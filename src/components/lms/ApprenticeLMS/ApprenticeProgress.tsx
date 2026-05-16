import { Progress } from "@/components/ui/progress";
import { CheckCircle, Lock, Circle } from "lucide-react";

interface Module {
  id: number;
  title: string;
  completed: boolean;
  locked: boolean;
}

interface ApprenticeProgressProps {
  modules: Module[];
  currentModuleId?: number;
  examUnlocked: boolean;
  examPassed: boolean;
}

export const ApprenticeProgress = ({ 
  modules, 
  currentModuleId, 
  examUnlocked, 
  examPassed 
}: ApprenticeProgressProps) => {
  const completedCount = modules.filter(m => m.completed).length;
  const totalSteps = modules.length + 1; // modules + final exam
  const completedSteps = completedCount + (examPassed ? 1 : 0);
  const progressPercent = (completedSteps / totalSteps) * 100;

  return (
    <div className="w-full bg-card border border-border rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Certification Progress</h3>
        <span className="text-sm text-muted-foreground">
          {completedSteps} of {totalSteps} complete
        </span>
      </div>
      
      <Progress value={progressPercent} className="h-2 mb-4" />
      
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
        {modules.map((module, index) => (
          <div 
            key={module.id}
            className="flex flex-col items-center min-w-[80px]"
          >
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center mb-1
              ${module.completed 
                ? 'bg-success text-success-foreground' 
                : module.locked 
                  ? 'bg-muted text-muted-foreground'
                  : currentModuleId === module.id
                    ? 'bg-secondary text-secondary-foreground'
                    : 'bg-primary/20 text-primary'
              }
            `}>
              {module.completed ? (
                <CheckCircle className="w-5 h-5" />
              ) : module.locked ? (
                <Lock className="w-4 h-4" />
              ) : (
                <span className="text-sm font-bold">{index + 1}</span>
              )}
            </div>
            <span className="text-xs text-center text-muted-foreground max-w-[70px] truncate">
              Module {index + 1}
            </span>
          </div>
        ))}
        
        {/* Final Exam */}
        <div className="flex flex-col items-center min-w-[80px]">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center mb-1
            ${examPassed 
              ? 'bg-success text-success-foreground' 
              : examUnlocked 
                ? 'bg-accent text-accent-foreground'
                : 'bg-muted text-muted-foreground'
            }
          `}>
            {examPassed ? (
              <CheckCircle className="w-5 h-5" />
            ) : examUnlocked ? (
              <span className="text-sm font-bold">✓</span>
            ) : (
              <Lock className="w-4 h-4" />
            )}
          </div>
          <span className="text-xs text-center text-muted-foreground">
            Final Exam
          </span>
        </div>
      </div>
    </div>
  );
};
