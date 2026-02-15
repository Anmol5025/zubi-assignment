/**
 * NetworkMonitor tests
 * 
 * Tests network connectivity monitoring, automatic reconnection,
 * and connection status updates.
 * 
 * Requirements: 10.3
 */

import { NetworkMonitor } from './NetworkMonitor';
import type { ConnectionStatus } from './NetworkMonitor';
import * as fc from 'fast-check';

describe('NetworkMonitor', () => {
  let monitor: NetworkMonitor;
  let onlineCallback: () => void;
  let offlineCallback: () => void;

  beforeEach(() => {
    // Mock window.addEventListener
    onlineCallback = jest.fn();
    offlineCallback = jest.fn();
    
    const originalAddEventListener = window.addEventListener;
    jest.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'online') {
        onlineCallback = handler as () => void;
      } else if (event === 'offline') {
        offlineCallback = handler as () => void;
      }
      return originalAddEventListener.call(window, event, handler);
    });

    // Mock fetch for connectivity checks
    global.fetch = jest.fn();
  });

  afterEach(() => {
    if (monitor) {
      monitor.destroy();
    }
    jest.restoreAllMocks();
    jest.clearAllTimers();
  });

  describe('initialization', () => {
    it('should start with online status', () => {
      monitor = new NetworkMonitor();
      expect(monitor.getStatus()).toBe('online');
      expect(monitor.isOnline()).toBe(true);
    });

    it('should set up event listeners', () => {
      monitor = new NetworkMonitor();
      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should accept custom configuration', () => {
      monitor = new NetworkMonitor({
        reconnectAttempts: 5,
        reconnectDelayMs: 3000,
      });
      expect(monitor).toBeDefined();
    });
  });

  describe('connection status', () => {
    it('should detect offline status and start reconnecting', () => {
      monitor = new NetworkMonitor();
      
      // Simulate offline event
      offlineCallback();
      
      // Should transition to reconnecting (automatic reconnection starts immediately)
      expect(monitor.getStatus()).toBe('reconnecting');
      expect(monitor.isReconnecting()).toBe(true);
      expect(monitor.isOnline()).toBe(false);
    });

    it('should detect online status after being offline', () => {
      monitor = new NetworkMonitor();
      
      // Go offline (will start reconnecting)
      offlineCallback();
      expect(monitor.isReconnecting()).toBe(true);
      
      // Go back online
      onlineCallback();
      expect(monitor.isOnline()).toBe(true);
    });

    it('should notify callbacks on status change', () => {
      monitor = new NetworkMonitor();
      const callback = jest.fn();
      
      monitor.onStatusChange(callback);
      
      // Should be called immediately with current status
      expect(callback).toHaveBeenCalledWith('online');
      
      // Simulate offline - will transition to offline then reconnecting
      offlineCallback();
      expect(callback).toHaveBeenCalledWith('offline');
      expect(callback).toHaveBeenCalledWith('reconnecting');
    });

    it('should allow unsubscribing from status changes', () => {
      monitor = new NetworkMonitor();
      const callback = jest.fn();
      
      const unsubscribe = monitor.onStatusChange(callback);
      callback.mockClear();
      
      unsubscribe();
      
      // Status change should not trigger callback
      offlineCallback();
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('automatic reconnection', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should attempt reconnection when going offline', () => {
      monitor = new NetworkMonitor({ reconnectDelayMs: 1000 });
      const callback = jest.fn();
      monitor.onStatusChange(callback);
      callback.mockClear();
      
      // Go offline
      offlineCallback();
      
      expect(callback).toHaveBeenCalledWith('offline');
      expect(callback).toHaveBeenCalledWith('reconnecting');
    });

    it('should retry multiple times', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      monitor = new NetworkMonitor({
        reconnectAttempts: 3,
        reconnectDelayMs: 1000,
        pingIntervalMs: 60000, // Long interval to avoid interference
      });
      
      const callback = jest.fn();
      monitor.onStatusChange(callback);
      callback.mockClear();
      
      // Go offline
      offlineCallback();
      
      // First reconnect attempt
      await jest.advanceTimersByTimeAsync(1000);
      expect(monitor.isReconnecting()).toBe(true);
      
      // Second reconnect attempt
      await jest.advanceTimersByTimeAsync(1000);
      expect(monitor.isReconnecting()).toBe(true);
      
      // Third reconnect attempt
      await jest.advanceTimersByTimeAsync(1000);
      
      // After max attempts, should be offline
      await jest.advanceTimersByTimeAsync(100);
      expect(monitor.isOffline()).toBe(true);
    });

    it('should stop reconnecting when connection is restored', async () => {
      let fetchCallCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        fetchCallCount++;
        if (fetchCallCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ ok: true });
      });
      
      monitor = new NetworkMonitor({
        reconnectAttempts: 3,
        reconnectDelayMs: 1000,
        pingIntervalMs: 60000,
      });
      
      // Go offline (will start reconnecting)
      offlineCallback();
      expect(monitor.isReconnecting()).toBe(true);
      
      // Wait for reconnect attempt
      await jest.advanceTimersByTimeAsync(1000);
      
      // Connection should be restored
      await jest.advanceTimersByTimeAsync(100);
      expect(monitor.isOnline()).toBe(true);
    });
  });

  describe('connectivity checking', () => {
    it('should check connectivity with fetch', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      
      monitor = new NetworkMonitor({ pingUrl: 'https://example.com/ping' });
      
      const isConnected = await monitor.checkNow();
      
      expect(isConnected).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/ping',
        expect.objectContaining({
          method: 'HEAD',
          mode: 'no-cors',
        })
      );
    });

    it('should detect connectivity loss via ping', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      monitor = new NetworkMonitor();
      
      const isConnected = await monitor.checkNow();
      
      expect(isConnected).toBe(false);
    });

    it('should handle fetch timeout', async () => {
      jest.useFakeTimers();
      
      let abortCalled = false;
      (global.fetch as jest.Mock).mockImplementation((_url, options) => {
        return new Promise((_, reject) => {
          options?.signal?.addEventListener('abort', () => {
            abortCalled = true;
            reject(new Error('Aborted'));
          });
        });
      });
      
      monitor = new NetworkMonitor();
      
      const checkPromise = monitor.checkNow();
      jest.advanceTimersByTime(6000);
      
      await expect(checkPromise).resolves.toBe(false);
      expect(abortCalled).toBe(true);
      
      jest.useRealTimers();
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on destroy', () => {
      monitor = new NetworkMonitor();
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      monitor.destroy();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should clear callbacks on destroy', () => {
      monitor = new NetworkMonitor();
      const callback = jest.fn();
      
      monitor.onStatusChange(callback);
      callback.mockClear();
      
      monitor.destroy();
      
      // Callbacks should not be called after destroy
      offlineCallback();
      expect(callback).not.toHaveBeenCalled();
    });

    it('should not process events after destroy', () => {
      monitor = new NetworkMonitor();
      const callback = jest.fn();
      monitor.onStatusChange(callback);
      
      monitor.destroy();
      callback.mockClear();
      
      // Try to trigger offline event
      offlineCallback();
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle callback errors gracefully', () => {
      monitor = new NetworkMonitor();
      
      let shouldThrow = false;
      const errorCallback = jest.fn(() => {
        if (shouldThrow) {
          throw new Error('Callback error');
        }
      });
      const goodCallback = jest.fn();
      
      // Suppress console.error for this test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Register callbacks (won't throw yet)
      monitor.onStatusChange(errorCallback);
      monitor.onStatusChange(goodCallback);
      
      // Clear the initial calls
      errorCallback.mockClear();
      goodCallback.mockClear();
      
      // Now enable throwing
      shouldThrow = true;
      
      // Should not throw when triggering status change
      expect(() => offlineCallback()).not.toThrow();
      
      // Good callback should still be called
      expect(goodCallback).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    it('should not update status if already in that state', () => {
      monitor = new NetworkMonitor();
      const callback = jest.fn();
      monitor.onStatusChange(callback);
      callback.mockClear();
      
      // Already online, trigger online again
      onlineCallback();
      
      // Should not notify callbacks
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * **Validates: Requirements 10.3**
     * 
     * Property 30: Network Reconnection Behavior
     * For any network connectivity loss event, the system should automatically
     * attempt to reconnect at least once.
     */
    it('Property 30: automatic reconnection attempt on connectivity loss', async () => {
      jest.useFakeTimers();

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }), // reconnectAttempts (at least 1)
          fc.integer({ min: 500, max: 5000 }), // reconnectDelayMs
          async (reconnectAttempts, reconnectDelayMs) => {
            // Track reconnection attempts
            let fetchCallCount = 0;
            (global.fetch as jest.Mock).mockImplementation(() => {
              fetchCallCount++;
              // Always fail to ensure reconnection attempts continue
              return Promise.reject(new Error('Network error'));
            });

            const testMonitor = new NetworkMonitor({
              reconnectAttempts,
              reconnectDelayMs,
              pingIntervalMs: 60000, // Long interval to avoid interference
            });

            const statusChanges: ConnectionStatus[] = [];
            testMonitor.onStatusChange((status) => {
              statusChanges.push(status);
            });

            // Clear initial status
            statusChanges.length = 0;
            fetchCallCount = 0;

            // Simulate offline event
            window.dispatchEvent(new Event('offline'));

            // Wait for first reconnection attempt
            await jest.advanceTimersByTimeAsync(reconnectDelayMs + 100);

            // Verify at least one reconnection attempt was made
            // The system should transition to 'offline' then 'reconnecting'
            expect(statusChanges).toContain('offline');
            expect(statusChanges).toContain('reconnecting');
            
            // Verify at least one fetch call was made (reconnection attempt)
            expect(fetchCallCount).toBeGreaterThanOrEqual(1);

            testMonitor.destroy();
          }
        ),
        { numRuns: 5 }
      );

      jest.useRealTimers();
    });
  });
});
