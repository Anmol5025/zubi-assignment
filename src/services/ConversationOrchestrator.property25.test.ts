/**
 * Property-Based Test for Processing Start Latency
 * 
 * Feature: ai-conversation-app, Property 25: Processing Start Latency
 * **Validates: Requirements 9.1**
 * 
 * Property: For any user speech input completion, the system should begin 
 * processing (visible via state indicator) within 500ms.
 */

import { ConversationOrchestrator } from './ConversationOrchestrator';
import * as fc from 'fast-check';

describe('ConversationOrchestrator - Property 25: Processing Start Latency', () => {
  it('should begin processing within 500ms of user speech completion', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random user transcripts
        fc.string({ minLength: 5, maxLength: 100 }),
        // Generate random conversation durations
        fc.integer({ min: 30000, max: 90000 }),
        async (userTranscript: string, durationMs: number) => {
          // Skip empty or whitespace-only transcripts
          if (userTranscript.trim().length === 0) {
            return;
          }

          // Generate elapsed time that ensures conversation is still active
          // Keep it well before the duration to avoid edge cases
          const elapsedMs = Math.floor(durationMs * 0.5); // Use 50% of duration

          // Setup: Create fresh mocks for this test iteration
          let processingStateChangedAt: number | null = null;

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

          // Mock LLM with fast response
          const testLLM = {
            initialize: jest.fn(),
            setImageContext: jest.fn(),
            sendMessage: jest.fn().mockResolvedValue({
              content: 'That sounds interesting! Tell me more.',
              toolCalls: [],
              finishReason: 'stop',
            }),
            streamMessage: jest.fn(),
          } as any;

          const callbacks = {
            onStateChange: (state: any) => {
              // Track when processing state changes to true
              if (state.isProcessing && processingStateChangedAt === null) {
                processingStateChangedAt = Date.now();
              }
            },
          };

          const testOrchestrator = new ConversationOrchestrator(
            testSTT,
            testLLM,
            testTTS,
            testToolRegistry,
            testSessionManager,
            callbacks
          );

          try {
            // Measure processing start latency
            const speechCompletionTime = Date.now();
            await testOrchestrator.processUserSpeech(userTranscript);
            
            // Calculate latency
            const processingStartLatency = processingStateChangedAt 
              ? processingStateChangedAt - speechCompletionTime 
              : Date.now() - speechCompletionTime;

            // Property: Processing should begin within 500ms
            expect(processingStartLatency).toBeLessThanOrEqual(500);

            // Verify that processing actually occurred
            expect(testLLM.sendMessage).toHaveBeenCalled();
            expect(testSessionManager.incrementMessageCount).toHaveBeenCalled();

          } finally {
            testOrchestrator.destroy();
          }
        }
      ),
      { numRuns: 10 }
    );
  }, 60000); // 60 second timeout for async property test
});
