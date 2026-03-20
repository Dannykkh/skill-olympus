export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type WorkerStatus = 'idle' | 'working' | 'offline';
export type AIProvider = 'claude' | 'codex' | 'gemini';
export interface Task {
    id: string;
    prompt: string;
    status: TaskStatus;
    owner?: string;
    dependsOn: string[];
    scope?: string[];
    priority: number;
    aiProvider?: AIProvider;
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    result?: string;
    error?: string;
}
export interface FileLock {
    path: string;
    owner: string;
    lockedAt: string;
    reason?: string;
}
export interface WorkerInfo {
    id: string;
    status: WorkerStatus;
    currentTask?: string;
    lastHeartbeat: string;
    completedTasks: number;
}
export interface OrchestratorState {
    tasks: Task[];
    fileLocks: FileLock[];
    workers: WorkerInfo[];
    projectRoot: string;
    startedAt: string;
    version: string;
}
export interface ProgressInfo {
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
    pending: number;
    percentComplete: number;
    blockedTasks: string[];
    activeTasks: {
        id: string;
        owner: string;
        startedAt: string;
    }[];
}
export type ActivityType = 'progress' | 'decision' | 'error' | 'milestone' | 'file_change';
export interface ActivityEntry {
    timestamp: string;
    workerId: string;
    taskId?: string;
    type: ActivityType;
    message: string;
    files?: string[];
    tags?: string[];
}
export interface ActivityQuery {
    taskId?: string;
    workerId?: string;
    type?: ActivityType;
    since?: string;
    limit?: number;
}
export interface TaskActivitySummary {
    taskId: string;
    totalEntries: number;
    milestones: string[];
    errors: string[];
    lastActivity?: ActivityEntry;
}
export declare class StateManager {
    private db;
    private dbPath;
    private workerId;
    private projectRoot;
    private startedAt;
    constructor(projectRoot: string, workerId: string);
    private initTables;
    private initMetadata;
    private migrateFromJson;
    private rowToTask;
    private normalizePath;
    private isPathOverlap;
    private registerWorker;
    updateHeartbeat(): void;
    getWorkers(): WorkerInfo[];
    createTask(id: string, prompt: string, options?: {
        dependsOn?: string[];
        scope?: string[];
        priority?: number;
        aiProvider?: AIProvider;
    }): {
        success: boolean;
        message: string;
        task?: Task;
    };
    getProgress(): ProgressInfo;
    getAvailableTasks(): {
        workerId: string;
        availableTasks: {
            id: string;
            prompt: string;
            priority: number;
            scope?: string[];
            aiProvider?: AIProvider;
            predecessorResults?: {
                taskId: string;
                result: string;
            }[];
        }[];
        message: string;
        allTasksCompleted: boolean;
        hasRemainingWork: boolean;
    };
    claimTask(taskId: string): {
        success: boolean;
        message: string;
        task?: Task;
    };
    completeTask(taskId: string, result?: string): {
        success: boolean;
        message: string;
        unlockedDependents?: string[];
    };
    failTask(taskId: string, error: string): {
        success: boolean;
        message: string;
    };
    lockFile(filePath: string, reason?: string): {
        success: boolean;
        message: string;
    };
    unlockFile(filePath: string): {
        success: boolean;
        message: string;
    };
    getFileLocks(): FileLock[];
    getTask(taskId: string): Task | undefined;
    getAllTasks(): Task[];
    getStatus(): OrchestratorState;
    getProjectRoot(): string;
    logActivity(type: ActivityType, message: string, options?: {
        taskId?: string;
        files?: string[];
        tags?: string[];
    }): {
        success: boolean;
        message: string;
    };
    getActivityLog(query?: ActivityQuery): {
        entries: ActivityEntry[];
        total: number;
    };
    getTaskActivitySummary(taskId: string): TaskActivitySummary;
    resetState(): void;
    deleteTask(taskId: string): {
        success: boolean;
        message: string;
    };
    isAllTasksCompleted(): boolean;
    hasRemainingWork(): boolean;
}
//# sourceMappingURL=state-manager.d.ts.map