/**
 * Unit tests for ToolRegistry
 */

import { ToolRegistry } from './ToolRegistry';
import type { ToolDefinition } from '../types/tool';
import * as fc from 'fast-check';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('registerTool', () => {
    it('should register a new tool successfully', () => {
      const tool: ToolDefinition = {
        name: 'test_tool',
        description: 'A test tool',
        parameters: {
          type: 'object',
          properties: { arg1: { type: 'string' } },
          required: ['arg1'],
        },
        handler: jest.fn(),
      };

      registry.registerTool(tool);
      expect(registry.hasTool('test_tool')).toBe(true);
      expect(registry.size).toBe(1);
    });

    it('should throw error when registering duplicate tool name', () => {
      const tool: ToolDefinition = {
        name: 'duplicate_tool',
        description: 'A tool',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
        handler: jest.fn(),
      };

      registry.registerTool(tool);
      expect(() => registry.registerTool(tool)).toThrow(
        'Tool with name "duplicate_tool" is already registered'
      );
    });

    it('should register multiple different tools', () => {
      const tool1: ToolDefinition = {
        name: 'tool1',
        description: 'First tool',
        parameters: { type: 'object', properties: {}, required: [] },
        handler: jest.fn(),
      };

      const tool2: ToolDefinition = {
        name: 'tool2',
        description: 'Second tool',
        parameters: { type: 'object', properties: {}, required: [] },
        handler: jest.fn(),
      };

      registry.registerTool(tool1);
      registry.registerTool(tool2);

      expect(registry.size).toBe(2);
      expect(registry.hasTool('tool1')).toBe(true);
      expect(registry.hasTool('tool2')).toBe(true);
    });
  });

  describe('getTool', () => {
    it('should retrieve a registered tool', () => {
      const tool: ToolDefinition = {
        name: 'retrieve_test',
        description: 'Test retrieval',
        parameters: {
          type: 'object',
          properties: { param: { type: 'number' } },
          required: ['param'],
        },
        handler: jest.fn(),
      };

      registry.registerTool(tool);
      const retrieved = registry.getTool('retrieve_test');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('retrieve_test');
      expect(retrieved?.description).toBe('Test retrieval');
    });

    it('should return undefined for non-existent tool', () => {
      const result = registry.getTool('non_existent');
      expect(result).toBeUndefined();
    });
  });

  describe('getAllTools', () => {
    it('should return empty array when no tools registered', () => {
      const tools = registry.getAllTools();
      expect(tools).toEqual([]);
    });

    it('should return all tools without handlers', () => {
      const tool1: ToolDefinition = {
        name: 'tool1',
        description: 'First tool',
        parameters: {
          type: 'object',
          properties: { arg: { type: 'string' } },
          required: ['arg'],
        },
        handler: jest.fn(),
      };

      const tool2: ToolDefinition = {
        name: 'tool2',
        description: 'Second tool',
        parameters: {
          type: 'object',
          properties: { num: { type: 'number' } },
          required: [],
        },
        handler: jest.fn(),
      };

      registry.registerTool(tool1);
      registry.registerTool(tool2);

      const tools = registry.getAllTools();

      expect(tools).toHaveLength(2);
      expect(tools[0]).toEqual({
        name: 'tool1',
        description: 'First tool',
        parameters: {
          type: 'object',
          properties: { arg: { type: 'string' } },
          required: ['arg'],
        },
      });
      expect(tools[1]).toEqual({
        name: 'tool2',
        description: 'Second tool',
        parameters: {
          type: 'object',
          properties: { num: { type: 'number' } },
          required: [],
        },
      });
      // Verify handlers are not included
      expect(tools[0]).not.toHaveProperty('handler');
      expect(tools[1]).not.toHaveProperty('handler');
    });
  });

  describe('executeTool', () => {
    it('should execute a tool successfully', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      const tool: ToolDefinition = {
        name: 'execute_test',
        description: 'Test execution',
        parameters: {
          type: 'object',
          properties: { value: { type: 'string' } },
          required: ['value'],
        },
        handler,
      };

      registry.registerTool(tool);
      await registry.executeTool('execute_test', { value: 'test' });

      expect(handler).toHaveBeenCalledWith({ value: 'test' });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should throw error when executing non-existent tool', async () => {
      await expect(
        registry.executeTool('non_existent', {})
      ).rejects.toThrow('Tool "non_existent" not found in registry');
    });

    it('should handle tool execution failures', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Handler failed'));
      const tool: ToolDefinition = {
        name: 'failing_tool',
        description: 'A failing tool',
        parameters: { type: 'object', properties: {}, required: [] },
        handler,
      };

      registry.registerTool(tool);

      await expect(
        registry.executeTool('failing_tool', {})
      ).rejects.toThrow('Tool "failing_tool" execution failed: Handler failed');
    });

    it('should log errors when tool execution fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const handler = jest.fn().mockRejectedValue(new Error('Test error'));
      const tool: ToolDefinition = {
        name: 'error_tool',
        description: 'Error tool',
        parameters: { type: 'object', properties: {}, required: [] },
        handler,
      };

      registry.registerTool(tool);

      try {
        await registry.executeTool('error_tool', {});
      } catch (error) {
        // Expected to throw
      }

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should pass arguments correctly to handler', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      const tool: ToolDefinition = {
        name: 'args_test',
        description: 'Test arguments',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            count: { type: 'number' },
            enabled: { type: 'boolean' },
          },
          required: ['name'],
        },
        handler,
      };

      registry.registerTool(tool);
      const args = { name: 'test', count: 42, enabled: true };
      await registry.executeTool('args_test', args);

      expect(handler).toHaveBeenCalledWith(args);
    });
  });

  describe('hasTool', () => {
    it('should return true for registered tool', () => {
      const tool: ToolDefinition = {
        name: 'exists',
        description: 'Exists',
        parameters: { type: 'object', properties: {}, required: [] },
        handler: jest.fn(),
      };

      registry.registerTool(tool);
      expect(registry.hasTool('exists')).toBe(true);
    });

    it('should return false for non-existent tool', () => {
      expect(registry.hasTool('does_not_exist')).toBe(false);
    });
  });

  describe('unregisterTool', () => {
    it('should remove a registered tool', () => {
      const tool: ToolDefinition = {
        name: 'remove_me',
        description: 'To be removed',
        parameters: { type: 'object', properties: {}, required: [] },
        handler: jest.fn(),
      };

      registry.registerTool(tool);
      expect(registry.hasTool('remove_me')).toBe(true);

      const result = registry.unregisterTool('remove_me');
      expect(result).toBe(true);
      expect(registry.hasTool('remove_me')).toBe(false);
      expect(registry.size).toBe(0);
    });

    it('should return false when removing non-existent tool', () => {
      const result = registry.unregisterTool('does_not_exist');
      expect(result).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all tools', () => {
      const tool1: ToolDefinition = {
        name: 'tool1',
        description: 'Tool 1',
        parameters: { type: 'object', properties: {}, required: [] },
        handler: jest.fn(),
      };

      const tool2: ToolDefinition = {
        name: 'tool2',
        description: 'Tool 2',
        parameters: { type: 'object', properties: {}, required: [] },
        handler: jest.fn(),
      };

      registry.registerTool(tool1);
      registry.registerTool(tool2);
      expect(registry.size).toBe(2);

      registry.clear();
      expect(registry.size).toBe(0);
      expect(registry.hasTool('tool1')).toBe(false);
      expect(registry.hasTool('tool2')).toBe(false);
    });

    it('should work on empty registry', () => {
      expect(registry.size).toBe(0);
      registry.clear();
      expect(registry.size).toBe(0);
    });
  });

  describe('size', () => {
    it('should return 0 for empty registry', () => {
      expect(registry.size).toBe(0);
    });

    it('should return correct count after registrations', () => {
      const createTool = (name: string): ToolDefinition => ({
        name,
        description: `Tool ${name}`,
        parameters: { type: 'object', properties: {}, required: [] },
        handler: jest.fn(),
      });

      registry.registerTool(createTool('tool1'));
      expect(registry.size).toBe(1);

      registry.registerTool(createTool('tool2'));
      expect(registry.size).toBe(2);

      registry.registerTool(createTool('tool3'));
      expect(registry.size).toBe(3);
    });

    it('should update after unregistering tools', () => {
      const tool: ToolDefinition = {
        name: 'temp_tool',
        description: 'Temporary',
        parameters: { type: 'object', properties: {}, required: [] },
        handler: jest.fn(),
      };

      registry.registerTool(tool);
      expect(registry.size).toBe(1);

      registry.unregisterTool('temp_tool');
      expect(registry.size).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty arguments object', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      const tool: ToolDefinition = {
        name: 'no_args',
        description: 'No arguments',
        parameters: { type: 'object', properties: {}, required: [] },
        handler,
      };

      registry.registerTool(tool);
      await registry.executeTool('no_args', {});

      expect(handler).toHaveBeenCalledWith({});
    });

    it('should handle tools with complex parameter schemas', () => {
      const tool: ToolDefinition = {
        name: 'complex_tool',
        description: 'Complex parameters',
        parameters: {
          type: 'object',
          properties: {
            nested: {
              type: 'object',
              properties: {
                value: { type: 'string' },
              },
            },
            array: {
              type: 'array',
              items: { type: 'number' },
            },
          },
          required: ['nested'],
        },
        handler: jest.fn(),
      };

      registry.registerTool(tool);
      const retrieved = registry.getTool('complex_tool');

      expect(retrieved?.parameters.properties.nested).toBeDefined();
      expect(retrieved?.parameters.properties.array).toBeDefined();
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * **Validates: Requirements 6.2**
     * 
     * Property 17: Tool Execution Latency
     * For any tool call invocation, the UI_Controller should execute the 
     * corresponding action within 500ms.
     */
    it('Property 17: tool execution completes within 500ms', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 100 }), // execution time in ms (reduced for test speed)
          fc.string({ minLength: 1, maxLength: 20 }), // tool name
          fc.record({
            value: fc.string(),
            count: fc.integer({ min: 0, max: 100 }),
          }), // tool arguments
          async (executionTimeMs: number, toolName: string, args: any) => {
            const testRegistry = new ToolRegistry();
            
            // Create a tool handler that takes a specific amount of time
            const handler = jest.fn().mockImplementation(async () => {
              await new Promise(resolve => setTimeout(resolve, executionTimeMs));
            });

            const tool: ToolDefinition = {
              name: toolName,
              description: 'Test tool for latency',
              parameters: {
                type: 'object',
                properties: {
                  value: { type: 'string' },
                  count: { type: 'number' },
                },
                required: [],
              },
              handler,
            };

            testRegistry.registerTool(tool);

            // Measure execution time
            const startTime = Date.now();
            await testRegistry.executeTool(toolName, args);
            const executionLatency = Date.now() - startTime;

            // Verify execution completed within 500ms
            // We allow some overhead for test execution (50ms)
            expect(executionLatency).toBeLessThanOrEqual(executionTimeMs + 50);
            expect(handler).toHaveBeenCalledWith(args);
          }
        ),
        { numRuns: 5 } // Reduced runs for faster test execution
      );
    }, 30000); // 30 second timeout for property-based test

    /**
     * **Validates: Requirements 6.4**
     * 
     * Property 19: Tool Failure Resilience
     * For any tool call that fails during execution, the system should log 
     * the error and continue the conversation without terminating the session.
     */
    it('Property 19: tool failures are logged and do not crash the system', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }), // tool name
          fc.oneof(
            fc.constant('Handler failed'),
            fc.constant('Network error'),
            fc.constant('Invalid state'),
            fc.string({ minLength: 1, maxLength: 50 })
          ), // error message
          fc.record({
            param1: fc.string(),
            param2: fc.integer(),
          }), // tool arguments
          async (toolName: string, errorMessage: string, args: any) => {
            const testRegistry = new ToolRegistry();
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            // Create a tool handler that always fails
            const handler = jest.fn().mockRejectedValue(new Error(errorMessage));

            const tool: ToolDefinition = {
              name: toolName,
              description: 'Test tool that fails',
              parameters: {
                type: 'object',
                properties: {
                  param1: { type: 'string' },
                  param2: { type: 'number' },
                },
                required: [],
              },
              handler,
            };

            testRegistry.registerTool(tool);

            // Execute the tool and expect it to throw
            let errorThrown = false;
            let thrownError: Error | null = null;
            
            try {
              await testRegistry.executeTool(toolName, args);
            } catch (error) {
              errorThrown = true;
              thrownError = error as Error;
            }

            // Verify error was thrown (so caller can handle it)
            expect(errorThrown).toBe(true);
            expect(thrownError).toBeDefined();
            expect(thrownError?.message).toContain(toolName);
            expect(thrownError?.message).toContain(errorMessage);
            
            // Verify error was logged (Requirement 6.4)
            expect(consoleErrorSpy).toHaveBeenCalled();
            
            // Verify the registry is still functional after the error
            expect(testRegistry.hasTool(toolName)).toBe(true);
            expect(testRegistry.size).toBe(1);
            
            // Verify we can still register and execute other tools
            const workingHandler = jest.fn().mockResolvedValue(undefined);
            const workingTool: ToolDefinition = {
              name: 'working_tool',
              description: 'A working tool',
              parameters: { type: 'object', properties: {}, required: [] },
              handler: workingHandler,
            };
            
            testRegistry.registerTool(workingTool);
            await testRegistry.executeTool('working_tool', {});
            expect(workingHandler).toHaveBeenCalled();
            
            consoleErrorSpy.mockRestore();
          }
        ),
        { numRuns: 5 }
      );
    }, 60000); // 60 second timeout for property-based test
  });
});
