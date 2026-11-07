import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-14 h-14',
    lg: 'w-20 h-20'
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center select-none animate-fadeIn">
      <div className="relative flex items-center justify-center">
        {/* Pulsing glow ring */}
        <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-[#002f6c]/40 via-[#00a86b]/30 to-[#f58220]/40 blur-md animate-pulse" />
        
        {/* Rotating outer accent border */}
        <div className="w-16 h-16 rounded-full border-2 border-t-[#f58220] border-r-[#00a86b] border-b-transparent border-l-[#002f6c] animate-spin" />

        {/* Center Logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src="/assets/aistudio/Logo1.png"
            alt="OmniSync Logo"
            className={`${sizeClasses[size]} object-contain drop-shadow-md animate-pulse`}
          />
        </div>
      </div>

      {message && (
        <p className="mt-3 text-xs font-semibold text-slate-300 tracking-wide animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};
