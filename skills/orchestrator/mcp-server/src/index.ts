#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { spawn, execSync } from 'child_process';
import { StateManager } from './services/state-manager.js';
import {
  detectAIProviders,
  getAvailableProviders,
  getProviderCommand,
  getProviderStrengths,
  type AIProvider
} from './services/ai-detector.js';

// ============================================================================
// 환경 변수 및 초기화
// ============================================================================

const PROJECT_ROOT = process.env.ORCHESTRATOR_PROJECT_ROOT || process.cwd();
const WORKER_ID = process.env.ORCHESTRATOR_WORKER_ID || 'default';

const stateManager = new StateManager(PROJECT_ROOT, WORKER_ID);

// ============================================================================
// 도구 스키마 정의
// ============================================================================

// PM 도구 스키마
const AnalyzeCodebaseSchema = z.object({
  path: z.string().optional().describe('분석할 하위 경로 (기본: 프로젝트 루트)'),
  pattern: z.string().optional().describe('필터 패턴 (예: "**/*.java")')
});

const CreateTaskSchema = z.object({
  id: z.string().describe('태스크 고유 ID'),
  prompt: z.string().describe('상세 작업 지시문'),
  depends_on: z.array(z.string()).optional().describe('선행 태스크 ID 목록'),
  scope: z.array(z.string()).optional().describe('수정 가능 파일 범위'),
  priority: z.number().optional().describe('우선순위 (높을수록 먼저, 기본: 1)'),
  ai_provider: z.enum(['claude', 'codex', 'gemini']).optional().describe('실행할 AI Provider (auto-detect 기반 fallback)')
});

// Worker 도구 스키마
const ClaimTaskSchema = z.object({
  task_id: z.string().describe('담당할 태스크 ID')
});

const LockFileSchema = z.object({
  path: z.string().describe('락할 파일 또는 폴더 경로'),
  reason: z.string().optional().describe('락 사유')
});

const UnlockFileSchema = z.object({
  path: z.string().describe('언락할 파일 또는 폴더 경로')
});

const CompleteTaskSchema = z.object({
  task_id: z.string().describe('완료할 태스크 ID'),
  result: z.string().optional().describe('완료 결과 요약')
});

const FailTaskSchema = z.object({
  task_id: z.string().describe('실패 처리할 태스크 ID'),
  error: z.string().describe('에러 메시지')
});

// 공통 도구 스키마
const GetTaskSchema = z.object({
  task_id: z.string().describe('조회할 태스크 ID')
});

const DeleteTaskSchema = z.object({
  task_id: z.string().describe('삭제할 태스크 ID')
});

// 플랜 파일 스키마
const ReadPlanSchema = z.object({
  path: z.string().describe('읽을 플랜 파일 경로')
});

// Worker Spawn 스키마
const SpawnWorkersSchema = z.object({
  count: z.number().min(1).max(10).default(1).describe('생성할 Worker 수 (1-10)'),
  auto_terminate: z.boolean().default(true).describe('태스크 완료 시 자동 종료 여부')
});

// Activity Log 스키마
const LogActivitySchema = z.object({
  task_id: z.string().optional().describe('관련 태스크 ID'),
  type: z.enum(['progress', 'decision', 'error', 'milestone', 'file_change']).describe('활동 유형'),
  message: z.string().describe('활동 내용 (1줄 요약)'),
  files: z.array(z.string()).optional().describe('관련 파일 목록'),
  tags: z.array(z.string()).optional().describe('Mnemo 검색용 키워드')
});

const GetActivityLogSchema = z.object({
  task_id: z.string().optional().describe('태스크 ID 필터'),
  worker_id: z.string().optional().describe('워커 ID 필터'),
  type: z.enum(['progress', 'decision', 'error', 'milestone', 'file_change']).optional().describe('활동 유형 필터'),
  since: z.string().optional().describe('이 시각 이후만 조회 (ISO 8601)'),
  limit: z.number().optional().describe('최대 반환 건수 (최신 N건)')
});

const GetTaskActivitySummarySchema = z.object({
  task_id: z.string().describe('요약할 태스크 ID')
});

