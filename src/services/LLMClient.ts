import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import type { LLMConfig } from '../types/config';
import type { Message, ToolCall } from '../types/message';
import type { AIResponse, Tool } from '../types/services';
import type { ImageContext } from '../types/image';
import { PromptManager } from './PromptManager';
import { retryWithBackoff, isRetryableError } from '../utils/retryWithBackoff';
import { logError } from '../utils/errorLogger';

export class LLMClient {
  private client: OpenAI | null = null;
  private config: LLMConfig | null = null;
  private systemPrompt: string = '';
  private promptManager: PromptManager | null = null;

  /**
   * Initialize the LLM client with configuration
   * 
   * @param config - LLM configuration including provider, model, API key, etc.
   */
  initialize(config: LLMConfig): void {
    if (config.provider !== 'openai') {
      const error = new Error(`Provider ${config.provider} not supported. Only 'openai' is currently supported.`);
      logError('ai_service_error', error.message, { component: 'LLMClient', action: 'initialize' });
      throw error;
    }

    if (!config.apiKey) {
      const error = new Error('OpenAI API key is required');
      logError('ai_service_error', error.message, { component: 'LLMClient', action: 'initialize' });
      throw error;
    }

    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      dangerouslyAllowBrowser: true,
    });

    this.systemPrompt = this.createChildAppropriateSystemPrompt();
  }

  /**
   * Create a child-appropriate system prompt for conversations
   * 
   * Generates a system prompt that guides the AI to use simple language,
   * ask open-ended questions, and maintain an engaging, educational tone
   * suitable for children.
   * 
   * @returns System prompt string
   * @private
   */
  private createChildAppropriateSystemPrompt(): string {
    return `You are a friendly, enthusiastic AI companion talking with a child about an image they're looking at. Your goal is to have an engaging, educational conversation that lasts about 1 minute.

Guidelines:
- Use simple, age-appropriate language suitable for children
- Be encouraging, positive, and supportive
- Ask open-ended questions to encourage the child to think and share
- Reference specific elements you can see in the image
- Build on the child's responses and show genuine interest
- Use the visual effect tools to make the conversation more engaging
- Keep responses concise (1-3 sentences) to maintain engagement
- Avoid complex vocabulary or abstract concepts
- Never discuss inappropriate topics
- Be patient and understanding if the child gives unexpected answers

Remember: You're here to make learning fun and help the child explore their curiosity!`;
  }

  /**
   * Set the image context and enable PromptManager for context-aware prompts
   * 
   * Creates a PromptManager instance with the provided image context and options,
   * then generates a context-aware system prompt that includes information about
   * the displayed image.
   * 
   * @param imageContext - The image context to use for generating prompts
   * @param options - Optional configuration for the PromptManager (child age, conversation style)
   * 
   * @example
   * ```typescript
   * client.setImageContext({
   *   description: 'A colorful garden with flowers',
   *   detectedObjects: ['flowers', 'butterfly', 'tree'],
   *   colors: ['red', 'yellow', 'green'],
   *   mood: 'cheerful'
   * }, {
   *   childAge: 7,
   *   conversationStyle: 'educational'
   * });
   * ```
   */
  setImageContext(imageContext: ImageContext, options?: { childAge?: number; conversationStyle?: 'educational' | 'playful' | 'exploratory' }): void {
    this.promptManager = new PromptManager(options);
    this.systemPrompt = this.promptManager.generateSystemPrompt(imageContext);
  }

  /**
   * Get the PromptManager instance (if set)
   * 
   * Returns the PromptManager instance if image context has been set,
   * otherwise returns null.
   * 
   * @returns PromptManager instance or null
   */
  getPromptManager(): PromptManager | null {
    return this.promptManager;
  }

  /**
   * Send a message and get a complete response
   * 
   * Sends messages to the LLM and receives a complete response including
   * any tool calls. Implements retry logic with exponential backoff for
   * transient failures (network errors, timeouts, rate limits).
   * 
   * Requirements: 10.2 (retry logic for AI service failures)
   * 
   * @param messages - Array of conversation messages
   * @param tools - Array of available tools for function calling
   * @returns Promise resolving to AI response with content and tool calls
   * @throws Error if LLM client is not initialized or API call fails after retries
   * 
   * @example
   * ```typescript
   * const response = await client.sendMessage(
   *   [{ role: 'user', content: 'What do you see?', timestamp: Date.now() }],
   *   toolRegistry.getAllTools()
   * );
   * console.log(response.content);
   * ```
   */
  async sendMessage(messages: Message[], tools: Tool[]): Promise<AIResponse> {
    if (!this.client || !this.config) {
      const error = new Error('LLMClient not initialized. Call initialize() first.');
      logError('ai_service_error', error.message, { component: 'LLMClient', action: 'sendMessage' });
      throw error;
    }

    // Convert messages to OpenAI format
    const openAIMessages = this.convertToOpenAIMessages(messages);

    // Convert tools to OpenAI format
    const openAITools = this.convertToOpenAITools(tools);

    // Wrap the API call with retry logic
    return retryWithBackoff(
      async () => {
        try {
          const completion = await this.client!.chat.completions.create({
            model: this.config!.model,
            messages: openAIMessages,
            tools: openAITools.length > 0 ? openAITools : undefined,
            temperature: this.config!.temperature,
            max_tokens: this.config!.maxTokens,
          });

          return this.parseOpenAIResponse(completion);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const wrappedError = new Error(`OpenAI API error: ${errorMessage}`);
          
          // Log the error with context
          logError(
            'ai_service_error',
            wrappedError.message,
            { 
              component: 'LLMClient', 
              action: 'sendMessage',
              additionalData: { model: this.config!.model }
            },
            error
          );
          
          throw wrappedError;
        }
      },
      {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 8000,
        backoffMultiplier: 2,
        shouldRetry: isRetryableError,
      }
    );
  }

  /**
   * Stream a message and get responses incrementally
   * 
   * Sends messages to the LLM and receives streaming responses as they are generated.
   * Useful for displaying AI responses in real-time as they are being created.
   * Accumulates content and tool calls across chunks.
   * 
   * @param messages - Array of conversation messages
   * @param tools - Array of available tools for function calling
   * @yields AIResponse objects with incrementally accumulated content and tool calls
   * @throws Error if LLM client is not initialized or streaming fails
   * 
   * @example
   * ```typescript
   * for await (const response of client.streamMessage(messages, tools)) {
   *   console.log('Partial response:', response.content);
   *   if (response.finishReason === 'stop') {
   *     console.log('Complete!');
   *   }
   * }
   * ```
   */
  async *streamMessage(messages: Message[], tools: Tool[]): AsyncGenerator<AIResponse> {
    if (!this.client || !this.config) {
      const error = new Error('LLMClient not initialized. Call initialize() first.');
      logError('ai_service_error', error.message, { component: 'LLMClient', action: 'streamMessage' });
      throw error;
    }

    // Convert messages to OpenAI format
    const openAIMessages = this.convertToOpenAIMessages(messages);

    // Convert tools to OpenAI format
    const openAITools = this.convertToOpenAITools(tools);

    try {
      const stream = await this.client.chat.completions.create({
        model: this.config.model,
        messages: openAIMessages,
        tools: openAITools.length > 0 ? openAITools : undefined,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: true,
      });

      let accumulatedContent = '';
      let accumulatedToolCalls: Array<{ id: string; name: string; argumentsStr: string }> = [];
      let finishReason: 'stop' | 'length' | 'tool_calls' = 'stop';

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        if (delta?.content) {
          accumulatedContent += delta.content;
        }

        if (delta?.tool_calls) {
          // Accumulate tool calls
          for (const toolCall of delta.tool_calls) {
            const index = toolCall.index;
            if (!accumulatedToolCalls[index]) {
              accumulatedToolCalls[index] = {
                id: toolCall.id || '',
                name: toolCall.function?.name || '',
                argumentsStr: '',
              };
            }
            
            if (toolCall.id) {
              accumulatedToolCalls[index].id = toolCall.id;
            }
            
            if (toolCall.function?.name) {
              accumulatedToolCalls[index].name = toolCall.function.name;
            }
            
            if (toolCall.function?.arguments) {
              accumulatedToolCalls[index].argumentsStr += toolCall.function.arguments;
            }
          }
        }

        if (chunk.choices[0]?.finish_reason) {
          const reason = chunk.choices[0].finish_reason;
          if (reason === 'stop' || reason === 'length' || reason === 'tool_calls') {
            finishReason = reason;
          }
        }

        // Parse tool calls for yielding
        const parsedToolCalls: ToolCall[] = accumulatedToolCalls
          .filter(tc => tc.id)
          .map(tc => {
            let args = {};
            if (tc.argumentsStr) {
              try {
                args = JSON.parse(tc.argumentsStr);
              } catch {
                // Still accumulating, not valid JSON yet
              }
            }
            return {
              id: tc.id,
              name: tc.name,
              arguments: args,
            };
          });

        // Yield current state
        yield {
          content: accumulatedContent,
          toolCalls: parsedToolCalls,
          finishReason,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const wrappedError = new Error(`OpenAI streaming error: ${errorMessage}`);
      
      // Log the error with context
      logError(
        'ai_service_error',
        wrappedError.message,
        { 
          component: 'LLMClient', 
          action: 'streamMessage',
          additionalData: { model: this.config.model }
        },
        error
      );
      
      throw wrappedError;
    }
  }

  /**
   * Convert internal Message format to OpenAI format
   * 
   * Transforms the application's message format into the format expected
   * by the OpenAI API. Adds the system prompt and handles tool calls.
   * 
   * @param messages - Array of internal messages
   * @returns Array of OpenAI-formatted messages
   * @private
   */
  private convertToOpenAIMessages(messages: Message[]): ChatCompletionMessageParam[] {
    const openAIMessages: ChatCompletionMessageParam[] = [];

    // Add system prompt first
    if (this.systemPrompt) {
      openAIMessages.push({
        role: 'system',
        content: this.systemPrompt,
      });
    }

    // Convert messages
    for (const message of messages) {
      if (message.role === 'system') {
        // Skip system messages as we already added our system prompt
        continue;
      }

      if (message.role === 'user') {
        openAIMessages.push({
          role: 'user',
          content: message.content,
        });
      } else if (message.role === 'assistant') {
        if (message.toolCalls && message.toolCalls.length > 0) {
          openAIMessages.push({
            role: 'assistant',
            content: message.content || null,
            tool_calls: message.toolCalls.map(tc => ({
              id: tc.id,
              type: 'function' as const,
              function: {
                name: tc.name,
                arguments: JSON.stringify(tc.arguments),
              },
            })),
          });
        } else {
          openAIMessages.push({
            role: 'assistant',
            content: message.content,
          });
        }
      }
    }

    return openAIMessages;
  }

  /**
   * Convert internal Tool format to OpenAI format
   * 
   * Transforms the application's tool definitions into the format expected
   * by the OpenAI function calling API.
   * 
   * @param tools - Array of internal tool definitions
   * @returns Array of OpenAI-formatted tool definitions
   * @private
   */
  private convertToOpenAITools(tools: Tool[]): ChatCompletionTool[] {
    return tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as Record<string, unknown>,
      },
    }));
  }

  /**
   * Parse OpenAI response to internal format
   * 
   * Transforms the OpenAI API response into the application's internal
   * AIResponse format, extracting content, tool calls, and finish reason.
   * 
   * @param completion - OpenAI chat completion response
   * @returns Parsed AI response in internal format
   * @private
   */
  private parseOpenAIResponse(completion: OpenAI.Chat.Completions.ChatCompletion): AIResponse {
    const choice = completion.choices[0];
    const message = choice.message;

    const toolCalls: ToolCall[] = [];
    if (message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        if (toolCall.type === 'function') {
          toolCalls.push({
            id: toolCall.id,
            name: toolCall.function.name,
            arguments: JSON.parse(toolCall.function.arguments),
          });
        }
      }
    }

    let finishReason: 'stop' | 'length' | 'tool_calls' = 'stop';
    if (choice.finish_reason === 'length') {
      finishReason = 'length';
    } else if (choice.finish_reason === 'tool_calls') {
      finishReason = 'tool_calls';
    }

    return {
      content: message.content || '',
      toolCalls,
      finishReason,
    };
  }
}
