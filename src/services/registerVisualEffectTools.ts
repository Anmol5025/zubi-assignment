/**
 * Helper function to register all visual effect tools with a ToolRegistry instance
 * 
 * This module provides a convenient way to register all visual effect tools
 * at once, ensuring they are available for the AI to use during conversations.
 * 
 * Requirements: 6.3
 */

import { ToolRegistry } from './ToolRegistry';
import { getAllVisualEffectTools } from './visualEffectTools';

/**
 * Register all visual effect tools with the provided ToolRegistry
 * 
 * @param registry - The ToolRegistry instance to register tools with
 * @returns The number of tools registered
 * 
 * @example
 * ```typescript
 * const registry = new ToolRegistry();
 * const count = registerVisualEffectTools(registry);
 * console.log(`Registered ${count} visual effect tools`);
 * ```
 */
export function registerVisualEffectTools(registry: ToolRegistry): number {
  const tools = getAllVisualEffectTools();
  
  tools.forEach(tool => {
    registry.registerTool(tool);
  });
  
  return tools.length;
}
