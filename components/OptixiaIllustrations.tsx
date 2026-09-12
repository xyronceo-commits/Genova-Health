import React from 'react';

interface IllustrationProps {
  className?: string;
  size?: number;
}

// 1. Onboarding: Health Tracking
export const HealthTrackingIllustration: React.FC<IllustrationProps> = ({ className = "w-48 h-48", size }) => (
  <svg 
    viewBox="0 0 240 240" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={`object-contain ${className}`}
    style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
  >
    <circle cx="120" cy="120" r="100" fill="#F0F6FF" />
    <circle cx="120" cy="120" r="75" fill="#DBEAFE" />
    {/* Shield frame */}
    <path 
      d="M120 45C120 45 165 55 165 100C165 145 120 180 120 180C120 180 75 145 75 100C75 55 120 45 120 45Z" 
      fill="#2563EB" 
    />
    {/* Pulse Line inside Shield */}
    <path 
      d="M88 110H102L108 95L116 128L124 100L130 115L136 110H152" 
      stroke="white" 
      strokeWidth="4" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    {/* Floating accent elements */}
    <circle cx="65" cy="75" r="8" fill="#3B82F6" opacity="0.4" />
    <circle cx="175" cy="160" r="12" fill="#2563EB" opacity="0.3" />
    <path d="M160 70L165 80L175 85L165 90L160 100L155 90L145 85L155 80L160 70Z" fill="#2563EB" />
  </svg>
);

// 2. Onboarding: AI Guidance
export const AIGuidanceIllustration: React.FC<IllustrationProps> = ({ className = "w-48 h-48", size }) => (
  <svg 
    viewBox="0 0 240 240" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={`object-contain ${className}`}
    style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
  >
    <circle cx="120" cy="120" r="100" fill="#EFF6FF" />
    {/* AI Brain & Stethoscope outline */}
    <rect x="60" y="65" width="120" height="110" rx="24" fill="white" stroke="#BFDBFE" strokeWidth="4" />
    <circle cx="120" cy="110" r="32" fill="#2563EB" />
    {/* Cross Symbol */}
    <path d="M120 96V124M106 110H134" stroke="white" strokeWidth="5" strokeLinecap="round" />
    {/* Sparkle Nodes */}
    <path d="M75 90L78 96L84 99L78 102L75 108L72 102L66 99L72 96L75 90Z" fill="#3B82F6" />
    <path d="M165 130L168 136L174 139L168 142L165 148L162 142L156 139L162 136L165 130Z" fill="#1D4ED8" />
    {/* Chat Bubble Bar */}
    <rect x="80" y="145" width="80" height="12" rx="6" fill="#DBEAFE" />
    <rect x="95" y="162" width="50" height="6" rx="3" fill="#BFDBFE" />
  </svg>
);

