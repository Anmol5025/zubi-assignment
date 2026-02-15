import type { SpeechToTextHandler } from './SpeechToTextHandler';
import type { LLMClient } from './LLMClient';
import type { TextToSpeechHandler } from './TextToSpeechHandler';
import type { ToolRegistry } from './ToolRegistry';
import type { SessionStateManager } from './SessionStateManager';
import type { Message, ToolCall } from '../types/message';
import type { AIResponse } from '../types/services';
import type { ImageContext } from '../types/image';
import { logError } from '../utils/errorLogger';

export interface ConversationCallbacks {
  onStateChange?: (state: any) => void;
  onError?: (error: Error) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onAIResponse?: (text: string) => void;
  onToolCall?: (toolName: string, args: object) => void;
}

export class ConversationOrchestrator {
  private sttHandler: SpeechToTextHandler;
  private llmClient: LLMClient;
  private ttsHandler: TextToSpeechHandler;
  private toolRegistry: ToolRegistry;
  private sessionManager: SessionStateManager;
  private callbacks: ConversationCallbacks;
  
  private messages: Message[] = [];
  private isProcessing: boolean = false;
  private conversationTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(
    sttHandler: SpeechToTextHandler,
    llmClient: LLMClient,
    ttsHandler: TextToSpeechHandler,
    toolRegistry: ToolRegistry,
    sessionManager: SessionStateManager,
    callbacks: ConversationCallbacks = {}
  ) {
    this.sttHandler = sttHandler;
    this.llmClient = llmClient;
    this.ttsHandler = ttsHandler;
    this.toolRegistry = toolRegistry;
    this.sessionManager = sessionManager;
    this.callbacks = callbacks;

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Handle speech transcription
    this.sttHandler.onTranscript((result) => {
      if (this.callbacks.onTranscript) {
        this.callbacks.onTranscript(result.text, result.isFinal);
      }

      // Process final transcripts
      if (result.isFinal && result.text.trim().length > 0) {
        this.processUserSpeech(result.text).catch((error) => {
          this.handleError(error);
        });
      }
    });

    // Handle STT errors
    this.sttHandler.onError((error) => {
      this.handleError(error);
    });

    // Handle TTS speech start
    this.ttsHandler.onSpeechStart(() => {
      // Stop listening while AI is speaking
      if (this.sttHandler.isCurrentlyListening()) {
        this.sttHandler.stopListening();
      }
    });

    // Handle TTS speech end
    this.ttsHandler.onSpeechEnd(() => {
      // Resume listening after AI finishes speaking
      const state = this.sessionManager.getState();
      if (state.status === 'active' || state.status === 'wrapping_up') {
        this.sttHandler.startListening();
      }
    });

    // Handle TTS errors with fallback
    this.ttsHandler.onError((error) => {
      logError(
        'speech_synthesis_error',
        'TTS error occurred',
        {
          component: 'ConversationOrchestrator',
          action: 'ttsHandler.onError',
          sessionId: this.sessionManager.getState().sessionId,
        },
        error
      );
      // Error is logged, fallback mechanism will handle display
    });

    // Handle TTS fallback
    this.ttsHandler.onFallback((text) => {
      // Display text in UI as fallback when TTS fails
      if (this.callbacks.onAIResponse) {
        this.callbacks.onAIResponse(text);
      }
    });
  }

  async startConversation(
      imageUrl: string,
      imageContext?: ImageContext,
      durationMs: number = 60000
    ): Promise<void> {
      const conversationStartTime = Date.now();

      try {
        // Create new session
        this.sessionManager.createSession(imageUrl, durationMs);
        this.messages = [];

        // Set image context in LLM if available
        if (imageContext) {
          this.llmClient.setImageContext(imageContext);
        }

        // Update state to active
        this.sessionManager.setStatus('active');
        this.notifyStateChange();

        // Set up automatic conversation ending at target duration (Requirement 5.3)
        this.setupConversationTimeout(durationMs);

        // Start listening for user input
        this.sttHandler.startListening();

        // Generate and deliver AI's opening message
        await this.generateAIOpening();

        // Measure and log conversation initiation time
        const initiationTime = Date.now() - conversationStartTime;
        console.log(`[ConversationOrchestrator] Conversation initiated in ${initiationTime}ms`);

        if (initiationTime > 2000) {
          console.warn(`[ConversationOrchestrator] Conversation initiation exceeded 2s target: ${initiationTime}ms`);
        }

      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.handleError(err);
        throw err; // Re-throw to allow caller to handle
      }
    }


