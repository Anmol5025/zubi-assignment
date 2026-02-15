/**
 * NetworkMonitor - Monitors network connectivity and handles reconnection
 * 
 * Detects network connectivity loss, implements automatic reconnection,
 * and provides connection status updates.
 * 
 * Requirements: 10.3
 */

import { logError } from '../utils/errorLogger';

export type ConnectionStatus = 'online' | 'offline' | 'reconnecting';

export interface NetworkStatusCallback {
  (status: ConnectionStatus): void;
}

export interface NetworkMonitorConfig {
  reconnectAttempts?: number;
  reconnectDelayMs?: number;
  pingUrl?: string;
  pingIntervalMs?: number;
}

const DEFAULT_CONFIG: Required<NetworkMonitorConfig> = {
  reconnectAttempts: 3,
  reconnectDelayMs: 2000,
  pingUrl: 'https://www.google.com/favicon.ico',
  pingIntervalMs: 30000,
};

export class NetworkMonitor {
  private config: Required<NetworkMonitorConfig>;
  private status: ConnectionStatus = 'online';
  private callbacks: Set<NetworkStatusCallback> = new Set();
  private reconnectAttempt: number = 0;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private pingIntervalId: ReturnType<typeof setInterval> | null = null;
  private isDestroyed: boolean = false;

  constructor(config: NetworkMonitorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupEventListeners();
    this.startPingMonitoring();
  }

