import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface PortalButtonProps {
  title: string;
  description: string;
  url: string;
  icon?: React.ReactNode;
  color?: string;
}

export function PortalButton({ title, description, url, icon, color = "primary" }: PortalButtonProps) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
      <div className="group relative overflow-hidden rounded-lg border border-border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/50">
        <div className="flex items-start gap-4">
          {icon && (
            <div className="flex-shrink-0 text-primary">
              {icon}
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          </div>
          <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </a>
  );
}
