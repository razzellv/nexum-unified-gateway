export function NexumBranding() {
  return (
    <div className="flex flex-col items-center gap-1 mb-8">
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="relative">
          <svg width="80" height="80" viewBox="0 0 100 100" className="drop-shadow-2xl">
            {/* Outer glow effect */}
            <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(234, 179, 8, 0.3)" strokeWidth="8" />
            
            {/* Lightning bolt circle */}
            <circle cx="50" cy="30" r="18" fill="none" stroke="#eab308" strokeWidth="2.5" className="animate-pulse" />
            <path 
              d="M 50 20 L 45 30 L 50 28 L 48 38 L 55 28 L 50 30 Z" 
              fill="#eab308" 
              className="drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]"
            />
            
            {/* Three gears */}
            <g className="animate-spin" style={{ transformOrigin: '30px 65px', animationDuration: '8s', animationDirection: 'reverse' }}>
              <circle cx="30" cy="65" r="12" fill="none" stroke="#eab308" strokeWidth="2" />
              <circle cx="30" cy="65" r="8" fill="none" stroke="#eab308" strokeWidth="1.5" />
              <circle cx="30" cy="65" r="3" fill="#eab308" />
            </g>
            
            <g className="animate-spin" style={{ transformOrigin: '50px 65px', animationDuration: '6s' }}>
              <circle cx="50" cy="65" r="14" fill="none" stroke="#eab308" strokeWidth="2.5" />
              <circle cx="50" cy="65" r="9" fill="none" stroke="#eab308" strokeWidth="2" />
              <circle cx="50" cy="65" r="4" fill="#eab308" />
            </g>
            
            <g className="animate-spin" style={{ transformOrigin: '70px 65px', animationDuration: '8s', animationDirection: 'reverse' }}>
              <circle cx="70" cy="65" r="12" fill="none" stroke="#eab308" strokeWidth="2" />
              <circle cx="70" cy="65" r="8" fill="none" stroke="#eab308" strokeWidth="1.5" />
              <circle cx="70" cy="65" r="3" fill="#eab308" />
            </g>
          </svg>
        </div>

        {/* Text */}
        <div className="flex flex-col">
          <h1 className="text-5xl font-bold tracking-wider" style={{
            color: '#06b6d4',
            textShadow: '0 0 20px rgba(6, 182, 212, 0.8), 0 0 40px rgba(6, 182, 212, 0.4)'
          }}>
            NEXUM SUUM
          </h1>
          <p className="text-xl tracking-widest mt-1" style={{
            color: '#eab308',
            textShadow: '0 0 15px rgba(234, 179, 8, 0.6)'
          }}>
            Incorporated
          </p>
        </div>
      </div>
      
      {/* Facility Intelligence subtitle */}
      <p className="text-lg text-muted-foreground italic mt-2">
        Facility Intelligence™
      </p>
    </div>
  );
}
