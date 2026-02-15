/**
 * Error handling type definitions
 */

export interface ErrorRecoveryStrategy {
  errorType: string;
  maxRetries: number;
  retryDelayMs: number;
  fallbackAction: () => void;
  userNotification: string;
}
