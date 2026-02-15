/**
 * ToolRegistry - Manages registration and execution of UI manipulation tools
 * 
 * This class provides a centralized registry for tools that the AI can invoke
 * to manipulate the UI during conversations. It handles tool registration,
 * retrieval, and execution with proper error handling.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import type { ToolDefinition } from '../types/tool';
import { logError } from '../utils/errorLogger';

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  /**
   * Register a new tool in the registry
   * @param tool - The tool definition to register
   * @throws Error if a tool with the same name already exists
   */
  registerTool(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool with name "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Retrieve a tool definition by name
   * @param name - The name of the tool to retrieve
   * @returns The tool definition or undefined if not found
   */
  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools (without handlers for LLM consumption)
   * @returns Array of tool definitions suitable for LLM function calling
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  /**
   * Execute a tool by name with the provided arguments
   * @param name - The name of the tool to execute
   * @param args - The arguments to pass to the tool handler
   * @throws Error if tool is not found or execution fails
   * 
   * Requirements: 6.2 (execution within 500ms), 6.4 (error handling)
   */
  async executeTool(name: string, args: object): Promise<void> {
    const tool = this.tools.get(name);
    
    if (!tool) {
      const error = new Error(`Tool "${name}" not found in registry`);
      logError(
        'tool_execution_error',
        `Tool "${name}" not found in registry`,
        { component: 'ToolRegistry', action: 'executeTool', additionalData: { toolName: name } },
        error
      );
      throw error;
    }

    try {
      await tool.handler(args);
    } catch (error) {
      const executionError = new Error(
        `Tool "${name}" execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
      logError(
        'tool_execution_error',
        `Tool "${name}" execution failed`,
        { component: 'ToolRegistry', action: 'executeTool', additionalData: { toolName: name, args } },
        error
      );
      throw executionError;
    }
  }

  /**
   * Check if a tool is registered
   * @param name - The name of the tool to check
   * @returns True if the tool exists in the registry
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Unregister a tool from the registry
   * @param name - The name of the tool to remove
   * @returns True if the tool was removed, false if it didn't exist
   */
  unregisterTool(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Clear all registered tools
   */
  clear(): void {
    this.tools.clear();
  }

  /**
   * Get the count of registered tools
   * @returns The number of tools in the registry
   */
  get size(): number {
    return this.tools.size;
  }
}
