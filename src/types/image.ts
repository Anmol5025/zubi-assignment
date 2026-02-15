/**
 * Image context type definitions
 */

export interface ImageContext {
  url: string;
  description: string;
  detectedObjects?: string[];
  colors?: string[];
  mood?: string;
  suggestedTopics?: string[];
}
