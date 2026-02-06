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
export declare class StateManager {
    private state;
    private stateFilePath;
    private workerId;
    constructor(projectRoot: string, workerId: string);
    private loadState;
    private saveState;
    private createInitialState;
    private reloadState;
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
    private isPathLocked;
    private normalizePath;
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
    resetState(): void;
    deleteTask(taskId: string): {
        success: boolean;
        message: string;
    };
    /**
     * 모든 태스크가 완료되었는지 확인
     * - 태스크가 없으면 false (아직 시작 안 함)
     * - 모든 태스크가 completed 또는 failed면 true
     */
    isAllTasksCompleted(): boolean;
    /**
     * 작업 가능한 태스크가 남아있는지 확인
     * - pending 또는 in_progress인 태스크가 있으면 true
     */
    hasRemainingWork(): boolean;
}
//# sourceMappingURL=state-manager.d.ts.map