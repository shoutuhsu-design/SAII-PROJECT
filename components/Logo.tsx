import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  variant?: 'blue' | 'white';
}

export const Logo: React.FC<LogoProps> = ({ className = "", variant = 'blue' }) => {
  const [hasError, setHasError] = useState(false);
  // Updated URL per request
  const logoUrl = "https://upload.wikimedia.org/wikipedia/commons/2/20/ZTE-logo.svg";

  // Render fallback text if image fails
  if (hasError) {
    return (
      <div 
        className={`flex items-center justify-center font-bold text-xl h-full w-full ${className}`}
        style={{ color: variant === 'white' ? 'white' : '#008ED3' }}
      >
        ZTE 中兴
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img 
        src={logoUrl} 
        alt="ZTE Logo"
        className="w-full h-full object-contain transition-all duration-300"
        style={{
          // Filter logic:
          // The original logo is Blue.
          // To make it White: brightness(0) -> Black, invert(1) -> White.
          // To keep it Blue: none.
          filter: variant === 'white' ? 'brightness(0) invert(1)' : 'none'
        }}
        onError={() => setHasError(true)}
      />
    </div>
  );
};