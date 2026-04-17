import React from 'react';
import { Activity } from 'lucide-react';

interface LogoProps {
  className?: string;
  imageSrc?: string;
}

export const Logo: React.FC<LogoProps> = ({ className, imageSrc }) => {
  const [error, setError] = React.useState(false);

  if (imageSrc && !error) {
    return (
      <img 
        src={imageSrc} 
        alt="Logo" 
        className={className} 
        referrerPolicy="no-referrer"
        onError={() => setError(true)}
      />
    );
  }

  return (
    <div className={`${className} bg-brand-blue/10 flex items-center justify-center`}>
      <Activity className="w-1/2 h-1/2 text-brand-blue" />
    </div>
  );
};
