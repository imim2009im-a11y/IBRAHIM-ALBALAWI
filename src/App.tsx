import { useState, useEffect, useRef } from "react";
import { 
  Trash2, 
  Database, 
  Folder, 
  Terminal, 
  Settings, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Plus, 
  RefreshCw, 
  BookOpen, 
  Sparkles, 
  Code, 
  Cpu, 
  Layers, 
  History, 
  Undo2, 
  Redo2, 
  Info, 
  Copy, 
  ArrowRight,
  FileText,
  Briefcase,
  TrendingUp,
  BarChart3
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  UserRecord, 
  VirtualFile, 
  BackupToken, 
  CommandHistoryEntry, 
  LogEntry 
} from "./types";
import { 
  SimulatedEnv, 
  VisualCommandLogger, 
  VisualFileBackupManager, 
  VisualUserRepository, 
  DeleteFileCommand, 
  UpdateUserEmailCommand, 
  MacroCommand, 
  VisualCommandManager, 
  Command 
} from "./commandEngine";
import { CODE_SNIPPETS, COMMAND_PATTERN_EXPLAINER } from "./codeSnippets";

export default function App() {
  // --- Tab State ---
  const [activeMainTab, setActiveMainTab] = useState<"simulator" | "blueprint">("simulator");
  const [activeSnippetTab, setActiveSnippetTab] = useState<string>("contract");

  // --- Controls & Toggles ---
  const [simFilesystemError, setSimFilesystemError] = useState<boolean>(false);
  const [simDbError, setSimDbError] = useState<boolean>(false);
  const [currentSelectedFile, setCurrentSelectedFile] = useState<string>("temp-demo/important-file.txt");
  const [currentSelectedUserId, setCurrentSelectedUserId] = useState<string>("u-1");
  const [currentUserNewEmail, setCurrentUserNewEmail] = useState<string>("ibrahim.new@domain.com");
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);

  // --- Custom Macro Builder State ---
  const [customMacroList, setCustomMacroList] = useState<Array<{ type: "delete" | "update"; label: string; args: any }>>([]);
  const [macroNameInput, setMacroNameInput] = useState<string>("Custom DB & Storage Safe-Batch");

  // --- Copy alert state ---
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // --- Environmental States mirroring persistent Maps ---
  const [filesState, setFilesState] = useState<Record<string, string>>({
    "temp-demo/important-file.txt": "This is an important file. Do not delete without backup.",
    "temp-demo/config.json": "{\n  \"server\": \"staging-east-cluster\",\n  \"auth\": true,\n  \"version\": \"2.1.0\"\n}",
    "temp-demo/secrets.env": "GEMINI_API_KEY=ai_studio_active_session_token_xyz_9988\nDATABASE_URL=postgresql://sandbox_admin:highly_secure_pass@localhost:5432"
  });

  const [backupsState, setBackupsState] = useState<Record<string, string>>({});

  const [usersState, setUsersState] = useState<UserRecord[]>([
    { id: "u-1", name: "Ibrahim", email: "old-email@example.com" },
    { id: "u-2", name: "Sarah Connor", email: "sarah@cyberdyne.net" },
    { id: "u-3", name: "David Miller", email: "david.m@cloudcorp.org" }
  ]);

  const [logsState, setLogsState] = useState<LogEntry[]>([
    { 
      id: "init", 
      timestamp: new Date().toISOString(), 
      level: "SUCCESS", 
      message: "Virtual Sandbox Client Environment loaded. Press 'Help' or execute prebuilt scenarios to explore." 
    }
  ]);

  // Command manager stacks tracking (state mirrors)
  const [undoStackList, setUndoStackList] = useState<string[]>([]);
  const [redoStackList, setRedoStackList] = useState<string[]>([]);
  const [commandHistory, setCommandHistory] = useState<CommandHistoryEntry[]>([]);

  // Keep references to persistent containers to pass into standard OOP Commands
  const envRef = useRef<{
    files: Map<string, string>;
    backups: Map<string, string>;
    users: Map<string, UserRecord>;
  }>({
    files: new Map(),
    backups: new Map(),
    users: new Map()
  });

  // Keep reference for current logs to ease logging synchronization
  const logsStateRef = useRef<LogEntry[]>(logsState);
  useEffect(() => {
    logsStateRef.current = logsState;
  }, [logsState]);

  // Initialize Maps on Mount
  useEffect(() => {
    Object.entries(filesState).forEach(([p, c]) => envRef.current.files.set(p, c));
    Object.entries(backupsState).forEach(([p, c]) => envRef.current.backups.set(p, c));
    usersState.forEach(u => envRef.current.users.set(u.id, u));
  }, []);

  // Sync virtual Maps to React readable states
  const syncEnvState = () => {
    setFilesState(Object.fromEntries(envRef.current.files));
    setBackupsState(Object.fromEntries(envRef.current.backups));
    setUsersState(Array.from(envRef.current.users.values()));
  };

  // --- Create Engine References ---
  const simulatedEnv: SimulatedEnv = {
    get files() { return envRef.current.files; },
    get backups() { return envRef.current.backups; },
    get users() { return envRef.current.users; },
    get logs() { return logsStateRef.current; },
    addLog: (level, msg) => {
      const newLog: LogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        level,
        message: msg
      };
      setLogsState(prev => [...prev, newLog]);
    },
    triggerUpdate: syncEnvState,
    simulateFileSystemError: simFilesystemError,
    simulateDbError: simDbError
  };

  // Sync error states to env on changes
  useEffect(() => {
    simulatedEnv.simulateFileSystemError = simFilesystemError;
  }, [simFilesystemError]);

  useEffect(() => {
    simulatedEnv.simulateDbError = simDbError;
  }, [simDbError]);

  const logger = new VisualCommandLogger(simulatedEnv);

  // Command Manager reference with callback hooks to update UI layers
  const [commandManager] = useState(() => {
    return new VisualCommandManager(logger, () => {
      // Re-trigger visual stack metrics
      syncEnvState();
    });
  });

  // Sync CommandManager stack arrays to React states
  const updateStackViews = () => {
    setUndoStackList(commandManager.getUndoStackNames());
    setRedoStackList(commandManager.getRedoStackNames());
    setCommandHistory(commandManager.getHistory());
  };

  // Let Command manager updates trigger lists
  useEffect(() => {
    updateStackViews(); // init view
  }, [filesState, backupsState, usersState, logsState]);

  // Clear Terminal helper
  const clearTerminalLogs = () => {
    setLogsState([{
      id: "clear-" + Date.now(),
      timestamp: new Date().toISOString(),
      level: "INFO",
      message: "Logger screen flushed cleanly."
    }]);
  };

  // --- Dynamic Node Animation helper ---
  const pulseNode = (nodeId: string) => {
    setHighlightedNode(nodeId);
    setTimeout(() => {
      setHighlightedNode(null);
    }, 1200);
  };

  // --- Command Instantiation Facade ---
  const buildDeleteCommand = (filePath: string): DeleteFileCommand => {
    const backupDir = "backup-demo";
    const backupManager = new VisualFileBackupManager(filePath, backupDir, simulatedEnv);
    return new DeleteFileCommand(filePath, backupManager, simulatedEnv, logger);
  };

  const buildUpdateEmailCommand = (userId: string, newEmail: string): UpdateUserEmailCommand => {
    const userRepo = new VisualUserRepository(simulatedEnv);
    return new UpdateUserEmailCommand(userRepo, userId, newEmail, logger);
  };

  // --- Execution Drivers ---
  const handleExecuteDeleteFile = async (filePath: string) => {
    pulseNode("deleteCommand");
    const cmd = buildDeleteCommand(filePath);
    await commandManager.execute(cmd);
  };

  const handleExecuteUpdateEmail = async (userId: string, targetEmail: string) => {
    pulseNode("updateEmailCommand");
    const cmd = buildUpdateEmailCommand(userId, targetEmail);
    await commandManager.execute(cmd);
  };

  const handleExecuteCustomMacro = async () => {
    pulseNode("macroCommand");
    if (customMacroList.length === 0) {
      simulatedEnv.addLog("WARNING", "Macro creation rejected: Batch queue details are empty.");
      return;
    }

    const compiledCommands: Command[] = customMacroList.map(item => {
      if (item.type === "delete") {
        return buildDeleteCommand(item.args.filePath);
      } else {
        return buildUpdateEmailCommand(item.args.userId, item.args.email);
      }
    });

    const labelName = macroNameInput || "User Custom Micro-Batch";
    const macroCmd = new MacroCommand(labelName, compiledCommands, logger);
    await commandManager.execute(macroCmd);
    setCustomMacroList([]); // Clear setup list on successful queueing
  };

  // Run the full original scenario from the user prompt
  const runOriginalDemoScenario = async () => {
    simulatedEnv.addLog("SUCCESS", "⚡ Loading original scenario script: Destructive safe-file-delete + db user-email update inside macro...");
    
    // 1. Reset state so files exist and can be safely deleted/mutated
    envRef.current.files.set("temp-demo/important-file.txt", "This is an important file. Do not delete without backup.");
    envRef.current.users.set("u-1", { id: "u-1", name: "Ibrahim", email: "old-email@example.com" });
    syncEnvState();

    pulseNode("macroCommand");

    // 2. Build constituent operations
    const delCmd = buildDeleteCommand("temp-demo/important-file.txt");
    const updateCmd = buildUpdateEmailCommand("u-1", "new-email@example.com");

    const macroCmd = new MacroCommand(
      "Scenario Macro: Safe Delete & Update Email",
      [delCmd, updateCmd],
      logger
    );

    await commandManager.execute(macroCmd);
  };

  // Command control center actions
  const handleUndo = async () => {
    pulseNode("manager");
    await commandManager.undo();
  };

  const handleRedo = async () => {
    pulseNode("manager");
    await commandManager.redo();
  };

  const handleResetSimulator = () => {
    commandManager.clearAll();
    
    // Reset file contents
    envRef.current.files.clear();
    envRef.current.files.set("temp-demo/important-file.txt", "This is an important file. Do not delete without backup.");
    envRef.current.files.set("temp-demo/config.json", "{\n  \"server\": \"staging-east-cluster\",\n  \"auth\": true,\n  \"version\": \"2.1.0\"\n}");
    envRef.current.files.set("temp-demo/secrets.env", "GEMINI_API_KEY=ai_studio_active_session_token_xyz_9988\nDATABASE_URL=postgresql://sandbox_admin:highly_secure_pass@localhost:5432");

    // Reset backups
    envRef.current.backups.clear();

    // Reset users
    envRef.current.users.clear();
    envRef.current.users.set("u-1", { id: "u-1", name: "Ibrahim", email: "old-email@example.com" });
    envRef.current.users.set("u-2", { id: "u-2", name: "Sarah Connor", email: "sarah@cyberdyne.net" });
    envRef.current.users.set("u-3", { id: "u-3", name: "David Miller", email: "david.m@cloudcorp.org" });

    syncEnvState();
    simulatedEnv.addLog("SUCCESS", "Virtual Environment State and historical command records re-initialized.");
  };

  // --- Dynamic Keyboard Listener (Hotkeys!) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid firing hotkeys when user is focused inside input elements
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === "input" || targetTag === "select" || targetTag === "textarea") {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undoStackList, redoStackList]);

  // --- Helper view getters ---
  const activeFileList = Object.keys(filesState);
  const activeBackupList = Object.keys(backupsState);

  // --- Real-time Ledger analytics calculations ---
  const totalAll = commandHistory.length;
  const successCount = commandHistory.filter(h => h.success).length;
  const failureCount = commandHistory.filter(h => !h.success).length;
  const successRate = totalAll > 0 ? Math.round((successCount / totalAll) * 100) : 100;
  const failureRate = totalAll > 0 ? 100 - successRate : 0;

  // --- Clipboard copy support ---
  const copyToClipboard = (text: string, titleId: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(titleId);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans flex flex-col md:overflow-x-hidden antialiased selection:bg-indigo-500/30 selection:text-indigo-200 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/60 via-[#0a0a0c] to-[#09090b]">
      
      {/* HEADER SECTION */}
      <header className="border-b border-zinc-800/80 bg-[#0c0c0e]/80 backdrop-blur sticky top-0 z-40 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-violet-500 p-[1px] flex items-center justify-center shadow-lg shadow-indigo-500/10">
            <div className="w-full h-full rounded-[11px] bg-zinc-950 flex items-center justify-center">
              <Cpu className="h-5 w-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-medium text-lg text-zinc-100 tracking-tight">
                Command Pattern Simulator
              </h1>
              <span className="text-[10px] bg-zinc-800/80 border border-zinc-700/40 px-2 py-0.5 rounded-full text-zinc-400 font-mono select-none">
                V2.1 (Pure OOP)
              </span>
            </div>
            <p className="text-xs text-zinc-450 hidden sm:block font-sans">
              Interactive transaction visualizer with atomic multi-step rollback and rollback-on-error cascades.
            </p>
          </div>
        </div>

        {/* TOP BUTTONS */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <button
            id="nav-btn-simulator"
            onClick={() => setActiveMainTab("simulator")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all border ${
              activeMainTab === "simulator"
                ? "bg-zinc-800 border-zinc-700 text-white shadow-lg shadow-black/40"
                : "bg-transparent border-transparent hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            Live Client Sandbox
          </button>
          
          <button
            id="nav-btn-blueprint"
            onClick={() => setActiveMainTab("blueprint")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all border ${
              activeMainTab === "blueprint"
                ? "bg-zinc-800 border-zinc-700 text-white shadow-lg shadow-black/40"
                : "bg-transparent border-transparent hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Design Blueprint & Code
          </button>
        </div>
      </header>

      {/* CORE WRAPPER */}
      <main className="flex-1 p-4 lg:p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-[1700px] w-full mx-auto">
        
        {activeMainTab === "simulator" ? (
          <>
            {/* LEFT / INTERACTIVE WORKSPACE (xl:col-span-8) */}
            <div className="xl:col-span-8 flex flex-col gap-6">
              
              {/* INVOKER / CONTROLLER PANEL */}
              <div id="invoker-panel" className="bg-[#121214]/90 rounded-2xl border border-zinc-800/80 p-5 shadow-xl relative overflow-hidden backdrop-blur-md">
                <div className="absolute right-0 top-0 h-24 w-24 bg-indigo-500/5 blur-2xl rounded-full select-none pointer-events-none" />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-805/80 pb-4 mb-4">
                  <div className="flex items-center gap-2.5">
                    <Layers className="h-5 w-5 text-indigo-400" />
                    <div>
                      <h2 className="font-display font-medium text-sm text-zinc-100">Invoker Control Deck</h2>
                      <p className="text-[11px] text-zinc-400">Trigger standard execution contexts or roll your system states backward/forward</p>
                    </div>
                  </div>

                  {/* Hotkeys indicator */}
                  <div className="hidden md:flex items-center gap-2 text-[10px] font-mono text-zinc-500 bg-zinc-950 px-2.5 py-1 rounded-md border border-zinc-805/60">
                    <span>Undo: <kbd className="text-zinc-400 bg-zinc-900/50 px-1 rounded">Ctrl+Z</kbd></span>
                    <span className="opacity-40">|</span>
                    <span>Redo: <kbd className="text-zinc-400 bg-zinc-900/50 px-1 rounded">Ctrl+Y</kbd></span>
                  </div>
                </div>

                {/* Main Invoker Action Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    id="btn-invoker-undo"
                    onClick={handleUndo}
                    disabled={undoStackList.length === 0}
                    className="group relative flex items-center justify-center gap-2.5 px-4 py-3 bg-[#18181b] hover:bg-[#202024] disabled:opacity-40 disabled:hover:bg-[#18181b] text-zinc-200 disabled:text-zinc-500 font-medium text-xs rounded-xl border border-zinc-800/80 disabled:border-zinc-900/50 transition-all cursor-pointer disabled:cursor-not-allowed overflow-hidden shadow-sm"
                  >
                    <Undo2 className="h-4 w-4 text-indigo-400 group-hover:-rotate-45 transition-transform" />
                    <div className="text-left">
                      <div className="font-semibold text-xs leading-none">Undo Command</div>
                      {undoStackList.length > 0 ? (
                        <span className="text-[9px] text-zinc-400 font-normal leading-3 block truncate max-w-[140px] mt-0.5">
                          Pop: {undoStackList[undoStackList.length - 1]}
                        </span>
                      ) : (
                        <span className="text-[9px] text-zinc-500 leading-3 block mt-0.5 font-mono">Stack empty</span>
                      )}
                    </div>
                    {undoStackList.length > 0 && (
                      <span className="absolute top-1 right-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-indigo-500/20 text-indigo-300">
                        {undoStackList.length}
                      </span>
                    )}
                  </button>

                  <button
                    id="btn-invoker-redo"
                    onClick={handleRedo}
                    disabled={redoStackList.length === 0}
                    className="group relative flex items-center justify-center gap-2.5 px-4 py-3 bg-[#18181b] hover:bg-[#202024] disabled:opacity-40 disabled:hover:bg-[#18181b] text-zinc-200 disabled:text-zinc-500 font-medium text-xs rounded-xl border border-zinc-800/80 disabled:border-zinc-900/50 transition-all cursor-pointer disabled:cursor-not-allowed overflow-hidden shadow-sm"
                  >
                    <Redo2 className="h-4 w-4 text-indigo-400 group-hover:rotate-45 transition-transform" />
                    <div className="text-left">
                      <div className="font-semibold text-xs leading-none">Redo Command</div>
                      {redoStackList.length > 0 ? (
                        <span className="text-[9px] text-zinc-400 font-normal leading-3 block truncate max-w-[140px] mt-0.5">
                          Push: {redoStackList[redoStackList.length - 1]}
                        </span>
                      ) : (
                        <span className="text-[9px] text-zinc-500 leading-3 block mt-0.5 font-mono">Stack empty</span>
                      )}
                    </div>
                    {redoStackList.length > 0 && (
                      <span className="absolute top-1 right-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-indigo-500/20 text-indigo-300">
                        {redoStackList.length}
                      </span>
                    )}
                  </button>

                  <button
                    id="btn-invoker-reset"
                    onClick={handleResetSimulator}
                    className="group flex items-center justify-center gap-2 px-4 py-3 bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 text-rose-450 hover:text-rose-400 font-medium text-xs rounded-xl transition-all cursor-pointer"
                  >
                    <RefreshCw className="h-4 w-4 text-rose-500 group-hover:rotate-180 transition-transform duration-500" />
                    <div className="text-left">
                      <div className="font-semibold text-xs">Reset Simulator</div>
                      <span className="text-[9px] text-rose-500/50 block mt-0.5">Restore all defaults</span>
                    </div>
                  </button>
                </div>

                {/* Active Stack Layers Visualization (Horizontal timelines showing state layers) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  
                  {/* Undo queue stack preview */}
                  <div className="bg-zinc-950/55 p-3 rounded-xl border border-zinc-800/60">
                    <span className="text-[10px] font-mono font-semibold text-zinc-400 flex items-center gap-1.5 mb-2 select-none">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                      UNDO STACK (LIFO Execution Order)
                    </span>
                    <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-thin">
                      {undoStackList.length === 0 ? (
                        <span className="text-[10px] font-mono text-zinc-650 px-2 py-1 italic">Empty (No operations recorded)</span>
                      ) : (
                        undoStackList.map((name, idx) => (
                          <div 
                            key={`u-${idx}-${name}`} 
                            className="bg-[#121214] border border-indigo-500/20 text-indigo-300 text-[10px] font-mono px-2.5 py-1 rounded flex items-center gap-1 shrink-0 shadow-sm"
                          >
                            <span className="text-indigo-500/50 font-bold">{idx + 1}.</span>
                            <span>{name.replace("Command", "")}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Redo queue stack preview */}
                  <div className="bg-zinc-950/55 p-3 rounded-xl border border-zinc-800/60">
                    <span className="text-[10px] font-mono font-semibold text-zinc-400 flex items-center gap-1.5 mb-2 select-none">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                      REDO REPLACEMENT STACK
                    </span>
                    <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-thin">
                      {redoStackList.length === 0 ? (
                        <span className="text-[10px] font-mono text-zinc-650 px-2 py-1 italic">Empty (No undo history buffered)</span>
                      ) : (
                        redoStackList.map((name, idx) => (
                          <div 
                            key={`r-${idx}-${name}`} 
                            className="bg-[#121214] border border-blue-500/20 text-blue-300 text-[10px] font-mono px-2.5 py-1 rounded flex items-center gap-1 shrink-0 shadow-sm"
                          >
                            <span className="text-blue-500/50 font-bold">{idx + 1}.</span>
                            <span>{name.replace("Command", "")}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* TWO SIDES: CLIENT COMMAND BUILDERS & MOCK PLATFORM */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* DYNAMIC SCENARIO COMMAND BUILDERS (lg:col-span-5) */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                                   {/* PREBUILT HIGH-FIDELITY DEMO OPERATIONS */}
                  <div className="bg-[#121214]/90 rounded-2xl border border-zinc-800/80 p-5 flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4.5 w-4.5 text-indigo-400" />
                      <h3 className="font-display font-medium text-sm text-zinc-100">Macro Pipelines & Quick Scenarios</h3>
                    </div>

                    <p className="text-[11px] text-zinc-455 leading-relaxed -mt-2">
                      Test automated rollbacks on errors, macro atomic commits, or trigger the standard scenario out-of-the-box:
                    </p>

                    <button
                      id="btn-scenario-user-demo"
                      onClick={runOriginalDemoScenario}
                      className="w-full flex items-center justify-between text-left p-3.5 rounded-xl bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-805 hover:border-zinc-700 transition-all cursor-pointer group shadow-sm"
                    >
                      <div>
                        <span className="text-zinc-500 font-mono text-[9px] tracking-wider uppercase block font-semibold">SCENARIO RUNNER 1</span>
                        <h4 className="text-xs font-semibold text-zinc-200 mt-0.5 group-hover:text-indigo-400 transition-colors">Original Safe-Macro Demo</h4>
                        <p className="text-[10px] text-zinc-400 mt-1 lines-2 leading-relaxed">Atomically unlinks <code className="text-indigo-400 text-[9px]">important-file.txt</code> and updates user <code className="text-indigo-450 text-[9px]">u-1</code> email in sequence.</p>
                      </div>
                      <Play className="h-4 w-4 text-indigo-400 shrink-0 ml-3 group-hover:scale-110 transition-transform" />
                    </button>

                    {/* INTERACTIVE FAILURE SIMULATION SWITCHES */}
                    <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-850 flex flex-col gap-3">
                      <span className="text-[10px] font-mono font-semibold text-zinc-400 tracking-wide uppercase flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        Inject Recovery Failures:
                      </span>
                      
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center justify-between p-2 rounded-lg bg-zinc-90 w/50 hover:bg-zinc-900 border border-zinc-900 cursor-pointer select-none">
                          <span className="text-xs text-zinc-300">
                            Simulate File System errors
                          </span>
                          <input
                            type="checkbox"
                            checked={simFilesystemError}
                            onChange={(e) => setSimFilesystemError(e.target.checked)}
                            className="h-4 w-4 bg-zinc-800 border-zinc-700 rounded text-indigo-500 focus:ring-indigo-650 focus:ring-offset-zinc-950 cursor-pointer"
                          />
                        </label>
                        {simFilesystemError && (
                          <div className="text-[9px] text-rose-400 font-mono px-2 -mt-1 leading-normal">
                            ⚠ Will simulate a read/write block during backup. Test how execution aborts safely and recovers previous states.
                          </div>
                        )}

                        <label className="flex items-center justify-between p-2 rounded-lg bg-zinc-90 w/50 hover:bg-zinc-900 border border-zinc-900 cursor-pointer select-none">
                          <span className="text-xs text-zinc-300">
                            Simulate DB Lock exception
                          </span>
                          <input
                            type="checkbox"
                            checked={simDbError}
                            onChange={(e) => setSimDbError(e.target.checked)}
                            className="h-4 w-4 bg-zinc-800 border-zinc-700 rounded text-indigo-500 focus:ring-indigo-650 focus:ring-offset-zinc-950 cursor-pointer"
                          />
                        </label>
                        {simDbError && (
                          <div className="text-[9px] text-rose-400 font-mono px-2 -mt-1 leading-normal">
                            ⚠ Will simulate database deadlocks during user email update mutations. Watch the Macro clean up the unlinked files automatically!
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* COMMAND CREATION CONTEXTS */}
                  <div className="bg-[#121214]/90 rounded-2xl border border-zinc-800/80 p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4.5 w-4.5 text-indigo-400" />
                        <h3 className="font-display font-medium text-sm text-zinc-100">Manual Command Trigger</h3>
                      </div>
                    </div>

                    {/* SELECT ACTION TYPE BOX */}
                    <div className="flex flex-col gap-3.5">
                      
                      {/* ACTION 1: DESTRUCTIVE FILE DELETE WITH BACKUP */}
                      <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-850">
                        <span className="text-[10px] font-mono text-indigo-400 font-bold block mb-2 uppercase">1. SECURE DESTRUCTIVE FILE REMOVAL</span>
                        <div className="flex items-center gap-2">
                          <select
                            id="select-delete-file"
                            value={currentSelectedFile}
                            onChange={(e) => setCurrentSelectedFile(e.target.value)}
                            className="flex-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-2 text-xs rounded-lg text-zinc-300 focus:outline-none focus:border-indigo-500"
                          >
                            {activeFileList.length === 0 ? (
                              <option disabled>No files available to delete</option>
                            ) : (
                              activeFileList.map((path) => (
                                <option key={path} value={path}>{path}</option>
                              ))
                            )}
                          </select>
                          
                          <button
                            id="btn-delete-file-run"
                            onClick={() => handleExecuteDeleteFile(currentSelectedFile)}
                            disabled={activeFileList.length === 0}
                            className="p-2 cursor-pointer disabled:cursor-not-allowed bg-rose-950/50 select-none hover:bg-rose-900/60 border border-rose-900/85 hover:border-rose-700 text-rose-400 hover:text-rose-300 disabled:opacity-40 disabled:hover:bg-rose-955/50 disabled:hover:text-rose-400 py-2 px-3 text-xs font-semibold rounded-lg shrink-0 flex items-center gap-1.5 transition-all"
                            title="Execute DeleteFileCommand"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Safely Delete
                          </button>
                        </div>
                      </div>

                      {/* ACTION 2: UPDATE USER DATABASE EMAIL */}
                      <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-850 flex flex-col gap-2.5">
                        <span className="text-[10px] font-mono text-indigo-400 font-bold block uppercase">2. MUTATE USER DB REGISTRY</span>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-mono text-zinc-500 block mb-1">Row Key:</label>
                            <select
                              id="select-update-user"
                              value={currentSelectedUserId}
                              onChange={(e) => setCurrentSelectedUserId(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-2 text-xs rounded-lg text-zinc-300 focus:outline-none focus:border-indigo-500"
                            >
                              {usersState.map((u) => (
                                <option key={u.id} value={u.id}>{u.id} - {u.name}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className="text-[9px] font-mono text-zinc-500 block mb-1">New Email:</label>
                            <input
                              type="text"
                              id="input-user-email"
                              value={currentUserNewEmail}
                              onChange={(e) => setCurrentUserNewEmail(e.target.value)}
                              placeholder="e.g. name@server.com"
                              className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-2 text-xs rounded-lg text-zinc-355 focus:outline-none focus:border-indigo-500 placeholder:text-zinc-600"
                            />
                          </div>
                        </div>

                        <button
                          id="btn-update-email-run"
                          onClick={() => handleExecuteUpdateEmail(currentSelectedUserId, currentUserNewEmail)}
                          className="w-full bg-zinc-900 hover:bg-[#1f1f23] border border-zinc-800 hover:border-zinc-705 text-zinc-200 py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <Database className="h-3.5 w-3.5 text-indigo-400" />
                          Update Email Row
                        </button>
                      </div>

                      {/* DETAILED ADHOC MACRO BATCH ASSEMBLY */}
                      <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-850 flex flex-col gap-2">
                        <span className="text-[10.5px] font-mono text-indigo-400 font-bold block uppercase">3. DYNAMIC MACRO COMPOSITION BUILDER</span>
                        <p className="text-[10px] text-zinc-450 mt-px leading-snug">
                          Build custom batches out of individual actions. Trigger them as an atomic block:
                        </p>

                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <button
                            id="btn-macro-add-delete"
                            onClick={() => {
                              const file = currentSelectedFile;
                              if (!file) return;
                              setCustomMacroList(prev => [
                                ...prev,
                                { type: "delete", label: `Delete file: ${file}`, args: { filePath: file } }
                              ]);
                            }}
                            className="bg-zinc-900 hover:bg-[#1e1e21] p-2 rounded-lg text-[11px] text-zinc-300 hover:text-zinc-100 font-medium flex items-center justify-center gap-1.5 transition-all border border-zinc-800 cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5 text-rose-455" />
                            Queue File Delete
                          </button>

                          <button
                            id="btn-macro-add-email"
                            onClick={() => {
                              const uId = currentSelectedUserId;
                              const email = currentUserNewEmail;
                              const userObj = usersState.find(u => u.id === uId);
                              if (!uId || !email) return;
                              setCustomMacroList(prev => [
                                ...prev,
                                { type: "update", label: `Update user ${userObj?.name || uId} to ${email}`, args: { userId: uId, email } }
                              ]);
                            }}
                            className="bg-zinc-900 hover:bg-[#1e1e21] p-2 rounded-lg text-[11px] text-zinc-300 hover:text-zinc-100 font-medium flex items-center justify-center gap-1.5 transition-all border border-zinc-800 cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5 text-indigo-400" />
                            Queue DB Update
                          </button>
                        </div>

                        {/* Batch setup review */}
                        {customMacroList.length > 0 && (
                          <div className="bg-zinc-900/55 border border-zinc-800 rounded-lg p-2 flex flex-col gap-1.5">
                            <div className="flex items-center justify-between border-b border-zinc-805/60 pb-1 mb-1">
                              <span className="text-[9px] font-mono font-extrabold text-indigo-400">BATCH STEPS QUEUED ({customMacroList.length})</span>
                              <button 
                                onClick={() => setCustomMacroList([])} 
                                className="text-[9.5px] font-mono text-rose-400 hover:underline cursor-pointer"
                              >
                                clear
                              </button>
                            </div>
                            
                            <div className="flex flex-col gap-1 max-h-24 overflow-y-auto scrollbar-thin">
                              {customMacroList.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-1 text-[10px] bg-zinc-950 p-1.5 rounded text-zinc-300 font-mono leading-tight border border-zinc-900">
                                  <span className="text-zinc-650 font-bold">{idx + 1}.</span>
                                  <span className="flex-1 truncate">{item.label}</span>
                                </div>
                              ))}
                            </div>

                            <div className="mt-2 text-left">
                              <label className="text-[9px] text-zinc-500 font-mono block mb-1">Macro Transaction Name:</label>
                              <input 
                                type="text"
                                value={macroNameInput}
                                onChange={(e) => setMacroNameInput(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 p-1.5 rounded text-xs focus:outline-none text-zinc-300 focus:border-indigo-500"
                              />
                            </div>

                            <button
                              id="btn-macro-run-composed"
                              onClick={handleExecuteCustomMacro}
                              className="mt-2 py-2 px-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 font-semibold text-[11px] text-white rounded-lg flex items-center justify-center gap-1.5 shadow-md border border-indigo-500/20 transition-all cursor-pointer"
                            >
                              <Play className="h-3 w-3 fill-current" />
                              Commit Atomic Macro Batch
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* VISUAL ENVIRONMENT CONTAINER: SIMULATING FILE SYSTEM & DATABASE REGISTRY (lg:col-span-7) */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  
                  {/* SIMULATED DB TABLE */}
                  <div id="visual-db-registry" className="bg-[#121214]/90 rounded-2xl border border-zinc-800/80 p-5 flex flex-col gap-4 shadow-md relative backdrop-blur-md">
                    <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-indigo-500/80 animate-ping" />
                    
                    <div className="flex items-center gap-2">
                      <Database className="h-4.5 w-4.5 text-indigo-400" />
                      <div>
                        <h3 className="font-display font-medium text-sm text-zinc-100">Live Memory Database Registry</h3>
                        <p className="text-[10px] text-zinc-400">Stores active user entities representing client/transaction states</p>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-zinc-800/60 bg-zinc-950/60">
                      <table className="w-full text-left text-xs text-zinc-300 font-sans">
                        <thead className="text-[10px] font-mono text-zinc-550 bg-zinc-950 border-b border-zinc-900">
                          <tr>
                            <th className="px-4 py-2.5 font-semibold">ID</th>
                            <th className="px-4 py-2.5 font-semibold">NAME</th>
                            <th className="px-4 py-2.5 font-semibold">EMAIL RECORD</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usersState.map((user) => (
                            <motion.tr 
                              key={user.id}
                              className="border-b border-zinc-900 hover:bg-zinc-900/30 transition-colors"
                              layoutId={`db-user-${user.id}`}
                            >
                              <td className="px-4 py-3 font-mono font-semibold text-indigo-400">{user.id}</td>
                              <td className="px-4 py-3 text-zinc-205 font-medium">{user.name}</td>
                              <td className="px-4 py-3">
                                <span className="bg-[#121214] px-2.5 py-1 rounded text-[11px] font-mono text-zinc-300 border border-zinc-850">
                                  {user.email}
                                </span>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* VIRTUAL PLATFORM STORAGE EXPLORER */}
                  <div id="virtual-filesystem" className="bg-[#121214]/90 rounded-2xl border border-zinc-800/80 p-5 flex flex-col gap-4 shadow-md backdrop-blur-md">
                    
                    <div className="flex items-center gap-2">
                      <Folder className="h-4.5 w-4.5 text-indigo-400" />
                      <div>
                        <h3 className="font-display font-medium text-sm text-zinc-100">Simulated Virtual Storage Device</h3>
                        <p className="text-[10px] text-zinc-400 font-sans">Filesystem tree displaying both workspace folders and secure recovery vaults</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* ACTIVE WORKSPACE DIRECTORY: temp-demo/ */}
                      <div className="p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-950/50 flex flex-col">
                        <span className="text-[10px] font-mono font-semibold text-zinc-400 mb-2.5 flex items-center gap-1.5 select-none">
                          <Folder className="h-3.5 w-3.5 text-indigo-400" />
                          /workspace/temp-demo/
                        </span>

                        <div className="flex-1 flex flex-col gap-2 min-h-24">
                          {Object.keys(filesState).length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border border-dashed border-zinc-805 rounded bg-zinc-950/20">
                              <span className="text-[10px] text-zinc-600 italic font-mono">No active files remaining</span>
                            </div>
                          ) : (
                            Object.entries(filesState).map(([path, content]) => (
                              <div 
                                key={path} 
                                className="bg-zinc-900/40 p-2.5 rounded border border-zinc-800 hover:border-zinc-700/85 transition-all flex flex-col gap-1.5"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <FileText className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                                    <span className="text-[11px] font-mono text-zinc-200 truncate font-semibold">{path.split("/").pop()}</span>
                                  </div>
                                  
                                  {/* Adhoc direct delete to test client integration context */}
                                  <button
                                    onClick={() => handleExecuteDeleteFile(path)}
                                    className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all cursor-pointer"
                                    title="Safely remove via DeleteFileCommand"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                                <div className="bg-zinc-950 p-2 rounded text-[10.5px] font-mono text-zinc-400 overflow-x-auto whitespace-pre leading-snug border border-zinc-900 max-h-16 scrollbar-thin">
                                  {content}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* SECURE RECOVERY VAULT: backup-demo/ */}
                      <div className="p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-950/50 flex flex-col">
                        <span className="text-[10px] font-mono font-semibold text-zinc-400 mb-2.5 flex items-center gap-1.5 select-none">
                          <Folder className="h-3.5 w-3.5 text-amber-550" />
                          /isolated/backup-demo/
                        </span>

                        <div className="flex-1 flex flex-col gap-2 min-h-24">
                          {Object.keys(backupsState).length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border border-dashed border-zinc-805 rounded bg-zinc-950/20">
                              <span className="text-[10px] text-zinc-605 italic font-mono font-normal">No backup points buffered</span>
                            </div>
                          ) : (
                            Object.entries(backupsState).map(([path, content]) => (
                              <div 
                                key={path} 
                                className="bg-zinc-900/30 p-2 border border-zinc-805/80 rounded flex flex-col gap-1.5"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <CheckCircle2 className="h-3 w-3 text-amber-500 shrink-0" />
                                    <span className="text-[10px] font-mono text-zinc-300 truncate">{path.split("/").pop()}</span>
                                  </div>
                                  <span className="text-[9px] font-mono text-amber-550/80 font-bold select-none">BACKUP</span>
                                </div>
                                <div className="bg-zinc-950 p-1.5 rounded text-[9.5px] font-mono text-zinc-500 overflow-x-auto leading-none border border-zinc-900 max-h-14 scrollbar-thin">
                                  {content}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                    </div>
                  </div>

                </div>

              </div>
            </div>

            {/* RIGHT SIDEBAR (xl:col-span-4) - ARCHITECTURE GRAPH & UNIX LOG SYSTEM */}
            <div className="xl:col-span-4 flex flex-col gap-6">

              {/* COMMAND PERFORMANCE ANALYTICS DASHBOARD */}
              <div id="performance-dashboard" className="bg-[#121214]/90 rounded-2xl border border-zinc-800/80 p-5 flex flex-col gap-4 shadow-md backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4.5 w-4.5 text-indigo-400" />
                    <div>
                      <h3 className="font-display font-medium text-sm text-zinc-100 font-semibold tracking-tight">Ledger Success Registry</h3>
                      <p className="text-[10px] text-zinc-400">Real-time health telemetry of database and storage operations</p>
                    </div>
                  </div>
                  {totalAll > 0 && (
                    <span className="text-[9px] font-mono bg-indigo-950/40 border border-indigo-500/30 px-2 py-0.5 rounded text-indigo-300 font-bold">
                      LIVE STATS
                    </span>
                  )}
                </div>

                {/* Dashboard grid layout */}
                <div className="bg-zinc-950/80 border border-zinc-850 p-4 rounded-xl flex flex-col gap-4">
                  {totalAll === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-6 text-zinc-500 font-sans">
                      <BarChart3 className="h-8 w-8 text-zinc-750 mb-2 stroke-[1.5]" />
                      <span className="text-xs font-semibold text-zinc-400 font-display">No Analytics Registered</span>
                      <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px] leading-relaxed">
                        Execute manual operations or scenarios to accumulate command success rates here.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* STATS COUNT */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-[#0c0c0e]/60 border border-zinc-900 p-2 rounded-lg">
                          <span className="block text-[9px] font-mono text-zinc-500 uppercase tracking-wider font-semibold">Total Run</span>
                          <span className="text-sm font-bold text-zinc-100 font-mono mt-0.5 block">{totalAll}</span>
                        </div>
                        <div className="bg-[#0c0c0e]/60 border border-zinc-900 p-2 rounded-lg">
                          <span className="block text-[9px] font-mono text-zinc-500 uppercase tracking-wider font-semibold">Success</span>
                          <span className="text-sm font-bold text-indigo-400 font-mono mt-0.5 block">{successCount}</span>
                        </div>
                        <div className="bg-[#0c0c0e]/60 border border-zinc-900 p-2 rounded-lg">
                          <span className="block text-[9px] font-mono text-zinc-500 uppercase tracking-wider font-semibold">Failures</span>
                          <span className="text-sm font-bold text-rose-500 font-mono mt-0.5 block">{failureCount}</span>
                        </div>
                      </div>

                      {/* SIMPLE CHART: Stacked comparison timeline & donut visualizations */}
                      <div className="grid grid-cols-5 gap-3 items-center pt-1">
                        
                        {/* Circle gauge (2 cols) */}
                        <div className="col-span-2 flex flex-col items-center justify-center relative">
                          <svg className="w-18 h-18 transform -rotate-90">
                            {/* Track */}
                            <circle
                              cx="36"
                              cy="36"
                              r="28"
                              className="stroke-zinc-900"
                              strokeWidth="5"
                              fill="transparent"
                            />
                            {/* Filled animated line */}
                            <motion.circle
                              cx="36"
                              cy="36"
                              r="28"
                              className="stroke-indigo-500"
                              strokeWidth="5.5"
                              fill="transparent"
                              strokeDasharray={`${2 * Math.PI * 28}`}
                              initial={{ strokeDashoffset: `${2 * Math.PI * 28}` }}
                              animate={{ strokeDashoffset: `${2 * Math.PI * 28 * (1 - successRate / 100)}` }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
                            <span className="text-xs font-bold text-zinc-100 font-mono">{successRate}%</span>
                            <span className="text-[7.5px] font-mono text-zinc-500 mt-0.5 tracking-tighter">RATE</span>
                          </div>
                        </div>

                        {/* Comparative bar breakdown details (3 cols) */}
                        <div className="col-span-3 flex flex-col gap-2.5">
                          <div>
                            <div className="flex justify-between items-center text-[10px] font-mono mb-0.5">
                              <span className="text-zinc-500 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                Success Rate
                              </span>
                              <span className="text-indigo-400 font-bold">{successRate}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                              <motion.div 
                                className="h-full bg-indigo-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${successRate}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center text-[10px] font-mono mb-0.5">
                              <span className="text-zinc-500 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                Failure Rate
                              </span>
                              <span className="text-rose-450 font-bold">{failureRate}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                              <motion.div 
                                className="h-full bg-rose-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${failureRate}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                              />
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* ANALYTICS EXPOSITORY FEEDBACK */}
                      <div className="border-t border-zinc-900 pt-2 flex items-center justify-between text-[9px] font-mono leading-none">
                        <span className="text-zinc-550">Telemetry Link Status</span>
                        <span className={`font-semibold ${successRate >= 85 ? "text-indigo-400" : successRate >= 50 ? "text-amber-400" : "text-rose-455"}`}>
                          {successRate >= 85 ? "0x00_HEALTHY" : successRate >= 50 ? "0x01_DEGRADED" : "0x02_FAULT"}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* INTERACTIVE ARCHITECTURAL FLOW GRAPH */}
              <div className="bg-[#121214]/90 rounded-2xl border border-zinc-800/80 p-5 flex flex-col gap-4 shadow-md backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4.5 w-4.5 text-indigo-400 animate-pulse" />
                  <div>
                    <h3 className="font-display font-medium text-sm text-zinc-100 font-semibold tracking-tight">Active Pattern Flow Graph</h3>
                    <p className="text-[10px] text-zinc-400">Watch classes and components light up during operations</p>
                  </div>
                </div>

                {/* Graph Grid */}
                <div className="bg-zinc-950/80 border border-zinc-850 p-4 rounded-xl flex flex-col gap-3">
                  
                  {/* Component 1: Client */}
                  <div className={`p-2 rounded-lg border text-center transition-all ${
                    highlightedNode === "client" 
                      ? "bg-indigo-500/10 border-indigo-400 shadow-md shadow-indigo-400/10 scale-102"
                      : "bg-zinc-900/75 border-zinc-800 text-zinc-300"
                  }`}>
                    <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-zinc-400">Trigger Layer (Client UI)</span>
                    <p className="text-[10px] text-zinc-400 font-mono mt-0.5 leading-tight">Registers user request state changes</p>
                  </div>

                  <div className="flex justify-center text-zinc-800 font-mono text-xs leading-none">↓</div>

                  {/* Component 2: Invoker */}
                  <div className={`p-2.5 rounded-lg border text-center transition-all ${
                    highlightedNode === "manager" 
                      ? "bg-indigo-500/10 border-indigo-400 shadow-md shadow-indigo-550/10 scale-102"
                      : "bg-zinc-900/75 border-zinc-800 text-zinc-200"
                  }`}>
                    <span className="text-[10.5px] uppercase font-mono font-bold text-zinc-250 flex items-center justify-center gap-1">
                      <Layers className="h-3 w-3 text-indigo-400" />
                      Invoker (CommandManager)
                    </span>
                    <p className="text-[9.5px] text-zinc-500 font-mono mt-0.5 leading-none">Keeps Undo stack [{undoStackList.length}] & Redo stack [{redoStackList.length}]</p>
                  </div>

                  <div className="flex justify-center text-zinc-800 font-mono text-xs leading-none">↓</div>

                  {/* Component 3: Command Type */}
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    
                    <div className={`p-1.5 rounded-lg border transition-all ${
                      highlightedNode === "deleteCommand" 
                        ? "bg-indigo-500/15 border-indigo-400 scale-103"
                        : "bg-zinc-900/50 border-zinc-800/85 text-zinc-400"
                    }`}>
                      <span className="text-[9px] uppercase font-mono font-semibold block">Delete cmd</span>
                    </div>

                    <div className={`p-1.5 rounded-lg border transition-all ${
                      highlightedNode === "updateEmailCommand" 
                        ? "bg-indigo-500/15 border-indigo-400 scale-103"
                        : "bg-zinc-900/50 border-zinc-800/85 text-zinc-400"
                    }`}>
                      <span className="text-[9px] uppercase font-mono font-semibold block">Update cmd</span>
                    </div>

                    <div className={`p-1.5 rounded-lg border transition-all ${
                      highlightedNode === "macroCommand" 
                        ? "bg-indigo-500/15 border-indigo-400 scale-103"
                        : "bg-zinc-900/50 border-zinc-800/85 text-zinc-400"
                    }`}>
                      <span className="text-[9px] uppercase font-mono font-semibold block">Macro cmd</span>
                    </div>

                  </div>

                  <div className="flex justify-center text-zinc-800 font-mono text-xs leading-none">↓</div>

                  {/* Component 4: Receiver Layer */}
                  <div className="grid grid-cols-2 gap-2 text-center">
                    
                    <div className="p-2 rounded-lg bg-zinc-900/70 border border-zinc-800/80 text-[10px] font-mono leading-snug">
                      <span className="text-amber-500 font-bold">Receiver A</span>
                      <p className="text-[9px] text-zinc-500 mt-0.5">Backup / File Sys</p>
                    </div>

                    <div className="p-2 rounded-lg bg-zinc-900/70 border border-zinc-800/80 text-[10px] font-mono leading-snug">
                      <span className="text-indigo-400 font-bold">Receiver B</span>
                      <p className="text-[9px] text-zinc-500 mt-0.5">DB Registry (uRepo)</p>
                    </div>

                  </div>

                </div>
              </div>

              {/* AUDIT TIMELINE TABLE */}
              <div className="bg-[#121214]/90 rounded-2xl border border-zinc-800/80 p-5 flex flex-col gap-4 shadow-md flex-1 min-h-[180px] max-h-[350px] backdrop-blur-md">
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <History className="h-4.5 w-4.5 text-indigo-400" />
                    <div>
                      <h4 className="font-display font-medium text-sm text-zinc-100">Historical Ledger</h4>
                      <p className="text-[10px] text-zinc-500 font-mono">Auditable execution chronological records</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin flex flex-col gap-2 rounded-xl pr-1">
                  {commandHistory.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-zinc-850 rounded bg-zinc-950/25">
                      <span className="text-[10px] text-zinc-500 italic">No instructions executed yet</span>
                    </div>
                  ) : (
                    [...commandHistory].reverse().map((entry) => (
                      <div 
                        key={entry.id} 
                        className={`p-2.5 rounded-lg border text-xs flex flex-col gap-1 transition-all ${
                          entry.success 
                            ? "bg-zinc-900/40 border-zinc-850 hover:bg-zinc-900/50" 
                            : "bg-rose-950/20 border-rose-900/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                            entry.action === "execute" 
                              ? "bg-indigo-500/10 text-indigo-405" 
                              : entry.action === "undo" 
                              ? "bg-amber-500/10 text-amber-500" 
                              : "bg-indigo-500/10 text-indigo-300"
                          }`}>
                            {entry.action.toUpperCase()}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-500">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <span className="font-semibold text-zinc-200 mt-0.5">{entry.commandName}</span>
                        <p className={`text-[10px] font-mono max-h-16 overflow-y-auto scrollbar-thin ${
                          entry.success ? "text-zinc-400" : "text-rose-455"
                        }`}>
                          {entry.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* LIVE LOGGER ENGINE CONSOLE */}
              <div className="bg-[#121214]/90 rounded-2xl border border-zinc-800/80 p-5 flex flex-col gap-4 shadow-md max-h-[350px] backdrop-blur-md">
                
                <div className="flex items-center justify-between pb-1 border-b border-zinc-850">
                  <div className="flex items-center gap-1.5">
                    <Terminal className="h-4.5 w-4.5 text-indigo-400" />
                    <div>
                      <h4 className="font-display font-medium text-sm text-zinc-100">Virtual Output Console</h4>
                      <p className="text-[10px] text-zinc-500">Streams raw output from VisualCommandLogger in real time</p>
                    </div>
                  </div>

                  <button 
                    onClick={clearTerminalLogs}
                    className="p-1 px-2.5 text-[10px] bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 transition-all rounded font-mono cursor-pointer"
                  >
                    Flush Screen
                  </button>
                </div>

                {/* Simulated Terminal Screen */}
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-850 font-mono text-[10.5px] h-[180px] overflow-y-auto flex flex-col gap-1.5 scrollbar-thin select-all">
                  {logsState.map((log) => (
                    <div key={log.id} className="flex gap-2">
                      <span className="text-zinc-600 shrink-0 select-none">
                        [{new Date(log.timestamp).toLocaleTimeString()}]
                      </span>
                      <span className={`font-bold select-none shrink-0 ${
                        log.level === "ERROR" 
                          ? "text-rose-500" 
                          : log.level === "WARNING" 
                          ? "text-amber-500" 
                          : log.level === "SUCCESS"
                          ? "text-indigo-400"
                          : "text-blue-400"
                      }`}>
                        {log.level}:
                      </span>
                      <span className={
                        log.level === "ERROR" 
                          ? "text-rose-400 font-semibold" 
                          : log.level === "SUCCESS" 
                          ? "text-zinc-300" 
                          : log.level === "WARNING"
                          ? "text-amber-300"
                          : "text-zinc-300"
                      }>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>

              </div>

            </div>
          </>
        ) : (          /* ==============================================================
             BLUEPRINT / SCHEMATIC CODE AND GRAPHICAL UNDERSTANDING DOC
             ============================================================== */
          <div className="xl:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-8 bg-[#121214]/60 p-6 rounded-2xl border border-zinc-800/80 backdrop-blur-md">
            
            {/* Design Explainer (lg:col-span-4) */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              <div className="bg-[#121214] border border-zinc-800/80 p-5 rounded-xl flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-400" />
                  <h3 className="font-display font-semibold text-base text-zinc-100">Pattern Guide & Benefits</h3>
                </div>

                <div className="text-xs text-zinc-300 leading-relaxed space-y-4 font-normal">
                  <p>
                    The <strong>Command Pattern</strong> is a behavioral design helper that converts executable commands into standalone object structures. This provides:
                  </p>

                  <div className="bg-zinc-950/80 p-3.5 rounded-lg border border-zinc-850 space-y-2 font-mono text-[11px] leading-relaxed">
                    <div className="flex gap-2 text-zinc-200">
                      <span className="text-indigo-400">✓</span>
                      <span><strong>Total Decoupling:</strong> The invoker classes trigger commands without knowing their receivers or internals.</span>
                    </div>
                    <div className="flex gap-2 text-zinc-200">
                      <span className="text-indigo-400">✓</span>
                      <span><strong>Macro Batches:</strong> Stack multiple commands logically to make transactions atomic.</span>
                    </div>
                    <div className="flex gap-2 text-zinc-200">
                      <span className="text-indigo-400">✓</span>
                      <span><strong>Cascaded Rollbacks:</strong> If step 5 fails inside a Macro, steps 4, 3, 2, 1 automatically execute unroll commands.</span>
                    </div>
                    <div className="flex gap-2 text-zinc-200">
                      <span className="text-indigo-400">✓</span>
                      <span><strong>History (Undo/Redo):</strong> Re-execute or revert command structures chronologically at will.</span>
                    </div>
                  </div>

                  <p className="leading-relaxed">
                    By storing data parameters (e.g. <code>filePath</code>, <code>originalEmail</code>) inside the class instance itself, the command carries its own local execution state. This allows undo blocks to operate reliably even long after the system registry has mutated elsewhere.
                  </p>
                </div>
              </div>

              {/* SYSTEM DIAGRAM */}
              <div className="bg-[#121214] border border-zinc-800/80 p-5 rounded-xl flex flex-col gap-4">
                <h4 className="font-display font-medium text-sm text-zinc-200 tracking-tight">Pattern Sequence Diagram</h4>
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 text-xs font-mono text-zinc-400 space-y-2.5">
                  <div className="flex justify-between items-center bg-zinc-900/30 p-1.5 rounded border border-zinc-900">
                    <span className="text-zinc-300">Client UI</span>
                    <span className="text-zinc-500">── creates cmd ──&gt;</span>
                    <span className="text-indigo-400 font-semibold">Command Object</span>
                  </div>
                  <div className="flex justify-between items-center bg-zinc-900/30 p-1.5 rounded border border-zinc-900">
                    <span className="text-zinc-300">Command</span>
                    <span className="text-zinc-500">── registers in ──&gt;</span>
                    <span className="text-amber-550 font-semibold">CommandManager</span>
                  </div>
                  <div className="flex justify-between items-center bg-zinc-900/30 p-1.5 rounded border border-zinc-900">
                    <span className="text-zinc-300">CommandManager</span>
                    <span className="text-zinc-500">── triggers .execute() ──&gt;</span>
                    <span className="text-zinc-100 font-bold">ConcreteCommand</span>
                  </div>
                  <div className="flex justify-between items-center bg-zinc-900/30 p-1.5 rounded border border-zinc-900">
                    <span className="text-zinc-300">ConcreteCommand</span>
                    <span className="text-zinc-500">── creates safety backup ──&gt;</span>
                    <span className="text-indigo-305 font-semibold">BackupManager</span>
                  </div>
                  <div className="flex justify-between items-center bg-zinc-900/30 p-1.5 rounded border border-zinc-900">
                    <span className="text-zinc-300">ConcreteCommand</span>
                    <span className="text-zinc-500">── modifies ──&gt;</span>
                    <span className="text-indigo-400 font-semibold">Receiver Systems</span>
                  </div>
                </div>
              </div>

            </div>

            {/* TABBED CODE CODE INSPECTOR (lg:col-span-8) */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-indigo-400" />
                  <h3 className="font-display font-medium text-zinc-100">Pure TypeScript Class Implementations</h3>
                </div>
                <span className="text-xs text-zinc-500 font-mono">Inspect architectural files</span>
              </div>

              {/* Code Selector Tabs */}
              <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
                {Object.entries(CODE_SNIPPETS).map(([key, snippet]) => (
                  <button
                    key={key}
                    onClick={() => setActiveSnippetTab(key)}
                    className={`px-3 py-1.5 text-xs rounded-lg shrink-0 transition-all font-mono border cursor-pointer ${
                      activeSnippetTab === key
                        ? "bg-indigo-950/40 border-indigo-500/50 text-indigo-300"
                        : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-300"
                    }`}
                  >
                    {snippet.title.split(".")[1] || snippet.title}
                  </button>
                ))}
              </div>

              {/* Code Container */}
              <div className="relative bg-zinc-950 rounded-xl border border-zinc-800 p-4 md:p-5 flex flex-col gap-4">
                
                {/* Copy / Feedback Box */}
                <div className="flex justify-between items-center">
                  <div className="text-xs text-zinc-400">
                    <span className="font-semibold text-zinc-200 block">{CODE_SNIPPETS[activeSnippetTab].title}</span>
                    <span className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">{CODE_SNIPPETS[activeSnippetTab].description}</span>
                  </div>

                  <button
                    onClick={() => copyToClipboard(CODE_SNIPPETS[activeSnippetTab].code, activeSnippetTab)}
                    className="p-1.5 text-zinc-450 hover:text-zinc-200 hover:bg-zinc-900 border border-zinc-800 rounded transition-all cursor-pointer flex items-center gap-1.5 text-[11px] font-mono shrink-0 select-none"
                    title="Copy code block to clipboard"
                  >
                    {copyFeedback === activeSnippetTab ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy Code
                      </>
                    )}
                  </button>
                </div>

                {/* Preformatted highlight code panel */}
                <pre className="font-mono text-[11.5px] leading-relaxed text-zinc-300 bg-zinc-900/40 p-4 rounded-lg border border-zinc-850/80 overflow-x-auto overflow-y-auto max-h-[500px] select-all scrollbar-thin">
                  <code>{CODE_SNIPPETS[activeSnippetTab].code}</code>
                </pre>

              </div>

            </div>

          </div>
        )}

      </main>

      {/* FOOTER METRICS DISPLAY */}
      <footer className="border-t border-zinc-850 bg-zinc-950 py-4 px-6 mt-auto text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-500">
        <div>
          Demo Client Session Active | Operator Reference ID: <span className="text-zinc-400 font-semibold">imim2009im@gmail.com</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Simulation Time: <span className="text-zinc-400">2026-06-10T23:37:09Z</span></span>
          <span className="hidden md:inline text-zinc-800">|</span>
          <span>Engine Status: <span className="text-indigo-400 font-semibold flex inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse inline-block" /> ONLINE</span></span>
        </div>
      </footer>

    </div>
  );
}
