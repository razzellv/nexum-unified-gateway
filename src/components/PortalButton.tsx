import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface PortalButtonProps {
  label: string;
  url: string;
  variant?: "primary" | "secondary" | "default";
}

export const PortalButton = ({ label, url, variant = "default" }: PortalButtonProps) => {
  const getVariantClasses = () => {
    switch (variant) {
      case "primary":
        return "bg-primary hover:bg-primary-glow text-primary-foreground glow-primary hover:scale-105";
      case "secondary":
        return "bg-secondary hover:bg-secondary-glow text-secondary-foreground glow-secondary hover:scale-105";
      default:
        return "bg-muted hover:bg-muted/80 text-foreground hover:border-primary/50";
    }
  };

  return (
    <Button
      asChild
      className={`group font-semibold transition-all duration-300 ${getVariantClasses()}`}
    >
      <a href={url} target="_blank" rel="noopener noreferrer">
        {label}
        <ExternalLink className="w-4 h-4 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
      </a>
    </Button>
  );
};
