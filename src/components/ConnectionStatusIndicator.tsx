/**
 * ConnectionStatusIndicator - Displays network connection status
 * 
 * Shows visual indicator for online, offline, and reconnecting states.
 * 
 * Requirements: 10.3
 */

import React from 'react';
import type { ConnectionStatus } from '../types/ui';

export interface ConnectionStatusIndicatorProps {
  status: ConnectionStatus;
  className?: string;
}

/**
 * ConnectionStatusIndicator component
 * Displays connection status with appropriate styling and messaging
 */
export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  status,
  className = '',
}) => {
  // Don't show anything when online
  if (status === 'online') {
    return null;
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'offline':
        return {
          icon: '⚠️',
          text: 'Connection lost',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-300',
        };
      case 'reconnecting':
        return {
          icon: '🔄',
          text: 'Reconnecting...',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-300',
        };
      default:
        return {
          icon: '✓',
          text: 'Connected',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-300',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg border
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        ${className}
      `}
      role="status"
      aria-live="polite"
      data-testid="connection-status-indicator"
    >
      <span
        className={status === 'reconnecting' ? 'animate-spin' : ''}
        aria-hidden="true"
      >
        {config.icon}
      </span>
      <span className="text-sm font-medium">{config.text}</span>
    </div>
  );
};