  private async generateAIOpening(): Promise<void> {
    try {
      this.isProcessing = true;
      this.notifyStateChange();

      // Get AI response with tools available
      const tools = this.toolRegistry.getAllTools();
      const response = await this.llmClient.sendMessage(this.messages, tools);

      // Handle the AI response
      await this.handleAIResponse(response);

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.handleError(err);
      throw err; // Re-throw to propagate to startConversation
    } finally {
      this.isProcessing = false;
      this.notifyStateChange();
    }
  }

  /**
   * Set up automatic conversation ending at target duration
   * 
   * Creates a timeout that will automatically end the conversation
   * when the target duration is reached. This ensures conversations
   * don't exceed the intended time limit.
   * 
   * Requirements: 5.3 (end conversation at 60 seconds)
   * 
   * @param durationMs - Duration in milliseconds after which to end conversation
   * @private
   */
  private setupConversationTimeout(durationMs: number): void {
    // Clear any existing timeout
    this.clearConversationTimeout();

    // Set up new timeout to automatically end conversation
    this.conversationTimeoutId = setTimeout(() => {
      const state = this.sessionManager.getState();
      if (state.status === 'active' || state.status === 'wrapping_up') {
        console.log('[ConversationOrchestrator] Conversation time limit reached, ending conversation');
        this.endConversation().catch((error) => {
          this.handleError(error instanceof Error ? error : new Error(String(error)));
        });
      }
    }, durationMs);
  }

  /**
   * Clear the conversation timeout
   * 
   * Cancels any pending automatic conversation ending timeout.
   * Called when the conversation ends manually or when setting up a new timeout.
   * 
   * @private
   */
  private clearConversationTimeout(): void {
    if (this.conversationTimeoutId) {
      clearTimeout(this.conversationTimeoutId);
      this.conversationTimeoutId = null;
    }
  }

  /**
   * Process user speech input
   * 
   * Handles transcribed user speech by adding it to the conversation history,
   * checking timing constraints, generating an AI response, and managing
   * the conversation flow. Ensures processing starts within 500ms.
   * 
   * Requirements: 9.1 (processing within 500ms)
   * 
   * @param transcript - The transcribed user speech
   * @throws Error if processing fails
   * 
   * @example
   * ```typescript
   * await orchestrator.processUserSpeech("I see a red flower!");
   * ```
   */
  async processUserSpeech(transcript: string): Promise<void> {
    const processingStartTime = Date.now();
    
    // Prevent processing if already processing or session not active
    const state = this.sessionManager.getState();
    if (this.isProcessing || (state.status !== 'active' && state.status !== 'wrapping_up')) {
      return;
    }

    try {
      this.isProcessing = true;
      this.notifyStateChange();
      
      // Measure and log processing start latency
      const processingStartLatency = Date.now() - processingStartTime;
      console.log(`[ConversationOrchestrator] Processing started in ${processingStartLatency}ms`);
      
      if (processingStartLatency > 500) {
        console.warn(`[ConversationOrchestrator] Processing start exceeded 500ms target: ${processingStartLatency}ms`);
      }

      // Add user message to conversation history
      const userMessage: Message = {
        role: 'user',
        content: transcript,
        timestamp: Date.now(),
      };
      this.messages.push(userMessage);
      this.sessionManager.incrementMessageCount();

      // Check if we should wrap up the conversation
      if (this.sessionManager.shouldWrapUp() && state.status === 'active') {
        this.sessionManager.setStatus('wrapping_up');
        this.notifyStateChange();
      }

      // Check if conversation time is up
      if (this.checkTimeRemaining() <= 0) {
        // Stop listening before ending conversation
        if (this.sttHandler.isCurrentlyListening()) {
          this.sttHandler.stopListening();
        }
        await this.endConversation();
        return;
      }

      // Get AI response
      // Requirement 9.2: Generate response within 2 seconds
      const aiResponseStartTime = Date.now();
      const tools = this.toolRegistry.getAllTools();
      const response = await this.llmClient.sendMessage(this.messages, tools);
      
      // Measure and log AI response latency
      const aiResponseLatency = Date.now() - aiResponseStartTime;
      console.log(`[ConversationOrchestrator] AI response generated in ${aiResponseLatency}ms`);
      
      if (aiResponseLatency > 2000) {
        console.warn(`[ConversationOrchestrator] AI response exceeded 2s target: ${aiResponseLatency}ms`);
      }

      // Handle the AI response
      await this.handleAIResponse(response);

    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.isProcessing = false;
      this.notifyStateChange();
    }
  }

