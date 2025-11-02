import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface ToolCardProps {
  title: string;
  description: string;
  route: string;
  status: "connected" | "maintenance";
  icon: React.ReactNode;
}

export const ToolCard = ({ title, description, route, status, icon }: ToolCardProps) => {
  return (
    <Card className="group relative overflow-hidden border-border bg-card hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 animate-fade-in-up">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>
          <StatusBadge status={status} />
        </div>
        <CardTitle className="text-xl mt-4 group-hover:text-primary transition-colors">
          {title}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {description}
        </CardDescription>
      </CardHeader>
      
      <CardFooter>
        <Link to={route} className="w-full">
          <Button 
            className="w-full group/btn bg-primary hover:bg-primary-glow text-primary-foreground font-semibold"
          >
            Open App
            <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};