// 3. Onboarding: PPG Health Scan
export const HealthScanIllustration: React.FC<IllustrationProps> = ({ className = "w-48 h-48", size }) => (
  <svg 
    viewBox="0 0 240 240" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={`object-contain ${className}`}
    style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
  >
    <circle cx="120" cy="120" r="100" fill="#F0F6FF" />
    {/* Smartphone Frame */}
    <rect x="80" y="45" width="80" height="150" rx="20" fill="#1E293B" />
    <rect x="86" y="53" width="68" height="134" rx="14" fill="#FFFFFF" />
    {/* Fingerprint / Scanning Target */}
    <circle cx="120" cy="110" r="28" fill="#EFF6FF" stroke="#2563EB" strokeWidth="3" strokeDasharray="4 4" />
    <circle cx="120" cy="110" r="16" fill="#2563EB" />
    {/* Pulse Signal */}
    <path d="M96 155H104L110 142L118 168L124 148L130 160L144 155" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// 4. Onboarding: Connected Health Platform
export const ConnectedHealthIllustration: React.FC<IllustrationProps> = ({ className = "w-48 h-48", size }) => (
  <svg 
    viewBox="0 0 240 240" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={`object-contain ${className}`}
    style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
  >
    <circle cx="120" cy="120" r="100" fill="#F0F6FF" />
    {/* Smartwatch Graphic */}
    <rect x="90" y="70" width="60" height="75" rx="18" fill="#1E293B" />
    <rect x="96" y="76" width="48" height="63" rx="12" fill="#2563EB" />
    <path d="M102 35H138V70H102V35Z" fill="#64748B" />
    <path d="M102 145H138V180H102V145Z" fill="#64748B" />
    {/* Heart Icon inside watch */}
    <path 
      d="M120 115C120 115 110 106 106 100C102 94 107 88 113 88C117 88 120 92 120 92C120 92 123 88 127 88C133 88 138 94 134 100C130 106 120 115 120 115Z" 
      fill="white" 
    />
    {/* Wireless Signal Waves */}
    <path d="M65 105C60 115 60 125 65 135" stroke="#2563EB" strokeWidth="4" strokeLinecap="round" />
    <path d="M175 105C180 115 180 125 175 135" stroke="#2563EB" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

// 5. Nurse Optixia Assistant Illustration
export const NurseOptixiaIllustration: React.FC<IllustrationProps> = ({ className = "w-24 h-24", size }) => (
  <svg 
    viewBox="0 0 120 120" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={`object-contain ${className}`}
    style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
  >
    <circle cx="60" cy="60" r="50" fill="#DBEAFE" />
    <circle cx="60" cy="50" r="22" fill="#2563EB" />
    <path d="M30 100C30 82 43 72 60 72C77 72 90 82 90 100H30Z" fill="#1E293B" />
    {/* Stethoscope */}
    <path d="M48 68V80C48 86 54 90 60 90C66 90 72 86 72 80V68" stroke="#FFFFFF" strokeWidth="3" />
    <circle cx="60" cy="94" r="4" fill="#2563EB" stroke="white" strokeWidth="2" />
  </svg>
);

// 6. Clinical Nutrition Illustration
export const NutritionIllustration: React.FC<IllustrationProps> = ({ className = "w-24 h-24", size }) => (
  <svg 
    viewBox="0 0 120 120" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={`object-contain ${className}`}
    style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
  >
    <circle cx="60" cy="60" r="50" fill="#EFF6FF" />
    {/* Meal Bowl */}
    <path d="M30 55C30 75 43 90 60 90C77 90 90 75 90 55H30Z" fill="#2563EB" />
    <ellipse cx="60" cy="55" rx="30" ry="8" fill="#BFDBFE" />
    {/* Healthy veggies inside */}
    <circle cx="50" cy="50" r="6" fill="#FFFFFF" />
    <circle cx="65" cy="48" r="7" fill="#DBEAFE" />
    <circle cx="75" cy="52" r="5" fill="#FFFFFF" />
  </svg>
);

// 7. Symptom Checker Illustration
export const SymptomCheckerIllustration: React.FC<IllustrationProps> = ({ className = "w-24 h-24", size }) => (
  <svg 
    viewBox="0 0 120 120" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={`object-contain ${className}`}
    style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
  >
    <circle cx="60" cy="60" r="50" fill="#EFF6FF" />
    <rect x="36" y="32" width="48" height="58" rx="8" fill="#FFFFFF" stroke="#2563EB" strokeWidth="3" />
    <path d="M44 48H76M44 60H68M44 72H60" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
    <circle cx="72" cy="72" r="7" fill="#2563EB" />
    <path d="M69 72L71 74L75 70" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// 8. Sleep Illustration
export const SleepIllustration: React.FC<IllustrationProps> = ({ className = "w-24 h-24", size }) => (
  <svg 
    viewBox="0 0 120 120" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={`object-contain ${className}`}
    style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
  >
    <circle cx="60" cy="60" r="50" fill="#F0F6FF" />
    {/* Crescent Moon */}
    <path 
      d="M72 40C55 40 42 53 42 70C42 85 53 98 68 100C52 100 38 86 38 70C38 52 52 38 70 38C71 38 71.5 39 72 40Z" 
      fill="#2563EB" 
    />
    <path d="M78 45L80 50L85 52L80 54L78 59L76 54L71 52L76 50L78 45Z" fill="#1E293B" />
    <path d="M92 65L93.5 68L97 69L93.5 70L92 73L90.5 70L87 69L90.5 68L92 65Z" fill="#3B82F6" />
  </svg>
);

// 9. Activity & Fitness Illustration
export const ActivityIllustration: React.FC<IllustrationProps> = ({ className = "w-24 h-24", size }) => (
  <svg 
    viewBox="0 0 120 120" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={`object-contain ${className}`}
    style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
  >
    <circle cx="60" cy="60" r="50" fill="#EFF6FF" />
    {/* Shoe / Footprint icon */}
    <path 
      d="M40 75C40 65 48 58 58 58H75C83 58 90 65 90 75V78H40V75Z" 
      fill="#2563EB" 
    />
    <rect x="44" y="80" width="42" height="6" rx="3" fill="#1E293B" />
    <path d="M52 48L64 36M64 48L76 36" stroke="#2563EB" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

// 10. Emergency SOS Illustration
export const SOSIllustration: React.FC<IllustrationProps> = ({ className = "w-28 h-28", size }) => (
  <svg 
    viewBox="0 0 140 140" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={`object-contain ${className}`}
    style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
  >
    <circle cx="70" cy="70" r="60" fill="#EFF6FF" />
    <circle cx="70" cy="70" r="45" fill="#2563EB" />
    {/* Medical Cross */}
    <path d="M70 45V95M45 70H95" stroke="white" strokeWidth="10" strokeLinecap="round" />
  </svg>
);

// 11. Finger Guidance Scan Illustration
export const FingerScanGuideIllustration: React.FC<IllustrationProps> = ({ className = "w-48 h-48", size }) => (
  <svg 
    viewBox="0 0 200 200" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={`object-contain ${className}`}
    style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
  >
    <circle cx="100" cy="100" r="85" fill="#F0F6FF" />
    {/* Smartphone Top Camera Lens */}
    <rect x="65" y="30" width="70" height="140" rx="16" fill="#1E293B" />
    <circle cx="100" cy="55" r="12" fill="#2563EB" stroke="#60A5FA" strokeWidth="3" />
    {/* Finger Resting on Camera */}
    <path 
      d="M90 140V70C90 62 96 55 104 55C112 55 118 62 118 70V140H90Z" 
      fill="#DBEAFE" 
      stroke="#2563EB" 
      strokeWidth="3" 
    />
    {/* Pulse ring animation */}
    <circle cx="100" cy="55" r="24" stroke="#2563EB" strokeWidth="2" strokeDasharray="3 3" />
  </svg>
);

// 12. Empty State Illustration
export const EmptyStateIllustration: React.FC<IllustrationProps> = ({ className = "w-32 h-32", size }) => (
  <svg 
    viewBox="0 0 160 160" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={`object-contain ${className}`}
    style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
  >
    <circle cx="80" cy="80" r="65" fill="#F0F6FF" />
    <rect x="50" y="45" width="60" height="75" rx="10" fill="white" stroke="#BFDBFE" strokeWidth="3" />
    <path d="M62 65H98M62 80H86M62 95H90" stroke="#93C5FD" strokeWidth="3" strokeLinecap="round" />
    <circle cx="110" cy="110" r="16" fill="#2563EB" />
    <path d="M104 110H116M110 104V116" stroke="white" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// 13. Dashboard Hero Illustration
export const DashboardHeroIllustration: React.FC<IllustrationProps> = ({ className = "w-40 h-40", size }) => (
  <svg 
    viewBox="0 0 200 200" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={`object-contain ${className}`}
    style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
  >
    <circle cx="100" cy="100" r="80" fill="#DBEAFE" opacity="0.6" />
    <circle cx="100" cy="100" r="60" fill="#2563EB" />
    <path d="M70 100H85L93 82L105 122L115 90L122 108L130 100H145" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M140 60L144 70L154 74L144 78L140 88L136 78L126 74L136 70L140 60Z" fill="#3B82F6" />
  </svg>
);

// 14. Empty Chat State Illustration
export const EmptyChatIllustration: React.FC<IllustrationProps> = ({ className = "w-36 h-36", size }) => (
  <svg 
    viewBox="0 0 180 180" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={`object-contain ${className}`}
    style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
  >
    <circle cx="90" cy="90" r="75" fill="#EFF6FF" />
    {/* Chat bubble outline */}
    <path d="M45 55C45 44 54 35 65 35H115C126 35 135 44 135 55V95C135 106 126 115 115 115H80L55 135V115H65C54 115 45 106 45 95V55Z" fill="#FFFFFF" stroke="#2563EB" strokeWidth="4" />
    {/* Clinical Sparkle in center */}
    <circle cx="90" cy="75" r="16" fill="#2563EB" />
    <path d="M90 65V85M80 75H100" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
    <circle cx="120" cy="50" r="6" fill="#3B82F6" opacity="0.6" />
    <circle cx="60" cy="95" r="4" fill="#60A5FA" opacity="0.8" />
  </svg>
);

// 15. Empty History Sidebar Illustration
export const EmptyHistoryIllustration: React.FC<IllustrationProps> = ({ className = "w-24 h-24", size }) => (
  <svg 
    viewBox="0 0 120 120" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={`object-contain ${className}`}
    style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
  >
    <circle cx="60" cy="60" r="48" fill="#F0F6FF" />
    {/* Folder / History Stack */}
    <rect x="35" y="40" width="50" height="42" rx="8" fill="#FFFFFF" stroke="#3B82F6" strokeWidth="3" />
    <path d="M45 52H75M45 62H65" stroke="#BFDBFE" strokeWidth="3" strokeLinecap="round" />
    <circle cx="75" cy="70" r="12" fill="#2563EB" />
    <path d="M75 64V76M69 70H81" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

// 16. Vitals Telemetry Empty Illustration
export const VitalsTelemetryIllustration: React.FC<IllustrationProps> = ({ className = "w-36 h-36", size }) => (
  <svg 
    viewBox="0 0 180 180" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={`object-contain ${className}`}
    style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
  >
    <circle cx="90" cy="90" r="75" fill="#EFF6FF" />
    <rect x="40" y="50" width="100" height="80" rx="16" fill="#FFFFFF" stroke="#2563EB" strokeWidth="4" />
    <path d="M50 90H70L78 70L88 110L98 80L106 95L112 90H130" stroke="#2563EB" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="88" cy="110" r="5" fill="#1D4ED8" />
  </svg>
);

// 17. Empty Sleep Architecture Illustration
export const EmptySleepIllustration: React.FC<IllustrationProps> = ({ className = "w-32 h-32", size }) => (
  <svg 
    viewBox="0 0 160 160" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={`object-contain ${className}`}
    style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
  >
    <circle cx="80" cy="80" r="65" fill="#EFF6FF" />
    {/* Moon & Cloud icon */}
    <path d="M90 40C72 40 58 54 58 72C58 88 70 101 86 103C70 103 55 88 55 72C55 54 70 40 88 40Z" fill="#2563EB" />
    <rect x="45" y="90" width="70" height="25" rx="10" fill="#FFFFFF" stroke="#93C5FD" strokeWidth="3" />
    <path d="M55 102H105" stroke="#3B82F6" strokeWidth="3" strokeDasharray="3 3" />
  </svg>
);
