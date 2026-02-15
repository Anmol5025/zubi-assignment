/**
 * Retry utility with exponential backoff
 * 
 * Implements retry logic for handling transient failures with exponential
 * backoff between attempts. Useful for network requests and other operations
 * that may fail temporarily.
 * 
 * Requirements: 10.2 (retry logic for AI service failures)
 */

export interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  shouldRetry?: (error: Error) => boolean;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Retry a function with exponential backoff
 * 
 * Executes the provided async function and retries it with exponential backoff
 * if it fails. The delay between retries increases exponentially up to a maximum.
 * Optionally filters which errors should trigger retries.
 * 
 * @param fn - The async function to retry
 * @param options - Retry configuration options
 * @returns Promise that resolves with the function result or rejects after all retries fail
 * @throws The last error encountered if all retries fail
 * 
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   async () => await fetchData(),
 *   {
 *     maxRetries: 3,
 *     initialDelayMs: 1000,
 *     shouldRetry: isRetryableError
 *   }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we should retry this error
      if (opts.shouldRetry && !opts.shouldRetry(lastError)) {
        throw lastError;
      }
      
      // If this was the last attempt, throw the error
      if (attempt === opts.maxRetries) {
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt),
        opts.maxDelayMs
      );
      
      console.log(`[RetryWithBackoff] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached, but TypeScript needs it
  throw lastError!;
}

/**
 * Check if an error is retryable (network/timeout errors)
 * 
 * Determines if an error is likely transient and worth retrying.
 * Checks for network errors, timeouts, rate limits, and server errors.
 * 
 * @param error - The error to check
 * @returns True if the error is retryable
 * 
 * @example
 * ```typescript
 * try {
 *   await apiCall();
 * } catch (error) {
 *   if (isRetryableError(error)) {
 *     console.log('Transient error, will retry');
 *   }
 * }
 * ```
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Retry on network errors, timeouts, rate limits, and server errors
  return (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504')
  );
}
