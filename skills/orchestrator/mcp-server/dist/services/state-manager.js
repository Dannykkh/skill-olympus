import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
// ============================================================================
// StateManager 클래스 — SQLite WAL 기반
// ============================================================================
export class StateManager {
    db;
    dbPath;
    workerId;
    projectRoot;
    startedAt;
    constructor(projectRoot, workerId) {
        this.workerId = workerId;
        this.projectRoot = projectRoot;
        this.startedAt = new Date().toISOString();
        // DB 디렉토리 생성
        const stateDir = path.join(projectRoot, '.orchestrator');
        if (!fs.existsSync(stateDir)) {
            fs.mkdirSync(stateDir, { recursive: true });
        }
        this.dbPath = path.join(stateDir, 'orchestrator.db');
        // SQLite 연결 + WAL 모드
        this.db = new Database(this.dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('busy_timeout = 5000'); // 동시접근 시 5초 대기
        this.db.pragma('synchronous = NORMAL'); // WAL에서 성능/안전 균형
        // 테이블 생성
        this.initTables();
        // 기존 state.json 마이그레이션
        this.migrateFromJson(stateDir);
        // 메타데이터 초기화
        this.initMetadata();
        // 워커 등록
        this.registerWorker();
    }
    // --------------------------------------------------------------------------
    // 초기화
    // --------------------------------------------------------------------------
    initTables() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        prompt TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        owner TEXT,
        depends_on TEXT NOT NULL DEFAULT '[]',
        scope TEXT DEFAULT '[]',
        priority INTEGER NOT NULL DEFAULT 1,
        ai_provider TEXT,
        created_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT,
        result TEXT,
        error TEXT
      );

      CREATE TABLE IF NOT EXISTS file_locks (
        path TEXT NOT NULL,
        owner TEXT NOT NULL,
        locked_at TEXT NOT NULL,
        reason TEXT,
        PRIMARY KEY (path, owner)
      );

