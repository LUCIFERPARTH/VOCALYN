
import React from 'react';
import MicIcon from './icons/MicIcon';
import StopIcon from './icons/StopIcon';

interface RecorderControlProps {
  isRecording: boolean;
  onToggleRecording: () => void;
  disabled?: boolean;
}

const RecorderControl: React.FC<RecorderControlProps> = ({ isRecording, onToggleRecording, disabled = false }) => {
  const buttonClasses = `
    w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center 
    transition-all duration-300 ease-in-out shadow-lg
    focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-gray-900
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const idleClasses = `
    bg-blue-600 hover:bg-blue-500 focus:ring-blue-500
    ${!isRecording && !disabled ? 'animate-pulse-slow' : ''}
  `;

  const recordingClasses = `
    bg-red-600 hover:bg-red-500 focus:ring-red-500
  `;

  return (
    <button
      onClick={onToggleRecording}
      disabled={disabled}
      className={`${buttonClasses} ${isRecording ? recordingClasses : idleClasses}`}
      aria-label={isRecording ? 'Stop recording' : 'Start recording'}
    >
      {isRecording ? <StopIcon /> : <MicIcon />}
    </button>
  );
};

export default RecorderControl;
