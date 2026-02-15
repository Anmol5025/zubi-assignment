import React from 'react';

interface ConversationStateIndicatorProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
}

/**
 * ConversationStateIndicator component displays visual indicators for conversation states.
 * Shows microphone icon when listening, speaker icon when speaking, and processing animation.
 * Includes pulsing animations for active states.
 * 
 * Requirements: 8.4, 9.4
 */
export const ConversationStateIndicator: React.FC<ConversationStateIndicatorProps> = ({
  isListening,
  isSpeaking,
  isProcessing,
}) => {
  return (
    <div 
      className="flex items-center justify-center gap-3 sm:gap-4 md:gap-5 p-3 sm:p-4 bg-white/95 rounded-lg sm:rounded-xl shadow-lg"
      data-testid="conversation-state-indicator"
    >
      {/* Listening State */}
      <div 
        className={`flex flex-col items-center gap-1 sm:gap-2 transition-opacity duration-300 ${
          isListening ? 'opacity-100' : 'opacity-30'
        }`}
        data-testid="listening-indicator"
        data-active={isListening}
      >
        <div 
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors duration-300 ${
            isListening ? 'bg-green-500 animate-pulse-scale' : 'bg-gray-300'
          }`}
        >
          <MicrophoneIcon active={isListening} />
        </div>
        <span 
          className={`text-xs font-medium ${
            isListening ? 'text-green-500' : 'text-gray-500'
          }`}
        >
          Listening
        </span>
      </div>

      {/* Speaking State */}
      <div 
        className={`flex flex-col items-center gap-1 sm:gap-2 transition-opacity duration-300 ${
          isSpeaking ? 'opacity-100' : 'opacity-30'
        }`}
        data-testid="speaking-indicator"
        data-active={isSpeaking}
      >
        <div 
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors duration-300 ${
            isSpeaking ? 'bg-blue-500 animate-pulse-scale' : 'bg-gray-300'
          }`}
        >
          <SpeakerIcon active={isSpeaking} />
        </div>
        <span 
          className={`text-xs font-medium ${
            isSpeaking ? 'text-blue-500' : 'text-gray-500'
          }`}
        >
          Speaking
        </span>
      </div>

      {/* Processing State */}
      <div 
        className={`flex flex-col items-center gap-1 sm:gap-2 transition-opacity duration-300 ${
          isProcessing ? 'opacity-100' : 'opacity-30'
        }`}
        data-testid="processing-indicator"
        data-active={isProcessing}
      >
        <div 
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors duration-300 ${
            isProcessing ? 'bg-orange-500 animate-pulse-scale' : 'bg-gray-300'
          }`}
        >
          <ProcessingIcon active={isProcessing} />
        </div>
        <span 
          className={`text-xs font-medium ${
            isProcessing ? 'text-orange-500' : 'text-gray-500'
          }`}
        >
          Processing
        </span>
      </div>
    </div>
  );
};

/**
 * MicrophoneIcon - SVG icon for microphone
 */
const MicrophoneIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <svg
    className="w-5 h-5 sm:w-6 sm:h-6"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14Z"
      fill={active ? '#FFFFFF' : '#9E9E9E'}
    />
    <path
      d="M17 11C17 13.76 14.76 16 12 16C9.24 16 7 13.76 7 11H5C5 14.53 7.61 17.43 11 17.92V21H13V17.92C16.39 17.43 19 14.53 19 11H17Z"
      fill={active ? '#FFFFFF' : '#9E9E9E'}
    />
  </svg>
);

/**
 * SpeakerIcon - SVG icon for speaker
 */
const SpeakerIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <svg
    className="w-5 h-5 sm:w-6 sm:h-6"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M3 9V15H7L12 20V4L7 9H3Z"
      fill={active ? '#FFFFFF' : '#9E9E9E'}
    />
    <path
      d="M16.5 12C16.5 10.23 15.48 8.71 14 7.97V16.02C15.48 15.29 16.5 13.77 16.5 12Z"
      fill={active ? '#FFFFFF' : '#9E9E9E'}
    />
    <path
      d="M14 3.23V5.29C16.89 6.15 19 8.83 19 12C19 15.17 16.89 17.85 14 18.71V20.77C18.01 19.86 21 16.28 21 12C21 7.72 18.01 4.14 14 3.23Z"
      fill={active ? '#FFFFFF' : '#9E9E9E'}
    />
  </svg>
);

/**
 * ProcessingIcon - SVG icon for processing (gear/cog)
 */
const ProcessingIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <svg
    className={`w-5 h-5 sm:w-6 sm:h-6 ${active ? 'animate-spin' : ''}`}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 8C9.79 8 8 9.79 8 12C8 14.21 9.79 16 12 16C14.21 16 16 14.21 16 12C16 9.79 14.21 8 12 8ZM20.94 11C20.48 6.83 17.17 3.52 13 3.06V1H11V3.06C6.83 3.52 3.52 6.83 3.06 11H1V13H3.06C3.52 17.17 6.83 20.48 11 20.94V23H13V20.94C17.17 20.48 20.48 17.17 20.94 13H23V11H20.94ZM12 19C8.13 19 5 15.87 5 12C5 8.13 8.13 5 12 5C15.87 5 19 8.13 19 12C19 15.87 15.87 19 12 19Z"
      fill={active ? '#FFFFFF' : '#9E9E9E'}
    />
  </svg>
);