  /**
   * Set up browser online/offline event listeners
   * 
   * Registers event handlers for the browser's online and offline events
   * to detect network connectivity changes.
   * 
   * @private
   */
  private setupEventListeners(): void {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  /**
   * Start periodic ping monitoring to detect connectivity issues
   * 
   * Begins periodic connectivity checks by attempting to fetch a resource.
   * This helps detect connectivity issues that the browser's online/offline
   * events might miss.
   * 
   * @private
   */
  private startPingMonitoring(): void {
    // Initial check
    this.checkConnectivity();

    // Periodic checks
    this.pingIntervalId = setInterval(() => {
      if (!this.isDestroyed) {
        this.checkConnectivity();
      }
    }, this.config.pingIntervalMs);
  }

  /**
   * Check network connectivity by attempting to fetch a resource
   * 
   * Performs an actual network request to verify connectivity.
   * More reliable than just checking navigator.onLine.
   * 
   * @returns Promise resolving to true if connected, false otherwise
   * @private
   */
  private async checkConnectivity(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch(this.config.pingUrl, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      // If we get here, we have connectivity
      if (this.status === 'offline' || this.status === 'reconnecting') {
        this.handleOnline();
      }
      
      return true;
    } catch (error) {
      // Network error detected
      if (this.status === 'online') {
        this.handleOffline();
      }
      return false;
    }
  }

  /**
   * Handle online event
   * 
   * Called when the browser detects network connectivity is restored.
   * Resets reconnection attempts and updates status to online.
   * 
   * @private
   */
  private handleOnline = (): void => {
    if (this.isDestroyed) return;

    console.log('[NetworkMonitor] Connection restored');
    this.reconnectAttempt = 0;
    this.clearReconnectTimeout();
    this.updateStatus('online');
  };

  /**
   * Handle offline event
   * 
   * Called when the browser detects network connectivity is lost.
   * Logs the error and initiates automatic reconnection attempts.
   * 
   * @private
   */
  private handleOffline = (): void => {
    if (this.isDestroyed) return;

    console.log('[NetworkMonitor] Connection lost');
    logError(
      'network_offline',
      'Network connection lost',
      { component: 'NetworkMonitor', action: 'handleOffline' }
    );
    this.updateStatus('offline');
    this.attemptReconnect();
  };

  /**
   * Attempt to reconnect automatically
   * 
   * Implements automatic reconnection with configurable retry attempts.
   * Uses exponential backoff between attempts.
   * 
   * Requirements: 10.3 (automatic reconnection)
   * 
   * @private
   */
  private attemptReconnect(): void {
    if (this.isDestroyed) return;
    if (this.reconnectAttempt >= this.config.reconnectAttempts) {
      console.log('[NetworkMonitor] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempt++;
    this.updateStatus('reconnecting');

    console.log(
      `[NetworkMonitor] Reconnection attempt ${this.reconnectAttempt}/${this.config.reconnectAttempts}`
    );

    this.reconnectTimeoutId = setTimeout(async () => {
      if (this.isDestroyed) return;

      const isConnected = await this.checkConnectivity();
      
      if (!isConnected && this.reconnectAttempt < this.config.reconnectAttempts) {
        // Try again
        this.attemptReconnect();
      } else if (!isConnected) {
        // All attempts failed
        console.log('[NetworkMonitor] All reconnection attempts failed');
        this.updateStatus('offline');
      }
      // If connected, handleOnline will be called by checkConnectivity
    }, this.config.reconnectDelayMs);
  }

  /**
   * Clear reconnect timeout
   * 
   * Cancels any pending reconnection attempt timeout.
   * 
   * @private
   */
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }

  /**
   * Update connection status and notify callbacks
   * 
   * Changes the current connection status and notifies all registered callbacks.
   * Only triggers notifications if the status actually changed.
   * 
   * @param newStatus - The new connection status
   * @private
   */
  private updateStatus(newStatus: ConnectionStatus): void {
    if (this.status === newStatus) return;

    this.status = newStatus;
    this.notifyCallbacks();
  }

  /**
   * Notify all registered callbacks of status change
   * 
   * Calls each registered callback with the current status.
   * Catches and logs any errors from callbacks to prevent one
   * failing callback from affecting others.
   * 
   * @private
   */
  private notifyCallbacks(): void {
    this.callbacks.forEach(callback => {
      try {
        callback(this.status);
      } catch (error) {
        console.error('[NetworkMonitor] Error in status callback:', error);
      }
    });
  }

  /**
   * Register a callback for connection status changes
   * 
   * Adds a callback function that will be called whenever the connection
   * status changes. The callback is immediately called with the current status.
   * 
   * @param callback - Function to call when connection status changes
   * @returns Unsubscribe function to remove the callback
   * 
   * @example
   * ```typescript
   * const monitor = new NetworkMonitor();
   * const unsubscribe = monitor.onStatusChange((status) => {
   *   console.log('Connection status:', status);
   * });
   * // Later: unsubscribe();
   * ```
   */
  onStatusChange(callback: NetworkStatusCallback): () => void {
    this.callbacks.add(callback);
    
    // Immediately call with current status
    callback(this.status);

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Get current connection status
   * 
   * Returns the current connection status without triggering any checks.
   * 
   * @returns Current connection status ('online', 'offline', or 'reconnecting')
   * 
   * @example
   * ```typescript
   * const status = monitor.getStatus();
   * console.log('Current status:', status);
   * ```
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Check if currently online
   * 
   * Convenience method to check if the connection status is 'online'.
   * 
   * @returns True if status is 'online'
   * 
   * @example
   * ```typescript
   * if (monitor.isOnline()) {
   *   console.log('Connected to network');
   * }
   * ```
   */
  isOnline(): boolean {
    return this.status === 'online';
  }

  /**
   * Check if currently offline
   * 
   * Convenience method to check if the connection status is 'offline'.
   * 
   * @returns True if status is 'offline'
   * 
   * @example
   * ```typescript
   * if (monitor.isOffline()) {
   *   console.log('No network connection');
   * }
   * ```
   */
  isOffline(): boolean {
    return this.status === 'offline';
  }

  /**
   * Check if currently reconnecting
   * 
   * Convenience method to check if the connection status is 'reconnecting'.
   * 
   * @returns True if status is 'reconnecting'
   * 
   * @example
   * ```typescript
   * if (monitor.isReconnecting()) {
   *   console.log('Attempting to reconnect...');
   * }
   * ```
   */
  isReconnecting(): boolean {
    return this.status === 'reconnecting';
  }

  /**
   * Manually trigger a connectivity check
   * 
   * Performs an immediate connectivity check by attempting to fetch a resource.
   * Useful for testing or forcing a status update.
   * 
   * @returns Promise resolving to true if connected, false otherwise
   * 
   * @example
   * ```typescript
   * const isConnected = await monitor.checkNow();
   * console.log('Connected:', isConnected);
   * ```
   */
  async checkNow(): Promise<boolean> {
    return this.checkConnectivity();
  }

  /**
   * Clean up resources
   * 
   * Removes event listeners, clears timeouts and intervals, and clears callbacks.
   * Should be called when the monitor is no longer needed to prevent memory leaks.
   * 
   * @example
   * ```typescript
   * monitor.destroy();
   * ```
   */
  destroy(): void {
    this.isDestroyed = true;

    // Remove event listeners
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);

    // Clear timeouts and intervals
    this.clearReconnectTimeout();
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }

    // Clear callbacks
    this.callbacks.clear();
  }
}
