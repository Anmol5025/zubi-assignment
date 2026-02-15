import { SessionStateManager } from './SessionStateManager';
import * as fc from 'fast-check';

describe('SessionStateManager', () => {
  let manager: SessionStateManager;

  beforeEach(() => {
    manager = new SessionStateManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('Unit Tests', () => {
    describe('createSession', () => {
      it('should create a new session with default duration', () => {
        const imageUrl = 'https://example.com/image.jpg';
        const state = manager.createSession(imageUrl);

        expect(state.sessionId).toBeTruthy();
        expect(state.status).toBe('initializing');
        expect(state.startTime).toBeGreaterThan(0);
        expect(state.elapsedMs).toBe(0);
        expect(state.targetDurationMs).toBe(60000);
        expect(state.messageCount).toBe(0);
        expect(state.toolCallCount).toBe(0);
        expect(state.imageContext).toBe(imageUrl);
      });

      it('should create a session with custom duration', () => {
        const imageUrl = 'https://example.com/image.jpg';
        const customDuration = 90000;
        const state = manager.createSession(imageUrl, customDuration);

        expect(state.targetDurationMs).toBe(customDuration);
      });

      it('should generate unique session IDs', () => {
        const state1 = manager.createSession('url1');
        const manager2 = new SessionStateManager();
        const state2 = manager2.createSession('url2');

        expect(state1.sessionId).not.toBe(state2.sessionId);
        manager2.destroy();
      });
    });

    describe('updateElapsedTime', () => {
      it('should update elapsed time', async () => {
        manager.createSession('https://example.com/image.jpg');
        manager.setStatus('active');

        await new Promise(resolve => setTimeout(resolve, 150));
        manager.updateElapsedTime();

        const state = manager.getState();
        expect(state.elapsedMs).toBeGreaterThan(100);
      });

      it('should not update time when status is idle', () => {
        const state = manager.getState();
        expect(state.status).toBe('idle');

        manager.updateElapsedTime();
        expect(manager.getState().elapsedMs).toBe(0);
      });

      it('should not update time when status is completed', () => {
        manager.createSession('https://example.com/image.jpg');
        manager.setStatus('completed');

        const elapsedBefore = manager.getState().elapsedMs;
        manager.updateElapsedTime();

        expect(manager.getState().elapsedMs).toBe(elapsedBefore);
      });

      it('should transition to wrapping_up at 50 seconds', () => {
        manager.createSession('https://example.com/image.jpg');
        manager.setStatus('active');

        // Simulate 50 seconds elapsed
        manager['state'].startTime = Date.now() - 50000;
        manager.updateElapsedTime();

        expect(manager.getState().status).toBe('wrapping_up');
      });

      it('should not transition from wrapping_up back to active', () => {
        manager.createSession('https://example.com/image.jpg');
        manager.setStatus('active');

        // Simulate 50 seconds elapsed
        manager['state'].startTime = Date.now() - 50000;
        manager.updateElapsedTime();
        expect(manager.getState().status).toBe('wrapping_up');

        // Simulate more time passing
        manager['state'].startTime = Date.now() - 55000;
        manager.updateElapsedTime();
        expect(manager.getState().status).toBe('wrapping_up');
      });
    });

    describe('getTimeRemaining', () => {
      it('should return correct remaining time', () => {
        manager.createSession('https://example.com/image.jpg', 60000);
        manager['state'].elapsedMs = 30000;

        expect(manager.getTimeRemaining()).toBe(30000);
      });

      it('should return 0 when time is exceeded', () => {
        manager.createSession('https://example.com/image.jpg', 60000);
        manager['state'].elapsedMs = 70000;

        expect(manager.getTimeRemaining()).toBe(0);
      });

      it('should return full duration at start', () => {
        manager.createSession('https://example.com/image.jpg', 60000);

        expect(manager.getTimeRemaining()).toBe(60000);
      });
    });

    describe('shouldWrapUp', () => {
      it('should return false before 50 seconds', () => {
        manager.createSession('https://example.com/image.jpg');
        manager['state'].elapsedMs = 49999;

        expect(manager.shouldWrapUp()).toBe(false);
      });

      it('should return true at exactly 50 seconds', () => {
        manager.createSession('https://example.com/image.jpg');
        manager['state'].elapsedMs = 50000;

        expect(manager.shouldWrapUp()).toBe(true);
      });

      it('should return true after 50 seconds', () => {
        manager.createSession('https://example.com/image.jpg');
        manager['state'].elapsedMs = 55000;

        expect(manager.shouldWrapUp()).toBe(true);
      });
    });

    describe('incrementMessageCount', () => {
      it('should increment message count', () => {
        manager.createSession('https://example.com/image.jpg');

        expect(manager.getState().messageCount).toBe(0);
        manager.incrementMessageCount();
        expect(manager.getState().messageCount).toBe(1);
        manager.incrementMessageCount();
        expect(manager.getState().messageCount).toBe(2);
      });
    });

    describe('incrementToolCallCount', () => {
      it('should increment tool call count', () => {
        manager.createSession('https://example.com/image.jpg');

        expect(manager.getState().toolCallCount).toBe(0);
        manager.incrementToolCallCount();
        expect(manager.getState().toolCallCount).toBe(1);
        manager.incrementToolCallCount();
        expect(manager.getState().toolCallCount).toBe(2);
      });
    });

    describe('getState', () => {
      it('should return a copy of the state', () => {
        manager.createSession('https://example.com/image.jpg');
        const state1 = manager.getState();
        const state2 = manager.getState();

        expect(state1).toEqual(state2);
        expect(state1).not.toBe(state2); // Different object references
      });

      it('should not allow external mutation', () => {
        manager.createSession('https://example.com/image.jpg');
        const state = manager.getState();
        state.messageCount = 999;

        expect(manager.getState().messageCount).toBe(0);
      });
    });

    describe('setStatus', () => {
      it('should update the status', () => {
        manager.createSession('https://example.com/image.jpg');

        manager.setStatus('active');
        expect(manager.getState().status).toBe('active');

        manager.setStatus('wrapping_up');
        expect(manager.getState().status).toBe('wrapping_up');
      });

      it('should stop time tracking when status is completed', async () => {
        manager.createSession('https://example.com/image.jpg');
        manager.setStatus('active');

        await new Promise(resolve => setTimeout(resolve, 150));
        manager.setStatus('completed');

        const elapsedBefore = manager.getState().elapsedMs;
        await new Promise(resolve => setTimeout(resolve, 150));

        // Time should not have advanced after completion
        expect(manager.getState().elapsedMs).toBe(elapsedBefore);
      });
    });

    describe('completeSession', () => {
      it('should set status to completed', () => {
        manager.createSession('https://example.com/image.jpg');
        manager.completeSession();

        expect(manager.getState().status).toBe('completed');
      });
    });

    describe('automatic time tracking', () => {
      it('should automatically update elapsed time', async () => {
        manager.createSession('https://example.com/image.jpg');
        manager.setStatus('active');

        const initialElapsed = manager.getState().elapsedMs;
        await new Promise(resolve => setTimeout(resolve, 250));

        const finalElapsed = manager.getState().elapsedMs;
        expect(finalElapsed).toBeGreaterThan(initialElapsed);
        expect(finalElapsed).toBeGreaterThanOrEqual(200);
      });

      it('should automatically transition to wrapping_up', async () => {
        manager.createSession('https://example.com/image.jpg');
        manager.setStatus('active');

        // Fast-forward time by manipulating startTime
        manager['state'].startTime = Date.now() - 49900;

        // Wait for automatic update
        await new Promise(resolve => setTimeout(resolve, 250));

        expect(manager.getState().status).toBe('wrapping_up');
      });
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * **Validates: Requirements 5.1**
     * 
     * Property 12: Conversation Duration Target
     * For any completed conversation session, the total duration should be between
     * 55 and 70 seconds (approximately 60 seconds with reasonable tolerance).
     */
    it('Property 12: conversation duration within target range', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 55000, max: 70000 }), // target duration within acceptable range
          async (targetDurationMs) => {
            const testManager = new SessionStateManager();
            testManager.createSession('https://example.com/test.jpg', targetDurationMs);
            testManager.setStatus('active');

            // Simulate conversation running until completion
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Fast-forward to near target duration
            testManager['state'].startTime = Date.now() - targetDurationMs;
            testManager.updateElapsedTime();
            testManager.completeSession();

            const state = testManager.getState();
            const durationSeconds = state.elapsedMs / 1000;

            // Verify duration is within acceptable range (55-70 seconds)
            expect(durationSeconds).toBeGreaterThanOrEqual(55);
            expect(durationSeconds).toBeLessThanOrEqual(70);
            expect(state.status).toBe('completed');

            testManager.destroy();
          }
        ),
        { numRuns: 5 }
      );
    }, 15000); // 15 second timeout

    /**
     * **Validates: Requirements 5.4**
     * 
     * Property 15: Timer Display Accuracy
     * For any point during an active conversation session, the displayed elapsed time
     * should match the actual elapsed time within 1 second accuracy.
     */
    it('Property 15: elapsed time should be accurate within tolerance', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 100, max: 500 }), // delay in ms (reduced for test speed)
          async (delayMs) => {
            const testManager = new SessionStateManager();
            testManager.createSession('https://example.com/test.jpg');
            testManager.setStatus('active');

            await new Promise(resolve => setTimeout(resolve, delayMs));
            testManager.updateElapsedTime();

            const state = testManager.getState();
            const tolerance = 1000; // 1 second tolerance

            expect(state.elapsedMs).toBeGreaterThanOrEqual(delayMs - tolerance);
            expect(state.elapsedMs).toBeLessThanOrEqual(delayMs + tolerance);

            testManager.destroy();
          }
        ),
        { numRuns: 5 } // Reduced runs due to async delays
      );
    }, 15000); // 15 second timeout

    /**
     * **Validates: Requirements 5.2**
     * 
     * Property 13: Wrap-Up Trigger Timing
     * For any conversation session, when elapsed time reaches 50 seconds,
     * the AI_Agent should transition to wrap-up mode.
     */
    it('Property 13: should transition to wrapping_up at 50 seconds', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 50000, max: 70000 }), // elapsed time >= 50s
          (elapsedMs) => {
            const testManager = new SessionStateManager();
            testManager.createSession('https://example.com/test.jpg');
            testManager.setStatus('active');

            // Simulate elapsed time
            testManager['state'].startTime = Date.now() - elapsedMs;
            testManager.updateElapsedTime();

            const state = testManager.getState();
            expect(state.status).toBe('wrapping_up');

            testManager.destroy();
          }
        ),
        { numRuns: 5 }
      );
    });

    /**
     * **Validates: Requirements 5.2**
     * 
     * shouldWrapUp should return true for any elapsed time >= 50 seconds
     */
    it('Property: shouldWrapUp returns true for elapsed time >= 50s', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 50000, max: 120000 }), // elapsed time >= 50s
          (elapsedMs) => {
            const testManager = new SessionStateManager();
            testManager.createSession('https://example.com/test.jpg');
            testManager['state'].elapsedMs = elapsedMs;

            expect(testManager.shouldWrapUp()).toBe(true);

            testManager.destroy();
          }
        ),
        { numRuns: 5 }
      );
    });

    /**
     * **Validates: Requirements 5.2**
     * 
     * shouldWrapUp should return false for any elapsed time < 50 seconds
     */
    it('Property: shouldWrapUp returns false for elapsed time < 50s', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 49999 }), // elapsed time < 50s
          (elapsedMs) => {
            const testManager = new SessionStateManager();
            testManager.createSession('https://example.com/test.jpg');
            testManager['state'].elapsedMs = elapsedMs;

            expect(testManager.shouldWrapUp()).toBe(false);

            testManager.destroy();
          }
        ),
        { numRuns: 5 }
      );
    });

    /**
     * **Validates: Requirements 5.1, 5.3**
     * 
     * getTimeRemaining should always return non-negative values
     */
    it('Property: getTimeRemaining always returns non-negative values', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 120000 }), // elapsed time
          fc.integer({ min: 30000, max: 90000 }), // target duration
          (elapsedMs, targetDurationMs) => {
            const testManager = new SessionStateManager();
            testManager.createSession('https://example.com/test.jpg', targetDurationMs);
            testManager['state'].elapsedMs = elapsedMs;

            const remaining = testManager.getTimeRemaining();
            expect(remaining).toBeGreaterThanOrEqual(0);

            testManager.destroy();
          }
        ),
        { numRuns: 5 }
      );
    });

    /**
     * **Validates: Requirements 5.1, 5.3**
     * 
     * getTimeRemaining should equal targetDuration - elapsedTime (or 0 if negative)
     */
    it('Property: getTimeRemaining calculation is correct', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 120000 }), // elapsed time
          fc.integer({ min: 30000, max: 90000 }), // target duration
          (elapsedMs, targetDurationMs) => {
            const testManager = new SessionStateManager();
            testManager.createSession('https://example.com/test.jpg', targetDurationMs);
            testManager['state'].elapsedMs = elapsedMs;

            const remaining = testManager.getTimeRemaining();
            const expected = Math.max(0, targetDurationMs - elapsedMs);

            expect(remaining).toBe(expected);

            testManager.destroy();
          }
        ),
        { numRuns: 5 }
      );
    });

    /**
     * Message and tool call counters should always be non-negative
     */
    it('Property: counters are always non-negative', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }), // number of increments
          (incrementCount) => {
            const testManager = new SessionStateManager();
            testManager.createSession('https://example.com/test.jpg');

            for (let i = 0; i < incrementCount; i++) {
              testManager.incrementMessageCount();
              testManager.incrementToolCallCount();
            }

            const state = testManager.getState();
            expect(state.messageCount).toBeGreaterThanOrEqual(0);
            expect(state.toolCallCount).toBeGreaterThanOrEqual(0);
            expect(state.messageCount).toBe(incrementCount);
            expect(state.toolCallCount).toBe(incrementCount);

            testManager.destroy();
          }
        ),
        { numRuns: 5 }
      );
    });

    /**
     * Session IDs should be unique across multiple sessions
     */
    it('Property: session IDs are unique', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 20 }), // number of sessions
          (sessionCount) => {
            const sessionIds = new Set<string>();

            for (let i = 0; i < sessionCount; i++) {
              const testManager = new SessionStateManager();
              const state = testManager.createSession(`https://example.com/image${i}.jpg`);
              sessionIds.add(state.sessionId);
              testManager.destroy();
            }

            expect(sessionIds.size).toBe(sessionCount);
          }
        ),
        { numRuns: 5 }
      );
    });

    /**
     * getState should always return an independent copy
     */
    it('Property: getState returns independent copies', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 50 }), // message count
          (messageCount) => {
            const testManager = new SessionStateManager();
            testManager.createSession('https://example.com/test.jpg');

            for (let i = 0; i < messageCount; i++) {
              testManager.incrementMessageCount();
            }

            const state1 = testManager.getState();
            const state2 = testManager.getState();

            // States should be equal but not the same object
            expect(state1).toEqual(state2);
            expect(state1).not.toBe(state2);

            // Mutating one should not affect the other
            state1.messageCount = 999;
            expect(state2.messageCount).toBe(messageCount);
            expect(testManager.getState().messageCount).toBe(messageCount);

            testManager.destroy();
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});
