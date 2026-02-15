/**
 * ConnectionStatusIndicator tests
 * 
 * Tests connection status display component.
 * 
 * Requirements: 10.3
 */

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator';

describe('ConnectionStatusIndicator', () => {
  describe('rendering', () => {
    it('should not render when status is online', () => {
      const { container } = render(<ConnectionStatusIndicator status="online" />);
      expect(container.firstChild).toBeNull();
    });

    it('should render offline status', () => {
      render(<ConnectionStatusIndicator status="offline" />);
      
      const indicator = screen.getByTestId('connection-status-indicator');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveTextContent('Connection lost');
    });

    it('should render reconnecting status', () => {
      render(<ConnectionStatusIndicator status="reconnecting" />);
      
      const indicator = screen.getByTestId('connection-status-indicator');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveTextContent('Reconnecting...');
    });
  });

  describe('styling', () => {
    it('should apply red styling for offline status', () => {
      render(<ConnectionStatusIndicator status="offline" />);
      
      const indicator = screen.getByTestId('connection-status-indicator');
      expect(indicator).toHaveClass('bg-red-100', 'text-red-800', 'border-red-300');
    });

    it('should apply yellow styling for reconnecting status', () => {
      render(<ConnectionStatusIndicator status="reconnecting" />);
      
      const indicator = screen.getByTestId('connection-status-indicator');
      expect(indicator).toHaveClass('bg-yellow-100', 'text-yellow-800', 'border-yellow-300');
    });

    it('should apply custom className', () => {
      render(<ConnectionStatusIndicator status="offline" className="custom-class" />);
      
      const indicator = screen.getByTestId('connection-status-indicator');
      expect(indicator).toHaveClass('custom-class');
    });
  });

  describe('accessibility', () => {
    it('should have role="status"', () => {
      render(<ConnectionStatusIndicator status="offline" />);
      
      const indicator = screen.getByRole('status');
      expect(indicator).toBeInTheDocument();
    });

    it('should have aria-live="polite"', () => {
      render(<ConnectionStatusIndicator status="offline" />);
      
      const indicator = screen.getByTestId('connection-status-indicator');
      expect(indicator).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-hidden on icon', () => {
      render(<ConnectionStatusIndicator status="offline" />);
      
      const icon = screen.getByText('⚠️');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('animations', () => {
    it('should animate icon when reconnecting', () => {
      render(<ConnectionStatusIndicator status="reconnecting" />);
      
      const icon = screen.getByText('🔄');
      expect(icon).toHaveClass('animate-spin');
    });

    it('should not animate icon when offline', () => {
      render(<ConnectionStatusIndicator status="offline" />);
      
      const icon = screen.getByText('⚠️');
      expect(icon).not.toHaveClass('animate-spin');
    });
  });

  describe('status transitions', () => {
    it('should update display when status changes', () => {
      const { rerender } = render(<ConnectionStatusIndicator status="offline" />);
      
      expect(screen.getByText('Connection lost')).toBeInTheDocument();
      
      rerender(<ConnectionStatusIndicator status="reconnecting" />);
      expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
      
      rerender(<ConnectionStatusIndicator status="online" />);
      expect(screen.queryByTestId('connection-status-indicator')).not.toBeInTheDocument();
    });
  });
});
