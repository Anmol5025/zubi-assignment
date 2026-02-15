/**
 * ErrorLogger Tests
 * 
 * Tests for the centralized error logging utility
 */

import { ErrorLogger, getErrorLogger, logError, ErrorType } from './errorLogger';
import * as fc from 'fast-check';

describe('ErrorLogger', () => {
  let logger: ErrorLogger;

  beforeEach(() => {
    logger = new ErrorLogger();
  });

  describe('logError', () => {
    it('should log an error with all required fields', () => {
      const beforeTime = Date.now();
      
      logger.logError(
        'microphone_permission_denied',
        'Microphone access denied by user',
        { component: 'MicrophoneHandler', action: 'requestPermission' }
      );

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      
      const log = logs[0];
      expect(log.type).toBe('microphone_permission_denied');
      expect(log.message).toBe('Microphone access denied by user');
      expect(log.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(log.timestamp).toBeLessThanOrEqual(Date.now());
      expect(log.context.component).toBe('MicrophoneHandler');
      expect(log.context.action).toBe('requestPermission');
    });

    it('should include stack trace when error object is provided', () => {
      const error = new Error('Test error');
      
      logger.logError(
        'ai_service_error',
        'AI service failed',
        { component: 'LLMClient' },
        error
      );

      const logs = logger.getLogs();
      expect(logs[0].stack).toBeDefined();
      expect(logs[0].stack).toContain('Error: Test error');
      expect(logs[0].originalError).toBe(error);
    });

    it('should handle errors without context', () => {
      logger.logError('network_error', 'Network connection lost');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].context).toEqual({});
    });

    it('should store additional data in context', () => {
      logger.logError(
        'tool_execution_error',
        'Tool failed to execute',
        {
          component: 'ToolRegistry',
          additionalData: {
            toolName: 'highlight_image_area',
            parameters: { area: 'top', color: 'yellow' }
          }
        }
      );

      const logs = logger.getLogs();
      expect(logs[0].context.additionalData).toEqual({
        toolName: 'highlight_image_area',
        parameters: { area: 'top', color: 'yellow' }
      });
    });

    it('should include sessionId when provided', () => {
      logger.logError(
        'conversation_error',
        'Conversation failed',
        { sessionId: 'session-123' }
      );

      const logs = logger.getLogs();
      expect(logs[0].context.sessionId).toBe('session-123');
    });
  });

  describe('log management', () => {
    it('should respect maxLogs limit', () => {
      const smallLogger = new ErrorLogger(3);

      smallLogger.logError('network_error', 'Error 1');
      smallLogger.logError('network_error', 'Error 2');
      smallLogger.logError('network_error', 'Error 3');
      smallLogger.logError('network_error', 'Error 4');

      const logs = smallLogger.getLogs();
      expect(logs).toHaveLength(3);
      expect(logs[0].message).toBe('Error 2');
      expect(logs[2].message).toBe('Error 4');
    });

    it('should clear all logs', () => {
      logger.logError('network_error', 'Error 1');
      logger.logError('network_error', 'Error 2');
      
      expect(logger.getLogs()).toHaveLength(2);
      
      logger.clearLogs();
      
      expect(logger.getLogs()).toHaveLength(0);
    });
  });

  describe('filtering and querying', () => {
    beforeEach(() => {
      logger.logError('microphone_error', 'Mic error 1', { sessionId: 'session-1' });
      logger.logError('network_error', 'Network error 1', { sessionId: 'session-1' });
      logger.logError('microphone_error', 'Mic error 2', { sessionId: 'session-2' });
      logger.logError('ai_service_error', 'AI error 1', { sessionId: 'session-2' });
    });

    it('should filter logs by type', () => {
      const micErrors = logger.getLogsByType('microphone_error');
      expect(micErrors).toHaveLength(2);
      expect(micErrors[0].message).toBe('Mic error 1');
      expect(micErrors[1].message).toBe('Mic error 2');
    });

    it('should filter logs by session', () => {
      const session1Logs = logger.getLogsBySession('session-1');
      expect(session1Logs).toHaveLength(2);
      expect(session1Logs[0].type).toBe('microphone_error');
      expect(session1Logs[1].type).toBe('network_error');
    });

    it('should filter logs by time range', () => {
      const startTime = Date.now() - 1000;
      const endTime = Date.now() + 1000;
      
      const logsInRange = logger.getLogsByTimeRange(startTime, endTime);
      expect(logsInRange).toHaveLength(4);
    });

    it('should return empty array for non-existent session', () => {
      const logs = logger.getLogsBySession('non-existent');
      expect(logs).toHaveLength(0);
    });
  });

  describe('statistics', () => {
    it('should calculate error statistics', () => {
      logger.logError('microphone_error', 'Error 1');
      logger.logError('microphone_error', 'Error 2');
      logger.logError('network_error', 'Error 3');
      logger.logError('ai_service_error', 'Error 4');

      const stats = logger.getStatistics();
      
      expect(stats.total).toBe(4);
      expect(stats.byType.microphone_error).toBe(2);
      expect(stats.byType.network_error).toBe(1);
      expect(stats.byType.ai_service_error).toBe(1);
      expect(stats.recentErrors).toBe(4);
    });

    it('should count recent errors correctly', () => {
      // Test that recent errors (within last hour) are counted separately
      logger.logError('network_error', 'Recent error 1');
      logger.logError('microphone_error', 'Recent error 2');

      const stats = logger.getStatistics();
      expect(stats.total).toBe(2);
      expect(stats.recentErrors).toBe(2); // Both are recent
    });
  });

  describe('export', () => {
    it('should export logs as JSON', () => {
      logger.logError('network_error', 'Test error', { component: 'Test' });
      
      const exported = logger.exportLogs();
      const parsed = JSON.parse(exported);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe('network_error');
      expect(parsed[0].message).toBe('Test error');
    });
  });

  describe('callback', () => {
    it('should call onLog callback when error is logged', () => {
      const callback = jest.fn();
      logger.onLog(callback);

      logger.logError('network_error', 'Test error');

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'network_error',
          message: 'Test error',
        })
      );
    });

    it('should handle callback errors gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      logger.onLog(() => {
        throw new Error('Callback error');
      });

      // Should not throw
      expect(() => {
        logger.logError('network_error', 'Test error');
      }).not.toThrow();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('console logging', () => {
    it('should log to console with formatted output', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      logger.logError(
        'ai_service_error',
        'AI service failed',
        { component: 'LLMClient', action: 'sendMessage' }
      );

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain('[ErrorLogger]');
      expect(logOutput).toContain('Type: ai_service_error');
      expect(logOutput).toContain('Message: AI service failed');
      expect(logOutput).toContain('Context:');

      consoleErrorSpy.mockRestore();
    });
  });
});

