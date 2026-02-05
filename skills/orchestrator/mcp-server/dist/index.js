#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import * as path from 'path';
import { glob } from 'glob';
import { StateManager } from './services/state-manager.js';
import { detectAIProviders, getAvailableProviders, getProviderCommand, getProviderStrengths } from './services/ai-detector.js';
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
// ============================================================================
// 도구 정의
// ============================================================================
const TOOLS = [
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
        name: 'orchestrator_get_progress',
        description: '전체 작업 진행 상황을 조회합니다. (PM 전용)',
        inputSchema: {
            type: 'object',
            properties: {}
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
    }
];
// ============================================================================
// 도구 구현
// ============================================================================
async function analyzeCodebase(args) {
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
    const structure = {};
    const fileCounts = {};
    const detectedModules = [];
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
    const suggestions = [];
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
// ============================================================================
// MCP 서버 설정
// ============================================================================
const server = new Server({
    name: 'claude-orchestrator',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
// 도구 목록 핸들러
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
});
// 도구 호출 핸들러
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        let result;
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
                const provider = args.provider;
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
                let aiProvider = parsed.ai_provider;
                if (aiProvider) {
                    const availableProviders = getAvailableProviders();
                    if (!availableProviders.includes(aiProvider)) {
                        // 지정한 Provider가 없으면 사용 가능한 것으로 fallback
                        const fallbackProvider = availableProviders[0] || 'claude';
                        console.error(`[WARN] ${aiProvider} not available, falling back to ${fallbackProvider}`);
                        aiProvider = fallbackProvider;
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
            case 'orchestrator_get_progress': {
                result = stateManager.getProgress();
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
    }
    catch (error) {
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
//# sourceMappingURL=index.js.map