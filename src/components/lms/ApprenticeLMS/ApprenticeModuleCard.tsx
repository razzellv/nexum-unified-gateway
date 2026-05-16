import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Lock, Clock, BookOpen, ArrowRight } from "lucide-react";

interface Module {
  id: number;
  title: string;
  duration: string;
  description: string;
  topics: string[];
  completed: boolean;
  locked: boolean;
}

interface ApprenticeModuleCardProps {
  module: Module;
  onSelect: (id: number) => void;
}

export const ApprenticeModuleCard = ({ module, onSelect }: ApprenticeModuleCardProps) => {
  const getStatusBadge = () => {
    if (module.completed) {
      return (
        <Badge variant="default" className="bg-success text-success-foreground">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed
        </Badge>
      );
    }
    if (module.locked) {
      return (
        <Badge variant="secondary" className="bg-muted text-muted-foreground">
          <Lock className="w-3 h-3 mr-1" />
          Locked
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-secondary text-secondary">
        <BookOpen className="w-3 h-3 mr-1" />
        Available
      </Badge>
    );
  };

  const getButtonText = () => {
    if (module.completed) return "Review Module";
    if (module.locked) return "Complete Previous Module";
    return "Start Module";
  };

  return (
    <Card className={`
      transition-all duration-300 hover:shadow-medium
      ${module.locked ? 'opacity-60' : ''}
      ${module.completed ? 'border-success/30 bg-success/5' : ''}
    `}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg
                ${module.completed 
                  ? 'bg-success text-success-foreground' 
                  : module.locked 
                    ? 'bg-muted text-muted-foreground'
                    : 'gradient-secondary text-secondary-foreground'
                }
              `}>
                {module.id}
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">{module.title}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{module.duration}</span>
                </div>
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <CardDescription className="text-sm">
          {module.description}
        </CardDescription>
        
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Topics Covered
          </p>
          <ul className="space-y-1">
            {module.topics.slice(0, 4).map((topic, index) => (
              <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-secondary mt-0.5">•</span>
                {topic}
              </li>
            ))}
          </ul>
        </div>
        
        <Button 
          onClick={() => onSelect(module.id)}
          disabled={module.locked}
          variant={module.completed ? "outline" : "default"}
          className="w-full"
        >
          {getButtonText()}
          {!module.locked && <ArrowRight className="w-4 h-4 ml-2" />}
        </Button>
        
        {!module.completed && !module.locked && (
          <p className="text-xs text-center text-muted-foreground">
            Pass quiz with 70% to unlock next module
          </p>
        )}
      </CardContent>
    </Card>
  );
};
