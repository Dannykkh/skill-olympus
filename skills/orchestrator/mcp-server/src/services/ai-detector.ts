import { execSync } from 'child_process';

// ============================================================================
// AI Provider 타입 정의
// ============================================================================

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
  mode: 'full' | 'dual' | 'single' | 'none';
  modeDescription: string;
}

export interface WorkerProviderSelection {
  success: boolean;
  providers: AIProvider[];
  message: string;
}

const PROVIDER_ORDER: readonly AIProvider[] = ['claude', 'codex', 'gemini'];

export function isAIProvider(value: string | undefined): value is AIProvider {
  return value !== undefined && PROVIDER_ORDER.includes(value as AIProvider);
}

/**
 * Resolve the provider for the current worker process. Auto-spawned workers
 * encode it in their worker id; manually launched workers can set the explicit
 * environment value instead.
 */
export function resolveWorkerProvider(
  workerId: string,
  explicitProvider?: string
): AIProvider | undefined {
  if (explicitProvider) {
    if (!isAIProvider(explicitProvider)) {
      throw new Error(`Unsupported worker provider '${explicitProvider}'. Expected claude, codex, or gemini.`);
    }
    return explicitProvider;
  }

  const prefix = workerId.match(/^(claude|codex|gemini)-worker(?:-|$)/)?.[1];
  return isAIProvider(prefix) ? prefix : undefined;
}

/**
 * Resolve one provider per worker. Missing entries use the first provider in
 * the deterministic detection order. Explicit but unavailable providers fail
 * closed instead of silently launching a different CLI.
 */
export function selectWorkerProviders(
  count: number,
  requestedProviders: AIProvider[] | undefined,
  availableProviders: AIProvider[]
): WorkerProviderSelection {
  const detectedProviders = PROVIDER_ORDER.filter(provider => availableProviders.includes(provider));
  if (detectedProviders.length === 0) {
    return {
      success: false,
      providers: [],
      message: 'No supported worker provider is installed (claude, codex, gemini).'
    };
  }

  const requestedSlots = (requestedProviders || []).slice(0, count);
  const unavailable = requestedSlots.filter(
    provider => !detectedProviders.includes(provider)
  );
  if (unavailable.length > 0) {
    return {
      success: false,
      providers: [],
      message: `Requested worker provider(s) unavailable: ${[...new Set(unavailable)].join(', ')}. Available: ${detectedProviders.join(', ')}`
    };
  }

  const defaultProvider = detectedProviders[0];
  const resolvedProviders = Array.from(
    { length: count },
    (_, index) => requestedProviders?.[index] ?? defaultProvider
  );
  return {
    success: true,
    providers: resolvedProviders,
    message: `Resolved ${count} worker provider(s): ${resolvedProviders.join(', ')}`
  };
}

export function buildDetectionResult(providers: AIProviderInfo[]): DetectionResult {
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
    modeDescription: 'No supported AI provider is installed (claude, codex, gemini).'
  };
}

// ============================================================================
// AI CLI 감지 함수
// ============================================================================

/**
 * 특정 CLI가 시스템에 설치되어 있는지 확인
 */
function checkCLI(command: string, versionFlag: string = '--version'): { available: boolean; version?: string } {
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
  } catch {
    return { available: false };
  }
}

/**
 * 모든 AI Provider 감지
 */
export function detectAIProviders(): DetectionResult {
  const providers: AIProviderInfo[] = [
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
      name: 'gemini',
      ...checkCLI('gemini', '--version'),
      command: 'gemini',
      description: 'Google Gemini CLI'
    }
  ];

  return buildDetectionResult(providers);
}

/**
 * 특정 Provider가 사용 가능한지 확인
 */
export function isProviderAvailable(provider: AIProvider): boolean {
  const result = detectAIProviders();
  const providerInfo = result.providers.find(p => p.name === provider);
  return providerInfo?.available ?? false;
}

/**
 * 사용 가능한 Provider 목록 반환
 */
export function getAvailableProviders(): AIProvider[] {
  const result = detectAIProviders();
  return result.providers
    .filter(p => p.available)
    .map(p => p.name);
}

/**
 * Provider 실행 명령어 생성
 */
export function getProviderCommand(
  provider: AIProvider,
  options: {
    workDir?: string;    // 작업 디렉토리
  } = {}
): string {
  const { workDir } = options;

  let command: string;

  switch (provider) {
    case 'claude':
      command = 'claude';
      break;

    case 'codex':
      command = 'codex';
      break;

    case 'gemini':
      command = 'gemini';
      break;

    default:
      throw new Error(`Unsupported AI provider: ${String(provider)}`);
  }

  if (workDir) {
    command = `cd "${workDir}" && ${command}`;
  }

  return command;
}
