/**
 * Unit tests for registerVisualEffectTools helper
 */

import { ToolRegistry } from './ToolRegistry';
import { registerVisualEffectTools } from './registerVisualEffectTools';

describe('registerVisualEffectTools', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  it('should register all visual effect tools', () => {
    const count = registerVisualEffectTools(registry);
    
    expect(count).toBe(5);
    expect(registry.size).toBe(5);
  });

  it('should register tools with correct names', () => {
    registerVisualEffectTools(registry);
    
    expect(registry.hasTool('highlight_image_area')).toBe(true);
    expect(registry.hasTool('show_emoji')).toBe(true);
    expect(registry.hasTool('show_animation')).toBe(true);
    expect(registry.hasTool('show_overlay')).toBe(true);
    expect(registry.hasTool('zoom_image')).toBe(true);
  });

  it('should register tools that can be retrieved', () => {
    registerVisualEffectTools(registry);
    
    const highlightTool = registry.getTool('highlight_image_area');
    expect(highlightTool).toBeDefined();
    expect(highlightTool?.name).toBe('highlight_image_area');
    expect(highlightTool?.handler).toBeInstanceOf(Function);
  });

  it('should register tools that can be executed', async () => {
    registerVisualEffectTools(registry);
    
    await expect(
      registry.executeTool('show_emoji', { emoji: '😊' })
    ).resolves.toBeUndefined();
  });

  it('should make tools available via getAllTools', () => {
    registerVisualEffectTools(registry);
    
    const tools = registry.getAllTools();
    expect(tools).toHaveLength(5);
    
    const toolNames = tools.map(t => t.name);
    expect(toolNames).toContain('highlight_image_area');
    expect(toolNames).toContain('show_emoji');
    expect(toolNames).toContain('show_animation');
    expect(toolNames).toContain('show_overlay');
    expect(toolNames).toContain('zoom_image');
  });

  it('should not duplicate tools if called multiple times', () => {
    registerVisualEffectTools(registry);
    
    // Attempting to register again should throw errors
    expect(() => registerVisualEffectTools(registry)).toThrow();
    
    // Size should still be 5 (first registration succeeded)
    expect(registry.size).toBe(5);
  });

  it('should work with empty registry', () => {
    expect(registry.size).toBe(0);
    
    const count = registerVisualEffectTools(registry);
    
    expect(count).toBe(5);
    expect(registry.size).toBe(5);
  });

  it('should work with registry that has other tools', () => {
    // Register a custom tool first
    registry.registerTool({
      name: 'custom_tool',
      description: 'A custom tool',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
      handler: async () => {},
    });
    
    expect(registry.size).toBe(1);
    
    const count = registerVisualEffectTools(registry);
    
    expect(count).toBe(5);
    expect(registry.size).toBe(6);
    expect(registry.hasTool('custom_tool')).toBe(true);
    expect(registry.hasTool('show_emoji')).toBe(true);
  });

  it('should return correct count', () => {
    const count = registerVisualEffectTools(registry);
    expect(count).toBeGreaterThan(0);
    expect(count).toBe(registry.size);
  });
});
