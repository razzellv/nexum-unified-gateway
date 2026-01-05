import { cn } from '@/lib/utils';

interface NexumLoaderProps {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function NexumLoader({ 
  message = 'Analyzing Facility Data…', 
  className,
  size = 'md' 
}: NexumLoaderProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  const ringClasses = {
    sm: 'w-8 h-8 border-2',
    md: 'w-16 h-16 border-3',
    lg: 'w-24 h-24 border-4',
  };

  return (
    <div className={cn(
      'flex flex-col items-center justify-center gap-4',
      className
    )}>
      <div className="relative">
        {/* Outer glow ring */}
        <div 
          className={cn(
            'absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse',
            sizeClasses[size]
          )} 
        />
        
        {/* Main spinning ring */}
        <div 
          className={cn(
            'relative rounded-full border-primary/30 border-t-primary animate-spin',
            ringClasses[size]
          )}
          style={{ 
            boxShadow: '0 0 20px hsl(var(--primary) / 0.5), inset 0 0 10px hsl(var(--primary) / 0.2)',
            animationDuration: '1s'
          }}
        />
        
        {/* Inner pulsing dot */}
        <div 
          className="absolute inset-0 flex items-center justify-center"
        >
          <div 
            className="w-2 h-2 rounded-full bg-primary animate-pulse"
            style={{ 
              boxShadow: '0 0 10px hsl(var(--primary))',
            }}
          />
        </div>
      </div>
      
      {/* Loading message */}
      <p className="text-sm text-muted-foreground animate-pulse text-center">
        {message}
      </p>
    </div>
  );
}

// Full page loader variant
export function NexumPageLoader({ message }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <NexumLoader message={message} size="lg" />
    </div>
  );
}
