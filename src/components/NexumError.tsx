import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NexumErrorProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
  variant?: 'banner' | 'card' | 'inline';
}

export function NexumError({ 
  message = 'Unable to load facility metrics. Please refresh.',
  onRetry,
  className,
  variant = 'banner'
}: NexumErrorProps) {
  if (variant === 'inline') {
    return (
      <div className={cn(
        'flex items-center gap-2 text-destructive',
        className
      )}>
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm">{message}</span>
        {onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry} className="h-6 px-2">
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn(
        'rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center',
        className
      )}>
        <div className="flex flex-col items-center gap-4">
          <div className="p-3 rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Error Loading Data</h3>
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
          </div>
          {onRetry && (
            <Button 
              variant="outline" 
              onClick={onRetry}
              className="border-destructive/30 hover:bg-destructive/10"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Banner variant (default)
  return (
    <div className={cn(
      'w-full px-4 py-3 rounded-lg border border-destructive/50 bg-destructive/10 backdrop-blur-sm',
      'flex items-center justify-between gap-4',
      className
    )}>
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
        <span className="text-sm font-medium text-destructive">
          ⚠ {message}
        </span>
      </div>
      {onRetry && (
        <Button 
          variant="outline" 
          size="sm"
          onClick={onRetry}
          className="border-destructive/30 hover:bg-destructive/10 text-destructive"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      )}
    </div>
  );
}
