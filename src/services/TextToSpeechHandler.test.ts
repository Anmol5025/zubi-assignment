/**
 * Tests for TextToSpeechHandler
 * 
 * Validates Requirements 4.1, 4.2
 */

import { TextToSpeechHandler } from './TextToSpeechHandler';
import type { TTSConfig } from '../types/config';
import * as fc from 'fast-check';

// Mock Web Speech API
class MockSpeechSynthesisUtterance {
  text: string = '';
  lang: string = '';
  voice: any = null;
  volume: number = 1;
  rate: number = 1;
  pitch: number = 1;
  onstart: ((event: any) => void) | null = null;
  onend: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onpause: ((event: any) => void) | null = null;
  onresume: ((event: any) => void) | null = null;
  onmark: ((event: any) => void) | null = null;
  onboundary: ((event: any) => void) | null = null;

  constructor(text?: string) {
    if (text) this.text = text;
  }
}

class MockSpeechSynthesis {
  pending: boolean = false;
  speaking: boolean = false;
  paused: boolean = false;
  onvoiceschanged: ((event: Event) => void) | null = null;
  
  private voices: any[] = [
    { name: 'Google US English', lang: 'en-US', localService: true, default: true, voiceURI: 'Google US English' },
    { name: 'Google UK English Female', lang: 'en-GB', localService: true, default: false, voiceURI: 'Google UK English Female' },
    { name: 'Child Voice', lang: 'en-US', localService: true, default: false, voiceURI: 'Child Voice' }
  ];

  speak(utterance: MockSpeechSynthesisUtterance): void {
    this.speaking = true;
    
    // Simulate async speech start
    setTimeout(() => {
      if (utterance.onstart) {
        utterance.onstart({} as any);
      }
      
      // Simulate speech end after a short delay
      setTimeout(() => {
        this.speaking = false;
        if (utterance.onend) {
          utterance.onend({} as any);
        }
      }, 50);
    }, 10);
  }