describe('Global error logger', () => {
  it('should return singleton instance', () => {
    const logger1 = getErrorLogger();
    const logger2 = getErrorLogger();
    
    expect(logger1).toBe(logger2);
  });

  it('should work with convenience function', () => {
    const logger = getErrorLogger();
    logger.clearLogs();

    logError('network_error', 'Test error', { component: 'Test' });

    const logs = logger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].type).toBe('network_error');
    expect(logs[0].message).toBe('Test error');
  });
});

describe('Error types', () => {
  let logger: ErrorLogger;

  beforeEach(() => {
    logger = new ErrorLogger();
  });

  it('should support all critical error types', () => {
    const errorTypes = [
      'microphone_permission_denied',
      'microphone_not_found',
      'microphone_in_use',
      'microphone_error',
      'speech_recognition_error',
      'speech_synthesis_error',
      'ai_service_error',
      'ai_service_timeout',
      'network_error',
      'network_offline',
      'tool_execution_error',
      'conversation_error',
      'unknown_error',
    ] as const;

    errorTypes.forEach(type => {
      expect(() => {
        logger.logError(type, `Test ${type}`);
      }).not.toThrow();
    });

    expect(logger.getLogs()).toHaveLength(errorTypes.length);
  });
});

// ============================================================================
// Property-Based Tests
// ============================================================================

describe('Property-Based Tests', () => {
  /**
   * **Property 31: Critical Error Logging**
   * **Validates: Requirements 10.4**
   * 
   * For any critical error (microphone failure, AI service failure, network failure),
   * the system should create a log entry with error details.
   */
  describe('Property 31: Critical Error Logging', () => {
    it('should create log entry with error details for any critical error', () => {
      // Define critical error types
      const criticalErrorTypes: ErrorType[] = [
        'microphone_permission_denied',
        'microphone_not_found',
        'microphone_in_use',
        'microphone_error',
        'ai_service_error',
        'ai_service_timeout',
        'network_error',
        'network_offline',
      ];

      // Arbitrary for error type
      const errorTypeArb = fc.constantFrom(...criticalErrorTypes);

      // Arbitrary for error message
      const errorMessageArb = fc.string({ minLength: 1, maxLength: 200 });

      // Arbitrary for context
      const contextArb = fc.record({
        component: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
        action: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
        sessionId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
        userId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
      });

      // Arbitrary for whether to include an Error object
      const errorObjectArb = fc.option(
        fc.string({ minLength: 1, maxLength: 100 }).map(msg => new Error(msg)),
        { nil: undefined }
      );

      fc.assert(
        fc.property(
          errorTypeArb,
          errorMessageArb,
          contextArb,
          errorObjectArb,
          (errorType, message, context, errorObj) => {
            const logger = new ErrorLogger();
            const beforeTime = Date.now();

            // Log the critical error
            logger.logError(errorType, message, context, errorObj);

            const afterTime = Date.now();
            const logs = logger.getLogs();

            // Property: A log entry must be created
            expect(logs.length).toBe(1);

            const logEntry = logs[0];

            // Property: Log entry must contain error type
            expect(logEntry.type).toBe(errorType);

            // Property: Log entry must contain error message
            expect(logEntry.message).toBe(message);

            // Property: Log entry must have a timestamp
            expect(logEntry.timestamp).toBeGreaterThanOrEqual(beforeTime);
            expect(logEntry.timestamp).toBeLessThanOrEqual(afterTime);

            // Property: Log entry must contain context
            expect(logEntry.context).toBeDefined();
            if (context.component !== undefined) {
              expect(logEntry.context.component).toBe(context.component);
            }
            if (context.action !== undefined) {
              expect(logEntry.context.action).toBe(context.action);
            }
            if (context.sessionId !== undefined) {
              expect(logEntry.context.sessionId).toBe(context.sessionId);
            }
            if (context.userId !== undefined) {
              expect(logEntry.context.userId).toBe(context.userId);
            }

            // Property: If error object provided, stack trace must be included
            if (errorObj) {
              expect(logEntry.stack).toBeDefined();
              expect(logEntry.stack).toContain('Error:');
              expect(logEntry.originalError).toBe(errorObj);
            }

            // Property: Log entry must be retrievable
            const retrievedLogs = logger.getLogs();
            expect(retrievedLogs).toContainEqual(logEntry);

            // Property: Log entry must be filterable by type
            const filteredByType = logger.getLogsByType(errorType);
            expect(filteredByType).toContainEqual(logEntry);

            // Property: If sessionId provided, log must be filterable by session
            if (context.sessionId) {
              const filteredBySession = logger.getLogsBySession(context.sessionId);
              expect(filteredBySession).toContainEqual(logEntry);
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});
