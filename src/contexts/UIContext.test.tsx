/**
 * Unit tests for UIContext
 */

import { renderHook, act } from '@testing-library/react';
import { UIProvider, useUI } from './UIContext';
import type { VisualEffect } from '../types/ui';

describe('UIContext', () => {
  describe('useUI hook', () => {
    it('should throw error when used outside UIProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => {
        renderHook(() => useUI());
      }).toThrow('useUI must be used within a UIProvider');
      
      consoleSpy.mockRestore();
    });

    it('should provide initial state', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: UIProvider,
      });

      expect(result.current.state).toEqual({
        conversationStatus: 'idle',
        elapsedTime: 0,
        isAISpeaking: false,
        isUserSpeaking: false,
        currentTranscript: '',
        visualEffects: [],
        errorMessage: undefined,
        connectionStatus: 'online',
      });
    });
  });

  describe('state updates', () => {
    it('should update conversation status', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: UIProvider,
      });

      act(() => {
        result.current.setConversationStatus('active');
      });

      expect(result.current.state.conversationStatus).toBe('active');
    });

    it('should update elapsed time', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: UIProvider,
      });

      act(() => {
        result.current.setElapsedTime(5000);
      });

      expect(result.current.state.elapsedTime).toBe(5000);
    });

    it('should update AI speaking state', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: UIProvider,
      });

      act(() => {
        result.current.setAISpeaking(true);
      });

      expect(result.current.state.isAISpeaking).toBe(true);
    });

    it('should update user speaking state', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: UIProvider,
      });

      act(() => {
        result.current.setUserSpeaking(true);
      });

      expect(result.current.state.isUserSpeaking).toBe(true);
    });

    it('should update current transcript', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: UIProvider,
      });

      act(() => {
        result.current.setCurrentTranscript('Hello world');
      });

      expect(result.current.state.currentTranscript).toBe('Hello world');
    });

    it('should update error message', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: UIProvider,
      });

      act(() => {
        result.current.setErrorMessage('Test error');
      });

      expect(result.current.state.errorMessage).toBe('Test error');
    });

    it('should clear error message', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: UIProvider,
      });

      act(() => {
        result.current.setErrorMessage('Test error');
      });

      expect(result.current.state.errorMessage).toBe('Test error');

      act(() => {
        result.current.setErrorMessage(undefined);
      });

      expect(result.current.state.errorMessage).toBeUndefined();
    });
  });

  describe('visual effects management', () => {
    it('should add visual effect', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: UIProvider,
      });

      const effect: VisualEffect = {
        id: 'effect-1',
        type: 'emoji',
        parameters: { emoji: '👍', position: 'center' },
        startTime: Date.now(),
      };

      act(() => {
        result.current.addVisualEffect(effect);
      });

      expect(result.current.state.visualEffects).toHaveLength(1);
      expect(result.current.state.visualEffects[0]).toEqual(effect);
    });

    it('should add multiple visual effects', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: UIProvider,
      });

      const effect1: VisualEffect = {
        id: 'effect-1',
        type: 'emoji',
        parameters: { emoji: '👍' },
        startTime: Date.now(),
      };

      const effect2: VisualEffect = {
        id: 'effect-2',
        type: 'highlight',
        parameters: { area: 'center', color: 'yellow' },
        startTime: Date.now(),
      };

      act(() => {
        result.current.addVisualEffect(effect1);
        result.current.addVisualEffect(effect2);
      });

      expect(result.current.state.visualEffects).toHaveLength(2);
    });

    it('should remove visual effect by id', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: UIProvider,
      });

      const effect1: VisualEffect = {
        id: 'effect-1',
        type: 'emoji',
        parameters: { emoji: '👍' },
        startTime: Date.now(),
      };

      const effect2: VisualEffect = {
        id: 'effect-2',
        type: 'highlight',
        parameters: { area: 'center' },
        startTime: Date.now(),
      };

      act(() => {
        result.current.addVisualEffect(effect1);
        result.current.addVisualEffect(effect2);
      });

      expect(result.current.state.visualEffects).toHaveLength(2);

      act(() => {
        result.current.removeVisualEffect('effect-1');
      });

      expect(result.current.state.visualEffects).toHaveLength(1);
      expect(result.current.state.visualEffects[0].id).toBe('effect-2');
    });

    it('should clear all visual effects', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: UIProvider,
      });

      const effect1: VisualEffect = {
        id: 'effect-1',
        type: 'emoji',
        parameters: { emoji: '👍' },
        startTime: Date.now(),
      };

      const effect2: VisualEffect = {
        id: 'effect-2',
        type: 'highlight',
        parameters: { area: 'center' },
        startTime: Date.now(),
      };

      act(() => {
        result.current.addVisualEffect(effect1);
        result.current.addVisualEffect(effect2);
      });

      expect(result.current.state.visualEffects).toHaveLength(2);

      act(() => {
        result.current.clearVisualEffects();
      });

      expect(result.current.state.visualEffects).toHaveLength(0);
    });
  });

  describe('bulk state updates', () => {
    it('should update multiple state properties at once', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: UIProvider,
      });

      act(() => {
        result.current.updateState({
          conversationStatus: 'active',
          elapsedTime: 10000,
          isAISpeaking: true,
          currentTranscript: 'Test transcript',
        });
      });

      expect(result.current.state.conversationStatus).toBe('active');
      expect(result.current.state.elapsedTime).toBe(10000);
      expect(result.current.state.isAISpeaking).toBe(true);
      expect(result.current.state.currentTranscript).toBe('Test transcript');
    });

    it('should preserve unmodified state properties', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: UIProvider,
      });

      act(() => {
        result.current.setUserSpeaking(true);
        result.current.setErrorMessage('Initial error');
      });

      act(() => {
        result.current.updateState({
          conversationStatus: 'active',
          elapsedTime: 5000,
        });
      });

      expect(result.current.state.isUserSpeaking).toBe(true);
      expect(result.current.state.errorMessage).toBe('Initial error');
    });
  });

  describe('state reset', () => {
    it('should reset state to initial values', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: UIProvider,
      });

      // Modify state
      act(() => {
        result.current.setConversationStatus('active');
        result.current.setElapsedTime(15000);
        result.current.setAISpeaking(true);
        result.current.setUserSpeaking(true);
        result.current.setCurrentTranscript('Test');
        result.current.setErrorMessage('Error');
        result.current.addVisualEffect({
          id: 'effect-1',
          type: 'emoji',
          parameters: { emoji: '👍' },
          startTime: Date.now(),
        });
      });

      // Reset state
      act(() => {
        result.current.resetState();
      });

      expect(result.current.state).toEqual({
        conversationStatus: 'idle',
        elapsedTime: 0,
        isAISpeaking: false,
        isUserSpeaking: false,
        currentTranscript: '',
        visualEffects: [],
        errorMessage: undefined,
        connectionStatus: 'online',
      });
    });
  });
});
