import { ReactNode } from 'react';
import { ParticleBackground } from '@/components/ParticleBackground';

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
}

export const PageWrapper = ({ children, className = '' }: PageWrapperProps) => {
  return (
    <div className={`relative min-h-screen ${className}`}>
      <ParticleBackground />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
