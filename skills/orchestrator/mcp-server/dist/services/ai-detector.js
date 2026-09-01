import { execSync } from 'child_process';
const PROVIDER_ORDER = ['claude', 'codex', 'antigravity'];
export function isAIProvider(value) {
    return value !== undefined && PROVIDER_ORDER.includes(value);
}
/**
 * Resolve the provider for the current worker process. Auto-spawned workers
 * encode it in their worker id; manually launched workers can set the explicit
 * environment value instead.
 */
export function resolveWorkerProvider(workerId, explicitProvider) {
    if (explicitProvider) {
        if (!isAIProvider(explicitProvider)) {
            throw new Error(`Unsupported worker provider '${explicitProvider}'. Expected claude, codex, or antigravity.`);
        }
        return explicitProvider;
    }
    const prefix = workerId.match(/^(claude|codex|antigravity)-worker(?:-|$)/)?.[1];
    return isAIProvider(prefix) ? prefix : undefined;
}
/**
 * Resolve one provider per worker. Missing entries use the first provider in
 * the deterministic detection order. Explicit but unavailable providers fail
 * closed instead of silently launching a different CLI.
 */
export function selectWorkerProviders(count, requestedProviders, availableProviders) {
    const detectedProviders = PROVIDER_ORDER.filter(provider => availableProviders.includes(provider));
    if (detectedProviders.length === 0) {
        return {
            success: false,
            providers: [],
            message: 'No supported worker provider is installed (claude, codex, antigravity).'
        };
    }
    const requestedSlots = (requestedProviders || []).slice(0, count);
    const unavailable = requestedSlots.filter(provider => !detectedProviders.includes(provider));
    if (unavailable.length > 0) {
        return {
            success: false,
            providers: [],
            message: `Requested worker provider(s) unavailable: ${[...new Set(unavailable)].join(', ')}. Available: ${detectedProviders.join(', ')}`
        };
    }
    const defaultProvider = detectedProviders[0];
    const resolvedProviders = Array.from({ length: count }, (_, index) => requestedProviders?.[index] ?? defaultProvider);
    return {
        success: true,
        providers: resolvedProviders,
        message: `Resolved ${count} worker provider(s): ${resolvedProviders.join(', ')}`
    };
}
export function buildDetectionResult(providers) {
    const available = providers.filter(provider => provider.available).map(provider => provider.name);
    const availableCount = available.length;
    if (availableCount >= 3) {
        return {
            providers,
            availableCount,
            mode: 'full',
            modeDescription: `Full Mode: ${available.join(' + ')} (${availableCount} AI providers)`
        };
    }
    if (availableCount === 2) {
        return {
            providers,
            availableCount,
            mode: 'dual',
            modeDescription: `Dual Mode: ${available.join(' + ')} (2 AI providers)`
        };
    }
    if (availableCount === 1) {
        return {
            providers,
            availableCount,
            mode: 'single',
            modeDescription: `Single Mode: ${available[0]} only`
        };
    }
    return {
        providers,
        availableCount,
        mode: 'none',
        modeDescription: 'No supported AI provider is installed (claude, codex, antigravity).'
    };
}
// ============================================================================
// AI CLI 감지 함수
// ============================================================================
/**
 * 특정 CLI가 시스템에 설치되어 있는지 확인
 */
function checkCLI(command, versionFlag = '--version') {
    try {
        const result = execSync(`${command} ${versionFlag}`, {
            encoding: 'utf-8',
            timeout: 5000,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        // 버전 정보 추출 (첫 줄에서 숫자 패턴 찾기)
        const versionMatch = result.match(/[\d]+\.[\d]+\.[\d]+/);
        return {
            available: true,
            version: versionMatch ? versionMatch[0] : 'unknown'
        };
    }
    catch {
        return { available: false };
    }
}
/**
 * 모든 AI Provider 감지
 */
export function detectAIProviders() {
    const providers = [
        {
            name: 'claude',
            ...checkCLI('claude', '--version'),
            command: 'claude',
            description: 'Anthropic Claude Code CLI'
        },
        {
            name: 'codex',
            ...checkCLI('codex', '--version'),
            command: 'codex',
            description: 'OpenAI Codex CLI'
        },
        {
            name: 'antigravity',
            ...checkCLI('agy', '--version'),
            command: 'agy',
            description: 'Google Antigravity CLI'
        }
    ];
    return buildDetectionResult(providers);
}
/**
 * 특정 Provider가 사용 가능한지 확인
 */
export function isProviderAvailable(provider) {
    const result = detectAIProviders();
    const providerInfo = result.providers.find(p => p.name === provider);
    return providerInfo?.available ?? false;
}
/**
 * 사용 가능한 Provider 목록 반환
 */
export function getAvailableProviders() {
    const result = detectAIProviders();
    return result.providers
        .filter(p => p.available)
        .map(p => p.name);
}
/**
 * Provider 실행 명령어 생성
 */
export function getProviderCommand(provider, options = {}) {
    const { workDir } = options;
    let command;
    switch (provider) {
        case 'claude':
            command = 'claude';
            break;
        case 'codex':
            command = 'codex';
            break;
        case 'antigravity':
            command = 'agy';
            break;
        default:
            throw new Error(`Unsupported AI provider: ${String(provider)}`);
    }
    if (workDir) {
        command = `cd "${workDir}" && ${command}`;
    }
    return command;
}
//# sourceMappingURL=ai-detector.js.map