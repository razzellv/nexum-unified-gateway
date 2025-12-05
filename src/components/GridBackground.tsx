export const GridBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Grid pattern */}
      <div className="absolute inset-0 grid-bg opacity-40" />
      
      {/* Nebula gradient overlays */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/5 rounded-full blur-[100px]" />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-accent/3 rounded-full blur-[80px]" />
      
      {/* Animated particles */}
      <div className="absolute top-20 left-10 w-2 h-2 bg-primary/40 rounded-full animate-float" style={{ animationDelay: '0s' }} />
      <div className="absolute top-40 right-20 w-1.5 h-1.5 bg-secondary/40 rounded-full animate-float" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-32 left-1/3 w-2 h-2 bg-accent/40 rounded-full animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-primary/60 rounded-full animate-float" style={{ animationDelay: '0.5s' }} />
      <div className="absolute bottom-1/4 right-10 w-1.5 h-1.5 bg-secondary/50 rounded-full animate-float" style={{ animationDelay: '1.5s' }} />
    </div>
  );
};
