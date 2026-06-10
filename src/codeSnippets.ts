export interface CodeSnippet {
  title: string;
  description: string;
  code: string;
}

export const COMMAND_PATTERN_EXPLAINER = `
The **Command Design Pattern** is a behavioral design pattern that turns a request into a stand-alone object containing all information about the request. This transformation lets you pass requests as arguments, delay or queue execution, support undoable/redoable operations, and assemble complex batches (Macro Commands).

### Core Components of the Pattern:
1. **Command Interface**: Outlines standard contracts (\`execute()\` and \`undo()\`).
2. **Concrete Commands**: Realizes specific requested operations (e.g., \`DeleteFileCommand\`, \`UpdateUserEmailCommand\`) and encapsulates state parameters & receivers.
3. **Receiver**: The ultimate subsystem executing the real business logic under the hood (e.g. \`FileSystem\`, \`UserRepository\`).
4. **Invoker (CommandManager)**: Trigger of the command sequence, maintaining historical tracking lists for rollback/rollforward functionality.
5. **Client**: The trigger initiating parameters, establishing associations between Concrete Commands and Receivers.
`;

export const CODE_SNIPPETS: Record<string, CodeSnippet> = {
  contract: {
    title: "1. The Command Contract",
    description: "Defines the base interface for all commands, forcing execution and reversal methods.",
    code: `interface Command {
  readonly name: string;
  execute(): Promise<CommandResult>;
  undo(): Promise<CommandResult>;
}`
  },
  base: {
    title: "2. The Base Class",
    description: "Provides shared boilerplate for error handling and structural logs across concrete commands.",
    code: `abstract class BaseCommand implements Command {
  abstract readonly name: string;
  constructor(protected readonly logger: CommandLogger) {}

  abstract execute(): Promise<CommandResult>;
  abstract undo(): Promise<CommandResult>;

  protected handleError(action: string, error: unknown): CommandResult {
    this.logger.error(\`\${this.name} failed during \${action}\`, error);
    return {
      success: false,
      message: \`\${this.name} failed during \${action}\`,
    };
  }
}`
  },
  deleteCommand: {
    title: "3. DeleteFileCommand (Destructive with Backup)",
    description: "An advanced, self-healing command that copies the file to a secure directory *before* deletion so it can be restored on undo.",
    code: `class DeleteFileCommand extends BaseCommand {
  readonly name = "DeleteFileCommand";
  private backupToken?: BackupToken;

  constructor(
    private readonly filePath: string,
    private readonly backupManager: BackupManager<BackupToken>,
    logger: CommandLogger
  ) {
    super(logger);
  }

  async execute(): Promise<CommandResult> {
    try {
      this.logger.log(\`Executing \${this.name}: \${this.filePath}\`);
      
      // Safety Backup!
      this.backupToken = await this.backupManager.createBackup();
      await fs.unlink(this.filePath);
      
      this.logger.log(\`File deleted: \${this.filePath}\`);
      return { success: true, message: "File unlinked." };
    } catch (error) {
      return this.handleError("execute", error);
    }
  }

  async undo(): Promise<CommandResult> {
    try {
      if (!this.backupToken) {
        throw new Error("No backup session index state recorded.");
      }
      this.logger.log(\`Restoring \${this.filePath}...\`);
      await this.backupManager.restoreBackup(this.backupToken);
      return { success: true, message: "File restored." };
    } catch (error) {
      return this.handleError("undo", error);
    }
  }
}`
  },
  updateEmailCommand: {
    title: "4. UpdateUserEmailCommand (Database State Mutation)",
    description: "Manages state records on a repository. Caches the exact row state before the update to cleanly restore it during rollback.",
    code: `class UpdateUserEmailCommand extends BaseCommand {
  readonly name = "UpdateUserEmailCommand";
  private previousState?: UserRecord;

  constructor(
    private readonly repository: InMemoryUserRepository,
    private readonly userId: string,
    private readonly newEmail: string,
    logger: CommandLogger
  ) {
    super(logger);
  }

  async execute(): Promise<CommandResult> {
    try {
      const user = await this.repository.findById(this.userId);
      if (!user) throw new Error("Target user index not found.");
      
      this.previousState = { ...user }; // Keep original
      await this.repository.update(this.userId, { email: this.newEmail });
      
      return { success: true, message: "Email changed successfully." };
    } catch (error) {
      return this.handleError("execute", error);
    }
  }

  async undo(): Promise<CommandResult> {
    try {
      if (!this.previousState) throw new Error("No undo history cache.");
      await this.repository.update(this.userId, this.previousState);
      return { success: true, message: "Email reverted." };
    } catch (error) {
      return this.handleError("undo", error);
    }
  }
}`
  },
  macroCommand: {
    title: "5. Macro Command (Composite Pattern)",
    description: "Groups multiple sequential commands together. If any command fails mid-execution, it executes an automatic rollback on the preceding successful ones to guarantee system consistency.",
    code: `class MacroCommand extends BaseCommand {
  readonly name: string;
  private executedCommands: Command[] = [];

  constructor(name: string, private readonly commands: Command[], logger: CommandLogger) {
    super(logger);
    this.name = name;
  }

  async execute(): Promise<CommandResult> {
    this.executedCommands = [];
    for (const command of this.commands) {
      const result = await command.execute();
      if (!result.success) {
        // Rollback already completed steps on failure!
        await this.rollback();
        return { success: false, message: "Macro aborted. Rollback execution done." };
      }
      this.executedCommands.push(command);
    }
    return { success: true, message: "Macro batch executed completely." };
  }

  async undo(): Promise<CommandResult> {
    // Reverse undo for structural integrity (LIFO order)
    for (const command of [...this.executedCommands].reverse()) {
      await command.undo();
    }
    return { success: true, message: "Macro reverted completely." };
  }

  private async rollback(): Promise<void> {
    for (const command of [...this.executedCommands].reverse()) {
      await command.undo();
    }
  }
}`
  },
  manager: {
    title: "6. The Invoker (CommandManager)",
    description: "Orchestrates command lifecycles. Keeps an active undo stack, a redo stack, and builds audit logging timelines.",
    code: `class CommandManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private history: HistoryEntry[] = [];

  async execute(command: Command): Promise<CommandResult> {
    const result = await command.execute();
    this.history.push({ command: command.name, action: "execute", timestamp: new Date() });
    
    if (result.success) {
      this.undoStack.push(command);
      this.redoStack = []; // Flushes redundant redos
    }
    return result;
  }

  async undo(): Promise<CommandResult> {
    const command = this.undoStack.pop();
    if (!command) return { success: false, message: "No history to undo." };

    const result = await command.undo();
    this.history.push({ command: command.name, action: "undo", timestamp: new Date() });
    
    if (result.success) {
      this.redoStack.push(command);
    }
    return result;
  }

  async redo(): Promise<CommandResult> {
    const command = this.redoStack.pop();
    if (!command) return { success: false, message: "No operations to redo." };

    const result = await command.execute();
    this.history.push({ command: command.name, action: "redo", timestamp: new Date() });
    
    if (result.success) {
      this.undoStack.push(command);
    }
    return result;
  }
}`
  }
};
