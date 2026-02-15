/**
 * ErrorNotification Component
 * 
 * Displays user-friendly error notifications with retry functionality
 * 
 * Requirements: 10.2
 */

import React from 'react';

export interface ErrorNotificationProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/**
 * ErrorNotification - Displays error messages with retry option
 */
export const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  message,
  onRetry,
  onDismiss,
}) => {
  return (
    <div
      className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] sm:w-full mx-2 sm:mx-4"
      role="alert"
      aria-live="assertive"
    >
      <div className="bg-red-50 border-l-4 border-red-500 rounded-lg shadow-lg p-3 sm:p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-xs sm:text-sm font-medium text-red-800">{message}</p>
            {onRetry && (
              <div className="mt-2 sm:mt-3 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={onRetry}
                  className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                  aria-label="Retry"
                >
                  <svg
                    className="h-3 w-3 mr-1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Retry
                </button>
                {onDismiss && (
                  <button
                    onClick={onDismiss}
                    className="inline-flex items-center justify-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                    aria-label="Dismiss"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            )}
          </div>
          {onDismiss && !onRetry && (
            <div className="ml-auto pl-3">
              <button
                onClick={onDismiss}
                className="inline-flex text-red-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 rounded-md"
                aria-label="Close"
              >
                <svg
                  className="h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
