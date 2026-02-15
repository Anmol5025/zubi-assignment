/**
 * SpeechToTextHandler - Web Speech API implementation for speech recognition
 * 
 * Handles continuous speech recognition with interim results support.
 * Validates Requirements 3.1, 3.4
 */

import type { SpeechToTextHandler as ISpeechToTextHandler, TranscriptResult } from '../types/services';
import type { STTConfig } from '../types/config';
import { logError } from '../utils/errorLogger';

export class SpeechToTextHandler implements ISpeechToTextHandler {
  private recognition: SpeechRecognition | null = null;
  private config: STTConfig | null = null;
  private transcriptCallback: ((result: TranscriptResult) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;
  private retryRequestCallback: ((message: string) => void) | null = null;
  private isListening: boolean = false;
  private confidenceThreshold: number = 0.5; // Minimum confidence for accepting transcripts

  /**
   * Initialize the speech recognition with configuration
   * 
   * Sets up the Web Speech API recognition instance with the provided
   * configuration and event handlers. Checks for browser support.
   * 
   * @param config - STT configuration including language, continuous mode, and interim results
   * @throws Error if Web Speech API is not supported in the browser
   * 
   * @example
   * ```typescript
   * const sttHandler = new SpeechToTextHandler();
   * await sttHandler.initialize({
   *   language: 'en-US',
   *   continuous: true,
   *   interimResults: true
   * });
   * ```
   */
  async initialize(config: STTConfig): Promise<void> {
    this.config = config;

    // Check if Web Speech API is available
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      const error = new Error('Web Speech API is not supported in this browser');
      logError('speech_recognition_error', error.message, { component: 'SpeechToTextHandler', action: 'initialize' });
      throw error;
    }

    // Create recognition instance
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = config.language;
    recognition.continuous = config.continuous;
    recognition.interimResults = config.interimResults;

    // Assign to instance property
    this.recognition = recognition;

    // Set up event handlers
    this.setupEventHandlers();
  }

