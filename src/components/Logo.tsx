import React from 'react';
import { Activity } from 'lucide-react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'white' | 'zinc';
}

const LOGO_URL = 'https://raw.githubusercontent.com/noahseabra/seabra-pressao-pro/main/public/logo.png';

export const Logo: React.FC<LogoProps> = ({ className, size = 'md', color = 'blue' }) => {
  const [error, setError] = React.useState(false);

  const sizeClasses = {
    xs: 'w-6 h-6 rounded-lg',
    sm: 'w-10 h-10 rounded-xl',
    md: 'w-16 h-16 rounded-2xl',
    lg: 'w-24 h-24 rounded-3xl',
    xl: 'w-32 h-32 rounded-[2rem]',
  };

  const bgClasses = {
    blue: 'bg-blue-600/10',
    white: 'bg-white/10',
    zinc: 'bg-zinc-800/50',
  };

  const iconColorClasses = {
    blue: 'text-blue-500',
    white: 'text-white',
    zinc: 'text-zinc-600',
  };

  if (!error) {
    return (
      <div className={cn(sizeClasses[size], "overflow-hidden flex items-center justify-center bg-black border border-white/5", className)}>
        <img 
          src={LOGO_URL} 
          alt="Logo" 
          className="w-full h-full object-contain" 
          referrerPolicy="no-referrer"
          onError={() => setError(true)}
        />
      </div>
    );
  }

  return (
    <div className={cn(sizeClasses[size], bgClasses[color], "flex items-center justify-center transition-all", className)}>
      <Activity className={cn("w-1/2 h-1/2", iconColorClasses[color])} />
    </div>
  );
};
