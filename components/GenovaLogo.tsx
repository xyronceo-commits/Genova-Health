import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const GenovaLogo: React.FC<LogoProps> = ({ className = "w-10 h-10", size }) => {
  return (
    <img 
      src="/logo.svg" 
      alt="Genova Health Logo" 
      className={`object-contain ${className}`}
      style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
    />
  );
};

export default GenovaLogo;
