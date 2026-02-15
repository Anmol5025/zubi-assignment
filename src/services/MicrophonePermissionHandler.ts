/**
 * MicrophonePermissionHandler - Handles microphone permission requests and errors
 * 
 * Manages microphone access permissions by:
 * - Requesting microphone access on initialization
 * - Detecting permission denial
 * - Providing user-friendly error messages with instructions
 * 
 * Requirements: 10.1
 */

import { logError } from '../utils/errorLogger';

export interface PermissionResult {
  granted: boolean;
  error?: string;
  instructions?: string;
}

export class MicrophonePermissionHandler {
  /**
   * Request microphone permission
   * 
   * Requests access to the user's microphone using the getUserMedia API.
   * Returns a result indicating whether permission was granted and provides
   * user-friendly error messages and instructions if denied.
   * 
   * Requirements: 10.1 - Request microphone access, handle denial, provide instructions
   * 
   * @returns Promise resolving to permission result with granted status, error message, and instructions
   * 
   * @example
   * ```typescript
   * const handler = new MicrophonePermissionHandler();
   * const result = await handler.requestPermission();
   * if (result.granted) {
   *   console.log('Microphone access granted');
   * } else {
   *   console.error(result.error);
   *   console.log(result.instructions);
   * }
   * ```
   */
  async requestPermission(): Promise<PermissionResult> {
    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return {
          granted: false,
          error: 'Microphone access is not supported in this browser',
          instructions: 'Please use a modern browser like Chrome, Firefox, Edge, or Safari to use voice features.'
        };
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Stop all tracks immediately - we just needed to check permission
      stream.getTracks().forEach(track => track.stop());
      
      return {
        granted: true
      };
    } catch (error) {
      return this.handlePermissionError(error);
    }
  }

  /**
   * Check current microphone permission status without requesting
   * 
   * Queries the Permissions API to check the current microphone permission state
   * without triggering a permission prompt. Returns 'unsupported' if the
   * Permissions API is not available in the browser.
   * 
   * @returns Promise resolving to permission state: 'granted', 'denied', 'prompt', or 'unsupported'
   * 
   * @example
   * ```typescript
   * const status = await handler.checkPermissionStatus();
   * if (status === 'granted') {
   *   console.log('Already have microphone access');
   * } else if (status === 'prompt') {
   *   console.log('Need to request permission');
   * }
   * ```
   */
  async checkPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
    try {
      // Check if Permissions API is available
      if (!navigator.permissions || !navigator.permissions.query) {
        return 'unsupported';
      }

      // Query microphone permission
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return result.state as 'granted' | 'denied' | 'prompt';
    } catch (error) {
      // Permissions API might not support microphone query in some browsers
      return 'unsupported';
    }
  }

  /**
   * Handle permission errors and provide appropriate messages
   * 
   * Analyzes permission errors and returns user-friendly error messages
   * with browser-specific instructions for resolving the issue.
   * 
   * @param error - The error that occurred during permission request
   * @returns Permission result with error message and instructions
   * @private
   */
  private handlePermissionError(error: unknown): PermissionResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check for specific error types
    if (errorMessage.includes('Permission denied') || 
        errorMessage.includes('NotAllowedError') ||
        (error instanceof DOMException && error.name === 'NotAllowedError')) {
      logError(
        'microphone_permission_denied',
        'Microphone access was denied by user',
        { component: 'MicrophonePermissionHandler', action: 'requestPermission' },
        error
      );
      return {
        granted: false,
        error: 'Microphone access was denied',
        instructions: this.getPermissionInstructions()
      };
    }

    if (errorMessage.includes('NotFoundError') ||
        (error instanceof DOMException && error.name === 'NotFoundError')) {
      logError(
        'microphone_not_found',
        'No microphone device found',
        { component: 'MicrophonePermissionHandler', action: 'requestPermission' },
        error
      );
      return {
        granted: false,
        error: 'No microphone found',
        instructions: 'Please connect a microphone to your device and try again.'
      };
    }

    if (errorMessage.includes('NotReadableError') ||
        (error instanceof DOMException && error.name === 'NotReadableError')) {
      logError(
        'microphone_in_use',
        'Microphone is already in use by another application',
        { component: 'MicrophonePermissionHandler', action: 'requestPermission' },
        error
      );
      return {
        granted: false,
        error: 'Microphone is already in use',
        instructions: 'Please close other applications using your microphone and try again.'
      };
    }

    // Generic error
    logError(
      'microphone_error',
      'Failed to access microphone',
      { component: 'MicrophonePermissionHandler', action: 'requestPermission' },
      error
    );
    return {
      granted: false,
      error: 'Failed to access microphone',
      instructions: 'Please check your microphone settings and try again.'
    };
  }

  /**
   * Get browser-specific instructions for enabling microphone
   * 
   * Detects the user's browser and returns tailored instructions for
   * enabling microphone access in that specific browser.
   * 
   * @returns Browser-specific instructions for enabling microphone access
   * @private
   */
  private getPermissionInstructions(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Check Edge first (before Chrome and Safari, as Edge contains both)
    if (userAgent.includes('edg')) {
      return 'To enable microphone access in Edge:\n' +
             '1. Click the lock/microphone icon in the address bar\n' +
             '2. Select "Allow" for microphone access\n' +
             '3. Refresh the page';
    }
    
    if (userAgent.includes('chrome')) {
      return 'To enable microphone access in Chrome:\n' +
             '1. Click the camera/microphone icon in the address bar\n' +
             '2. Select "Always allow" for microphone access\n' +
             '3. Refresh the page';
    }
    
    if (userAgent.includes('firefox')) {
      return 'To enable microphone access in Firefox:\n' +
             '1. Click the microphone icon in the address bar\n' +
             '2. Select "Allow" and check "Remember this decision"\n' +
             '3. Refresh the page';
    }
    
    if (userAgent.includes('safari')) {
      return 'To enable microphone access in Safari:\n' +
             '1. Go to Safari > Settings > Websites > Microphone\n' +
             '2. Find this website and select "Allow"\n' +
             '3. Refresh the page';
    }
    
    // Generic instructions
    return 'To enable microphone access:\n' +
           '1. Look for the microphone icon in your browser\'s address bar\n' +
           '2. Click it and select "Allow"\n' +
           '3. Refresh the page';
  }
}
