export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

export function calculateBackoff(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
  return Math.min(config.baseDelayMs * Math.pow(2, attempt - 1), config.maxDelayMs);
}

export function shouldRetry(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): boolean {
  return attempt < config.maxAttempts;
}
