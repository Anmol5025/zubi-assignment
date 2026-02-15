/**
 * TextToSpeechHandler - Web Speech API implementation for text-to-speech synthesis
 * 
 * Handles speech synthesis with child-friendly voice settings and event management.
 * Validates Requirements 4.1, 4.2
 */

import type { TextToSpeechHandler as ITextToSpeechHandler } from '../types/services';
import type { TTSConfig } from '../types/config';
import { logError } from '../utils/errorLogger';

export class TextToSpeechHandler implements ITextToSpeechHandler {
  private synthesis: SpeechSynthesis | null = null;
  private config: TTSConfig | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speechStartCallback: (() => void) | null = null;
  private speechEndCallback: (() => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;
  private fallbackCallback: ((text: string) => void) | null = null;
  private isSpeaking: boolean = false;
  private availableVoices: SpeechSynthesisVoice[] = [];

  /**
   * Initialize the speech synthesis with configuration
   * 
   * Sets up the Web Speech API synthesis with the provided configuration,
   * loads available voices, and validates the configuration parameters.
   * 
   * @param config - TTS configuration including voice, rate, pitch, and volume
   * @throws Error if Web Speech API is not supported or configuration is invalid
   * 
   * @example
   * ```typescript
   * const ttsHandler = new TextToSpeechHandler();
   * await ttsHandler.initialize({
   *   voice: 'Google US English',
   *   rate: 1.0,
   *   pitch: 1.2,
   *   volume: 1.0
   * });
   * ```
   */
  async initialize(config: TTSConfig): Promise<void> {
    this.config = config;

    // Check if Web Speech API synthesis is available
    if (!(window as any).speechSynthesis) {
      const error = new Error('Web Speech API synthesis is not supported in this browser');
      logError('speech_synthesis_error', error.message, { component: 'TextToSpeechHandler', action: 'initialize' });
      throw error;
    }

    this.synthesis = (window as any).speechSynthesis;

    // Load available voices
    await this.loadVoices();

    // Validate configuration
    this.validateConfig(config);
  }

  /**
   * Load available voices from the browser
   * 
   * Retrieves the list of available speech synthesis voices from the browser.
   * Some browsers load voices asynchronously, so this method waits for them
   * to become available (with a 2-second timeout).
   * 
   * @returns Promise that resolves when voices are loaded
   * @private
   */
  private async loadVoices(): Promise<void> {
    return new Promise((resolve) => {
      // Get voices immediately if available
      this.availableVoices = this.synthesis!.getVoices();

      if (this.availableVoices.length > 0) {
        resolve();
        return;
      }

      // Wait for voices to load (some browsers load asynchronously)
      const voicesChangedHandler = () => {
        this.availableVoices = this.synthesis!.getVoices();
        if (this.availableVoices.length > 0) {
          this.synthesis!.onvoiceschanged = null;
          resolve();
        }
      };

      this.synthesis!.onvoiceschanged = voicesChangedHandler;

      // Timeout after 2 seconds if voices don't load
      setTimeout(() => {
        this.synthesis!.onvoiceschanged = null;
        resolve();
      }, 2000);
    });
  }

  /**
   * Validate the TTS configuration
   * 
   * Checks that rate, pitch, and volume parameters are within valid ranges.
   * 
   * @param config - TTS configuration to validate
   * @throws Error if any parameter is out of range
   * @private
   */
  private validateConfig(config: TTSConfig): void {
    if (config.rate < 0.1 || config.rate > 10) {
      throw new Error('Speech rate must be between 0.1 and 10');
    }
    if (config.pitch < 0 || config.pitch > 2) {
      throw new Error('Speech pitch must be between 0 and 2');
    }
    if (config.volume < 0 || config.volume > 1) {
      throw new Error('Speech volume must be between 0 and 1');
    }
  }

  /**
   * Find the best matching voice for the configuration
   * 
   * Searches for a voice matching the configured voice name. Falls back to
   * child-friendly voices (higher pitch), local voices, or the default voice.
   * 
   * @param voiceName - Name of the voice to find
   * @returns Matching voice or null if no voices available
   * @private
   */
  private findVoice(voiceName: string): SpeechSynthesisVoice | null {
    if (this.availableVoices.length === 0) {
      return null;
    }

    // Try exact match first
    let voice = this.availableVoices.find(v => v.name === voiceName);
    if (voice) return voice;

    // Try partial match (case-insensitive)
    voice = this.availableVoices.find(v => 
      v.name.toLowerCase().includes(voiceName.toLowerCase())
    );
    if (voice) return voice;

    // Try to find a child-friendly voice (higher pitch voices)
    // Look for voices with keywords like "child", "kid", or female voices (typically higher pitch)
    voice = this.availableVoices.find(v => 
      v.name.toLowerCase().includes('child') || 
      v.name.toLowerCase().includes('kid')
    );
    if (voice) return voice;

    // Prefer local voices for better performance
    voice = this.availableVoices.find(v => v.localService);
    if (voice) return voice;

    // Fall back to default voice
    return this.availableVoices.find(v => v.default) || this.availableVoices[0];
  }

  /**
   * Speak the provided text
   * 
   * Converts text to speech using the configured voice settings.
   * Cancels any ongoing speech before starting. Triggers fallback
   * mechanism if synthesis fails.
   * 
   * Requirements: 4.1 (text-to-speech conversion)
   * 
   * @param text - Text to speak
   * @returns Promise that resolves when speech completes
   * @throws Error if TTS is not initialized, text is empty, or synthesis fails
   * 
   * @example
   * ```typescript
   * await ttsHandler.speak("Hello! What do you see in the picture?");
   * ```
   */
  async speak(text: string): Promise<void> {
    if (!this.synthesis || !this.config) {
      const error = new Error('Text-to-speech not initialized. Call initialize() first.');
      logError('speech_synthesis_error', error.message, { component: 'TextToSpeechHandler', action: 'speak' });
      throw error;
    }

    if (!text || text.trim().length === 0) {
      const error = new Error('Cannot speak empty text');
      logError('speech_synthesis_error', error.message, { component: 'TextToSpeechHandler', action: 'speak' });
      throw error;
    }

    // Cancel any ongoing speech
    if (this.isSpeaking) {
      this.stop();
    }

    return new Promise((resolve, reject) => {
      // Create utterance
      this.currentUtterance = new SpeechSynthesisUtterance(text);
      
      // Apply configuration
      this.currentUtterance.rate = this.config!.rate;
      this.currentUtterance.pitch = this.config!.pitch;
      this.currentUtterance.volume = this.config!.volume;

      // Set voice
      const voice = this.findVoice(this.config!.voice);
      if (voice) {
        this.currentUtterance.voice = voice;
        this.currentUtterance.lang = voice.lang;
      }

      // Set up event handlers
      this.currentUtterance.onstart = () => {
        this.isSpeaking = true;
        if (this.speechStartCallback) {
          this.speechStartCallback();
        }
      };

      this.currentUtterance.onend = () => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        if (this.speechEndCallback) {
          this.speechEndCallback();
        }
        resolve();
      };

      this.currentUtterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        
        const error = new Error(`Speech synthesis error: ${event.error}`);
        
        // Log the error with context
        logError(
          'speech_synthesis_error',
          error.message,
          { 
            component: 'TextToSpeechHandler', 
            action: 'speak',
            additionalData: { errorType: event.error, text: text.substring(0, 50) }
          },
          error
        );
        
        // Trigger fallback mechanism if registered
        if (this.fallbackCallback) {
          this.fallbackCallback(text);
        }
        
        if (this.errorCallback) {
          this.errorCallback(error);
        }
        
        reject(error);
      };

      // Start speaking
      try {
        this.synthesis!.speak(this.currentUtterance);
      } catch (error) {
        this.isSpeaking = false;
        this.currentUtterance = null;
        const err = error instanceof Error ? error : new Error('Failed to start speech synthesis');
        
        // Log the error
        logError(
          'speech_synthesis_error',
          err.message,
          { 
            component: 'TextToSpeechHandler', 
            action: 'speak',
            additionalData: { text: text.substring(0, 50) }
          },
          error
        );
        
        // Trigger fallback mechanism if registered
        if (this.fallbackCallback) {
          this.fallbackCallback(text);
        }
        
        if (this.errorCallback) {
          this.errorCallback(err);
        }
        
        reject(err);
      }
    });
  }

  /**
   * Stop any ongoing speech
   * 
   * Immediately cancels any active speech synthesis.
   * Safe to call even if not currently speaking.
   * 
   * @throws Error if TTS is not initialized
   * 
   * @example
   * ```typescript
   * ttsHandler.stop();
   * ```
   */
  stop(): void {
    if (!this.synthesis) {
      const error = new Error('Text-to-speech not initialized. Call initialize() first.');
      logError('speech_synthesis_error', error.message, { component: 'TextToSpeechHandler', action: 'stop' });
      throw error;
    }

    if (this.isSpeaking) {
      this.synthesis.cancel();
      this.isSpeaking = false;
      this.currentUtterance = null;
    }
  }

  /**
   * Register callback for speech start event
   * 
   * Sets a callback function that will be called when speech synthesis begins.
   * Useful for updating UI state or stopping speech recognition.
   * 
   * @param callback - Function to call when speech starts
   * 
   * @example
   * ```typescript
   * ttsHandler.onSpeechStart(() => {
   *   console.log('AI is speaking');
   *   sttHandler.stopListening();
   * });
   * ```
   */
  onSpeechStart(callback: () => void): void {
    this.speechStartCallback = callback;
  }

  /**
   * Register callback for speech end event
   * 
   * Sets a callback function that will be called when speech synthesis completes.
   * Useful for resuming speech recognition or updating UI state.
   * 
   * @param callback - Function to call when speech ends
   * 
   * @example
   * ```typescript
   * ttsHandler.onSpeechEnd(() => {
   *   console.log('AI finished speaking');
   *   sttHandler.startListening();
   * });
   * ```
   */
  onSpeechEnd(callback: () => void): void {
    this.speechEndCallback = callback;
  }

  /**
   * Register callback for errors
   * 
   * Sets a callback function that will be called when speech synthesis errors occur.
   * 
   * @param callback - Function to call with error information
   * 
   * @example
   * ```typescript
   * ttsHandler.onError((error) => {
   *   console.error('TTS error:', error.message);
   * });
   * ```
   */
  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  /**
   * Register callback for fallback text display
   * This callback is triggered when speech synthesis fails
   * Validates: Requirements 4.4
   * 
   * Example usage:
   * ```typescript
   * const ttsHandler = new TextToSpeechHandler();
   * await ttsHandler.initialize(config);
   * 
   * // Register fallback to display text when TTS fails
   * ttsHandler.onFallback((text) => {
   *   // Display text in UI as fallback
   *   displayTextInUI(text);
   * });
   * 
   * // Attempt to speak - if it fails, fallback will be triggered
   * try {
   *   await ttsHandler.speak("Hello, world!");
   * } catch (error) {
   *   // Error is logged, but fallback has already displayed the text
   * }
   * ```
   */
  onFallback(callback: (text: string) => void): void {
    this.fallbackCallback = callback;
  }

  /**
   * Check if currently speaking
   * 
   * Returns whether speech synthesis is currently active.
   * 
   * @returns True if currently speaking
   * 
   * @example
   * ```typescript
   * if (ttsHandler.isCurrentlySpeaking()) {
   *   console.log('AI is speaking');
   * }
   * ```
   */
  isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Get list of available voices
   * 
   * Returns all speech synthesis voices available in the browser.
   * Useful for displaying voice options to users or debugging.
   * 
   * @returns Array of available voices
   * 
   * @example
   * ```typescript
   * const voices = ttsHandler.getAvailableVoices();
   * voices.forEach(v => console.log(v.name, v.lang));
   * ```
   */
  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.availableVoices;
  }

  /**
   * Pause ongoing speech (if supported)
   * 
   * Pauses the current speech synthesis. Not all browsers support this feature.
   * Safe to call even if not currently speaking.
   * 
   * @throws Error if TTS is not initialized
   * 
   * @example
   * ```typescript
   * ttsHandler.pause();
   * ```
   */
  pause(): void {
    if (!this.synthesis) {
      const error = new Error('Text-to-speech not initialized. Call initialize() first.');
      logError('speech_synthesis_error', error.message, { component: 'TextToSpeechHandler', action: 'pause' });
      throw error;
    }

    if (this.isSpeaking && !this.synthesis.paused) {
      this.synthesis.pause();
    }
  }

  /**
   * Resume paused speech (if supported)
   * 
   * Resumes speech synthesis that was paused. Not all browsers support this feature.
   * Safe to call even if not paused.
   * 
   * @throws Error if TTS is not initialized
   * 
   * @example
   * ```typescript
   * ttsHandler.resume();
   * ```
   */
  resume(): void {
    if (!this.synthesis) {
      const error = new Error('Text-to-speech not initialized. Call initialize() first.');
      logError('speech_synthesis_error', error.message, { component: 'TextToSpeechHandler', action: 'resume' });
      throw error;
    }

    if (this.synthesis.paused) {
      this.synthesis.resume();
    }
  }
}
