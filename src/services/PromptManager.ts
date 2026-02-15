/**
 * PromptManager
 * 
 * Manages prompt generation for image-based conversations including
 * system prompts, conversation initiation, wrap-up, and closing templates.
 * 
 * Validates Requirements: 2.2, 5.2, 5.3
 */

import type { ImageContext } from '../types/image';
import type { SessionStatus } from '../types/session';

export interface PromptOptions {
  childAge?: number;
  conversationStyle?: 'educational' | 'playful' | 'exploratory';
}

export class PromptManager {
  private options: PromptOptions;

  constructor(options: PromptOptions = {}) {
    this.options = {
      childAge: options.childAge || 8,
      conversationStyle: options.conversationStyle || 'educational',
    };
  }

  /**
   * Generates a system prompt that includes image context
   * Requirement 2.2: References the displayed image
   */
  generateSystemPrompt(imageContext: ImageContext): string {
    const basePrompt = this.getBaseSystemPrompt();
    const imageDescription = this.formatImageContext(imageContext);
    
    return `${basePrompt}

IMAGE CONTEXT:
${imageDescription}

Your task is to have a natural, engaging conversation about this image with the child. Reference specific elements from the image throughout the conversation to make it interactive and educational.`;
  }

  /**
   * Generates an opening message to initiate the conversation
   * Requirement 2.2: References the displayed image in opening statement
   */
  generateOpeningPrompt(imageContext: ImageContext): string {
    const imageElements = this.extractKeyElements(imageContext);
    
    return `Start the conversation by greeting the child and immediately referencing something interesting you see in the image. For example, mention ${imageElements}. Ask an open-ended question that encourages the child to share their thoughts or observations about the image.`;
  }

  /**
   * Generates a wrap-up prompt when conversation should begin concluding
   * Requirement 5.2: Begin wrapping up naturally at 50 seconds
   */
  generateWrapUpPrompt(): string {
    return `The conversation is approaching its end. Begin wrapping up naturally by:
- Summarizing one interesting thing you discussed about the image
- Asking one final, simple question
- Preparing to say goodbye in your next response
Keep this response brief and positive.`;
  }

  /**
   * Generates a closing prompt to end the conversation
   * Requirement 5.3: Conclude with a friendly closing at 60 seconds
   */
  generateClosingPrompt(): string {
    return `End the conversation now with a warm, friendly goodbye. Thank the child for the wonderful conversation and encourage them positively. Keep it brief (1-2 sentences) and upbeat.`;
  }

  /**
   * Gets the appropriate prompt based on session status
   */
  getPromptForStatus(status: SessionStatus, imageContext: ImageContext): string | null {
    switch (status) {
      case 'initializing':
        return this.generateOpeningPrompt(imageContext);
      case 'wrapping_up':
        return this.generateWrapUpPrompt();
      case 'completed':
        return this.generateClosingPrompt();
      default:
        return null;
    }
  }

  /**
   * Creates the base system prompt with conversation guidelines
   */
  private getBaseSystemPrompt(): string {
    const ageGuidance = this.getAgeAppropriateGuidance();
    const styleGuidance = this.getStyleGuidance();

    return `You are a friendly, enthusiastic AI companion talking with a child about an image they're looking at. Your goal is to have an engaging, educational conversation that lasts about 1 minute.

GUIDELINES:
${ageGuidance}
${styleGuidance}

CONVERSATION RULES:
- Use simple, age-appropriate language
- Be encouraging, positive, and supportive
- Ask open-ended questions (not yes/no questions)
- Reference specific elements visible in the image
- Build on the child's responses with genuine interest
- Use visual effect tools to enhance engagement
- Keep responses concise (1-3 sentences)
- Avoid complex vocabulary or abstract concepts
- Never discuss inappropriate topics
- Be patient with unexpected answers

Remember: Make learning fun and help the child explore their curiosity!`;
  }

  /**
   * Gets age-appropriate conversation guidance
   */
  private getAgeAppropriateGuidance(): string {
    const age = this.options.childAge || 8;

    if (age <= 5) {
      return `- Use very simple words and short sentences
- Focus on colors, shapes, and familiar objects
- Encourage counting and naming things
- Use lots of enthusiasm and praise`;
    } else if (age <= 8) {
      return `- Use clear, simple language
- Ask "why" and "how" questions
- Encourage descriptive answers
- Connect to their everyday experiences`;
    } else {
      return `- Use more varied vocabulary
- Ask analytical questions
- Encourage critical thinking
- Explore cause and effect relationships`;
    }
  }

  /**
   * Gets conversation style guidance
   */
  private getStyleGuidance(): string {
    switch (this.options.conversationStyle) {
      case 'playful':
        return `- Use playful language and expressions
- Make the conversation fun and lighthearted
- Use imagination and creativity
- Celebrate silly or creative answers`;
      
      case 'exploratory':
        return `- Encourage observation and discovery
- Ask questions that promote exploration
- Help the child notice details
- Foster curiosity about the world`;
      
      case 'educational':
      default:
        return `- Focus on learning opportunities
- Introduce new concepts gently
- Connect observations to knowledge
- Encourage thinking and reasoning`;
    }
  }

  /**
   * Formats image context into a readable description
   */
  private formatImageContext(imageContext: ImageContext): string {
    const parts: string[] = [];

    parts.push(`Description: ${imageContext.description}`);

    if (imageContext.detectedObjects && imageContext.detectedObjects.length > 0) {
      parts.push(`Objects visible: ${imageContext.detectedObjects.join(', ')}`);
    }

    if (imageContext.colors && imageContext.colors.length > 0) {
      parts.push(`Prominent colors: ${imageContext.colors.join(', ')}`);
    }

    if (imageContext.mood) {
      parts.push(`Mood/Atmosphere: ${imageContext.mood}`);
    }

    if (imageContext.suggestedTopics && imageContext.suggestedTopics.length > 0) {
      parts.push(`Suggested discussion topics: ${imageContext.suggestedTopics.join(', ')}`);
    }

    return parts.join('\n');
  }

  /**
   * Extracts key elements from image context for opening prompts
   */
  private extractKeyElements(imageContext: ImageContext): string {
    const elements: string[] = [];

    // Prioritize detected objects
    if (imageContext.detectedObjects && imageContext.detectedObjects.length > 0) {
      elements.push(...imageContext.detectedObjects.slice(0, 2));
    }

    // Add colors if available
    if (imageContext.colors && imageContext.colors.length > 0 && elements.length < 2) {
      elements.push(`the ${imageContext.colors[0]} colors`);
    }

    // Fallback to description keywords
    if (elements.length === 0) {
      const words = imageContext.description.split(' ').slice(0, 3);
      elements.push(...words);
    }

    return elements.join(' or ');
  }

  /**
   * Updates prompt options
   */
  updateOptions(options: Partial<PromptOptions>): void {
    this.options = {
      ...this.options,
      ...options,
    };
  }

  /**
   * Gets current options
   */
  getOptions(): PromptOptions {
    return { ...this.options };
  }
}