// ============================================================================
// 도구 정의
// ============================================================================

const TOOLS: Tool[] = [
  // Multi-AI 관리 도구
  {
    name: 'orchestrator_detect_providers',
    description: '설치된 AI CLI (Claude, Codex, Gemini)를 감지하고 사용 가능한 모드를 반환합니다.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'orchestrator_get_provider_info',
    description: '특정 AI Provider의 강점과 최적 용도를 반환합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          enum: ['claude', 'codex', 'gemini'],
          description: '정보를 조회할 AI Provider'
        }
      },
      required: ['provider']
    }
  },

  // PM 전용 도구
  {
    name: 'orchestrator_analyze_codebase',
    description: '프로젝트 구조를 분석하여 태스크 분해에 필요한 정보를 수집합니다. (PM 전용)',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '분석할 하위 경로 (기본: 프로젝트 루트)' },
        pattern: { type: 'string', description: '필터 패턴 (예: "**/*.java")' }
      }
    }
  },
  {
    name: 'orchestrator_create_task',
    description: '새로운 태스크를 생성합니다. AI Provider를 지정하면 해당 AI로 실행됩니다. (PM 전용)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '태스크 고유 ID' },
        prompt: { type: 'string', description: '상세 작업 지시문' },
        depends_on: {
          type: 'array',
          items: { type: 'string' },
          description: '선행 태스크 ID 목록'
        },
        scope: {
          type: 'array',
          items: { type: 'string' },
          description: '수정 가능 파일 범위'
        },
        priority: { type: 'number', description: '우선순위 (높을수록 먼저, 기본: 1)' },
        ai_provider: {
          type: 'string',
          enum: ['claude', 'codex', 'gemini'],
          description: 'AI Provider (미지정시 사용 가능한 AI 중 자동 선택)'
        }
      },
      required: ['id', 'prompt']
    }
  },
  {
    name: 'orchestrator_list_plan_files',
    description: '.claude/plans/ 디렉토리에서 사용 가능한 플랜 파일 목록을 조회합니다. (PM 전용)',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'orchestrator_get_latest_plan',
    description: '가장 최근 수정된 플랜 파일을 자동으로 찾아 내용을 반환합니다. (PM 전용)',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'orchestrator_read_plan',
    description: '지정된 경로의 플랜 파일 내용을 읽어 반환합니다. (PM 전용)',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '읽을 플랜 파일 경로' }
      },
      required: ['path']
    }
  },
  {
    name: 'orchestrator_get_progress',
    description: '전체 작업 진행 상황을 조회합니다. (PM 전용)',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'orchestrator_spawn_workers',
    description: '새 터미널에서 Worker를 자동으로 생성합니다. Worker는 태스크를 자동으로 가져와 처리하며, 모든 태스크 완료 시 자동 종료됩니다. (PM 전용)',
    inputSchema: {
      type: 'object',
      properties: {
        count: { type: 'number', description: '생성할 Worker 수 (1-10, 기본: 1)', minimum: 1, maximum: 10 },
        auto_terminate: { type: 'boolean', description: '태스크 완료 시 자동 종료 (기본: true)' }
      }
    }
  },

  // Worker 전용 도구
  {
    name: 'orchestrator_get_available_tasks',
    description: '현재 수행 가능한 태스크 목록을 조회합니다. (Worker 전용)',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'orchestrator_claim_task',
    description: '태스크 담당을 선언합니다. (Worker 전용)',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: '담당할 태스크 ID' }
      },
      required: ['task_id']
    }
  },
  {
    name: 'orchestrator_lock_file',
    description: '파일 수정 전 락을 획득합니다. 상위/하위 경로도 충돌로 처리됩니다. (Worker 전용)',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '락할 파일 또는 폴더 경로' },
        reason: { type: 'string', description: '락 사유' }
      },
      required: ['path']
    }
  },
  {
    name: 'orchestrator_unlock_file',
    description: '파일 락을 해제합니다. (Worker 전용)',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '언락할 파일 또는 폴더 경로' }
      },
      required: ['path']
    }
  },
  {
    name: 'orchestrator_complete_task',
    description: '태스크를 완료 처리하고 모든 락을 해제합니다. (Worker 전용)',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: '완료할 태스크 ID' },
        result: { type: 'string', description: '완료 결과 요약' }
      },
      required: ['task_id']
    }
  },
  {
    name: 'orchestrator_fail_task',
    description: '태스크를 실패 처리하고 모든 락을 해제합니다. (Worker 전용)',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: '실패 처리할 태스크 ID' },
        error: { type: 'string', description: '에러 메시지' }
      },
      required: ['task_id', 'error']
    }
  },

  // 공통 도구
  {
    name: 'orchestrator_get_status',
    description: '전체 시스템 상태를 조회합니다. (태스크, 락, 워커 목록)',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'orchestrator_get_task',
    description: '특정 태스크의 상세 정보를 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: '조회할 태스크 ID' }
      },
      required: ['task_id']
    }
  },
  {
    name: 'orchestrator_get_file_locks',
    description: '현재 파일 락 목록을 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'orchestrator_delete_task',
    description: '태스크를 삭제합니다. 의존하는 태스크가 있으면 삭제할 수 없습니다.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: '삭제할 태스크 ID' }
      },
      required: ['task_id']
    }
  },
  {
    name: 'orchestrator_reset',
    description: '전체 상태를 초기화합니다. (모든 태스크, 락, 워커 정보 삭제)',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'orchestrator_heartbeat',
    description: '워커 하트비트를 갱신합니다.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // Activity Log 도구
  {
    name: 'orchestrator_log_activity',
    description: '활동을 기록합니다. 진행 상황, 의사결정, 에러, 마일스톤, 파일 변경 등. (Worker/PM 공용)',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: '관련 태스크 ID' },
        type: {
          type: 'string',
          enum: ['progress', 'decision', 'error', 'milestone', 'file_change'],
          description: '활동 유형'
        },
        message: { type: 'string', description: '활동 내용 (1줄 요약)' },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: '관련 파일 목록'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Mnemo 검색용 키워드'
        }
      },
      required: ['type', 'message']
    }
  },
  {
    name: 'orchestrator_get_activity_log',
    description: '활동 로그를 조회합니다. 태스크/워커/유형별 필터링 가능. (PM 전용)',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: '태스크 ID 필터' },
        worker_id: { type: 'string', description: '워커 ID 필터' },
        type: {
          type: 'string',
          enum: ['progress', 'decision', 'error', 'milestone', 'file_change'],
          description: '활동 유형 필터'
        },
        since: { type: 'string', description: '이 시각 이후만 조회 (ISO 8601)' },
        limit: { type: 'number', description: '최대 반환 건수 (최신 N건)' }
      }
    }
  },
  {
    name: 'orchestrator_get_task_summary',
    description: '특정 태스크의 활동 요약을 조회합니다. milestones/errors/lastActivity. (PM 전용)',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: '요약할 태스크 ID' }
      },
      required: ['task_id']
    }
  }
];

