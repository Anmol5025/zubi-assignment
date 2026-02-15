/**
 * Unit tests for SpeechToTextHandler
 */

import { SpeechToTextHandler } from './SpeechToTextHandler';
import type { STTConfig } from '../types/config';
import * as fc from 'fast-check';

// Mock Web Speech API
class MockSpeechRecognition {
  lang = '';
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;
  onstart: (() => void) | null = null;
  
  start = jest.fn();
  stop = jest.fn();
  abort = jest.fn();
}

describe('SpeechToTextHandler', () => {
  let handler: SpeechToTextHandler;
  let mockRecognition: MockSpeechRecognition;
  
  beforeEach(() => {
    // Set up mock
    mockRecognition = new MockSpeechRecognition();
    (window as any).SpeechRecognition = jest.fn(() => mockRecognition);
    (window as any).webkitSpeechRecognition = jest.fn(() => mockRecognition);
    
    handler = new SpeechToTextHandler();
  });

  describe('initialize', () => {
    it('should initialize with provided config', async () => {
      const config: STTConfig = {
        language: 'en-US',
        continuous: true,
        interimResults: true
      };

      await handler.initialize(config);

      expect(mockRecognition.lang).toBe('en-US');
      expect(mockRecognition.continuous).toBe(true);
      expect(mockRecognition.interimResults).toBe(true);
    });

    it('should throw error if Web Speech API is not supported', async () => {
      delete (window as any).SpeechRecognition;
      delete (window as any).webkitSpeechRecognition;

      const config: STTConfig = {
        language: 'en-US',
        continuous: false,
        interimResults: false
      };

      await expect(handler.initialize(config)).rejects.toThrow('Web Speech API is not supported');
    });
  });

  describe('startListening', () => {
    it('should start recognition when initialized', async () => {
      const config: STTConfig = {
        language: 'en-US',
        continuous: true,
        interimResults: true
      };

      await handler.initialize(config);
      handler.startListening();

      expect(mockRecognition.start).toHaveBeenCalledTimes(1);
      expect(handler.isCurrentlyListening()).toBe(true);
    });

    it('should throw error if not initialized', () => {
      expect(() => handler.startListening()).toThrow('Speech recognition not initialized');
    });

    it('should not start if already listening', async () => {
      const config: STTConfig = {
        language: 'en-US',
        continuous: true,
        interimResults: true
      };

      await handler.initialize(config);
      handler.startListening();
      handler.startListening(); // Call again

      expect(mockRecognition.start).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopListening', () => {
    it('should stop recognition when listening', async () => {
      const config: STTConfig = {
        language: 'en-US',
        continuous: true,
        interimResults: true
      };

      await handler.initialize(config);
      handler.startListening();
      handler.stopListening();

      expect(mockRecognition.stop).toHaveBeenCalledTimes(1);
      expect(handler.isCurrentlyListening()).toBe(false);
    });

    it('should throw error if not initialized', () => {
      expect(() => handler.stopListening()).toThrow('Speech recognition not initialized');
    });

    it('should not stop if not listening', async () => {
      const config: STTConfig = {
        language: 'en-US',
        continuous: true,
        interimResults: true
      };

      await handler.initialize(config);
      handler.stopListening(); // Call without starting

      expect(mockRecognition.stop).not.toHaveBeenCalled();
    });
  });

  describe('onTranscript', () => {
    it('should call callback with transcript result', async () => {
      const config: STTConfig = {
        language: 'en-US',
        continuous: true,
        interimResults: true
      };

      await handler.initialize(config);

      const callback = jest.fn();
      handler.onTranscript(callback);

      // Simulate recognition result
      const mockEvent = {
        resultIndex: 0,
        results: [
          {
            isFinal: true,
            0: {
              transcript: 'hello world',
              confidence: 0.95
            }
          }
        ]
      };

      mockRecognition.onresult?.(mockEvent);

      expect(callback).toHaveBeenCalledWith({
        text: 'hello world',
        isFinal: true,
        confidence: 0.95
      });
    });

    it('should handle interim results', async () => {
      const config: STTConfig = {
        language: 'en-US',
        continuous: true,
        interimResults: true
      };

      await handler.initialize(config);

      const callback = jest.fn();
      handler.onTranscript(callback);

      // Simulate interim result
      const mockEvent = {
        resultIndex: 0,
        results: [
          {
            isFinal: false,
            0: {
              transcript: 'hello',
              confidence: 0.8
            }
          }
        ]
      };

      mockRecognition.onresult?.(mockEvent);

      expect(callback).toHaveBeenCalledWith({
        text: 'hello',
        isFinal: false,
        confidence: 0.8
      });
    });
  });

  describe('onError', () => {
    it('should call error callback on recognition error', async () => {
      const config: STTConfig = {
        language: 'en-US',
        continuous: true,
        interimResults: true
      };

      await handler.initialize(config);

      const errorCallback = jest.fn();
      handler.onError(errorCallback);

      // Simulate error
      const mockError = {
        error: 'no-speech',
        message: 'No speech detected'
      };

      mockRecognition.onerror?.(mockError);

      expect(errorCallback).toHaveBeenCalled();
      expect(errorCallback.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(errorCallback.mock.calls[0][0].message).toContain('no-speech');
    });
  });

  describe('continuous listening', () => {
    it('should restart recognition on end when continuous mode is enabled', async () => {
      const config: STTConfig = {
        language: 'en-US',
        continuous: true,
        interimResults: true
      };

      await handler.initialize(config);
      handler.startListening();

      // Clear the initial start call
      mockRecognition.start.mockClear();

      // Simulate recognition end
      mockRecognition.onend?.();

      expect(mockRecognition.start).toHaveBeenCalledTimes(1);
      expect(handler.isCurrentlyListening()).toBe(true);
    });

    it('should not restart recognition on end when stopped manually', async () => {
      const config: STTConfig = {
        language: 'en-US',
        continuous: true,
        interimResults: true
      };

      await handler.initialize(config);
      handler.startListening();
      handler.stopListening();

      // Clear previous calls
      mockRecognition.start.mockClear();

      // Simulate recognition end
      mockRecognition.onend?.();

      expect(mockRecognition.start).not.toHaveBeenCalled();
      expect(handler.isCurrentlyListening()).toBe(false);
    });
  });

  describe('error handling and retry logic', () => {
    it('should request retry on no-speech error', async () => {
      const config: STTConfig = {
        language: 'en-US',
        continuous: true,
        interimResults: true
      };

      await handler.initialize(config);

      const retryCallback = jest.fn();
      handler.onRetryRequest(retryCallback);

      // Simulate no-speech error
      const mockError = {
        error: 'no-speech',
        message: 'No speech detected'
      };

      mockRecognition.onerror?.(mockError);

      expect(retryCallback).toHaveBeenCalledWith(
        "I didn't hear anything. Could you please say that again?"
      );
    });

    it('should request retry on audio-capture error', async () => {
      const config: STTConfig = {
        language: 'en-US',
        continuous: true,
        interimResults: true
      };

      await handler.initialize(config);

      const retryCallback = jest.fn();
      handler.onRetryRequest(retryCallback);

      // Simulate audio-capture error
      const mockError = {
        error: 'audio-capture',
        message: 'Audio capture failed'
      };

      mockRecognition.onerror?.(mockError);

      expect(retryCallback).toHaveBeenCalledWith(
        "I'm having trouble hearing you. Could you please try again?"
      );
    });

    it('should request retry on aborted error', async () => {
      const config: STTConfig = {
        language: 'en-US',
        continuous: true,
        interimResults: true
      };

      await handler.initialize(config);

      const retryCallback = jest.fn();
      handler.onRetryRequest(retryCallback);

      // Simulate aborted error
      const mockError = {
        error: 'aborted',
        message: 'Recognition aborted'
      };

      mockRecognition.onerror?.(mockError);

      expect(retryCallback).toHaveBeenCalledWith(
        "Sorry, I missed that. Could you please repeat?"
      );
    });

    it('should not request retry on non-retryable errors', async () => {
      const config: STTConfig = {
        language: 'en-US',
        continuous: true,
        interimResults: true
      };

      await handler.initialize(config);

      const retryCallback = jest.fn();
      handler.onRetryRequest(retryCallback);

      // Simulate network error (not retryable)
      const mockError = {
        error: 'network',
        message: 'Network error'
      };

      mockRecognition.onerror?.(mockError);

      expect(retryCallback).not.toHaveBeenCalled();
    });

    it('should handle low confidence transcripts', async () => {
      const config: STTConfig = {
        language: 'en-US',
        continuous: true,
        interimResults: true
      };

      await handler.initialize(config);

      const transcriptCallback = jest.fn();
      const retryCallback = jest.fn();
      handler.onTranscript(transcriptCallback);
      handler.onRetryRequest(retryCallback);

      // Simulate low confidence result
      const mockEvent = {
        resultIndex: 0,
        results: [
          {
            isFinal: true,
            0: {
              transcript: 'unclear speech',
              confidence: 0.3 // Below default threshold of 0.5
            }
          }
        ]
      };

      mockRecognition.onresult?.(mockEvent);

      // Should not call transcript callback for low confidence
      expect(transcriptCallback).not.toHaveBeenCalled();
      
      // Should request retry
      expect(retryCallback).toHaveBeenCalledWith(
        "I didn't quite catch that. Could you please repeat?"
      );
    });

    it('should accept high confidence transcripts', async () => {
      const config: STTConfig = {
        language: 'en-US',
        continuous: true,
        interimResults: true
      };

      await handler.initialize(config);

      const transcriptCallback = jest.fn();
      const retryCallback = jest.fn();
      handler.onTranscript(transcriptCallback);
      handler.onRetryRequest(retryCallback);

      // Simulate high confidence result
      const mockEvent = {
        resultIndex: 0,
        results: [
          {
            isFinal: true,
            0: {
              transcript: 'clear speech',
              confidence: 0.9 // Above threshold
            }
          }
        ]
      };

      mockRecognition.onresult?.(mockEvent);

      // Should call transcript callback
      expect(transcriptCallback).toHaveBeenCalledWith({
        text: 'clear speech',
        isFinal: true,
        confidence: 0.9
      });
      
      // Should not request retry
      expect(retryCallback).not.toHaveBeenCalled();
    });

    it('should allow setting custom confidence threshold', async () => {
      const config: STTConfig = {
        language: 'en-US',
        continuous: true,
        interimResults: true
      };

      await handler.initialize(config);
      handler.setConfidenceThreshold(0.7); // Higher threshold

      const transcriptCallback = jest.fn();
      const retryCallback = jest.fn();
      handler.onTranscript(transcriptCallback);
      handler.onRetryRequest(retryCallback);

      // Simulate medium confidence result
      const mockEvent = {
        resultIndex: 0,
        results: [
          {
            isFinal: true,
            0: {
              transcript: 'medium confidence',
              confidence: 0.6 // Below new threshold of 0.7
            }
          }
        ]
      };

      mockRecognition.onresult?.(mockEvent);

      // Should not call transcript callback
      expect(transcriptCallback).not.toHaveBeenCalled();
      
      // Should request retry
      expect(retryCallback).toHaveBeenCalled();
    });

    it('should throw error for invalid confidence threshold', async () => {
      const config: STTConfig = {
        language: 'en-US',
        continuous: true,
        interimResults: true
      };

      await handler.initialize(config);

      expect(() => handler.setConfidenceThreshold(-0.1)).toThrow(
        'Confidence threshold must be between 0 and 1'
      );
      expect(() => handler.setConfidenceThreshold(1.5)).toThrow(
        'Confidence threshold must be between 0 and 1'
      );
    });

    it('should not request retry if callback not registered', async () => {
      const config: STTConfig = {
        language: 'en-US',
        continuous: true,
        interimResults: true
      };

      await handler.initialize(config);

      // Don't register retry callback

      // Simulate no-speech error - should not throw
      const mockError = {
        error: 'no-speech',
        message: 'No speech detected'
      };

      expect(() => mockRecognition.onerror?.(mockError)).not.toThrow();
    });

    it('should still call error callback even when retry is requested', async () => {
      const config: STTConfig = {
        language: 'en-US',
        continuous: true,
        interimResults: true
      };

      await handler.initialize(config);

      const errorCallback = jest.fn();
      const retryCallback = jest.fn();
      handler.onError(errorCallback);
      handler.onRetryRequest(retryCallback);

      // Simulate no-speech error
      const mockError = {
        error: 'no-speech',
        message: 'No speech detected'
      };

      mockRecognition.onerror?.(mockError);

      // Both callbacks should be called
      expect(retryCallback).toHaveBeenCalled();
      expect(errorCallback).toHaveBeenCalled();
      expect(errorCallback.mock.calls[0][0].message).toContain('no-speech');
    });
  });

  /**
   * Property-Based Tests
   */
  describe('Property-Based Tests', () => {
    /**
     * **Validates: Requirements 3.1**
     * 
     * Property 6: Speech Transcription
     * For any audio input captured during a conversation session, the Voice_Interface
     * should produce a text transcript or an error result.
     */
    it('Property 6: speech transcription produces transcript or error', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various speech recognition scenarios
          fc.record({
            transcript: fc.string({ minLength: 0, maxLength: 200 }),
            confidence: fc.float({ min: 0, max: 1 }),
            isFinal: fc.boolean(),
            shouldError: fc.boolean(),
            errorType: fc.constantFrom('no-speech', 'audio-capture', 'aborted', 'network', 'not-allowed')
          }),
          async (scenario) => {
            // Set up fresh handler for each test
            const testHandler = new SpeechToTextHandler();
            const testRecognition = new MockSpeechRecognition();
            (window as any).SpeechRecognition = jest.fn(() => testRecognition);

            const config: STTConfig = {
              language: 'en-US',
              continuous: true,
              interimResults: true
            };

            await testHandler.initialize(config);

            // Track results
            let transcriptReceived = false;
            let errorReceived = false;
            let transcriptResult: any = null;
            let errorResult: any = null;

            testHandler.onTranscript((result) => {
              transcriptReceived = true;
              transcriptResult = result;
            });

            testHandler.onError((error) => {
              errorReceived = true;
              errorResult = error;
            });

            testHandler.startListening();

            // Simulate either a successful transcription or an error
            if (scenario.shouldError) {
              // Simulate error event
              const mockError = {
                error: scenario.errorType,
                message: `Error: ${scenario.errorType}`
              };
              testRecognition.onerror?.(mockError);

              // Property: Should produce an error result
              expect(errorReceived).toBe(true);
              expect(errorResult).toBeInstanceOf(Error);
            } else {
              // Simulate successful transcription
              const mockEvent = {
                resultIndex: 0,
                results: [
                  {
                    isFinal: scenario.isFinal,
                    0: {
                      transcript: scenario.transcript,
                      confidence: scenario.confidence
                    }
                  }
                ]
              };
              testRecognition.onresult?.(mockEvent);

              // Property: Should produce a transcript result (unless low confidence and final)
              if (scenario.isFinal && scenario.confidence < 0.5) {
                // Low confidence final results trigger retry, not transcript
                expect(transcriptReceived).toBe(false);
              } else {
                expect(transcriptReceived).toBe(true);
                expect(transcriptResult).toMatchObject({
                  text: scenario.transcript,
                  isFinal: scenario.isFinal,
                  confidence: scenario.confidence
                });
              }
            }

            // Core property: For any audio input, we get either transcript or error
            // (or retry request for low confidence, which is a form of error handling)
            expect(transcriptReceived || errorReceived || (scenario.isFinal && scenario.confidence < 0.5)).toBe(true);
          }
        ),
        { numRuns: 5 }
      );
    });

    /**
     * **Validates: Requirements 3.4**
     * 
     * Property 8: Continuous Listening State
     * For any active conversation session, the microphone should remain in listening state
     * from session start until session end (excluding TTS playback periods).
     */
    it('Property 8: continuous listening maintains active state throughout session', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various session scenarios
          fc.record({
            // Number of recognition end events that occur during session
            endEventCount: fc.integer({ min: 1, max: 10 }),
            // Whether session is explicitly stopped
            explicitStop: fc.boolean(),
            // Delays between events (simulating time passing)
            eventDelays: fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 10 })
          }),
          async (scenario) => {
            // Set up fresh handler for each test
            const testHandler = new SpeechToTextHandler();
            const testRecognition = new MockSpeechRecognition();
            (window as any).SpeechRecognition = jest.fn(() => testRecognition);

            const config: STTConfig = {
              language: 'en-US',
              continuous: true, // Continuous mode is key for this property
              interimResults: true
            };

            await testHandler.initialize(config);

            // Start the session
            testHandler.startListening();

            // Property: Should be listening after start
            expect(testHandler.isCurrentlyListening()).toBe(true);
            expect(testRecognition.start).toHaveBeenCalled();

            // Clear the initial start call to track restarts
            testRecognition.start.mockClear();

            // Simulate multiple recognition end events during the session
            // In continuous mode, the handler should automatically restart
            for (let i = 0; i < scenario.endEventCount; i++) {
              // Simulate recognition ending (e.g., due to silence, internal restart)
              testRecognition.onend?.();

              // Property: In continuous mode without explicit stop, should restart automatically
              if (!scenario.explicitStop) {
                expect(testRecognition.start).toHaveBeenCalled();
                expect(testHandler.isCurrentlyListening()).toBe(true);
                testRecognition.start.mockClear();
              }
            }

            // If explicitly stopped, verify listening stops
            if (scenario.explicitStop) {
              testHandler.stopListening();
              
              // Property: After explicit stop, should not be listening
              expect(testHandler.isCurrentlyListening()).toBe(false);
              expect(testRecognition.stop).toHaveBeenCalled();

              // Clear calls
              testRecognition.start.mockClear();

              // Simulate end event after stop
              testRecognition.onend?.();

              // Property: Should NOT restart after explicit stop
              expect(testRecognition.start).not.toHaveBeenCalled();
              expect(testHandler.isCurrentlyListening()).toBe(false);
            } else {
              // Property: Without explicit stop, should still be listening
              expect(testHandler.isCurrentlyListening()).toBe(true);
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});
