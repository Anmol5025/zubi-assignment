/**
 * ErrorLogger - Centralized error logging utility
 * 
 * Logs all critical errors with details including:
 * - Error type
 * - Timestamp
 * - Context information
 * 
 * Requirements: 10.4
 */

export type ErrorType =
  | 'microphone_permission_denied'
  | 'microphone_not_found'
  | 'microphone_in_use'
  | 'microphone_error'
  | 'speech_recognition_error'
  | 'speech_synthesis_error'
  | 'ai_service_error'
  | 'ai_service_timeout'
  | 'network_error'
  | 'network_offline'
  | 'tool_execution_error'
  | 'conversation_error'
  | 'unknown_error';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  additionalData?: Record<string, unknown>;
}

export interface ErrorLogEntry {
  type: ErrorType;
  message: string;
  timestamp: number;
  context: ErrorContext;
  stack?: string;
  originalError?: unknown;
}

/**
 * ErrorLogger class for centralized error logging
 * 
 * Requirements: 10.4 - Log critical errors with details
 */
export class ErrorLogger {
  private logs: ErrorLogEntry[] = [];
  private maxLogs: number;
  private onLogCallback?: (entry: ErrorLogEntry) => void;

  constructor(maxLogs: number = 100) {
    this.maxLogs = maxLogs;
  }

  /**
   * Log a critical error with full details
   * 
   * Records an error with type, message, timestamp, context, and stack trace.
   * Logs to console, stores in memory, and calls registered callback if set.
   * 
   * Requirements: 10.4 (log critical errors with details)
   * 
   * @param type - Type of error (e.g., 'microphone_permission_denied', 'ai_service_error')
   * @param message - Error message describing what happened
   * @param context - Additional context information (component, action, session ID, etc.)
   * @param error - Original error object (optional)
   * 
   * @example
   * ```typescript
   * const logger = new ErrorLogger();
   * logger.logError(
   *   'ai_service_error',
   *   'Failed to generate response',
   *   { component: 'LLMClient', action: 'sendMessage', sessionId: 'abc123' },
   *   error
   * );
   * ```
   */
  logError(
    type: ErrorType,
    message: string,
    context: ErrorContext = {},
    error?: unknown
  ): void {
    const entry: ErrorLogEntry = {
      type,
      message,
      timestamp: Date.now(),
      context,
      stack: error instanceof Error ? error.stack : undefined,
      originalError: error,
    };

    // Add to logs array
    this.logs.push(entry);

    // Trim logs if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Log to console for debugging
    this.logToConsole(entry);

    // Call callback if registered
    if (this.onLogCallback) {
      try {
        this.onLogCallback(entry);
      } catch (callbackError) {
        console.error('[ErrorLogger] Error in log callback:', callbackError);
      }
    }
  }

  /**
   * Log to console with formatted output
   * 
   * Formats and outputs the error log entry to the console for debugging.
   * 
   * @param entry - The error log entry to output
   * @private
   */
  private logToConsole(entry: ErrorLogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const contextStr = Object.keys(entry.context).length > 0
      ? JSON.stringify(entry.context, null, 2)
      : 'No additional context';

    console.error(
      `[ErrorLogger] ${timestamp}\n` +
      `Type: ${entry.type}\n` +
      `Message: ${entry.message}\n` +
      `Context: ${contextStr}`
    );

    if (entry.stack) {
      console.error(`Stack: ${entry.stack}`);
    }
  }

  /**
   * Register a callback to be called when errors are logged
   * 
   * Sets a callback function that will be called for every error logged.
   * Useful for sending errors to external monitoring services like Sentry.
   * 
   * @param callback - Function to call with each error log entry
   * 
   * @example
   * ```typescript
   * logger.onLog((entry) => {
   *   // Send to monitoring service
   *   Sentry.captureException(entry.originalError, {
   *     extra: entry.context
   *   });
   * });
   * ```
   */
  onLog(callback: (entry: ErrorLogEntry) => void): void {
    this.onLogCallback = callback;
  }

