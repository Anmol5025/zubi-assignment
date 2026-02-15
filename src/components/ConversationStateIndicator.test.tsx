import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConversationStateIndicator } from './ConversationStateIndicator';
import * as fc from 'fast-check';

describe('ConversationStateIndicator', () => {
  it('renders all three state indicators', () => {
    render(
      <ConversationStateIndicator
        isListening={false}
        isSpeaking={false}
        isProcessing={false}
      />
    );

    expect(screen.getByTestId('listening-indicator')).toBeInTheDocument();
    expect(screen.getByTestId('speaking-indicator')).toBeInTheDocument();
    expect(screen.getByTestId('processing-indicator')).toBeInTheDocument();
  });

  it('shows listening state as active when isListening is true', () => {
    render(
      <ConversationStateIndicator
        isListening={true}
        isSpeaking={false}
        isProcessing={false}
      />
    );

    const listeningIndicator = screen.getByTestId('listening-indicator');
    expect(listeningIndicator).toHaveAttribute('data-active', 'true');
    expect(listeningIndicator).toHaveClass('opacity-100');
  });

  it('shows speaking state as active when isSpeaking is true', () => {
    render(
      <ConversationStateIndicator
        isListening={false}
        isSpeaking={true}
        isProcessing={false}
      />
    );

    const speakingIndicator = screen.getByTestId('speaking-indicator');
    expect(speakingIndicator).toHaveAttribute('data-active', 'true');
    expect(speakingIndicator).toHaveClass('opacity-100');
  });

  it('shows processing state as active when isProcessing is true', () => {
    render(
      <ConversationStateIndicator
        isListening={false}
        isSpeaking={false}
        isProcessing={true}
      />
    );

    const processingIndicator = screen.getByTestId('processing-indicator');
    expect(processingIndicator).toHaveAttribute('data-active', 'true');
    expect(processingIndicator).toHaveClass('opacity-100');
  });

  it('shows inactive states with reduced opacity', () => {
    render(
      <ConversationStateIndicator
        isListening={false}
        isSpeaking={false}
        isProcessing={false}
      />
    );

    expect(screen.getByTestId('listening-indicator')).toHaveClass('opacity-30');
    expect(screen.getByTestId('speaking-indicator')).toHaveClass('opacity-30');
    expect(screen.getByTestId('processing-indicator')).toHaveClass('opacity-30');
  });

  it('can show multiple states as active simultaneously', () => {
    render(
      <ConversationStateIndicator
        isListening={true}
        isSpeaking={true}
        isProcessing={true}
      />
    );

    expect(screen.getByTestId('listening-indicator')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('speaking-indicator')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('processing-indicator')).toHaveAttribute('data-active', 'true');
  });

  it('displays correct labels for each state', () => {
    render(
      <ConversationStateIndicator
        isListening={false}
        isSpeaking={false}
        isProcessing={false}
      />
    );

    expect(screen.getByText('Listening')).toBeInTheDocument();
    expect(screen.getByText('Speaking')).toBeInTheDocument();
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('renders with correct container structure', () => {
    render(
      <ConversationStateIndicator
        isListening={false}
        isSpeaking={false}
        isProcessing={false}
      />
    );

    const container = screen.getByTestId('conversation-state-indicator');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('flex', 'items-center', 'justify-center');
  });

  it('applies pulsing animation styles when states are active', () => {
    render(
      <ConversationStateIndicator
        isListening={true}
        isSpeaking={false}
        isProcessing={false}
      />
    );

    // Check that the animate-pulse-scale class is applied to active state
    const listeningIndicator = screen.getByTestId('listening-indicator');
    const iconContainer = listeningIndicator.querySelector('div');
    expect(iconContainer).toHaveClass('animate-pulse-scale');
  });

  it('changes state dynamically when props update', () => {
    const { rerender } = render(
      <ConversationStateIndicator
        isListening={true}
        isSpeaking={false}
        isProcessing={false}
      />
    );

    expect(screen.getByTestId('listening-indicator')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('speaking-indicator')).toHaveAttribute('data-active', 'false');

    rerender(
      <ConversationStateIndicator
        isListening={false}
        isSpeaking={true}
        isProcessing={false}
      />
    );

    expect(screen.getByTestId('listening-indicator')).toHaveAttribute('data-active', 'false');
    expect(screen.getByTestId('speaking-indicator')).toHaveAttribute('data-active', 'true');
  });
});

describe('Property-Based Tests', () => {
  /**
   * **Validates: Requirements 8.4**
   * 
   * Property 24: Conversation State Indicators
   * For any conversation state (listening, speaking, processing), the UI should
   * display the corresponding visual indicator.
   */
  it('Property 24: displays correct visual indicator for any conversation state', () => {
    fc.assert(
      fc.property(
        // Generate all possible combinations of conversation states
        fc.record({
          isListening: fc.boolean(),
          isSpeaking: fc.boolean(),
          isProcessing: fc.boolean()
        }),
        (conversationState) => {
          // Render the component with the generated state
          const { container, unmount } = render(
            <ConversationStateIndicator
              isListening={conversationState.isListening}
              isSpeaking={conversationState.isSpeaking}
              isProcessing={conversationState.isProcessing}
            />
          );

          try {
            // Verify the main container is rendered
            const mainContainer = container.querySelector('[data-testid="conversation-state-indicator"]');
            expect(mainContainer).toBeInTheDocument();

            // Verify listening indicator
            const listeningIndicator = container.querySelector('[data-testid="listening-indicator"]');
            expect(listeningIndicator).toBeInTheDocument();
            expect(listeningIndicator?.getAttribute('data-active')).toBe(
              conversationState.isListening.toString()
            );
            
            // Verify listening indicator has correct opacity class
            if (conversationState.isListening) {
              expect(listeningIndicator).toHaveClass('opacity-100');
            } else {
              expect(listeningIndicator).toHaveClass('opacity-30');
            }

            // Verify speaking indicator
            const speakingIndicator = container.querySelector('[data-testid="speaking-indicator"]');
            expect(speakingIndicator).toBeInTheDocument();
            expect(speakingIndicator?.getAttribute('data-active')).toBe(
              conversationState.isSpeaking.toString()
            );
            
            // Verify speaking indicator has correct opacity class
            if (conversationState.isSpeaking) {
              expect(speakingIndicator).toHaveClass('opacity-100');
            } else {
              expect(speakingIndicator).toHaveClass('opacity-30');
            }

            // Verify processing indicator
            const processingIndicator = container.querySelector('[data-testid="processing-indicator"]');
            expect(processingIndicator).toBeInTheDocument();
            expect(processingIndicator?.getAttribute('data-active')).toBe(
              conversationState.isProcessing.toString()
            );
            
            // Verify processing indicator has correct opacity class
            if (conversationState.isProcessing) {
              expect(processingIndicator).toHaveClass('opacity-100');
            } else {
              expect(processingIndicator).toHaveClass('opacity-30');
            }

            // Verify that all three indicators are always present regardless of state
            expect(listeningIndicator).toBeInTheDocument();
            expect(speakingIndicator).toBeInTheDocument();
            expect(processingIndicator).toBeInTheDocument();

            // Verify labels are present
            expect(container.textContent).toContain('Listening');
            expect(container.textContent).toContain('Speaking');
            expect(container.textContent).toContain('Processing');

            // Verify active states have animation classes
            const listeningIconContainer = listeningIndicator?.querySelector('div');
            if (conversationState.isListening) {
              expect(listeningIconContainer).toHaveClass('animate-pulse-scale');
            }

            const speakingIconContainer = speakingIndicator?.querySelector('div');
            if (conversationState.isSpeaking) {
              expect(speakingIconContainer).toHaveClass('animate-pulse-scale');
            }

            const processingIconContainer = processingIndicator?.querySelector('div');
            if (conversationState.isProcessing) {
              expect(processingIconContainer).toHaveClass('animate-pulse-scale');
            }
          } finally {
            // Clean up after each test iteration
            unmount();
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