  /**
   * Handle AI response including tool calls and speech synthesis
   * 
   * Processes the AI's response by adding it to conversation history,
   * executing any tool calls, and speaking the response text via TTS.
   * Tool calls are executed with a 500ms timeout requirement.
   * 
   * Requirements: 6.1 (tool calls), 6.2 (execution within 500ms), 9.2 (response latency)
   * 
   * @param response - The AI response from the LLM
   * @throws Error if response handling fails
   */
  async handleAIResponse(response: AIResponse): Promise<void> {
    try {
      // Add assistant message to conversation history
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
        toolCalls: response.toolCalls.length > 0 ? response.toolCalls : undefined,
      };
      this.messages.push(assistantMessage);
      this.sessionManager.incrementMessageCount();

      // Execute tool calls if present
      // Requirement 6.2: Execute within 500ms
      if (response.toolCalls && response.toolCalls.length > 0) {
        await this.executeToolCalls(response.toolCalls);
      }

      // Speak the AI response if there's content
      if (response.content && response.content.trim().length > 0) {
        if (this.callbacks.onAIResponse) {
          this.callbacks.onAIResponse(response.content);
        }

        // Speak the response (TTS will handle stopping STT)
        await this.ttsHandler.speak(response.content);
      }

    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Execute tool calls from AI response
   * 
   * Iterates through tool calls and executes each one with a 500ms timeout.
   * If a tool execution fails, the error is logged but the conversation continues
   * to ensure resilience (Requirement 6.4).
   * 
   * Requirements: 6.2 (execution within 500ms), 6.4 (error resilience)
   * 
   * @param toolCalls - Array of tool calls to execute
   * @private
   */
  private async executeToolCalls(toolCalls: ToolCall[]): Promise<void> {
    for (const toolCall of toolCalls) {
      const toolExecutionStartTime = Date.now();
      
      try {
        // Notify callback
        if (this.callbacks.onToolCall) {
          this.callbacks.onToolCall(toolCall.name, toolCall.arguments);
        }

        // Execute the tool with timeout
        // Requirement 6.2: Execute within 500ms
        await this.executeToolWithTimeout(toolCall.name, toolCall.arguments, 500);
        
        // Measure and log tool execution time
        const toolExecutionTime = Date.now() - toolExecutionStartTime;
        console.log(`[ConversationOrchestrator] Tool "${toolCall.name}" executed in ${toolExecutionTime}ms`);
        
        if (toolExecutionTime > 500) {
          console.warn(`[ConversationOrchestrator] Tool "${toolCall.name}" exceeded 500ms target: ${toolExecutionTime}ms`);
        }
        
        // Track tool call
        this.sessionManager.incrementToolCallCount();

      } catch (error) {
        // Log execution time even on error
        const toolExecutionTime = Date.now() - toolExecutionStartTime;
        console.log(`[ConversationOrchestrator] Tool "${toolCall.name}" failed after ${toolExecutionTime}ms`);
        
        // Requirement 6.4: Log error and continue conversation
        logError(
          'tool_execution_error',
          `Tool execution failed for "${toolCall.name}"`,
          {
            component: 'ConversationOrchestrator',
            action: 'executeToolCall',
            sessionId: this.sessionManager.getState().sessionId,
            additionalData: {
              toolName: toolCall.name,
              toolArgs: toolCall.arguments,
              executionTime: toolExecutionTime,
            },
          },
          error
        );
        // Continue with next tool call - don't let one failure stop the conversation
      }
    }
  }

  /**
   * Execute a tool with a timeout
   * 
   * Wraps tool execution with a timeout to ensure it completes within
   * the specified time limit. Uses Promise.race to enforce the timeout.
   * 
   * Requirements: 6.2 (execution within 500ms)
   * 
   * @param toolName - Name of the tool to execute
   * @param args - Arguments for the tool
   * @param timeoutMs - Timeout in milliseconds
   * @throws Error if tool execution times out or fails
   * @private
   */
  private async executeToolWithTimeout(
    toolName: string,
    args: object,
    timeoutMs: number
  ): Promise<void> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Tool execution timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    const executionPromise = this.toolRegistry.executeTool(toolName, args);

    await Promise.race([executionPromise, timeoutPromise]);
  }

