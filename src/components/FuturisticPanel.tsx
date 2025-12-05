import { cn } from "@/lib/utils";

interface FuturisticPanelProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: "primary" | "secondary" | "accent";
  animated?: boolean;
}

export const FuturisticPanel = ({ 
  children, 
  className, 
  glowColor = "primary",
  animated = true 
}: FuturisticPanelProps) => {
  const glowClasses = {
    primary: "hover:shadow-[0_0_40px_hsl(168_92%_55%/0.3)]",
    secondary: "hover:shadow-[0_0_40px_hsl(210_100%_54%/0.3)]",
    accent: "hover:shadow-[0_0_40px_hsl(24_100%_55%/0.3)]",
  };

  const borderClasses = {
    primary: "border-primary/20 hover:border-primary/40",
    secondary: "border-secondary/20 hover:border-secondary/40",
    accent: "border-accent/20 hover:border-accent/40",
  };

  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden",
        "bg-card/60 backdrop-blur-xl",
        "border",
        borderClasses[glowColor],
        glowClasses[glowColor],
        "transition-all duration-500",
        animated && "hover:-translate-y-1",
        className
      )}
    >
      {/* Holographic shimmer overlay */}
      <div className="absolute inset-0 holographic opacity-30 pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
