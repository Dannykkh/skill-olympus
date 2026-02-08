import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// 타입 정의
// ============================================================================

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
  aiProvider?: AIProvider;  // 태스크 실행에 사용할 AI Provider
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

// ============================================================================
// StateManager 클래스
// ============================================================================

export class StateManager {
  private state: OrchestratorState;
  private stateFilePath: string;
  private workerId: string;

  constructor(projectRoot: string, workerId: string) {
    this.workerId = workerId;
    this.stateFilePath = path.join(projectRoot, '.orchestrator', 'state.json');

    // 상태 디렉토리 생성
    const stateDir = path.dirname(this.stateFilePath);
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }

    // 기존 상태 로드 또는 새로 생성
    if (fs.existsSync(this.stateFilePath)) {
      this.state = this.loadState();
    } else {
      this.state = this.createInitialState(projectRoot);
      this.saveState();
    }

    // 워커 등록
    this.registerWorker();
  }

  // --------------------------------------------------------------------------
  // 상태 파일 관리
  // --------------------------------------------------------------------------

  private loadState(): OrchestratorState {
    const content = fs.readFileSync(this.stateFilePath, 'utf-8');
    return JSON.parse(content) as OrchestratorState;
  }

  private saveState(): void {
    fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2), 'utf-8');
  }

  private createInitialState(projectRoot: string): OrchestratorState {
    return {
      tasks: [],
      fileLocks: [],
      workers: [],
      projectRoot,
      startedAt: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  // 상태 다시 로드 (다른 프로세스가 변경했을 수 있음)
  private reloadState(): void {
    if (fs.existsSync(this.stateFilePath)) {
      this.state = this.loadState();
    }
  }

  // --------------------------------------------------------------------------
  // 워커 관리
  // --------------------------------------------------------------------------

  private registerWorker(): void {
    this.reloadState();

    const existingWorker = this.state.workers.find(w => w.id === this.workerId);
    if (existingWorker) {
      existingWorker.status = 'idle';
      existingWorker.lastHeartbeat = new Date().toISOString();
    } else {
      this.state.workers.push({
        id: this.workerId,
        status: 'idle',
        lastHeartbeat: new Date().toISOString(),
        completedTasks: 0
      });
    }

    this.saveState();
  }

  public updateHeartbeat(): void {
    this.reloadState();

    const worker = this.state.workers.find(w => w.id === this.workerId);
    if (worker) {
      worker.lastHeartbeat = new Date().toISOString();
      this.saveState();
    }
  }

  public getWorkers(): WorkerInfo[] {
    this.reloadState();
    return [...this.state.workers];
  }

  // --------------------------------------------------------------------------
  // 태스크 관리 - PM 전용
  // --------------------------------------------------------------------------

  public createTask(
    id: string,
    prompt: string,
    options: {
      dependsOn?: string[];
      scope?: string[];
      priority?: number;
      aiProvider?: AIProvider;
    } = {}
  ): { success: boolean; message: string; task?: Task } {
    this.reloadState();

    // ID 중복 확인
    if (this.state.tasks.find(t => t.id === id)) {
      return { success: false, message: `Task with id '${id}' already exists` };
    }

    // prompt 최소 길이 검증 (모호한 태스크 방지)
    if (prompt.length < 50) {
      return { success: false, message: `Task prompt too short (${prompt.length} chars, minimum 50). Include: what to do, expected input/output, success criteria.` };
    }

    // scope 누락 경고 (파일 락이 작동하지 않음)
    if (!options.scope || options.scope.length === 0) {
      return { success: false, message: `Task scope is required. Specify files/directories this task will modify (e.g., ["src/api/**", "src/models/User.ts"]). Without scope, file locking cannot prevent conflicts.` };
    }

    // 의존성 태스크 존재 확인
    const dependsOn = options.dependsOn || [];
    for (const depId of dependsOn) {
      if (!this.state.tasks.find(t => t.id === depId)) {
        return { success: false, message: `Dependency task '${depId}' not found` };
      }
    }

    const task: Task = {
      id,
      prompt,
      status: 'pending',
      dependsOn,
      scope: options.scope,
      priority: options.priority ?? 1,
      aiProvider: options.aiProvider,
      createdAt: new Date().toISOString()
    };

    this.state.tasks.push(task);
    this.saveState();

    return { success: true, message: `Task '${id}' created successfully`, task };
  }

  public getProgress(): ProgressInfo {
    this.reloadState();

    const tasks = this.state.tasks;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const failed = tasks.filter(t => t.status === 'failed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const total = tasks.length;

    // 의존성 때문에 블로킹된 태스크
    const blockedTasks = tasks
      .filter(t => t.status === 'pending')
      .filter(t => {
        return t.dependsOn.some(depId => {
          const depTask = tasks.find(dt => dt.id === depId);
          return depTask && depTask.status !== 'completed';
        });
      })
      .map(t => t.id);

    // 현재 진행 중인 태스크
    const activeTasks = tasks
      .filter(t => t.status === 'in_progress')
      .map(t => ({
        id: t.id,
        owner: t.owner || 'unknown',
        startedAt: t.startedAt || ''
      }));

    return {
      total,
      completed,
      failed,
      inProgress,
      pending,
      percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
      blockedTasks,
      activeTasks
    };
  }

  // --------------------------------------------------------------------------
  // 태스크 관리 - Worker 전용
  // --------------------------------------------------------------------------

  public getAvailableTasks(): {
    workerId: string;
    availableTasks: {
      id: string;
      prompt: string;
      priority: number;
      scope?: string[];
      aiProvider?: AIProvider;
      predecessorResults?: { taskId: string; result: string }[];
    }[];
    message: string;
    allTasksCompleted: boolean;
    hasRemainingWork: boolean;
  } {
    this.reloadState();

    const availableTasks = this.state.tasks
      .filter(t => t.status === 'pending')
      .filter(t => {
        // 모든 의존성이 완료되었는지 확인
        return t.dependsOn.every(depId => {
          const depTask = this.state.tasks.find(dt => dt.id === depId);
          return depTask && depTask.status === 'completed';
        });
      })
      .filter(t => {
        // scope가 락된 파일과 충돌하지 않는지 확인
        if (!t.scope || t.scope.length === 0) return true;
        return !t.scope.some(scopePath => this.isPathLocked(scopePath));
      })
      .sort((a, b) => b.priority - a.priority)
      .map(t => {
        // 완료된 선행 태스크의 result 수집 (Worker가 맥락 파악용)
        const predecessorResults = t.dependsOn
          .map(depId => this.state.tasks.find(dt => dt.id === depId))
          .filter((dt): dt is Task => !!dt && dt.status === 'completed' && !!dt.result)
          .map(dt => ({ taskId: dt.id, result: dt.result! }));

        return {
          id: t.id,
          prompt: t.prompt,
          priority: t.priority,
          scope: t.scope,
          aiProvider: t.aiProvider,
          predecessorResults: predecessorResults.length > 0 ? predecessorResults : undefined
        };
      });

    const allTasksCompleted = this.isAllTasksCompleted();
    const hasRemainingWork = this.hasRemainingWork();

    return {
      workerId: this.workerId,
      availableTasks,
      message: allTasksCompleted
        ? 'All tasks completed. Worker can terminate.'
        : availableTasks.length > 0
          ? `${availableTasks.length} task(s) available`
          : 'No tasks available (waiting for dependencies or tasks)',
      allTasksCompleted,
      hasRemainingWork
    };
  }

  public claimTask(taskId: string): { success: boolean; message: string; task?: Task } {
    this.reloadState();

    const task = this.state.tasks.find(t => t.id === taskId);
    if (!task) {
      return { success: false, message: `Task '${taskId}' not found` };
    }

    if (task.status !== 'pending') {
      return { success: false, message: `Task '${taskId}' is not pending (status: ${task.status})` };
    }

    // 의존성 확인
    const unmetDeps = task.dependsOn.filter(depId => {
      const depTask = this.state.tasks.find(dt => dt.id === depId);
      return !depTask || depTask.status !== 'completed';
    });

    if (unmetDeps.length > 0) {
      return {
        success: false,
        message: `Task '${taskId}' has unmet dependencies: ${unmetDeps.join(', ')}`
      };
    }

    // 태스크 담당
    task.status = 'in_progress';
    task.owner = this.workerId;
    task.startedAt = new Date().toISOString();

    // 워커 상태 업데이트
    const worker = this.state.workers.find(w => w.id === this.workerId);
    if (worker) {
      worker.status = 'working';
      worker.currentTask = taskId;
    }

    this.saveState();

    return { success: true, message: `Task '${taskId}' claimed by ${this.workerId}`, task };
  }

  public completeTask(
    taskId: string,
    result?: string
  ): { success: boolean; message: string; unlockedDependents?: string[] } {
    this.reloadState();

    const task = this.state.tasks.find(t => t.id === taskId);
    if (!task) {
      return { success: false, message: `Task '${taskId}' not found` };
    }

    if (task.owner !== this.workerId) {
      return { success: false, message: `Task '${taskId}' is owned by ${task.owner}, not ${this.workerId}` };
    }

    // 태스크 완료
    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    if (result) task.result = result;

    // 워커의 모든 락 해제
    this.state.fileLocks = this.state.fileLocks.filter(lock => lock.owner !== this.workerId);

    // 워커 상태 업데이트
    const worker = this.state.workers.find(w => w.id === this.workerId);
    if (worker) {
      worker.status = 'idle';
      worker.currentTask = undefined;
      worker.completedTasks++;
    }

    // 의존성이 해소된 태스크 찾기
    const unlockedDependents = this.state.tasks
      .filter(t => t.status === 'pending' && t.dependsOn.includes(taskId))
      .filter(t => {
        return t.dependsOn.every(depId => {
          const depTask = this.state.tasks.find(dt => dt.id === depId);
          return depTask && depTask.status === 'completed';
        });
      })
      .map(t => t.id);

    this.saveState();

    return {
      success: true,
      message: `Task '${taskId}' completed`,
      unlockedDependents: unlockedDependents.length > 0 ? unlockedDependents : undefined
    };
  }

  public failTask(taskId: string, error: string): { success: boolean; message: string } {
    this.reloadState();

    const task = this.state.tasks.find(t => t.id === taskId);
    if (!task) {
      return { success: false, message: `Task '${taskId}' not found` };
    }

    if (task.owner !== this.workerId) {
      return { success: false, message: `Task '${taskId}' is owned by ${task.owner}, not ${this.workerId}` };
    }

    task.status = 'failed';
    task.completedAt = new Date().toISOString();
    task.error = error;

    // 워커의 모든 락 해제
    this.state.fileLocks = this.state.fileLocks.filter(lock => lock.owner !== this.workerId);

    // 워커 상태 업데이트
    const worker = this.state.workers.find(w => w.id === this.workerId);
    if (worker) {
      worker.status = 'idle';
      worker.currentTask = undefined;
    }

    this.saveState();

    return { success: true, message: `Task '${taskId}' marked as failed` };
  }

  // --------------------------------------------------------------------------
  // 파일 락 관리
  // --------------------------------------------------------------------------

  private isPathLocked(targetPath: string): boolean {
    const normalizedTarget = this.normalizePath(targetPath);

    return this.state.fileLocks.some(lock => {
      const normalizedLock = this.normalizePath(lock.path);
      // 경로가 같거나, 상위/하위 관계인지 확인
      return normalizedTarget === normalizedLock ||
             normalizedTarget.startsWith(normalizedLock + '/') ||
             normalizedLock.startsWith(normalizedTarget + '/');
    });
  }

  private normalizePath(p: string): string {
    return p.replace(/\\/g, '/').replace(/\/+$/, '');
  }

  public lockFile(filePath: string, reason?: string): { success: boolean; message: string } {
    this.reloadState();

    const normalizedPath = this.normalizePath(filePath);

    // 기존 락 확인
    const existingLock = this.state.fileLocks.find(lock => {
      const normalizedLock = this.normalizePath(lock.path);
      return normalizedPath === normalizedLock ||
             normalizedPath.startsWith(normalizedLock + '/') ||
             normalizedLock.startsWith(normalizedPath + '/');
    });

    if (existingLock) {
      if (existingLock.owner === this.workerId) {
        return { success: true, message: `Path '${filePath}' is already locked by you` };
      }
      return {
        success: false,
        message: `Path '${filePath}' is locked by ${existingLock.owner} (locked: ${existingLock.path})`
      };
    }

    // 새 락 생성
    this.state.fileLocks.push({
      path: filePath,
      owner: this.workerId,
      lockedAt: new Date().toISOString(),
      reason
    });

    this.saveState();

    return { success: true, message: `Path '${filePath}' locked successfully` };
  }

  public unlockFile(filePath: string): { success: boolean; message: string } {
    this.reloadState();

    const normalizedPath = this.normalizePath(filePath);
    const lockIndex = this.state.fileLocks.findIndex(lock => {
      return this.normalizePath(lock.path) === normalizedPath && lock.owner === this.workerId;
    });

    if (lockIndex === -1) {
      return { success: false, message: `No lock found for '${filePath}' owned by you` };
    }

    this.state.fileLocks.splice(lockIndex, 1);
    this.saveState();

    return { success: true, message: `Path '${filePath}' unlocked successfully` };
  }

  public getFileLocks(): FileLock[] {
    this.reloadState();
    return [...this.state.fileLocks];
  }

  // --------------------------------------------------------------------------
  // 공통 조회
  // --------------------------------------------------------------------------

  public getTask(taskId: string): Task | undefined {
    this.reloadState();
    return this.state.tasks.find(t => t.id === taskId);
  }

  public getAllTasks(): Task[] {
    this.reloadState();
    return [...this.state.tasks];
  }

  public getStatus(): OrchestratorState {
    this.reloadState();
    return { ...this.state };
  }

  public getProjectRoot(): string {
    return this.state.projectRoot;
  }

  // --------------------------------------------------------------------------
  // 관리 기능
  // --------------------------------------------------------------------------

  public resetState(): void {
    this.state = this.createInitialState(this.state.projectRoot);
    this.registerWorker();
    this.saveState();
  }

  public deleteTask(taskId: string): { success: boolean; message: string } {
    this.reloadState();

    const taskIndex = this.state.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      return { success: false, message: `Task '${taskId}' not found` };
    }

    // 이 태스크에 의존하는 다른 태스크가 있는지 확인
    const dependentTasks = this.state.tasks.filter(t => t.dependsOn.includes(taskId));
    if (dependentTasks.length > 0) {
      return {
        success: false,
        message: `Cannot delete task '${taskId}': other tasks depend on it (${dependentTasks.map(t => t.id).join(', ')})`
      };
    }

    this.state.tasks.splice(taskIndex, 1);
    this.saveState();

    return { success: true, message: `Task '${taskId}' deleted successfully` };
  }

  // --------------------------------------------------------------------------
  // 완료 상태 확인
  // --------------------------------------------------------------------------

  /**
   * 모든 태스크가 완료되었는지 확인
   * - 태스크가 없으면 false (아직 시작 안 함)
   * - 모든 태스크가 completed 또는 failed면 true
   */
  public isAllTasksCompleted(): boolean {
    this.reloadState();

    const tasks = this.state.tasks;
    if (tasks.length === 0) {
      return false; // 태스크가 없으면 완료 아님 (시작 안 함)
    }

    return tasks.every(t => t.status === 'completed' || t.status === 'failed');
  }

  /**
   * 작업 가능한 태스크가 남아있는지 확인
   * - pending 또는 in_progress인 태스크가 있으면 true
   */
  public hasRemainingWork(): boolean {
    this.reloadState();

    const tasks = this.state.tasks;
    return tasks.some(t => t.status === 'pending' || t.status === 'in_progress');
  }
}
