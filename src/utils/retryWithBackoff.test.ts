/**
 * Tests for retry with exponential backoff utility
 * Requirements: 10.2
 */

import { retryWithBackoff, isRetryableError } from './retryWithBackoff';

describe('retryWithBackoff', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('should succeed on first attempt if function succeeds', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    
    const promise = retryWithBackoff(fn, { maxRetries: 3 });
    jest.runAllTimers();
    const result = await promise;
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue('success');
    
    const promise = retryWithBackoff(fn, { 
      maxRetries: 3,
      initialDelayMs: 100,
      shouldRetry: isRetryableError,
    });
    
    await jest.runAllTimersAsync();
    const result = await promise;
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw error after max retries', async () => {
    const error = new Error('Network error');
    const fn = jest.fn().mockRejectedValue(error);
    
    const promise = retryWithBackoff(fn, { 
      maxRetries: 2,
      initialDelayMs: 100,
      shouldRetry: isRetryableError,
    });
    
    // Run all timers to completion
    const result = promise.catch(e => e);
    await jest.runAllTimersAsync();
    const caughtError = await result;
    
    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as Error).message).toBe('Network error');
    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should use exponential backoff delays', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue('success');
    
    const promise = retryWithBackoff(fn, { 
      maxRetries: 3,
      initialDelayMs: 1000,
      backoffMultiplier: 2,
      shouldRetry: isRetryableError,
    });
    
    // First attempt fails immediately
    await jest.advanceTimersByTimeAsync(0);
    expect(fn).toHaveBeenCalledTimes(1);
    
    // Wait for first retry delay (1000ms)
    await jest.advanceTimersByTimeAsync(1000);
    expect(fn).toHaveBeenCalledTimes(2);
    
    // Wait for second retry delay (2000ms)
    await jest.advanceTimersByTimeAsync(2000);
    expect(fn).toHaveBeenCalledTimes(3);
    
    const result = await promise;
    expect(result).toBe('success');
  });

  it('should respect max delay', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue('success');
    
    const promise = retryWithBackoff(fn, { 
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 1500,
      backoffMultiplier: 2,
      shouldRetry: isRetryableError,
    });
    
    await jest.advanceTimersByTimeAsync(0);
    expect(fn).toHaveBeenCalledTimes(1);
    
    // First retry: 1000ms
    await jest.advanceTimersByTimeAsync(1000);
    expect(fn).toHaveBeenCalledTimes(2);
    
    // Second retry: capped at 1500ms instead of 2000ms
    await jest.advanceTimersByTimeAsync(1500);
    expect(fn).toHaveBeenCalledTimes(3);
    
    const result = await promise;
    expect(result).toBe('success');
  });

  it('should not retry if shouldRetry returns false', async () => {
    const error = new Error('Invalid input');
    const fn = jest.fn().mockRejectedValue(error);
    
    const promise = retryWithBackoff(fn, { 
      maxRetries: 3,
      initialDelayMs: 100,
      shouldRetry: () => false,
    });
    
    jest.runAllTimers();
    
    await expect(promise).rejects.toThrow('Invalid input');
    expect(fn).toHaveBeenCalledTimes(1); // No retries
  });
});

describe('isRetryableError', () => {
  it('should identify network errors as retryable', () => {
    expect(isRetryableError(new Error('Network error occurred'))).toBe(true);
    expect(isRetryableError(new Error('ECONNREFUSED'))).toBe(true);
    expect(isRetryableError(new Error('ENOTFOUND'))).toBe(true);
  });

  it('should identify timeout errors as retryable', () => {
    expect(isRetryableError(new Error('Request timeout'))).toBe(true);
    expect(isRetryableError(new Error('Connection timeout'))).toBe(true);
  });

  it('should identify rate limit errors as retryable', () => {
    expect(isRetryableError(new Error('Rate limit exceeded'))).toBe(true);
    expect(isRetryableError(new Error('HTTP 429 error'))).toBe(true);
  });

  it('should identify server errors as retryable', () => {
    expect(isRetryableError(new Error('HTTP 500 Internal Server Error'))).toBe(true);
    expect(isRetryableError(new Error('502 Bad Gateway'))).toBe(true);
    expect(isRetryableError(new Error('503 Service Unavailable'))).toBe(true);
    expect(isRetryableError(new Error('504 Gateway Timeout'))).toBe(true);
  });

  it('should identify non-retryable errors', () => {
    expect(isRetryableError(new Error('Invalid API key'))).toBe(false);
    expect(isRetryableError(new Error('Bad request'))).toBe(false);
    expect(isRetryableError(new Error('Unauthorized'))).toBe(false);
    expect(isRetryableError(new Error('Not found'))).toBe(false);
  });
});
