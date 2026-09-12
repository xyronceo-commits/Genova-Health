import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const OptixiaLogo: React.FC<LogoProps> = ({ className = "w-10 h-10", size }) => {
  return (
    <img 
      src="/logo.svg" 
      alt="Optixia Health Logo" 
      className={`object-contain ${className}`}
      style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
    />
  );
};

export const GenovaLogo = OptixiaLogo;
export default OptixiaLogo;
