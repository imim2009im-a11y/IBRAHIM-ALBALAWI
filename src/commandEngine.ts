import { UserRecord, BackupToken, CommandHistoryEntry, LogEntry } from "./types";

/* ======================================================
   1. Simulated Environment
====================================================== */

export interface SimulatedEnv {
  files: Map<string, string>; // path -> content
  backups: Map<string, string>; // backupPath -> content
  users: Map<string, UserRecord>; // id -> user
  logs: LogEntry[];
  addLog: (level: "INFO" | "ERROR" | "WARNING" | "SUCCESS", message: string) => void;
  triggerUpdate: () => void;
  simulateFileSystemError: boolean;
  simulateDbError: boolean;
}

/* ======================================================
   2. Logger - Single Responsibility
====================================================== */

export interface CommandLogger {
  log(message: string): void;
  error(message: string, error?: unknown): void;
  warning(message: string): void;
  success(message: string): void;
}

export class VisualCommandLogger implements CommandLogger {
  constructor(private readonly env: SimulatedEnv) {}

  log(message: string): void {
    console.log(`[INFO]: ${message}`);
    this.env.addLog("INFO", message);
  }

  warning(message: string): void {
    console.warn(`[WARNING]: ${message}`);
    this.env.addLog("WARNING", message);
  }

  success(message: string): void {
    console.log(`[SUCCESS]: ${message}`);
    this.env.addLog("SUCCESS", message);
  }

  error(message: string, error?: unknown): void {
    let errStr = "";
    if (error instanceof Error) {
      errStr = error.message;
    } else if (error) {
      errStr = String(error);
    }
    const fullMessage = errStr ? `${message}: ${errStr}` : message;
    console.error(`[ERROR]: ${fullMessage}`);
    this.env.addLog("ERROR", fullMessage);
  }
}

/* ======================================================
   3. Backup Manager - Open/Closed Principle
====================================================== */

export interface BackupManager<TToken> {
  createBackup(): Promise<TToken>;
  restoreBackup(token: TToken): Promise<void>;
}

export class VisualFileBackupManager implements BackupManager<BackupToken> {
  constructor(
    private readonly targetPath: string,
    private readonly backupDirectory: string,
    private readonly env: SimulatedEnv
  ) {}

  async createBackup(): Promise<BackupToken> {
    if (this.env.simulateFileSystemError) {
      throw new Error(`I/O failure: Simulated read error on disk sector when backing up "${this.targetPath}".`);
    }

    const fileContent = this.env.files.get(this.targetPath);
    if (fileContent === undefined) {
      throw new Error(`File system error: Source file at "${this.targetPath}" does not exist.`);
    }

    const fileName = this.targetPath.split("/").pop() || "file.txt";
    const backupPath = `${this.backupDirectory}/${Date.now()}-${fileName}.backup`;

    // Write to virtual backup storage
    this.env.backups.set(backupPath, fileContent);
    this.env.triggerUpdate();

    return {
      originalPath: this.targetPath,
      backupPath,
      createdAt: new Date().toISOString(),
      content: fileContent,
    };
  }

  async restoreBackup(token: BackupToken): Promise<void> {
    if (this.env.simulateFileSystemError) {
      throw new Error(`I/O failure: Simulated disk write lock when restoring from "${token.backupPath}".`);
    }

    const backupContent = this.env.backups.get(token.backupPath);
    if (backupContent === undefined) {
      throw new Error(`Restore failed: Backup slice "${token.backupPath}" has expired or been corrupted.`);
    }

    // Restore virtual file
    this.env.files.set(token.originalPath, backupContent);
    this.env.triggerUpdate();
  }
}

/* ======================================================
   4. Command Contract
====================================================== */

export interface CommandResult {
  success: boolean;
  message: string;
}

export interface Command {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly details: string;
  execute(): Promise<CommandResult>;
  undo(): Promise<CommandResult>;
}

/* ======================================================
   5. Base Command - Shared Behavior
====================================================== */

export abstract class BaseCommand implements Command {
  readonly id = Math.random().toString(36).substr(2, 9);
  abstract readonly name: string;
  abstract readonly type: string;
  abstract readonly details: string;

  constructor(protected readonly logger: CommandLogger) {}

  abstract execute(): Promise<CommandResult>;
  abstract undo(): Promise<CommandResult>;