      CREATE TABLE IF NOT EXISTS workers (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'idle',
        current_task TEXT,
        last_heartbeat TEXT NOT NULL,
        completed_tasks INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS activity_log (
        rowid INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        worker_id TEXT NOT NULL,
        task_id TEXT,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        files TEXT,
        tags TEXT
      );

      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner);
      CREATE INDEX IF NOT EXISTS idx_file_locks_owner ON file_locks(owner);
      CREATE INDEX IF NOT EXISTS idx_activity_log_task ON activity_log(task_id);
      CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(type);
      CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON activity_log(timestamp);
    `);
    }
    initMetadata() {
        const upsert = this.db.prepare('INSERT OR IGNORE INTO metadata (key, value) VALUES (?, ?)');
        upsert.run('projectRoot', this.projectRoot);
        upsert.run('startedAt', this.startedAt);
        upsert.run('version', '2.0.0');
    }
    migrateFromJson(stateDir) {
        const jsonPath = path.join(stateDir, 'state.json');
        if (!fs.existsSync(jsonPath))
            return;
        // 이미 마이그레이션 완료 여부 확인
        const taskCount = this.db.prepare('SELECT COUNT(*) as cnt FROM tasks').get();
        if (taskCount.cnt > 0)
            return; // 이미 데이터 있으면 건너뜀
        try {
            const content = fs.readFileSync(jsonPath, 'utf-8');
            const state = JSON.parse(content);
            const insertTask = this.db.prepare(`
        INSERT OR IGNORE INTO tasks (id, prompt, status, owner, depends_on, scope, priority, ai_provider, created_at, started_at, completed_at, result, error)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            const insertLock = this.db.prepare(`
        INSERT OR IGNORE INTO file_locks (path, owner, locked_at, reason) VALUES (?, ?, ?, ?)
      `);
            const insertWorker = this.db.prepare(`
        INSERT OR IGNORE INTO workers (id, status, current_task, last_heartbeat, completed_tasks) VALUES (?, ?, ?, ?, ?)
      `);
            const migrate = this.db.transaction(() => {
                for (const t of state.tasks || []) {
                    insertTask.run(t.id, t.prompt, t.status, t.owner || null, JSON.stringify(t.dependsOn || []), JSON.stringify(t.scope || []), t.priority || 1, t.aiProvider || null, t.createdAt, t.startedAt || null, t.completedAt || null, t.result || null, t.error || null);
                }
                for (const l of state.fileLocks || []) {
                    insertLock.run(l.path, l.owner, l.lockedAt, l.reason || null);
                }
                for (const w of state.workers || []) {
                    insertWorker.run(w.id, w.status, w.currentTask || null, w.lastHeartbeat, w.completedTasks);
                }
            });
            migrate();
            // 마이그레이션 완료 후 기존 파일 백업
            fs.renameSync(jsonPath, jsonPath + '.migrated');
            // activity-log.jsonl도 마이그레이션
            const logPath = path.join(stateDir, 'activity-log.jsonl');
            if (fs.existsSync(logPath)) {
                const insertLog = this.db.prepare(`
          INSERT INTO activity_log (timestamp, worker_id, task_id, type, message, files, tags) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
                const migrateLog = this.db.transaction(() => {
                    const lines = fs.readFileSync(logPath, 'utf-8').split('\n').filter(l => l.trim());
                    for (const line of lines) {
                        try {
                            const entry = JSON.parse(line);
                            insertLog.run(entry.timestamp, entry.workerId, entry.taskId || null, entry.type, entry.message, entry.files ? JSON.stringify(entry.files) : null, entry.tags ? JSON.stringify(entry.tags) : null);
                        }
                        catch { /* 파싱 실패 무시 */ }
                    }
                });
                migrateLog();
                fs.renameSync(logPath, logPath + '.migrated');
            }
        }
        catch {
            // 마이그레이션 실패해도 새로 시작 가능
        }
    }
    // --------------------------------------------------------------------------
    // 헬퍼
    // --------------------------------------------------------------------------
    rowToTask(row) {
        return {
            id: row.id,
            prompt: row.prompt,
            status: row.status,
            owner: row.owner || undefined,
            dependsOn: JSON.parse(row.depends_on || '[]'),
            scope: JSON.parse(row.scope || '[]'),
            priority: row.priority,
            aiProvider: row.ai_provider || undefined,
            createdAt: row.created_at,
            startedAt: row.started_at || undefined,
            completedAt: row.completed_at || undefined,
            result: row.result || undefined,
            error: row.error || undefined,
        };
    }
    normalizePath(p) {
        return p.replace(/\\/g, '/').replace(/\/+$/, '');
    }
    isPathOverlap(pathA, pathB) {
        const a = this.normalizePath(pathA);
        const b = this.normalizePath(pathB);
        return a === b || a.startsWith(b + '/') || b.startsWith(a + '/');
    }
    // --------------------------------------------------------------------------
    // 워커 관리
    // --------------------------------------------------------------------------
    registerWorker() {
        this.db.prepare(`
      INSERT INTO workers (id, status, last_heartbeat, completed_tasks)
      VALUES (?, 'idle', ?, 0)
      ON CONFLICT(id) DO UPDATE SET status = 'idle', last_heartbeat = ?
    `).run(this.workerId, new Date().toISOString(), new Date().toISOString());
    }
    updateHeartbeat() {
        this.db.prepare('UPDATE workers SET last_heartbeat = ? WHERE id = ?')
            .run(new Date().toISOString(), this.workerId);
    }
    getWorkers() {
        const rows = this.db.prepare('SELECT * FROM workers').all();
        return rows.map(r => ({
            id: r.id,
            status: r.status,
            currentTask: r.current_task || undefined,
            lastHeartbeat: r.last_heartbeat,
            completedTasks: r.completed_tasks,
        }));
    }
    // --------------------------------------------------------------------------
    // 태스크 관리 - PM 전용
    // --------------------------------------------------------------------------
    createTask(id, prompt, options = {}) {
        const existing = this.db.prepare('SELECT id FROM tasks WHERE id = ?').get(id);
        if (existing) {
            return { success: false, message: `Task with id '${id}' already exists` };
        }
        if (prompt.length < 50) {
            return { success: false, message: `Task prompt too short (${prompt.length} chars, minimum 50). Include: what to do, expected input/output, success criteria.` };
        }
        if (!options.scope || options.scope.length === 0) {
            return { success: false, message: `Task scope is required. Specify files/directories this task will modify (e.g., ["src/api/**", "src/models/User.ts"]). Without scope, file locking cannot prevent conflicts.` };
        }
        const dependsOn = options.dependsOn || [];
        for (const depId of dependsOn) {
            const dep = this.db.prepare('SELECT id FROM tasks WHERE id = ?').get(depId);
            if (!dep) {
                return { success: false, message: `Dependency task '${depId}' not found` };
            }
        }
        const now = new Date().toISOString();
        this.db.prepare(`
      INSERT INTO tasks (id, prompt, status, depends_on, scope, priority, ai_provider, created_at)
      VALUES (?, ?, 'pending', ?, ?, ?, ?, ?)
    `).run(id, prompt, JSON.stringify(dependsOn), JSON.stringify(options.scope), options.priority ?? 1, options.aiProvider || null, now);
        const task = {
            id, prompt, status: 'pending', dependsOn,
            scope: options.scope, priority: options.priority ?? 1,
            aiProvider: options.aiProvider, createdAt: now,
        };
        return { success: true, message: `Task '${id}' created successfully`, task };
    }
    getProgress() {
        const rows = this.db.prepare('SELECT id, status, owner, started_at, depends_on FROM tasks').all();
        const tasks = rows.map(r => ({
            id: r.id,
            status: r.status,
            owner: r.owner || 'unknown',
            startedAt: r.started_at || '',
            dependsOn: JSON.parse(r.depends_on || '[]'),
        }));
        const completed = tasks.filter(t => t.status === 'completed').length;
        const failed = tasks.filter(t => t.status === 'failed').length;
        const inProgress = tasks.filter(t => t.status === 'in_progress').length;
        const pending = tasks.filter(t => t.status === 'pending').length;
        const total = tasks.length;
        const completedIds = new Set(tasks.filter(t => t.status === 'completed').map(t => t.id));
        const blockedTasks = tasks
            .filter(t => t.status === 'pending')
            .filter(t => t.dependsOn.some(depId => !completedIds.has(depId)))
            .map(t => t.id);
        const activeTasks = tasks
            .filter(t => t.status === 'in_progress')
            .map(t => ({ id: t.id, owner: t.owner, startedAt: t.startedAt }));
        return {
            total, completed, failed, inProgress, pending,
            percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
            blockedTasks, activeTasks,
        };
    }
    // --------------------------------------------------------------------------
    // 태스크 관리 - Worker 전용
    // --------------------------------------------------------------------------
    getAvailableTasks() {
        const allTasks = this.db.prepare('SELECT * FROM tasks').all();
        const tasks = allTasks.map(r => this.rowToTask(r));
        const locks = this.getFileLocks();
        const completedIds = new Set(tasks.filter(t => t.status === 'completed').map(t => t.id));
        const availableTasks = tasks
            .filter(t => t.status === 'pending')
            .filter(t => t.dependsOn.every(depId => completedIds.has(depId)))
            .filter(t => {
            if (!t.scope || t.scope.length === 0)
                return true;
            return !t.scope.some(sp => locks.some(l => this.isPathOverlap(sp, l.path)));
        })
            .sort((a, b) => b.priority - a.priority)
            .map(t => {
            const predecessorResults = t.dependsOn
                .map(depId => tasks.find(dt => dt.id === depId))
                .filter((dt) => !!dt && dt.status === 'completed' && !!dt.result)
                .map(dt => ({ taskId: dt.id, result: dt.result }));
            return {
                id: t.id, prompt: t.prompt, priority: t.priority,
                scope: t.scope, aiProvider: t.aiProvider,
                predecessorResults: predecessorResults.length > 0 ? predecessorResults : undefined,
            };
        });
        const allTasksCompleted = this.isAllTasksCompleted();
        const hasRemainingWork = this.hasRemainingWork();
        return {
            workerId: this.workerId, availableTasks,
            message: allTasksCompleted
                ? 'All tasks completed. Worker can terminate.'
                : availableTasks.length > 0
                    ? `${availableTasks.length} task(s) available`
                    : 'No tasks available (waiting for dependencies or tasks)',
            allTasksCompleted, hasRemainingWork,
        };
    }
    claimTask(taskId) {
        const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
        if (!row)
            return { success: false, message: `Task '${taskId}' not found` };
        const task = this.rowToTask(row);
        if (task.status !== 'pending') {
            return { success: false, message: `Task '${taskId}' is not pending (status: ${task.status})` };
        }
        const completedIds = new Set(this.db.prepare("SELECT id FROM tasks WHERE status = 'completed'").all().map(r => r.id));
        const unmetDeps = task.dependsOn.filter(depId => !completedIds.has(depId));
        if (unmetDeps.length > 0) {
            return { success: false, message: `Task '${taskId}' has unmet dependencies: ${unmetDeps.join(', ')}` };
        }
        const now = new Date().toISOString();
        const claim = this.db.transaction(() => {
            this.db.prepare('UPDATE tasks SET status = ?, owner = ?, started_at = ? WHERE id = ?')
                .run('in_progress', this.workerId, now, taskId);
            this.db.prepare('UPDATE workers SET status = ?, current_task = ? WHERE id = ?')
                .run('working', taskId, this.workerId);
        });
        claim();
        this.logActivity('milestone', `태스크 시작: ${task.prompt.slice(0, 80)}`, { taskId });
        task.status = 'in_progress';
        task.owner = this.workerId;
        task.startedAt = now;
        return { success: true, message: `Task '${taskId}' claimed by ${this.workerId}`, task };
    }
    completeTask(taskId, result) {
        const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
        if (!row)
            return { success: false, message: `Task '${taskId}' not found` };
        const task = this.rowToTask(row);
        if (task.owner !== this.workerId) {
            return { success: false, message: `Task '${taskId}' is owned by ${task.owner}, not ${this.workerId}` };
        }
        const now = new Date().toISOString();
        const complete = this.db.transaction(() => {
            this.db.prepare('UPDATE tasks SET status = ?, completed_at = ?, result = ? WHERE id = ?')
                .run('completed', now, result || null, taskId);
            this.db.prepare('DELETE FROM file_locks WHERE owner = ?').run(this.workerId);
            this.db.prepare('UPDATE workers SET status = ?, current_task = NULL, completed_tasks = completed_tasks + 1 WHERE id = ?')
                .run('idle', this.workerId);
        });
        complete();
        // 의존성 해소된 태스크 찾기
        const allTasks = this.db.prepare('SELECT id, status, depends_on FROM tasks').all();
        const completedIds = new Set(allTasks.filter(t => t.status === 'completed').map(t => t.id));
        completedIds.add(taskId);
        const unlockedDependents = allTasks
            .filter(t => t.status === 'pending')
            .filter(t => {
            const deps = JSON.parse(t.depends_on || '[]');
            return deps.includes(taskId) && deps.every(d => completedIds.has(d));
        })
            .map(t => t.id);
        this.logActivity('milestone', `태스크 완료: ${(result || '').slice(0, 100)}`, { taskId });
        return {
            success: true,
            message: `Task '${taskId}' completed`,
            unlockedDependents: unlockedDependents.length > 0 ? unlockedDependents : undefined,
        };
    }
    failTask(taskId, error) {
        const row = this.db.prepare('SELECT owner FROM tasks WHERE id = ?').get(taskId);
        if (!row)
            return { success: false, message: `Task '${taskId}' not found` };
        if (row.owner !== this.workerId) {
            return { success: false, message: `Task '${taskId}' is owned by ${row.owner}, not ${this.workerId}` };
        }
        const now = new Date().toISOString();
        const fail = this.db.transaction(() => {
            this.db.prepare('UPDATE tasks SET status = ?, completed_at = ?, error = ? WHERE id = ?')
                .run('failed', now, error, taskId);
            this.db.prepare('DELETE FROM file_locks WHERE owner = ?').run(this.workerId);
            this.db.prepare('UPDATE workers SET status = ?, current_task = NULL WHERE id = ?')
                .run('idle', this.workerId);
        });
        fail();
        this.logActivity('error', `태스크 실패: ${error.slice(0, 100)}`, { taskId });
        return { success: true, message: `Task '${taskId}' marked as failed` };
    }
    // --------------------------------------------------------------------------
    // 파일 락 관리
    // --------------------------------------------------------------------------
    lockFile(filePath, reason) {
        const locks = this.getFileLocks();
        const existingLock = locks.find(l => this.isPathOverlap(filePath, l.path));
        if (existingLock) {
            if (existingLock.owner === this.workerId) {
                return { success: true, message: `Path '${filePath}' is already locked by you` };
            }
            return {
                success: false,
                message: `Path '${filePath}' is locked by ${existingLock.owner} (locked: ${existingLock.path})`,
            };
        }
        this.db.prepare('INSERT INTO file_locks (path, owner, locked_at, reason) VALUES (?, ?, ?, ?)')
            .run(filePath, this.workerId, new Date().toISOString(), reason || null);
        return { success: true, message: `Path '${filePath}' locked successfully` };
    }
    unlockFile(filePath) {
        const normalizedPath = this.normalizePath(filePath);
        const result = this.db.prepare('DELETE FROM file_locks WHERE owner = ? AND path = ?')
            .run(this.workerId, filePath);
        if (result.changes === 0) {
            // 정규화된 경로로 재시도
            const locks = this.getFileLocks();
            const match = locks.find(l => this.normalizePath(l.path) === normalizedPath && l.owner === this.workerId);
            if (match) {
                this.db.prepare('DELETE FROM file_locks WHERE owner = ? AND path = ?').run(this.workerId, match.path);
                return { success: true, message: `Path '${filePath}' unlocked successfully` };
            }
            return { success: false, message: `No lock found for '${filePath}' owned by you` };
        }
        return { success: true, message: `Path '${filePath}' unlocked successfully` };
    }
    getFileLocks() {
        const rows = this.db.prepare('SELECT * FROM file_locks').all();
        return rows.map(r => ({
            path: r.path,
            owner: r.owner,
            lockedAt: r.locked_at,
            reason: r.reason || undefined,
        }));
    }
    // --------------------------------------------------------------------------
    // 공통 조회
    // --------------------------------------------------------------------------
    getTask(taskId) {
        const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
        return row ? this.rowToTask(row) : undefined;
    }
    getAllTasks() {
        const rows = this.db.prepare('SELECT * FROM tasks').all();
        return rows.map(r => this.rowToTask(r));
    }
    getStatus() {
        return {
            tasks: this.getAllTasks(),
            fileLocks: this.getFileLocks(),
            workers: this.getWorkers(),
            projectRoot: this.projectRoot,
            startedAt: this.startedAt,
            version: '2.0.0',
        };
    }
    getProjectRoot() {
        return this.projectRoot;
    }
    // --------------------------------------------------------------------------
    // Activity Log
    // --------------------------------------------------------------------------
    logActivity(type, message, options = {}) {
        try {
            this.db.prepare(`
        INSERT INTO activity_log (timestamp, worker_id, task_id, type, message, files, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(new Date().toISOString(), this.workerId, options.taskId || null, type, message, options.files ? JSON.stringify(options.files) : null, options.tags ? JSON.stringify(options.tags) : null);
            return { success: true, message: 'Activity logged' };
        }
        catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            return { success: false, message: `Failed to log activity: ${errMsg}` };
        }
    }
    getActivityLog(query = {}) {
        let sql = 'SELECT * FROM activity_log WHERE 1=1';
        const params = [];
        if (query.taskId) {
            sql += ' AND task_id = ?';
            params.push(query.taskId);
        }
        if (query.workerId) {
            sql += ' AND worker_id = ?';
            params.push(query.workerId);
        }
        if (query.type) {
            sql += ' AND type = ?';
            params.push(query.type);
        }
        if (query.since) {
            sql += ' AND timestamp >= ?';
            params.push(query.since);
        }
        sql += ' ORDER BY rowid ASC';
        const totalRow = this.db.prepare('SELECT COUNT(*) as cnt FROM activity_log').get();
        if (query.limit && query.limit > 0) {
            // 최신 N건 → 전체에서 오프셋 계산
            const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as cnt');
            const filtered = this.db.prepare(countSql).get(...params);
            const offset = Math.max(0, filtered.cnt - query.limit);
            sql += ' LIMIT ? OFFSET ?';
            params.push(query.limit, offset);
        }
        const rows = this.db.prepare(sql).all(...params);
        const entries = rows.map(r => ({
            timestamp: r.timestamp,
            workerId: r.worker_id,
            taskId: r.task_id || undefined,
            type: r.type,
            message: r.message,
            files: r.files ? JSON.parse(r.files) : undefined,
            tags: r.tags ? JSON.parse(r.tags) : undefined,
        }));
        return { entries, total: totalRow.cnt };
    }
    getTaskActivitySummary(taskId) {
        const { entries } = this.getActivityLog({ taskId });
        return {
            taskId,
            totalEntries: entries.length,
            milestones: entries.filter(e => e.type === 'milestone').map(e => e.message),
            errors: entries.filter(e => e.type === 'error').map(e => e.message),
            lastActivity: entries.length > 0 ? entries[entries.length - 1] : undefined,
        };
    }
    // --------------------------------------------------------------------------
    // 관리 기능
    // --------------------------------------------------------------------------
    resetState() {
        const reset = this.db.transaction(() => {
            this.db.exec('DELETE FROM tasks');
            this.db.exec('DELETE FROM file_locks');
            this.db.exec('DELETE FROM workers');
            this.db.exec('DELETE FROM activity_log');
            this.db.exec("DELETE FROM metadata WHERE key != 'projectRoot'");
        });
        reset();
        this.registerWorker();
    }
    deleteTask(taskId) {
        // 의존성 확인
        const allTasks = this.db.prepare('SELECT id, depends_on FROM tasks').all();
        const dependents = allTasks.filter(t => {
            const deps = JSON.parse(t.depends_on || '[]');
            return deps.includes(taskId);
        });
        if (dependents.length > 0) {
            return {
                success: false,
                message: `Cannot delete task '${taskId}': other tasks depend on it (${dependents.map(t => t.id).join(', ')})`,
            };
        }
        const result = this.db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
        if (result.changes === 0) {
            return { success: false, message: `Task '${taskId}' not found` };
        }
        return { success: true, message: `Task '${taskId}' deleted successfully` };
    }
    // --------------------------------------------------------------------------
    // 완료 상태 확인
    // --------------------------------------------------------------------------
    isAllTasksCompleted() {
        const total = this.db.prepare('SELECT COUNT(*) as cnt FROM tasks').get();
        if (total.cnt === 0)
            return false;
        const remaining = this.db.prepare("SELECT COUNT(*) as cnt FROM tasks WHERE status NOT IN ('completed', 'failed')").get();
        return remaining.cnt === 0;
    }
    hasRemainingWork() {
        const row = this.db.prepare("SELECT COUNT(*) as cnt FROM tasks WHERE status IN ('pending', 'in_progress')").get();
        return row.cnt > 0;
    }
}
//# sourceMappingURL=state-manager.js.map