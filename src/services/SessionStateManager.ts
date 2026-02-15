/**
 * SessionStateManager
 * 
 * Manages conversation session state including timing, status transitions,
 * and tracking of messages and tool calls.
 * 
 * Validates Requirements: 5.1, 5.2, 5.3, 5.4
 */

export type SessionStatus = 'idle' | 'initializing' | 'active' | 'wrapping_up' | 'completed';

export interface SessionState {
  sessionId: string;
  status: SessionStatus;
  startTime: number;
  elapsedMs: number;
  targetDurationMs: number;
  messageCount: number;
  toolCallCount: number;
  imageContext: string;
}

export class SessionStateManager {
  private state: SessionState;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.state = {
      sessionId: '',
      status: 'idle',
      startTime: 0,
      elapsedMs: 0,
      targetDurationMs: 60000, // Default 60 seconds
      messageCount: 0,
      toolCallCount: 0,
      imageContext: '',
    };
  }

  /**
   * Creates a new conversation session
   * @param imageUrl - URL of the image for the conversation context
   * @param durationMs - Target duration in milliseconds (default: 60000)
   * @returns The newly created session state
   */
  createSession(imageUrl: string, durationMs: number = 60000): SessionState {
    this.state = {
      sessionId: this.generateSessionId(),
      status: 'initializing',
      startTime: Date.now(),
      elapsedMs: 0,
      targetDurationMs: durationMs,
      messageCount: 0,
      toolCallCount: 0,
      imageContext: imageUrl,
    };

    // Start automatic time tracking
    this.startTimeTracking();

    return { ...this.state };
  }

  /**
   * Updates the elapsed time since session start
   * Automatically transitions to wrapping_up state at 50 seconds
   */
  updateElapsedTime(): void {
    if (this.state.status === 'idle' || this.state.status === 'completed') {
      return;
    }

    this.state.elapsedMs = Date.now() - this.state.startTime;

    // Auto-transition to wrapping_up at 50 seconds (Requirement 5.2)
    if (this.state.elapsedMs >= 50000 && this.state.status === 'active') {
      this.state.status = 'wrapping_up';
    }
  }

  /**
   * Gets the remaining time in the conversation
   * @returns Remaining time in milliseconds
   */
  getTimeRemaining(): number {
    const remaining = this.state.targetDurationMs - this.state.elapsedMs;
    return Math.max(0, remaining);
  }

  /**
   * Determines if the conversation should begin wrapping up
   * @returns true if elapsed time >= 50 seconds
   */
  shouldWrapUp(): boolean {
    return this.state.elapsedMs >= 50000;
  }

  /**
   * Increments the message counter
   */
  incrementMessageCount(): void {
    this.state.messageCount++;
  }

  /**
   * Increments the tool call counter
   */
  incrementToolCallCount(): void {
    this.state.toolCallCount++;
  }

  /**
   * Gets the current session state
   * @returns A copy of the current state
   */
  getState(): SessionState {
    return { ...this.state };
  }

  /**
   * Updates the session status
   * @param status - The new status to set
   */
  setStatus(status: SessionStatus): void {
    this.state.status = status;

    // Stop time tracking when session completes
    if (status === 'completed') {
      this.stopTimeTracking();
    }
  }

  /**
   * Completes the session and stops time tracking
   */
  completeSession(): void {
    this.setStatus('completed');
  }

  /**
   * Starts automatic time tracking with 100ms interval
   */
  private startTimeTracking(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      this.updateElapsedTime();
    }, 100);
  }

  /**
   * Stops automatic time tracking
   */
  private stopTimeTracking(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Generates a unique session ID
   * @returns A unique session identifier
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Cleanup method to stop tracking when manager is destroyed
   */
  destroy(): void {
    this.stopTimeTracking();
  }
}
