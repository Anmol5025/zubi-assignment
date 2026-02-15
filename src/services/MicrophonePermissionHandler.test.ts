/**
 * Unit tests for MicrophonePermissionHandler
 */

import { MicrophonePermissionHandler } from './MicrophonePermissionHandler';
import * as fc from 'fast-check';

describe('MicrophonePermissionHandler', () => {
  let handler: MicrophonePermissionHandler;
  let mockGetUserMedia: jest.Mock;
  let mockPermissionsQuery: jest.Mock;

  beforeEach(() => {
    handler = new MicrophonePermissionHandler();
    
    // Mock getUserMedia
    mockGetUserMedia = jest.fn();
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: mockGetUserMedia
      }
    });

    // Mock Permissions API
    mockPermissionsQuery = jest.fn();
    Object.defineProperty(navigator, 'permissions', {
      writable: true,
      value: {
        query: mockPermissionsQuery
      }
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('requestPermission', () => {
    it('should return granted when permission is allowed', async () => {
      // Mock successful permission grant
      const mockTrack = { stop: jest.fn() };
      const mockStream = { getTracks: () => [mockTrack] };
      mockGetUserMedia.mockResolvedValue(mockStream);

      const result = await handler.requestPermission();

      expect(result.granted).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.instructions).toBeUndefined();
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
      expect(mockTrack.stop).toHaveBeenCalled();
    });

    it('should return error when permission is denied', async () => {
      // Mock permission denial
      const error = new DOMException('Permission denied', 'NotAllowedError');
      mockGetUserMedia.mockRejectedValue(error);

      const result = await handler.requestPermission();

      expect(result.granted).toBe(false);
      expect(result.error).toBe('Microphone access was denied');
      expect(result.instructions).toBeDefined();
      expect(result.instructions).toContain('enable microphone access');
    });

    it('should return error when no microphone is found', async () => {
      // Mock no microphone found
      const error = new DOMException('No microphone found', 'NotFoundError');
      mockGetUserMedia.mockRejectedValue(error);

      const result = await handler.requestPermission();

      expect(result.granted).toBe(false);
      expect(result.error).toBe('No microphone found');
      expect(result.instructions).toContain('connect a microphone');
    });

    it('should return error when microphone is already in use', async () => {
      // Mock microphone in use
      const error = new DOMException('Microphone in use', 'NotReadableError');
      mockGetUserMedia.mockRejectedValue(error);

      const result = await handler.requestPermission();

      expect(result.granted).toBe(false);
      expect(result.error).toBe('Microphone is already in use');
      expect(result.instructions).toContain('close other applications');
    });

    it('should return error when getUserMedia is not supported', async () => {
      // Mock unsupported browser
      Object.defineProperty(navigator, 'mediaDevices', {
        writable: true,
        value: undefined
      });

      const result = await handler.requestPermission();

      expect(result.granted).toBe(false);
      expect(result.error).toBe('Microphone access is not supported in this browser');
      expect(result.instructions).toContain('modern browser');
    });

    it('should handle generic errors', async () => {
      // Mock generic error
      mockGetUserMedia.mockRejectedValue(new Error('Unknown error'));

      const result = await handler.requestPermission();

      expect(result.granted).toBe(false);
      expect(result.error).toBe('Failed to access microphone');
      expect(result.instructions).toContain('check your microphone settings');
    });
  });

  describe('checkPermissionStatus', () => {
    it('should return granted when permission is granted', async () => {
      mockPermissionsQuery.mockResolvedValue({ state: 'granted' });

      const status = await handler.checkPermissionStatus();

      expect(status).toBe('granted');
      expect(mockPermissionsQuery).toHaveBeenCalledWith({ name: 'microphone' });
    });

    it('should return denied when permission is denied', async () => {
      mockPermissionsQuery.mockResolvedValue({ state: 'denied' });

      const status = await handler.checkPermissionStatus();

      expect(status).toBe('denied');
    });

    it('should return prompt when permission is not yet decided', async () => {
      mockPermissionsQuery.mockResolvedValue({ state: 'prompt' });

      const status = await handler.checkPermissionStatus();

      expect(status).toBe('prompt');
    });

    it('should return unsupported when Permissions API is not available', async () => {
      Object.defineProperty(navigator, 'permissions', {
        writable: true,
        value: undefined
      });

      const status = await handler.checkPermissionStatus();

      expect(status).toBe('unsupported');
    });

    it('should return unsupported when query fails', async () => {
      mockPermissionsQuery.mockRejectedValue(new Error('Query failed'));

      const status = await handler.checkPermissionStatus();

      expect(status).toBe('unsupported');
    });
  });

  describe('browser-specific instructions', () => {
    const testBrowserInstructions = (userAgent: string, expectedBrowser: string) => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: userAgent
      });

      const error = new DOMException('Permission denied', 'NotAllowedError');
      mockGetUserMedia.mockRejectedValue(error);

      return handler.requestPermission().then(result => {
        expect(result.instructions).toContain(expectedBrowser);
      });
    };

    it('should provide Chrome-specific instructions', async () => {
      await testBrowserInstructions(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Chrome'
      );
    });

    it('should provide Firefox-specific instructions', async () => {
      await testBrowserInstructions(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        'Firefox'
      );
    });

    it('should provide Safari-specific instructions', async () => {
      await testBrowserInstructions(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        'Safari'
      );
    });

    it('should provide Edge-specific instructions', async () => {
      await testBrowserInstructions(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        'Edge'
      );
    });

    it('should provide generic instructions for unknown browsers', async () => {
      await testBrowserInstructions(
        'Unknown Browser',
        'microphone icon'
      );
    });
  });

  /**
   * Property-Based Tests
   */
  describe('Property-Based Tests', () => {
    /**
     * **Validates: Requirements 10.1**
     * 
     * Property: Microphone Permission Handling
     * For any microphone permission request, the system should either grant access
     * or provide an error message with instructions for enabling the microphone.
     */
    it('Property: permission request always returns result with granted status', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            shouldGrant: fc.boolean(),
            errorType: fc.constantFrom(
              'NotAllowedError',
              'NotFoundError',
              'NotReadableError',
              'GenericError'
            ),
            hasMediaDevices: fc.boolean()
          }),
          async (scenario) => {
            // Set up mock based on scenario
            if (!scenario.hasMediaDevices) {
              Object.defineProperty(navigator, 'mediaDevices', {
                writable: true,
                value: undefined
              });
            } else {
              const mockGetUserMediaLocal = jest.fn();
              Object.defineProperty(navigator, 'mediaDevices', {
                writable: true,
                value: {
                  getUserMedia: mockGetUserMediaLocal
                }
              });

              if (scenario.shouldGrant) {
                // Mock successful grant
                const mockTrack = { stop: jest.fn() };
                const mockStream = { getTracks: () => [mockTrack] };
                mockGetUserMediaLocal.mockResolvedValue(mockStream);
              } else {
                // Mock error based on type
                let error: Error;
                switch (scenario.errorType) {
                  case 'NotAllowedError':
                    error = new DOMException('Permission denied', 'NotAllowedError');
                    break;
                  case 'NotFoundError':
                    error = new DOMException('No microphone', 'NotFoundError');
                    break;
                  case 'NotReadableError':
                    error = new DOMException('In use', 'NotReadableError');
                    break;
                  default:
                    error = new Error('Generic error');
                }
                mockGetUserMediaLocal.mockRejectedValue(error);
              }
            }

            // Request permission
            const testHandler = new MicrophonePermissionHandler();
            const result = await testHandler.requestPermission();

            // Property 1: Result always has a granted boolean
            expect(typeof result.granted).toBe('boolean');

            // Property 2: If not granted, must have error message
            if (!result.granted) {
              expect(result.error).toBeDefined();
              expect(typeof result.error).toBe('string');
              expect(result.error!.length).toBeGreaterThan(0);
            }

            // Property 3: If not granted, must have instructions
            if (!result.granted) {
              expect(result.instructions).toBeDefined();
              expect(typeof result.instructions).toBe('string');
              expect(result.instructions!.length).toBeGreaterThan(0);
            }

            // Property 4: If granted, should not have error or instructions
            if (result.granted) {
              expect(result.error).toBeUndefined();
              expect(result.instructions).toBeUndefined();
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    /**
     * **Validates: Requirements 10.1**
     * 
     * Property: Permission Status Check
     * For any permission status check, the system should return a valid state
     * (granted, denied, prompt, or unsupported).
     */
    it('Property: permission status check returns valid state', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            hasPermissionsAPI: fc.boolean(),
            permissionState: fc.constantFrom('granted', 'denied', 'prompt'),
            shouldThrow: fc.boolean()
          }),
          async (scenario) => {
            // Set up mock based on scenario
            if (!scenario.hasPermissionsAPI) {
              Object.defineProperty(navigator, 'permissions', {
                writable: true,
                value: undefined
              });
            } else {
              const mockQuery = jest.fn();
              Object.defineProperty(navigator, 'permissions', {
                writable: true,
                value: {
                  query: mockQuery
                }
              });

              if (scenario.shouldThrow) {
                mockQuery.mockRejectedValue(new Error('Query failed'));
              } else {
                mockQuery.mockResolvedValue({ state: scenario.permissionState });
              }
            }

            // Check permission status
            const testHandler = new MicrophonePermissionHandler();
            const status = await testHandler.checkPermissionStatus();

            // Property: Status is always one of the valid states
            expect(['granted', 'denied', 'prompt', 'unsupported']).toContain(status);

            // Property: If API not available or throws, status is 'unsupported'
            if (!scenario.hasPermissionsAPI || scenario.shouldThrow) {
              expect(status).toBe('unsupported');
            }

            // Property: If API available and doesn't throw, status matches mock
            if (scenario.hasPermissionsAPI && !scenario.shouldThrow) {
              expect(status).toBe(scenario.permissionState);
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});