  cancel(): void {
    this.speaking = false;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  getVoices(): any[] {
    return this.voices;
  }
}

describe('TextToSpeechHandler', () => {
  let handler: TextToSpeechHandler;
  let mockSynthesis: MockSpeechSynthesis;
  let defaultConfig: TTSConfig;

  beforeEach(() => {
    // Set up mocks FIRST
    mockSynthesis = new MockSpeechSynthesis();
    
    // Ensure window exists and has speechSynthesis
    if (typeof window === 'undefined') {
      (global as any).window = {};
    }
    (window as any).speechSynthesis = mockSynthesis;
    
    // Mock the SpeechSynthesisUtterance constructor
    (global as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;

    // NOW create the handler
    handler = new TextToSpeechHandler();
    
    defaultConfig = {
      voice: 'Google US English',
      rate: 0.9,
      pitch: 1.2,
      volume: 1.0
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize successfully with valid config', async () => {
      await expect(handler.initialize(defaultConfig)).resolves.toBeUndefined();
    });

    it('should throw error if speech synthesis is not available', async () => {
      delete (window as any).speechSynthesis;
      const newHandler = new TextToSpeechHandler();
      
      await expect(newHandler.initialize(defaultConfig)).rejects.toThrow(
        'Web Speech API synthesis is not supported in this browser'
      );
      
      // Restore for other tests
      (window as any).speechSynthesis = mockSynthesis;
    });

    it('should validate rate bounds', async () => {
      const invalidConfig = { ...defaultConfig, rate: 15 };
      await expect(handler.initialize(invalidConfig)).rejects.toThrow(
        'Speech rate must be between 0.1 and 10'
      );
    });

    it('should validate pitch bounds', async () => {
      const invalidConfig = { ...defaultConfig, pitch: 3 };
      await expect(handler.initialize(invalidConfig)).rejects.toThrow(
        'Speech pitch must be between 0 and 2'
      );
    });

    it('should validate volume bounds', async () => {
      const invalidConfig = { ...defaultConfig, volume: 1.5 };
      await expect(handler.initialize(invalidConfig)).rejects.toThrow(
        'Speech volume must be between 0 and 1'
      );
    });

    it('should load available voices', async () => {
      await handler.initialize(defaultConfig);
      const voices = handler.getAvailableVoices();
      expect(voices.length).toBeGreaterThan(0);
    });
  });

  describe('speak', () => {
    beforeEach(async () => {
      await handler.initialize(defaultConfig);
    });

    it('should speak text successfully', async () => {
      await expect(handler.speak('Hello, world!')).resolves.toBeUndefined();
    });

    it('should throw error if not initialized', async () => {
      const uninitializedHandler = new TextToSpeechHandler();
      await expect(uninitializedHandler.speak('test')).rejects.toThrow(
        'Text-to-speech not initialized'
      );
    });

    it('should throw error for empty text', async () => {
      await expect(handler.speak('')).rejects.toThrow('Cannot speak empty text');
      await expect(handler.speak('   ')).rejects.toThrow('Cannot speak empty text');
    });
  });

  describe('stop', () => {
    beforeEach(async () => {
      await handler.initialize(defaultConfig);
    });

    it('should throw error if not initialized', () => {
      const uninitializedHandler = new TextToSpeechHandler();
      expect(() => uninitializedHandler.stop()).toThrow(
        'Text-to-speech not initialized'
      );
    });

    it('should be safe to call when not speaking', () => {
      expect(() => handler.stop()).not.toThrow();
    });
  });

  describe('event handlers', () => {
    beforeEach(async () => {
      await handler.initialize(defaultConfig);
    });

    it('should call onSpeechStart callback when speech starts', async () => {
      const startCallback = jest.fn();
      handler.onSpeechStart(startCallback);
      
      await handler.speak('Test speech');
      
      expect(startCallback).toHaveBeenCalled();
    });

    it('should call onSpeechEnd callback when speech ends', async () => {
      const endCallback = jest.fn();
      handler.onSpeechEnd(endCallback);
      
      await handler.speak('Test speech');
      
      expect(endCallback).toHaveBeenCalled();
    });
  });

  describe('pause and resume', () => {
    beforeEach(async () => {
      await handler.initialize(defaultConfig);
    });

    it('should throw error if not initialized', () => {
      const uninitializedHandler = new TextToSpeechHandler();
      expect(() => uninitializedHandler.pause()).toThrow(
        'Text-to-speech not initialized'
      );
      expect(() => uninitializedHandler.resume()).toThrow(
        'Text-to-speech not initialized'
      );
    });
  });

  describe('state tracking', () => {
    beforeEach(async () => {
      await handler.initialize(defaultConfig);
    });

    it('should track speaking state correctly', async () => {
      expect(handler.isCurrentlySpeaking()).toBe(false);
      
      const speakPromise = handler.speak('Test speech');
      
      // Wait a bit for speech to start
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(handler.isCurrentlySpeaking()).toBe(true);
      
      await speakPromise;
      expect(handler.isCurrentlySpeaking()).toBe(false);
    });
  });

  describe('child-friendly configuration', () => {
    it('should support child-friendly voice settings', async () => {
      const childConfig: TTSConfig = {
        voice: 'Child Voice',
        rate: 0.85,  // Slightly slower for clarity
        pitch: 1.3,  // Higher pitch for child-friendly tone
        volume: 1.0
      };
      
      await expect(handler.initialize(childConfig)).resolves.toBeUndefined();
      await expect(handler.speak('Hello there!')).resolves.toBeUndefined();
    });
  });

  describe('fallback mechanism', () => {
    beforeEach(async () => {
      await handler.initialize(defaultConfig);
    });

    it('should trigger fallback callback on synthesis error', async () => {
      const fallbackCallback = jest.fn();
      const errorCallback = jest.fn();
      handler.onFallback(fallbackCallback);
      handler.onError(errorCallback);

      // Mock synthesis error
      const originalSpeak = mockSynthesis.speak.bind(mockSynthesis);
      mockSynthesis.speak = (utterance: MockSpeechSynthesisUtterance) => {
        setTimeout(() => {
          if (utterance.onerror) {
            utterance.onerror({ error: 'synthesis-failed' } as any);
          }
        }, 10);
      };

      const testText = 'This should trigger fallback';
      await expect(handler.speak(testText)).rejects.toThrow('Speech synthesis error');
      
      expect(fallbackCallback).toHaveBeenCalledWith(testText);
      expect(errorCallback).toHaveBeenCalled();

      // Restore original
      mockSynthesis.speak = originalSpeak;
    });

    it('should trigger fallback callback when speak() throws exception', async () => {
      const fallbackCallback = jest.fn();
      const errorCallback = jest.fn();
      handler.onFallback(fallbackCallback);
      handler.onError(errorCallback);

      // Mock synthesis to throw error
      mockSynthesis.speak = () => {
        throw new Error('Synthesis unavailable');
      };

      const testText = 'This should also trigger fallback';
      await expect(handler.speak(testText)).rejects.toThrow();
      
      expect(fallbackCallback).toHaveBeenCalledWith(testText);
      expect(errorCallback).toHaveBeenCalled();
    });

    it('should work without fallback callback registered', async () => {
      const errorCallback = jest.fn();
      handler.onError(errorCallback);

      // Mock synthesis error
      const originalSpeak = mockSynthesis.speak.bind(mockSynthesis);
      mockSynthesis.speak = (utterance: MockSpeechSynthesisUtterance) => {
        setTimeout(() => {
          if (utterance.onerror) {
            utterance.onerror({ error: 'synthesis-failed' } as any);
          }
        }, 10);
      };

      await expect(handler.speak('Test')).rejects.toThrow();
      expect(errorCallback).toHaveBeenCalled();

      // Restore original
      mockSynthesis.speak = originalSpeak;
    });

    it('should trigger fallback with original text content', async () => {
      const fallbackCallback = jest.fn();
      handler.onFallback(fallbackCallback);

      // Mock synthesis error
      mockSynthesis.speak = (utterance: MockSpeechSynthesisUtterance) => {
        setTimeout(() => {
          if (utterance.onerror) {
            utterance.onerror({ error: 'audio-busy' } as any);
          }
        }, 10);
      };

      const originalText = 'Hello, this is a test message with specific content!';
      await expect(handler.speak(originalText)).rejects.toThrow();
      
      expect(fallbackCallback).toHaveBeenCalledWith(originalText);
      expect(fallbackCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Property 9: Text-to-Speech Conversion
     * 
     * For any AI-generated text response, the Voice_Interface should produce 
     * audio output or trigger a fallback display mechanism.
     * 
     * **Validates: Requirements 4.1**
     */
    describe('Property 9: Text-to-Speech Conversion', () => {
      it('should produce audio output or trigger fallback for any text input', async () => {
        await fc.assert(
          fc.asyncProperty(
            // Generate various text inputs that might come from an AI
            fc.oneof(
              // Normal conversational text
              fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
              // Sentences with punctuation
              fc.array(fc.lorem({ maxCount: 10 }), { minLength: 1, maxLength: 5 })
                .map(words => words.join(' ') + '.'),
              // Questions
              fc.lorem({ maxCount: 15 }).map(text => text + '?'),
              // Exclamations
              fc.lorem({ maxCount: 10 }).map(text => text + '!'),
              // Multi-sentence responses
              fc.array(fc.lorem({ maxCount: 8 }), { minLength: 2, maxLength: 4 })
                .map(sentences => sentences.map(s => s + '.').join(' '))
            ),
            async (text) => {
              // Skip empty or whitespace-only strings
              if (!text || text.trim().length === 0) {
                return true;
              }

              // Track whether audio output OR fallback was triggered
              let audioOutputProduced = false;
              let fallbackTriggered = false;

              // Create a fresh handler for each test
              const testHandler = new TextToSpeechHandler();
              await testHandler.initialize(defaultConfig);

              // Register fallback callback
              testHandler.onFallback((fallbackText) => {
                fallbackTriggered = true;
                expect(fallbackText).toBe(text);
              });

              // Register speech start callback to detect audio output
              testHandler.onSpeechStart(() => {
                audioOutputProduced = true;
              });

              // Attempt to speak the text
              try {
                await testHandler.speak(text);
                // If speak succeeds, audio output was produced
                audioOutputProduced = true;
              } catch (error) {
                // If speak fails, fallback should have been triggered
                // This is acceptable as per the property
              }

              // Property: Either audio output was produced OR fallback was triggered
              expect(audioOutputProduced || fallbackTriggered).toBe(true);

              return true;
            }
          ),
          { numRuns: 5 }
        );
      }, 30000); // 30 second timeout for property-based test

      it('should handle edge cases in text content', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.oneof(
              // Text with special characters
              fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              // Text with numbers
              fc.tuple(fc.lorem({ maxCount: 5 }), fc.integer()).map(([text, num]) => `${text} ${num}`),
              // Text with emojis (common in child-friendly content)
              fc.lorem({ maxCount: 10 }).map(text => `${text} 😊`),
              // Very short text
              fc.constantFrom('Hi!', 'Yes.', 'No.', 'Wow!', 'Cool!'),
              // Text with line breaks
              fc.array(fc.lorem({ maxCount: 5 }), { minLength: 2, maxLength: 3 })
                .map(lines => lines.join('\n'))
            ),
            async (text) => {
              if (!text || text.trim().length === 0) {
                return true;
              }

              let outputProduced = false;
              let fallbackTriggered = false;

              const testHandler = new TextToSpeechHandler();
              await testHandler.initialize(defaultConfig);

              testHandler.onFallback(() => {
                fallbackTriggered = true;
              });

              testHandler.onSpeechStart(() => {
                outputProduced = true;
              });

              try {
                await testHandler.speak(text);
                outputProduced = true;
              } catch (error) {
                // Error is acceptable if fallback was triggered
              }

              // Property must hold: output OR fallback
              expect(outputProduced || fallbackTriggered).toBe(true);

              return true;
            }
          ),
          { numRuns: 5 }
        );
      }, 20000); // 20 second timeout for edge case test
    });

    /**
     * Property 11: TTS Fallback on Failure
     * 
     * For any TTS synthesis failure, the system should display the text response 
     * in the UI as a fallback.
     * 
     * **Validates: Requirements 4.4**
     */
    describe('Property 11: TTS Fallback on Failure', () => {
      it('should trigger fallback display for any text when synthesis fails', async () => {
        await fc.assert(
          fc.asyncProperty(
            // Generate various text inputs that an AI might produce
            fc.oneof(
              // Normal conversational responses
              fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
              // Sentences with punctuation
              fc.array(fc.lorem({ maxCount: 10 }), { minLength: 1, maxLength: 5 })
                .map(words => words.join(' ') + '.'),
              // Questions
              fc.lorem({ maxCount: 15 }).map(text => text + '?'),
              // Multi-sentence responses
              fc.array(fc.lorem({ maxCount: 8 }), { minLength: 2, maxLength: 4 })
                .map(sentences => sentences.map(s => s + '.').join(' ')),
              // Short responses
              fc.constantFrom('Okay!', 'I see.', 'That\'s interesting!', 'Tell me more.'),
              // Responses with special characters
              fc.lorem({ maxCount: 10 }).map(text => `${text}... 🤔`)
            ),
            // Generate different error types that could occur
            fc.constantFrom(
              'synthesis-failed',
              'synthesis-unavailable',
              'audio-busy',
              'audio-hardware-busy',
              'network',
              'not-allowed',
              'canceled'
            ),
            async (text, errorType) => {
              // Skip empty or whitespace-only strings
              if (!text || text.trim().length === 0) {
                return true;
              }

              // Create a fresh handler for each test
              const testHandler = new TextToSpeechHandler();
              await testHandler.initialize(defaultConfig);

              // Track fallback invocation
              let fallbackWasTriggered = false;
              let fallbackReceivedText = '';

              // Register fallback callback
              testHandler.onFallback((fallbackText) => {
                fallbackWasTriggered = true;
                fallbackReceivedText = fallbackText;
              });

              // Mock synthesis to fail with the specified error type
              const originalSpeak = mockSynthesis.speak.bind(mockSynthesis);
              mockSynthesis.speak = (utterance: MockSpeechSynthesisUtterance) => {
                setTimeout(() => {
                  if (utterance.onerror) {
                    utterance.onerror({ error: errorType } as any);
                  }
                }, 10);
              };

              // Attempt to speak - this should fail and trigger fallback
              try {
                await testHandler.speak(text);
                // If it doesn't throw, that's unexpected but we still check fallback
              } catch (error) {
                // Expected to throw due to synthesis failure
              }

              // Restore original speak method
              mockSynthesis.speak = originalSpeak;

              // Property: Fallback MUST be triggered when synthesis fails
              expect(fallbackWasTriggered).toBe(true);
              
              // Property: Fallback MUST receive the original text
              expect(fallbackReceivedText).toBe(text);

              return true;
            }
          ),
          { numRuns: 5 }
        );
      }, 30000); // 30 second timeout for property-based test

      it('should trigger fallback when speak() throws an exception', async () => {
        await fc.assert(
          fc.asyncProperty(
            // Generate various text inputs
            fc.oneof(
              fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              fc.lorem({ maxCount: 20 }).map(text => text + '.'),
              fc.constantFrom('Hello!', 'How are you?', 'That\'s great!', 'I understand.')
            ),
            // Generate different exception messages
            fc.constantFrom(
              'Synthesis unavailable',
              'Audio context error',
              'Browser blocked audio',
              'Hardware failure',
              'Permission denied'
            ),
            async (text, exceptionMessage) => {
              if (!text || text.trim().length === 0) {
                return true;
              }

              const testHandler = new TextToSpeechHandler();
              await testHandler.initialize(defaultConfig);

              let fallbackTriggered = false;
              let fallbackText = '';

              testHandler.onFallback((txt) => {
                fallbackTriggered = true;
                fallbackText = txt;
              });

              // Mock synthesis to throw an exception
              const originalSpeak = mockSynthesis.speak.bind(mockSynthesis);
              mockSynthesis.speak = () => {
                throw new Error(exceptionMessage);
              };

              // Attempt to speak
              try {
                await testHandler.speak(text);
              } catch (error) {
                // Expected to throw
              }

              // Restore
              mockSynthesis.speak = originalSpeak;

              // Property: Fallback must be triggered on exception
              expect(fallbackTriggered).toBe(true);
              expect(fallbackText).toBe(text);

              return true;
            }
          ),
          { numRuns: 5 }
        );
      }, 20000); // 20 second timeout

      it('should preserve text content exactly in fallback', async () => {
        await fc.assert(
          fc.asyncProperty(
            // Generate text with various characteristics that must be preserved
            fc.oneof(
              // Text with leading/trailing spaces
              fc.lorem({ maxCount: 10 }).map(text => `  ${text}  `),
              // Text with multiple spaces
              fc.array(fc.lorem({ maxCount: 3 }), { minLength: 2, maxLength: 5 })
                .map(words => words.join('  ')),
              // Text with special characters
              fc.string({ minLength: 1, maxLength: 100 })
                .filter(s => s.trim().length > 0)
                .map(s => `${s}!@#$%`),
              // Text with line breaks
              fc.array(fc.lorem({ maxCount: 5 }), { minLength: 2, maxLength: 3 })
                .map(lines => lines.join('\n')),
              // Text with unicode characters
              fc.lorem({ maxCount: 10 }).map(text => `${text} 😊🎉✨`)
            ),
            async (text) => {
              if (!text || text.trim().length === 0) {
                return true;
              }

              const testHandler = new TextToSpeechHandler();
              await testHandler.initialize(defaultConfig);

              let capturedFallbackText = '';

              testHandler.onFallback((txt) => {
                capturedFallbackText = txt;
              });

              // Force synthesis failure
              const originalSpeak = mockSynthesis.speak.bind(mockSynthesis);
              mockSynthesis.speak = (utterance: MockSpeechSynthesisUtterance) => {
                setTimeout(() => {
                  if (utterance.onerror) {
                    utterance.onerror({ error: 'synthesis-failed' } as any);
                  }
                }, 10);
              };

              try {
                await testHandler.speak(text);
              } catch (error) {
                // Expected
              }

              mockSynthesis.speak = originalSpeak;

              // Property: Fallback text must be EXACTLY the original text
              // No modifications, truncations, or transformations
              expect(capturedFallbackText).toBe(text);
              expect(capturedFallbackText.length).toBe(text.length);

              return true;
            }
          ),
          { numRuns: 5 }
        );
      }, 20000); // 20 second timeout
    });
  });
});
