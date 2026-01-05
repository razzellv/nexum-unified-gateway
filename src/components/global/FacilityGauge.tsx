import { cn } from '@/lib/utils';

interface FacilityGaugeProps {
  value: number;
  max?: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function FacilityGauge({ 
  value, 
  max = 100, 
  label = 'Facility Score',
  size = 'md',
  className 
}: FacilityGaugeProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const sizeConfig = {
    sm: { width: 120, strokeWidth: 8, fontSize: 'text-lg' },
    md: { width: 180, strokeWidth: 10, fontSize: 'text-3xl' },
    lg: { width: 240, strokeWidth: 12, fontSize: 'text-4xl' },
  };

  const config = sizeConfig[size];
  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = radius * Math.PI; // Half circle
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage >= 80) return 'hsl(var(--primary))';
    if (percentage >= 60) return 'hsl(45, 100%, 50%)'; // Yellow
    return 'hsl(var(--destructive))';
  };

  const getGlowColor = () => {
    if (percentage >= 80) return 'hsl(var(--primary) / 0.5)';
    if (percentage >= 60) return 'hsl(45, 100%, 50%, 0.5)';
    return 'hsl(var(--destructive) / 0.5)';
  };

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative" style={{ width: config.width, height: config.width / 2 + 20 }}>
        <svg
          width={config.width}
          height={config.width / 2 + 20}
          className="transform -rotate-0"
        >
          {/* Background arc */}
          <path
            d={`M ${config.strokeWidth / 2} ${config.width / 2} A ${radius} ${radius} 0 0 1 ${config.width - config.strokeWidth / 2} ${config.width / 2}`}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
          />
          
          {/* Value arc with animation */}
          <path
            d={`M ${config.strokeWidth / 2} ${config.width / 2} A ${radius} ${radius} 0 0 1 ${config.width - config.strokeWidth / 2} ${config.width / 2}`}
            fill="none"
            stroke={getColor()}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              filter: `drop-shadow(0 0 8px ${getGlowColor()})`,
              transition: 'stroke-dashoffset 1s ease-out, stroke 0.3s ease',
            }}
          />
        </svg>

        {/* Center value */}
        <div 
          className="absolute inset-0 flex flex-col items-center justify-end pb-2"
        >
          <span 
            className={cn(
              'font-bold text-glow',
              config.fontSize
            )}
            style={{ color: getColor() }}
          >
            {Math.round(value)}
          </span>
          <span className="text-xs text-muted-foreground">/ {max}</span>
        </div>
      </div>
      
      {label && (
        <p className="text-sm text-muted-foreground mt-2">{label}</p>
      )}
    </div>
  );
}
