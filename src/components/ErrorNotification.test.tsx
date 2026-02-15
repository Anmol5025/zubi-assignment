/**
 * Tests for ErrorNotification component
 * Requirements: 10.2
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ErrorNotification } from './ErrorNotification';

describe('ErrorNotification', () => {
  it('should render error message', () => {
    render(
      <ErrorNotification message="Test error message" />
    );
    
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('should display retry button when onRetry is provided', () => {
    const onRetry = jest.fn();
    
    render(
      <ErrorNotification 
        message="Test error" 
        onRetry={onRetry}
      />
    );
    
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('should call onRetry when retry button is clicked', () => {
    const onRetry = jest.fn();
    
    render(
      <ErrorNotification 
        message="Test error" 
        onRetry={onRetry}
      />
    );
    
    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);
    
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should display dismiss button when onDismiss is provided with onRetry', () => {
    const onRetry = jest.fn();
    const onDismiss = jest.fn();
    
    render(
      <ErrorNotification 
        message="Test error" 
        onRetry={onRetry}
        onDismiss={onDismiss}
      />
    );
    
    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    expect(dismissButton).toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button is clicked', () => {
    const onRetry = jest.fn();
    const onDismiss = jest.fn();
    
    render(
      <ErrorNotification 
        message="Test error" 
        onRetry={onRetry}
        onDismiss={onDismiss}
      />
    );
    
    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissButton);
    
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should display close button when only onDismiss is provided', () => {
    const onDismiss = jest.fn();
    
    render(
      <ErrorNotification 
        message="Test error" 
        onDismiss={onDismiss}
      />
    );
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toBeInTheDocument();
  });

  it('should call onDismiss when close button is clicked', () => {
    const onDismiss = jest.fn();
    
    render(
      <ErrorNotification 
        message="Test error" 
        onDismiss={onDismiss}
      />
    );
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should have proper ARIA attributes for accessibility', () => {
    render(
      <ErrorNotification message="Test error" />
    );
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });

  it('should render without buttons when no callbacks provided', () => {
    render(
      <ErrorNotification message="Test error" />
    );
    
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
