/**
 * Property-Based Test for AI Response Generation Latency
 * 
 * Feature: ai-conversation-app, Property 26: AI Response Generation Latency
 * **Validates: Requirements 9.2**
 * 
 * Property: For any user input, the AI_Agent should generate a complete 
 * response within 2 seconds.
 */

import { ConversationOrchestrator } from './ConversationOrchestrator';
import * as fc from 'fast-check';

describe('ConversationOrchestrator - Property 26: AI Response Generation Latency', () => {
  it('should generate AI response within 2 seconds for any user input', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random user inputs
        fc.string({ minLength: 5, maxLength: 200 }),
        // Generate random conversation durations
        fc.integer({ min: 30000, max: 90000 }),
        // Generate random LLM response delays (0-1900ms to test various scenarios including edge cases)
        fc.integer({ min: 0, max: 1900 }),
        async (userInput: string, durationMs: number, llmDelayMs: number) => {
          // Skip empty or whitespace-only inputs
          if (userInput.trim().length === 0) {
            return;
          }

          // Generate elapsed time that ensures conversation is still active
          // Keep it well before the duration to avoid edge cases
          const elapsedMs = Math.floor(durationMs * 0.3); // Use 30% of duration

          // Setup: Create fresh mocks for this test iteration
          const testSTT = {
            initialize: jest.fn(),
            startListening: jest.fn(),
            stopListening: jest.fn(),
            onTranscript: jest.fn(),
            onError: jest.fn(),
            isCurrentlyListening: jest.fn().mockReturnValue(true),
          } as any;

          const testTTS = {
            initialize: jest.fn(),
            speak: jest.fn().mockResolvedValue(undefined),
            stop: jest.fn(),
            onSpeechStart: jest.fn(),
            onSpeechEnd: jest.fn(),
            onError: jest.fn(),
            onFallback: jest.fn(),
            isCurrentlySpeaking: jest.fn().mockReturnValue(false),
          } as any;

          const testToolRegistry = {
            registerTool: jest.fn(),
            getTool: jest.fn(),
            getAllTools: jest.fn().mockReturnValue([]),
            executeTool: jest.fn().mockResolvedValue(undefined),
          } as any;

          const testSessionManager = {
            createSession: jest.fn(),
            getState: jest.fn().mockReturnValue({
              sessionId: `test-session-${Date.now()}`,
              status: 'active',
              startTime: Date.now() - elapsedMs,
              elapsedMs: elapsedMs,
              targetDurationMs: durationMs,
              messageCount: 1,
              toolCallCount: 0,
              imageContext: 'https://example.com/image.jpg',
            }),
            setStatus: jest.fn(),
            incrementMessageCount: jest.fn(),
            incrementToolCallCount: jest.fn(),
            shouldWrapUp: jest.fn().mockReturnValue(false),
            getTimeRemaining: jest.fn().mockReturnValue(durationMs - elapsedMs),
            completeSession: jest.fn(),
            destroy: jest.fn(),
          } as any;

          // Mock LLM with configurable delay to simulate various response times
          const testLLM = {
            initialize: jest.fn(),
            setImageContext: jest.fn(),
            sendMessage: jest.fn().mockImplementation(async () => {
              // Simulate LLM processing time
              await new Promise(resolve => setTimeout(resolve, llmDelayMs));
              return {
                content: 'That sounds interesting! Tell me more about that.',
                toolCalls: [],
                finishReason: 'stop',
              };
            }),
            streamMessage: jest.fn(),
          } as any;

          const testOrchestrator = new ConversationOrchestrator(
            testSTT,
            testLLM,
            testTTS,
            testToolRegistry,
            testSessionManager
          );

          try {
            // Measure AI response generation latency
            const responseStartTime = Date.now();
            await testOrchestrator.processUserSpeech(userInput);
            const responseLatency = Date.now() - responseStartTime;

            // Property: AI response should be generated within 2 seconds (2000ms)
            expect(responseLatency).toBeLessThanOrEqual(2000);

            // Verify that the AI response was actually generated
            expect(testLLM.sendMessage).toHaveBeenCalled();
            expect(testTTS.speak).toHaveBeenCalledWith('That sounds interesting! Tell me more about that.');
            
            // Verify message was added to conversation history
            expect(testSessionManager.incrementMessageCount).toHaveBeenCalled();

          } finally {
            testOrchestrator.destroy();
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 120000); // 120 second timeout for async property test
});
