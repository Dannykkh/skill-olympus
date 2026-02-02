export type AIProvider = 'claude' | 'codex' | 'gemini';
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
    mode: 'full' | 'dual' | 'single';
    modeDescription: string;
}
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
    autoMode?: boolean;
    workDir?: string;
}): string;
/**
 * AI Provider별 최적 용도 반환
 */
export declare function getProviderStrengths(provider: AIProvider): string[];
//# sourceMappingURL=ai-detector.d.ts.map