  protected handleError(action: string, error: unknown): CommandResult {
    this.logger.error(`${this.name} failed during ${action}`, error);
    return {
      success: false,
      message: `${this.name} error during ${action}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/* ======================================================
   6. Real Command Example: Delete File Safely
====================================================== */

export class DeleteFileCommand extends BaseCommand {
  readonly name = "DeleteFileCommand";
  readonly type = "DELETE_FILE";
  private backupToken?: BackupToken;

  constructor(
    private readonly filePath: string,
    private readonly backupManager: BackupManager<BackupToken>,
    private readonly env: SimulatedEnv,
    logger: CommandLogger
  ) {
    super(logger);
  }

  get details(): string {
    return `Delete absolute file path [${this.filePath}] with automated safety backup`;
  }

  async execute(): Promise<CommandResult> {
    try {
      this.logger.log(`Executing ${this.name}: ${this.filePath}`);

      // Check if file exists before running
      if (!this.env.files.has(this.filePath)) {
        throw new Error(`File at "${this.filePath}" not found.`);
      }

      // Backup before destructive operation
      this.backupToken = await this.backupManager.createBackup();
      this.logger.log(`Temporary recovery point generated: ${this.backupToken.backupPath}`);

      // Perform simulation file unlink
      this.env.files.delete(this.filePath);
      this.env.triggerUpdate();

      this.logger.success(`File successfully unlinked: ${this.filePath}`);

      return {
        success: true,
        message: `File deleted: ${this.filePath}`,
      };
    } catch (error) {
      return this.handleError("execute", error);
    }
  }

  async undo(): Promise<CommandResult> {
    try {
      if (!this.backupToken) {
        throw new Error("No backup session found. Cannot reverse deletion.");
      }

      this.logger.log(`Undoing ${this.name}: restoring contents of ${this.filePath}`);

      await this.backupManager.restoreBackup(this.backupToken);
      this.env.triggerUpdate();

      this.logger.success(`Reversed file deletion. Content restored to original path.`);

      return {
        success: true,
        message: `File restored: ${this.filePath}`,
      };
    } catch (error) {
      return this.handleError("undo", error);
    }
  }
}

/* ======================================================
   7. Another Example: Update In-Memory Database
====================================================== */

export class VisualUserRepository {
  constructor(private readonly env: SimulatedEnv) {}

  async create(user: UserRecord): Promise<void> {
    this.env.users.set(user.id, user);
    this.env.triggerUpdate();
  }

  async findById(id: string): Promise<UserRecord | undefined> {
    return this.env.users.get(id);
  }

  async update(id: string, data: Partial<UserRecord>): Promise<void> {
    if (this.env.simulateDbError) {
      throw new Error("Transaction deadlock simulated: State mutation aborted on critical database thread.");
    }

    const existing = this.env.users.get(id);
    if (!existing) {
      throw new Error(`In-Memory integrity constraint failure: User with ID "${id}" does not exist.`);
    }

    this.env.users.set(id, {
      ...existing,
      ...data,
    });
    this.env.triggerUpdate();
  }
}

export class UpdateUserEmailCommand extends BaseCommand {
  readonly name = "UpdateUserEmailCommand";
  readonly type = "UPDATE_EMAIL";
  private previousState?: UserRecord;

  constructor(
    private readonly repository: VisualUserRepository,
    private readonly userId: string,
    private readonly newEmail: string,
    logger: CommandLogger
  ) {
    super(logger);
  }

  get details(): string {
    return `Update contact key of user [${this.userId}] to target email address [${this.newEmail}]`;
  }

  async execute(): Promise<CommandResult> {
    try {
      this.logger.log(`Executing ${this.name} for user index reference: ${this.userId}`);

      const user = await this.repository.findById(this.userId);
      if (!user) {
        throw new Error(`User with primary key "${this.userId}" was not found in database registry.`);
      }

      // Safeguard historical properties before modification
      this.previousState = { ...user };

      await this.repository.update(this.userId, {
        email: this.newEmail,
      });

      this.logger.success(`Database row with user key "${this.userId}" has updated email: "${this.newEmail}".`);

      return {
        success: true,
        message: `User email updated to ${this.newEmail}`,
      };
    } catch (error) {
      return this.handleError("execute", error);
    }
  }

  async undo(): Promise<CommandResult> {
    try {
      if (!this.previousState) {
        throw new Error("No previous state cache available. Cannot rollback record update.");
      }

      this.logger.log(`Undoing ${this.name} for user: ${this.userId}`);

      await this.repository.update(this.userId, this.previousState);

      this.logger.success(`Database row reverted. Email rolled back to: "${this.previousState.email}"`);

      return {
        success: true,
        message: `User email restored to ${this.previousState.email}`,
      };
    } catch (error) {
      return this.handleError("undo", error);
    }
  }
}

/* ======================================================
   8. Macro Command
====================================================== */

export class MacroCommand extends BaseCommand {
  readonly name: string;
  readonly type = "MACRO";
  private executedCommands: Command[] = [];

  constructor(
    name: string,
    private readonly commands: Command[],
    logger: CommandLogger
  ) {
    super(logger);
    this.name = name;
  }

  get details(): string {
    return `Execute transaction batch containing [${this.commands.length}] discrete transaction commands`;
  }

  async execute(): Promise<CommandResult> {
    this.logger.warning(`Initiating atomic macro block execution: "${this.name}"`);
    this.executedCommands = [];

    for (const command of this.commands) {
      this.logger.log(`Macro subprocess -> Directing: ${command.name}`);
      const result = await command.execute();

      if (!result.success) {
        this.logger.error(
          `Macro sequence aborted at action: [${command.name}]. Initiating rollback cascade...`
        );

        await this.rollback();

        return {
          success: false,
          message: `Macro abort: ${command.name} failed. Complete batch rollback completed.`,
        };
      }

      this.executedCommands.push(command);
    }

    this.logger.success(`All [${this.commands.length}] macro substeps committed successfully.`);
    return {
      success: true,
      message: `Macro committed successfully: ${this.name}`,
    };
  }

  async undo(): Promise<CommandResult> {
    this.logger.warning(`Reversing atomic macro block: "${this.name}"`);

    // Reverse command logic using stack unrolling (LIFO check)
    for (const command of [...this.executedCommands].reverse()) {
      this.logger.log(`Macro subprocess -> Reversing: ${command.name}`);
      const result = await command.undo();

      if (!result.success) {
        this.logger.error(`Anomalous state: Macro rollback compromised at action [${command.name}]!`);
        return {
          success: false,
          message: `Macro undo error at component command: ${command.name}`,
        };
      }
    }

    this.logger.success(`All macro actions undone cleanly in reverse sequence order.`);
    return {
      success: true,
      message: `Macro undone: ${this.name}`,
    };
  }

  private async rollback(): Promise<void> {
    this.logger.warning("Rolling block changes back cleanly in reverse topological execution order...");
    for (const command of [...this.executedCommands].reverse()) {
      this.logger.log(`Recovery roll -> Reverting step: ${command.name}`);
      await command.undo();
    }
    this.logger.success("Rollback script execution complete. System state reconciled.");
  }
}

/* ======================================================
   9. Command History Manager (Client Invoker)
====================================================== */

export class VisualCommandManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private history: CommandHistoryEntry[] = [];

  constructor(
    private readonly logger: CommandLogger,
    private readonly onUpdate: () => void
  ) {}

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getUndoStackNames(): string[] {
    return this.undoStack.map((c) => c.name);
  }

  getRedoStackNames(): string[] {
    return this.redoStack.map((c) => c.name);
  }

  async execute(command: Command): Promise<CommandResult> {
    this.logger.log(`Invoker receiving request for command state dispatch: ${command.name}`);

    const result = await command.execute();

    this.history.push({
      id: Math.random().toString(36).substr(2, 9),
      commandId: command.id,
      commandName: command.name,
      action: "execute",
      timestamp: new Date().toISOString(),
      message: result.message,
      success: result.success,
    });

    if (result.success) {
      this.undoStack.push(command);
      // New executions invalidate redo stack according to Command specifications
      this.redoStack = [];
    }

    this.onUpdate();
    return result;
  }

  async undo(): Promise<CommandResult> {
    const command = this.undoStack.pop();

    if (!command) {
      const msg = "Undo request rejected: History stack empty.";
      this.logger.warning(msg);
      return { success: false, message: msg };
    }

    this.logger.log(`Invoker initiating command reversal chain: ${command.name}`);

    const result = await command.undo();

    this.history.push({
      id: Math.random().toString(36).substr(2, 9),
      commandId: command.id,
      commandName: command.name,
      action: "undo",
      timestamp: new Date().toISOString(),
      message: result.message,
      success: result.success,
    });

    if (result.success) {
      this.redoStack.push(command);
    } else {
      // Put it back on undo stack on failure so it can be re-attempted
      this.undoStack.push(command);
    }

    this.onUpdate();
    return result;
  }

  async redo(): Promise<CommandResult> {
    const command = this.redoStack.pop();

    if (!command) {
      const msg = "Redo request rejected: Redo forward stack empty.";
      this.logger.warning(msg);
      return { success: false, message: msg };
    }

    this.logger.log(`Invoker re-dispatched forwards command: ${command.name}`);

    const result = await command.execute();

    this.history.push({
      id: Math.random().toString(36).substr(2, 9),
      commandId: command.id,
      commandName: command.name,
      action: "redo",
      timestamp: new Date().toISOString(),
      message: result.message,
      success: result.success,
    });

    if (result.success) {
      this.undoStack.push(command);
    } else {
      // Put it back if redo fails
      this.redoStack.push(command);
    }

    this.onUpdate();
    return result;
  }

  getHistory(): CommandHistoryEntry[] {
    return [...this.history];
  }

  clearAll(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.history = [];
    this.logger.warning("Command history, undo stack, and redo stack cleared by invoker request.");
    this.onUpdate();
  }
}
