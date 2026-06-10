export interface UserRecord {
  id: string;
  name: string;
  email: string;
}

export interface VirtualFile {
  path: string; // e.g. "temp-demo/important-file.txt"
  content: string;
  isDeleted: boolean;
}

export interface BackupToken {
  originalPath: string;
  backupPath: string;
  createdAt: string;
  content: string; // Save content to simulate full restoration
}

export interface CommandHistoryEntry {
  id: string;
  commandId: string; // Track which instance executed this
  commandName: string;
  action: "execute" | "undo" | "redo";
  timestamp: string;
  message: string;
  success: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "INFO" | "ERROR" | "WARNING" | "SUCCESS";
  message: string;
}

export type CommandType = "DELETE_FILE" | "UPDATE_EMAIL" | "MACRO";

export interface CommandConfig {
  id: string;
  name: string;
  type: CommandType;
  params: {
    filePath?: string;
    userId?: string;
    email?: string;
    subCommands?: string[]; // IDs of sub-commands for Macro
  };
}
