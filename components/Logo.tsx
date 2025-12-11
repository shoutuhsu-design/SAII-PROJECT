import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'blue' | 'white';
}

export const Logo: React.FC<LogoProps> = ({ className = "", variant = 'blue' }) => {
  // Official ZTE Logo URL (Hosted on Wikimedia Commons)
  // In a production environment, you should download this file, save it to your public folder, and reference it locally.
  const logoUrl = "https://upload.wikimedia.org/wikipedia/commons/2/2e/ZTE_logo.svg";

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img 
        src={logoUrl} 
        alt="ZTE Logo"
        className="w-full h-full object-contain transition-all duration-300"
        style={{
          // If variant is white, use CSS filter to invert the blue logo to white
          // brightness(0) turns it black, invert(1) turns black to white
          filter: variant === 'white' ? 'brightness(0) invert(1)' : 'none'
        }}
      />
    </div>
  );
};