  /**
   * Set up Web Speech API event handlers
   * 
   * Configures handlers for recognition results, errors, and end events.
   * Handles low confidence transcripts and automatic restart in continuous mode.
   * 
   * @private
   */
  private setupEventHandlers(): void {
    if (!this.recognition) return;

    // Handle recognition results
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (!this.transcriptCallback) return;

      // Process all results from the event
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;
        const isFinal = result.isFinal;

        // Check for low confidence on final results
        if (isFinal && confidence < this.confidenceThreshold) {
          this.handleLowConfidence(transcript, confidence);
          continue;
        }

        this.transcriptCallback({
          text: transcript,
          isFinal,
          confidence
        });
      }
    };

    // Handle errors
    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorType = event.error;
      
      // Log the error with context
      logError(
        'speech_recognition_error',
        `Speech recognition error: ${errorType}`,
        { 
          component: 'SpeechToTextHandler', 
          action: 'recognition',
          additionalData: { errorType }
        }
      );
      
      // Handle specific error types that warrant retry requests
      if (this.shouldRequestRetry(errorType)) {
        this.requestRetry(errorType);
      }
      
      if (this.errorCallback) {
        this.errorCallback(new Error(`Speech recognition error: ${errorType}`));
      }
    };

    // Handle recognition end
    this.recognition.onend = () => {
      // If continuous mode and still supposed to be listening, restart
      if (this.config?.continuous && this.isListening) {
        try {
          this.recognition?.start();
        } catch (error) {
          // Ignore errors from restarting (e.g., already started)
        }
      } else {
        this.isListening = false;
      }
    };
  }

  /**
   * Start listening for speech input
   * 
   * Activates the microphone and begins speech recognition.
   * In continuous mode, will automatically restart if recognition ends.
   * 
   * @throws Error if speech recognition is not initialized
   * 
   * @example
   * ```typescript
   * sttHandler.startListening();
   * ```
   */
  startListening(): void {
    if (!this.recognition) {
      const error = new Error('Speech recognition not initialized. Call initialize() first.');
      logError('speech_recognition_error', error.message, { component: 'SpeechToTextHandler', action: 'startListening' });
      throw error;
    }

    if (this.isListening) {
      return; // Already listening
    }

    try {
      this.isListening = true;
      this.recognition.start();
    } catch (error) {
      this.isListening = false;
      const err = error instanceof Error ? error : new Error('Failed to start listening');
      
      // Log the error
      logError('speech_recognition_error', err.message, { component: 'SpeechToTextHandler', action: 'startListening' }, error);
      
      if (this.errorCallback) {
        this.errorCallback(err);
      }
    }
  }

  /**
   * Stop listening for speech input
   * 
   * Deactivates the microphone and stops speech recognition.
   * Safe to call even if not currently listening.
   * 
   * @throws Error if speech recognition is not initialized
   * 
   * @example
   * ```typescript
   * sttHandler.stopListening();
   * ```
   */
  stopListening(): void {
    if (!this.recognition) {
      const error = new Error('Speech recognition not initialized. Call initialize() first.');
      logError('speech_recognition_error', error.message, { component: 'SpeechToTextHandler', action: 'stopListening' });
      throw error;
    }

    if (!this.isListening) {
      return; // Not listening
    }

    this.isListening = false;
    try {
      this.recognition.stop();
    } catch (error) {
      // Ignore errors from stopping (e.g., already stopped)
    }
  }

  /**
   * Register callback for transcript results
   * 
   * Sets a callback function that will be called whenever speech is transcribed.
   * The callback receives both interim and final results with confidence scores.
   * 
   * @param callback - Function to call with transcript results
   * 
   * @example
   * ```typescript
   * sttHandler.onTranscript((result) => {
   *   console.log(`Transcript: ${result.text} (final: ${result.isFinal})`);
   * });
   * ```
   */
  onTranscript(callback: (result: TranscriptResult) => void): void {
    this.transcriptCallback = callback;
  }

  /**
   * Register callback for errors
   * 
   * Sets a callback function that will be called when speech recognition errors occur.
   * 
   * @param callback - Function to call with error information
   * 
   * @example
   * ```typescript
   * sttHandler.onError((error) => {
   *   console.error('STT error:', error.message);
   * });
   * ```
   */
  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  /**
   * Check if currently listening
   * 
   * Returns whether speech recognition is currently active and listening for input.
   * 
   * @returns True if currently listening for speech
   * 
   * @example
   * ```typescript
   * if (sttHandler.isCurrentlyListening()) {
   *   console.log('Microphone is active');
   * }
   * ```
   */
  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  /**
   * Register callback for retry requests
   * 
   * Sets a callback function that will be called when the system needs the user
   * to repeat their speech (e.g., due to no speech detected or low confidence).
   * 
   * Requirements: 3.3 (retry request generation)
   * 
   * @param callback - Function to call with retry request message
   * 
   * @example
   * ```typescript
   * sttHandler.onRetryRequest((message) => {
   *   console.log('Please retry:', message);
   * });
   * ```
   */
  onRetryRequest(callback: (message: string) => void): void {
    this.retryRequestCallback = callback;
  }

  /**
   * Set the confidence threshold for accepting transcripts
   * 
   * Sets the minimum confidence level (0-1) required to accept a transcript.
   * Transcripts below this threshold will trigger a retry request.
   * 
   * @param threshold - Confidence threshold between 0 and 1
   * @throws Error if threshold is not between 0 and 1
   * 
   * @example
   * ```typescript
   * sttHandler.setConfidenceThreshold(0.7); // Require 70% confidence
   * ```
   */
  setConfidenceThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Confidence threshold must be between 0 and 1');
    }
    this.confidenceThreshold = threshold;
  }

  /**
   * Determine if an error type should trigger a retry request
   * 
   * Checks if the given error type is one that warrants asking the user
   * to repeat their speech (e.g., no speech detected, audio capture failed).
   * 
   * @param errorType - The speech recognition error type
   * @returns True if a retry should be requested
   * @private
   */
  private shouldRequestRetry(errorType: string): boolean {
    const retryableErrors = [
      'no-speech',      // No speech was detected
      'audio-capture',  // Audio capture failed
      'aborted'         // Recognition was aborted
    ];
    return retryableErrors.includes(errorType);
  }

  /**
   * Handle low confidence transcription results
   * 
   * Called when a final transcript has confidence below the threshold.
   * Triggers a retry request to ask the user to repeat.
   * 
   * @param transcript - The low confidence transcript text
   * @param confidence - The confidence score (0-1)
   * @private
   */
  private handleLowConfidence(transcript: string, confidence: number): void {
    this.requestRetry('low-confidence', { transcript, confidence });
  }

  /**
   * Generate and send a retry request message
   * 
   * Creates a user-friendly message based on the error reason and
   * calls the retry request callback if registered.
   * 
   * @param reason - The reason for the retry request
   * @param _metadata - Optional metadata about the error (unused)
   * @private
   */
  private requestRetry(reason: string, _metadata?: any): void {
    if (!this.retryRequestCallback) return;

    const retryMessages: Record<string, string> = {
      'no-speech': "I didn't hear anything. Could you please say that again?",
      'audio-capture': "I'm having trouble hearing you. Could you please try again?",
      'aborted': "Sorry, I missed that. Could you please repeat?",
      'low-confidence': "I didn't quite catch that. Could you please repeat?"
    };

    const message = retryMessages[reason] || "Could you please repeat that?";
    this.retryRequestCallback(message);
  }
}
