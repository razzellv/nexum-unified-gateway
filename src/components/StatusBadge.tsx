import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Wrench } from "lucide-react";

interface StatusBadgeProps {
  status: "connected" | "maintenance";
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  if (status === "connected") {
    return (
      <Badge className="bg-primary/20 text-primary border-primary/30 hover:bg-primary/30">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Connected
      </Badge>
    );
  }

  return (
    <Badge className="bg-secondary/20 text-secondary border-secondary/30 hover:bg-secondary/30">
      <Wrench className="w-3 h-3 mr-1" />
      Maintenance
    </Badge>
  );
};
