/**
 * Property-Based Test for Conversation Initiation Timing
 * 
 * Feature: ai-conversation-app, Property 3: Conversation Initiation Timing
 * **Validates: Requirements 2.1**
 * 
 * Property: For any application start, the AI_Agent should generate and deliver 
 * its first message within 2 seconds of the ready state.
 */

import { ConversationOrchestrator } from './ConversationOrchestrator';
import * as fc from 'fast-check';

describe('ConversationOrchestrator - Property 3: Conversation Initiation Timing', () => {
  it('should initiate conversation within 2 seconds', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random image URLs
        fc.webUrl(),
        // Generate random conversation durations
        fc.integer({ min: 30000, max: 90000 }),
        // Generate random LLM response delays (0-1500ms to test various scenarios)
        fc.integer({ min: 0, max: 1500 }),
        async (imageUrl: string, durationMs: number, llmDelayMs: number) => {
          // Setup: Create fresh mocks for this test iteration
          const testSTT = {
            initialize: jest.fn(),
            startListening: jest.fn(),
            stopListening: jest.fn(),
            onTranscript: jest.fn(),
            onError: jest.fn(),
            isCurrentlyListening: jest.fn().mockReturnValue(false),
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
            createSession: jest.fn().mockReturnValue({
              sessionId: `test-session-${Date.now()}`,
              status: 'initializing',
              startTime: Date.now(),
              elapsedMs: 0,
              targetDurationMs: durationMs,
              messageCount: 0,
              toolCallCount: 0,
              imageContext: imageUrl,
            }),
            getState: jest.fn().mockReturnValue({
              sessionId: `test-session-${Date.now()}`,
              status: 'active',
              startTime: Date.now(),
              elapsedMs: 0,
              targetDurationMs: durationMs,
              messageCount: 0,
              toolCallCount: 0,
              imageContext: imageUrl,
            }),
            setStatus: jest.fn(),
            incrementMessageCount: jest.fn(),
            incrementToolCallCount: jest.fn(),
            shouldWrapUp: jest.fn().mockReturnValue(false),
            getTimeRemaining: jest.fn().mockReturnValue(durationMs),
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
                content: 'Hello! What do you see in this image?',
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
            // Measure conversation initiation time
            const startTime = Date.now();
            await testOrchestrator.startConversation(imageUrl, undefined, durationMs);
            const initiationTime = Date.now() - startTime;

            // Property: Conversation should be initiated within 2 seconds (2000ms)
            expect(initiationTime).toBeLessThanOrEqual(2000);

            // Verify that the AI's first message was generated and delivered
            expect(testLLM.sendMessage).toHaveBeenCalled();
            expect(testTTS.speak).toHaveBeenCalledWith('Hello! What do you see in this image?');
            
            // Verify session was created and activated
            expect(testSessionManager.createSession).toHaveBeenCalledWith(imageUrl, durationMs);
            expect(testSessionManager.setStatus).toHaveBeenCalledWith('active');
            
            // Verify listening started
            expect(testSTT.startListening).toHaveBeenCalled();

          } finally {
            testOrchestrator.destroy();
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 30000); // 30 second timeout for async property test
});
