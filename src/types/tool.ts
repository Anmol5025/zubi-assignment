/**
 * Tool registry and definition type definitions
 */

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
  handler: (args: any) => Promise<void>;
}
