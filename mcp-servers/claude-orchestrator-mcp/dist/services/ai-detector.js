import { execSync } from 'child_process';
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
            description: 'OpenAI Codex CLI (GPT-5.2)'
        },
        {
            name: 'gemini',
            ...checkCLI('gemini', '--version'),
            command: 'gemini',
            description: 'Google Gemini CLI (Gemini 3 Pro)'
        }
    ];
    const availableCount = providers.filter(p => p.available).length;
    let mode;
    let modeDescription;
    if (availableCount >= 3) {
        mode = 'full';
        modeDescription = 'Full Mode: Claude + Codex + Gemini (3개 AI 병렬 처리)';
    }
    else if (availableCount === 2) {
        mode = 'dual';
        const available = providers.filter(p => p.available).map(p => p.name);
        modeDescription = `Dual Mode: ${available.join(' + ')} (2개 AI 병렬 처리)`;
    }
    else {
        mode = 'single';
        modeDescription = 'Single Mode: Claude만 사용 (기본 모드)';
    }
    return {
        providers,
        availableCount,
        mode,
        modeDescription
    };
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
    const { autoMode = true, workDir } = options;
    let command;
    switch (provider) {
        case 'claude':
            command = autoMode
                ? 'claude --dangerously-skip-permissions'
                : 'claude';
            break;
        case 'codex':
            // Codex CLI 옵션
            command = autoMode
                ? 'codex --full-auto --approval-mode full-auto'
                : 'codex';
            break;
        case 'gemini':
            // Gemini CLI 옵션
            command = autoMode
                ? 'gemini --approval-mode yolo'
                : 'gemini';
            break;
        default:
            command = 'claude';
    }
    if (workDir) {
        command = `cd "${workDir}" && ${command}`;
    }
    return command;
}
/**
 * AI Provider별 최적 용도 반환
 */
export function getProviderStrengths(provider) {
    switch (provider) {
        case 'claude':
            return [
                '복잡한 추론 및 분석',
                '코드 리팩토링',
                '문서 작성',
                '아키텍처 설계'
            ];
        case 'codex':
            return [
                '코드 생성 및 자동화',
                '테스트 케이스 작성',
                '반복적인 코드 수정',
                '빠른 프로토타이핑'
            ];
        case 'gemini':
            return [
                '대용량 컨텍스트 분석 (1M 토큰)',
                '전체 코드베이스 리뷰',
                '보안 취약점 분석',
                '멀티파일 이해'
            ];
        default:
            return [];
    }
}
//# sourceMappingURL=ai-detector.js.map