  /**
   * Get all logged errors
   * 
   * Returns a copy of all error log entries stored in memory.
   * 
   * @returns Array of all error log entries
   * 
   * @example
   * ```typescript
   * const logs = logger.getLogs();
   * console.log(`Total errors: ${logs.length}`);
   * ```
   */
  getLogs(): ErrorLogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs filtered by error type
   * 
   * Returns only the error log entries matching the specified type.
   * 
   * @param type - The error type to filter by
   * @returns Array of matching error log entries
   * 
   * @example
   * ```typescript
   * const micErrors = logger.getLogsByType('microphone_permission_denied');
   * console.log(`Microphone errors: ${micErrors.length}`);
   * ```
   */
  getLogsByType(type: ErrorType): ErrorLogEntry[] {
    return this.logs.filter(log => log.type === type);
  }

  /**
   * Get logs within a time range
   * 
   * Returns error log entries that occurred between the specified timestamps.
   * 
   * @param startTime - Start timestamp in milliseconds
   * @param endTime - End timestamp in milliseconds
   * @returns Array of error log entries within the time range
   * 
   * @example
   * ```typescript
   * const lastHour = Date.now() - 3600000;
   * const recentErrors = logger.getLogsByTimeRange(lastHour, Date.now());
   * ```
   */
  getLogsByTimeRange(startTime: number, endTime: number): ErrorLogEntry[] {
    return this.logs.filter(
      log => log.timestamp >= startTime && log.timestamp <= endTime
    );
  }

  /**
   * Get logs for a specific session
   * 
   * Returns error log entries associated with the specified session ID.
   * 
   * @param sessionId - The session ID to filter by
   * @returns Array of error log entries for the session
   * 
   * @example
   * ```typescript
   * const sessionErrors = logger.getLogsBySession('session_123');
   * console.log(`Errors in session: ${sessionErrors.length}`);
   * ```
   */
  getLogsBySession(sessionId: string): ErrorLogEntry[] {
    return this.logs.filter(log => log.context.sessionId === sessionId);
  }

  /**
   * Clear all logs
   * 
   * Removes all error log entries from memory.
   * 
   * @example
   * ```typescript
   * logger.clearLogs();
   * ```
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Export logs as JSON string
   * 
   * Serializes all error log entries to a formatted JSON string.
   * Useful for saving logs to a file or sending to a server.
   * 
   * @returns JSON string representation of all logs
   * 
   * @example
   * ```typescript
   * const json = logger.exportLogs();
   * // Save to file or send to server
   * ```
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Get error statistics
   * 
   * Returns statistics about logged errors including total count,
   * breakdown by type, and count of recent errors (last hour).
   * 
   * @returns Statistics object with total, byType, and recentErrors counts
   * 
   * @example
   * ```typescript
   * const stats = logger.getStatistics();
   * console.log(`Total errors: ${stats.total}`);
   * console.log(`Recent errors: ${stats.recentErrors}`);
   * console.log('By type:', stats.byType);
   * ```
   */
  getStatistics(): {
    total: number;
    byType: Record<ErrorType, number>;
    recentErrors: number;
  } {
    const byType: Record<string, number> = {};
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let recentErrors = 0;

    this.logs.forEach(log => {
      byType[log.type] = (byType[log.type] || 0) + 1;
      if (log.timestamp >= oneHourAgo) {
        recentErrors++;
      }
    });

    return {
      total: this.logs.length,
      byType: byType as Record<ErrorType, number>,
      recentErrors,
    };
  }
}

// Singleton instance for global use
let globalLogger: ErrorLogger | null = null;

/**
 * Get the global error logger instance
 * 
 * Returns the singleton ErrorLogger instance, creating it if it doesn't exist.
 * 
 * @returns The global ErrorLogger instance
 * 
 * @example
 * ```typescript
 * const logger = getErrorLogger();
 * logger.logError('network_error', 'Connection failed', {});
 * ```
 */
export function getErrorLogger(): ErrorLogger {
  if (!globalLogger) {
    globalLogger = new ErrorLogger();
  }
  return globalLogger;
}

/**
 * Convenience function to log an error using the global logger
 * 
 * Shorthand for getErrorLogger().logError(). Logs an error to the global
 * error logger instance.
 * 
 * @param type - Type of error
 * @param message - Error message
 * @param context - Additional context information (optional)
 * @param error - Original error object (optional)
 * 
 * @example
 * ```typescript
 * logError(
 *   'ai_service_timeout',
 *   'Request timed out',
 *   { component: 'LLMClient', action: 'sendMessage' },
 *   error
 * );
 * ```
 */
export function logError(
  type: ErrorType,
  message: string,
  context?: ErrorContext,
  error?: unknown
): void {
  getErrorLogger().logError(type, message, context, error);
}