// ============================================================================
// 도구 구현
// ============================================================================

async function analyzeCodebase(args: z.infer<typeof AnalyzeCodebaseSchema>) {
  const basePath = args.path
    ? path.join(PROJECT_ROOT, args.path)
    : PROJECT_ROOT;

  const pattern = args.pattern || '**/*';

  // 파일 목록 조회
  const files = await glob(pattern, {
    cwd: basePath,
    nodir: true,
    ignore: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/bin/**',
      '**/obj/**',
      '**/.orchestrator/**'
    ]
  });

  // 디렉토리 구조 분석
  const structure: { [dir: string]: string[] } = {};
  const fileCounts: { [ext: string]: number } = {};
  const detectedModules: string[] = [];

  for (const file of files) {
    const dir = path.dirname(file);
    const ext = path.extname(file) || 'no-extension';

    // 디렉토리별 파일
    if (!structure[dir]) {
      structure[dir] = [];
    }
    structure[dir].push(path.basename(file));

    // 확장자별 카운트
    fileCounts[ext] = (fileCounts[ext] || 0) + 1;

    // 모듈 탐지 (Controller, Service 등)
    const basename = path.basename(file, ext);
    if (basename.endsWith('Controller') || basename.endsWith('Service')) {
      const moduleName = basename.replace(/Controller$|Service$/, '');
      if (!detectedModules.includes(moduleName)) {
        detectedModules.push(moduleName);
      }
    }
  }

  // 태스크 분해 제안
  const suggestions: string[] = [];
  if (detectedModules.length > 0) {
    suggestions.push(`${detectedModules.length}개의 모듈을 탐지했습니다: ${detectedModules.join(', ')}`);
    suggestions.push('각 모듈별로 독립적인 태스크를 생성하는 것을 권장합니다.');
  }

  const topDirs = Object.entries(structure)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10);

  return {
    projectRoot: PROJECT_ROOT,
    analyzedPath: basePath,
    totalFiles: files.length,
    structure: Object.fromEntries(topDirs),
    fileCounts,
    detectedModules,
    suggestions
  };
}

async function listPlanFiles(): Promise<{ files: { name: string; path: string; modifiedAt: string; size: number }[]; directory: string }> {
  const plansDir = path.join(PROJECT_ROOT, '.claude', 'plans');

  if (!fs.existsSync(plansDir)) {
    return { files: [], directory: plansDir };
  }

  const entries = fs.readdirSync(plansDir);
  const files = entries
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const fullPath = path.join(plansDir, f);
      const stat = fs.statSync(fullPath);
      return {
        name: f,
        path: fullPath,
        modifiedAt: stat.mtime.toISOString(),
        size: stat.size
      };
    })
    .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

  return { files, directory: plansDir };
}

async function getLatestPlan(): Promise<{ found: boolean; path?: string; content?: string; error?: string }> {
  const { files } = await listPlanFiles();

  if (files.length === 0) {
    return { found: false, error: 'No plan files found in .claude/plans/' };
  }

  const latest = files[0];
  const content = fs.readFileSync(latest.path, 'utf-8');

  return { found: true, path: latest.path, content };
}

async function readPlan(filePath: string): Promise<{ found: boolean; path: string; content?: string; error?: string }> {
  // 절대 경로 또는 상대 경로 지원
  const resolvedPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(PROJECT_ROOT, filePath);

  if (!fs.existsSync(resolvedPath)) {
    return { found: false, path: resolvedPath, error: `File not found: ${resolvedPath}` };
  }

  const content = fs.readFileSync(resolvedPath, 'utf-8');
  return { found: true, path: resolvedPath, content };
}

async function spawnWorkers(count: number, autoTerminate: boolean): Promise<{
  success: boolean;
  message: string;
  spawnedWorkers: { id: string; status: string }[];
  errors?: string[];
}> {
  const isWindows = process.platform === 'win32';
  const scriptDir = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..', 'scripts');
  const scriptName = isWindows ? 'spawn-worker.ps1' : 'spawn-worker.sh';
  const scriptPath = path.join(scriptDir, scriptName);

  // 스크립트 존재 확인
  if (!fs.existsSync(scriptPath)) {
    return {
      success: false,
      message: `Spawn script not found: ${scriptPath}`,
      spawnedWorkers: [],
      errors: [`Script not found: ${scriptPath}`]
    };
  }

  const spawnedWorkers: { id: string; status: string }[] = [];
  const errors: string[] = [];

  for (let i = 0; i < count; i++) {
    const workerId = `worker-${Date.now()}-${i + 1}`;

    try {
      if (isWindows) {
        // Windows: PowerShell로 새 터미널에서 스크립트 실행
        const psCommand = `Start-Process powershell -ArgumentList '-ExecutionPolicy', 'Bypass', '-File', '${scriptPath.replace(/\\/g, '\\\\')}', '-WorkerId', '${workerId}', '-ProjectRoot', '${PROJECT_ROOT.replace(/\\/g, '\\\\')}', '-AutoTerminate', '${autoTerminate ? '1' : '0'}'`;

        spawn('powershell', ['-Command', psCommand], {
          detached: true,
          stdio: 'ignore'
        }).unref();

      } else {
        // Mac/Linux: 새 터미널에서 스크립트 실행
        // macOS: Terminal.app 또는 iTerm2
        // Linux: gnome-terminal, xterm 등
        const isMac = process.platform === 'darwin';

        if (isMac) {
          // macOS: osascript로 Terminal.app에서 실행
          const appleScript = `tell application "Terminal" to do script "bash '${scriptPath}' '${workerId}' '${PROJECT_ROOT}' '${autoTerminate ? '1' : '0'}'"`;
          spawn('osascript', ['-e', appleScript], {
            detached: true,
            stdio: 'ignore'
          }).unref();
        } else {
          // Linux: 다양한 터미널 에뮬레이터 시도
          const terminals = [
            { cmd: 'gnome-terminal', args: ['--', 'bash', scriptPath, workerId, PROJECT_ROOT, autoTerminate ? '1' : '0'] },
            { cmd: 'konsole', args: ['-e', 'bash', scriptPath, workerId, PROJECT_ROOT, autoTerminate ? '1' : '0'] },
            { cmd: 'xterm', args: ['-e', 'bash', scriptPath, workerId, PROJECT_ROOT, autoTerminate ? '1' : '0'] }
          ];

          let spawned = false;
          for (const term of terminals) {
            try {
              execSync(`which ${term.cmd}`, { stdio: 'ignore' });
              spawn(term.cmd, term.args, {
                detached: true,
                stdio: 'ignore'
              }).unref();
              spawned = true;
              break;
            } catch {
              continue;
            }
          }

          if (!spawned) {
            errors.push(`No terminal emulator found for worker ${workerId}`);
            continue;
          }
        }
      }

      spawnedWorkers.push({ id: workerId, status: 'spawned' });

      // 터미널 간 약간의 딜레이
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to spawn worker ${workerId}: ${errorMsg}`);
    }
  }

  return {
    success: spawnedWorkers.length > 0,
    message: spawnedWorkers.length === count
      ? `Successfully spawned ${count} worker(s)`
      : `Spawned ${spawnedWorkers.length}/${count} worker(s)`,
    spawnedWorkers,
    errors: errors.length > 0 ? errors : undefined
  };
}

// ============================================================================
// MCP 서버 설정
// ============================================================================

const server = new Server(
  {
    name: 'claude-orchestrator',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 도구 목록 핸들러
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// 도구 호출 핸들러
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: unknown;

    switch (name) {
      // Multi-AI 관리 도구
      case 'orchestrator_detect_providers': {
        const detection = detectAIProviders();
        result = {
          ...detection,
          recommendation: detection.availableCount >= 2
            ? '병렬 처리 가능: 코드 생성은 Codex, 분석은 Claude, 대용량 컨텍스트는 Gemini 권장'
            : 'Single Mode: Claude만 사용합니다'
        };
        break;
      }

      case 'orchestrator_get_provider_info': {
        const provider = (args as { provider: AIProvider }).provider;
        const availableProviders = getAvailableProviders();
        const isAvailable = availableProviders.includes(provider);
        result = {
          provider,
          available: isAvailable,
          strengths: getProviderStrengths(provider),
          command: isAvailable ? getProviderCommand(provider) : null,
          suggestion: isAvailable
            ? `${provider}는 현재 사용 가능합니다.`
            : `${provider}는 설치되어 있지 않습니다. 대안: ${availableProviders.join(', ') || 'claude'}`
        };
        break;
      }

      // PM 전용 도구
      case 'orchestrator_analyze_codebase': {
        const parsed = AnalyzeCodebaseSchema.parse(args);
        result = await analyzeCodebase(parsed);
        break;
      }

      case 'orchestrator_create_task': {
        const parsed = CreateTaskSchema.parse(args);

        // AI Provider 유효성 검증 및 fallback
        let aiProvider = parsed.ai_provider as AIProvider | undefined;
        if (aiProvider) {
          const availableProviders = getAvailableProviders();
          if (!availableProviders.includes(aiProvider)) {
            // 지정한 Provider가 없으면 사용 가능한 것으로 fallback
            const fallbackProvider = availableProviders[0] || 'claude';
            console.error(`[WARN] ${aiProvider} not available, falling back to ${fallbackProvider}`);
            aiProvider = fallbackProvider as AIProvider;
          }
        }

        result = stateManager.createTask(parsed.id, parsed.prompt, {
          dependsOn: parsed.depends_on,
          scope: parsed.scope,
          priority: parsed.priority,
          aiProvider
        });
        break;
      }

      case 'orchestrator_list_plan_files': {
        result = await listPlanFiles();
        break;
      }

      case 'orchestrator_get_latest_plan': {
        result = await getLatestPlan();
        break;
      }

      case 'orchestrator_read_plan': {
        const parsed = ReadPlanSchema.parse(args);
        result = await readPlan(parsed.path);
        break;
      }

      case 'orchestrator_get_progress': {
        result = stateManager.getProgress();
        break;
      }

      case 'orchestrator_spawn_workers': {
        const parsed = SpawnWorkersSchema.parse(args);
        result = await spawnWorkers(parsed.count, parsed.auto_terminate);
        break;
      }

      // Worker 전용 도구
      case 'orchestrator_get_available_tasks': {
        result = stateManager.getAvailableTasks();
        break;
      }

      case 'orchestrator_claim_task': {
        const parsed = ClaimTaskSchema.parse(args);
        result = stateManager.claimTask(parsed.task_id);
        break;
      }

      case 'orchestrator_lock_file': {
        const parsed = LockFileSchema.parse(args);
        result = stateManager.lockFile(parsed.path, parsed.reason);
        break;
      }

      case 'orchestrator_unlock_file': {
        const parsed = UnlockFileSchema.parse(args);
        result = stateManager.unlockFile(parsed.path);
        break;
      }

      case 'orchestrator_complete_task': {
        const parsed = CompleteTaskSchema.parse(args);
        result = stateManager.completeTask(parsed.task_id, parsed.result);
        break;
      }

      case 'orchestrator_fail_task': {
        const parsed = FailTaskSchema.parse(args);
        result = stateManager.failTask(parsed.task_id, parsed.error);
        break;
      }

      // 공통 도구
      case 'orchestrator_get_status': {
        result = stateManager.getStatus();
        break;
      }

      case 'orchestrator_get_task': {
        const parsed = GetTaskSchema.parse(args);
        const task = stateManager.getTask(parsed.task_id);
        result = task || { error: `Task '${parsed.task_id}' not found` };
        break;
      }

      case 'orchestrator_get_file_locks': {
        result = { locks: stateManager.getFileLocks() };
        break;
      }

      case 'orchestrator_delete_task': {
        const parsed = DeleteTaskSchema.parse(args);
        result = stateManager.deleteTask(parsed.task_id);
        break;
      }

      case 'orchestrator_reset': {
        stateManager.resetState();
        result = { success: true, message: 'State reset successfully' };
        break;
      }

      case 'orchestrator_heartbeat': {
        stateManager.updateHeartbeat();
        result = { success: true, workerId: WORKER_ID, timestamp: new Date().toISOString() };
        break;
      }

      // Activity Log 도구
      case 'orchestrator_log_activity': {
        const parsed = LogActivitySchema.parse(args);
        result = stateManager.logActivity(parsed.type, parsed.message, {
          taskId: parsed.task_id,
          files: parsed.files,
          tags: parsed.tags
        });
        break;
      }

      case 'orchestrator_get_activity_log': {
        const parsed = GetActivityLogSchema.parse(args);
        result = stateManager.getActivityLog({
          taskId: parsed.task_id,
          workerId: parsed.worker_id,
          type: parsed.type,
          since: parsed.since,
          limit: parsed.limit
        });
        break;
      }

      case 'orchestrator_get_task_summary': {
        const parsed = GetTaskActivitySummarySchema.parse(args);
        result = stateManager.getTaskActivitySummary(parsed.task_id);
        break;
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: errorMessage }, null, 2)
        }
      ],
      isError: true
    };
  }
});

// ============================================================================
// 서버 시작
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Claude Orchestrator MCP Server started (Worker: ${WORKER_ID})`);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