  /**
   * Check remaining time in the conversation
   * 
   * Returns the amount of time remaining before the conversation
   * should end based on the target duration.
   * 
   * Requirements: 5.1, 5.2, 5.3
   * 
   * @returns Remaining time in milliseconds
   * 
   * @example
   * ```typescript
   * const remaining = orchestrator.checkTimeRemaining();
   * console.log(`${remaining}ms remaining`);
   * ```
   */
  checkTimeRemaining(): number {
    return this.sessionManager.getTimeRemaining();
  }

  /**
   * End the conversation session
   * 
   * Gracefully ends the conversation by stopping speech recognition,
   * canceling any ongoing speech synthesis, and marking the session as complete.
   * Cleans up all active resources.
   * 
   * Requirements: 5.3 (conclude at 60 seconds)
   * 
   * @throws Error if cleanup fails
   * 
   * @example
   * ```typescript
   * await orchestrator.endConversation();
   * ```
   */
  async endConversation(): Promise<void> {
    try {
      // Clear the conversation timeout
      this.clearConversationTimeout();

      // Stop listening
      if (this.sttHandler.isCurrentlyListening()) {
        this.sttHandler.stopListening();
      }

      // Stop any ongoing speech
      if (this.ttsHandler.isCurrentlySpeaking()) {
        this.ttsHandler.stop();
      }

      // Update session state
      this.sessionManager.completeSession();
      this.notifyStateChange();

    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get the current conversation messages
   * 
   * Returns a copy of all messages in the conversation history,
   * including user and assistant messages with their timestamps and tool calls.
   * 
   * @returns Array of conversation messages
   * 
   * @example
   * ```typescript
   * const messages = orchestrator.getMessages();
   * console.log(`Conversation has ${messages.length} messages`);
   * ```
   */
  getMessages(): Message[] {
    return [...this.messages];
  }

  /**
   * Get the current session state
   * 
   * Returns the current state of the conversation session including
   * status, timing information, and counters.
   * 
   * @returns Current session state object
   * 
   * @example
   * ```typescript
   * const state = orchestrator.getSessionState();
   * console.log(`Status: ${state.status}, Elapsed: ${state.elapsedMs}ms`);
   * ```
   */
  getSessionState() {
    return this.sessionManager.getState();
  }

  /**
   * Check if currently processing
   * 
   * Returns whether the orchestrator is currently processing user input
   * or generating an AI response. Used to prevent concurrent processing.
   * 
   * @returns True if processing is in progress
   * 
   * @example
   * ```typescript
   * if (!orchestrator.isCurrentlyProcessing()) {
   *   await orchestrator.processUserSpeech(transcript);
   * }
   * ```
   */
  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Notify state change to callback
   * 
   * Calls the registered onStateChange callback with the current state
   * information including session state, processing status, and message count.
   * 
   * @private
   */
  private notifyStateChange(): void {
    if (this.callbacks.onStateChange) {
      const state = {
        sessionState: this.sessionManager.getState(),
        isProcessing: this.isProcessing,
        messageCount: this.messages.length,
      };
      this.callbacks.onStateChange(state);
    }
  }

  /**
   * Handle errors with callback notification
   * 
   * Logs errors to the error logger and notifies the registered error callback.
   * Ensures all errors are properly tracked and communicated to the UI.
   * 
   * @param error - The error to handle
   * @private
   */
  private handleError(error: Error): void {
    logError(
      'conversation_error',
      error.message,
      {
        component: 'ConversationOrchestrator',
        sessionId: this.sessionManager.getState().sessionId,
      },
      error
    );
    if (this.callbacks.onError) {
      this.callbacks.onError(error);
    }
  }

  /**
   * Clean up resources
   * 
   * Stops all active processes (speech recognition, speech synthesis),
   * clears timeouts, and destroys the session manager. Should be called
   * when the orchestrator is no longer needed.
   * 
   * @example
   * ```typescript
   * orchestrator.destroy();
   * ```
   */
  destroy(): void {
    // Clear conversation timeout
    this.clearConversationTimeout();

    // Stop listening
    if (this.sttHandler.isCurrentlyListening()) {
      this.sttHandler.stopListening();
    }

    // Stop speaking
    if (this.ttsHandler.isCurrentlySpeaking()) {
      this.ttsHandler.stop();
    }

    // Clean up session manager
    this.sessionManager.destroy();
  }
}
