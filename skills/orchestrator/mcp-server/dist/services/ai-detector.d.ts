export type AIProvider = 'claude' | 'codex' | 'antigravity';
export interface AIProviderInfo {
    name: AIProvider;
    available: boolean;
    version?: string;
    command: string;
    description: string;
}
export interface DetectionResult {
    providers: AIProviderInfo[];
    availableCount: number;
    mode: 'full' | 'dual' | 'single' | 'none';
    modeDescription: string;
}
export interface WorkerProviderSelection {
    success: boolean;
    providers: AIProvider[];
    message: string;
}
export declare function isAIProvider(value: string | undefined): value is AIProvider;
/**
 * Resolve the provider for the current worker process. Auto-spawned workers
 * encode it in their worker id; manually launched workers can set the explicit
 * environment value instead.
 */
export declare function resolveWorkerProvider(workerId: string, explicitProvider?: string): AIProvider | undefined;
/**
 * Resolve one provider per worker. Missing entries use the first provider in
 * the deterministic detection order. Explicit but unavailable providers fail
 * closed instead of silently launching a different CLI.
 */
export declare function selectWorkerProviders(count: number, requestedProviders: AIProvider[] | undefined, availableProviders: AIProvider[]): WorkerProviderSelection;
export declare function buildDetectionResult(providers: AIProviderInfo[]): DetectionResult;
/**
 * 모든 AI Provider 감지
 */
export declare function detectAIProviders(): DetectionResult;
/**
 * 특정 Provider가 사용 가능한지 확인
 */
export declare function isProviderAvailable(provider: AIProvider): boolean;
/**
 * 사용 가능한 Provider 목록 반환
 */
export declare function getAvailableProviders(): AIProvider[];
/**
 * Provider 실행 명령어 생성
 */
export declare function getProviderCommand(provider: AIProvider, options?: {
    workDir?: string;
}): string;
//# sourceMappingURL=ai-detector.d.ts.map