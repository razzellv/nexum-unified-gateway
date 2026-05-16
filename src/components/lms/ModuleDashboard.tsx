import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Module } from "@/types/lms/course";
import { CheckCircle2, Lock, Clock, ArrowRight } from "lucide-react";

interface ModuleDashboardProps {
  modules: Module[];
  onModuleSelect: (moduleId: number) => void;
}

export const ModuleDashboard = ({ modules, onModuleSelect }: ModuleDashboardProps) => {
  const completedModules = modules.filter(m => m.completed).length;
  const progressPercentage = (completedModules / modules.length) * 100;

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Training Dashboard</h1>
          <p className="text-muted-foreground text-lg mb-6">
            Track your progress through the Nexum Suum Compliance & Optimization Training Series
          </p>
          
          {/* Overall progress */}
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Overall Progress</CardTitle>
              <CardDescription>
                {completedModules} of {modules.length} modules completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={progressPercentage} className="h-3" />
              <p className="text-sm text-muted-foreground mt-2">
                {progressPercentage.toFixed(0)}% Complete
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Module grid */}
        <div className="grid gap-6">
          {modules.map((module, index) => (
            <Card 
              key={module.id} 
              className={`shadow-soft transition-smooth hover:shadow-medium ${
                module.locked ? 'opacity-60' : 'cursor-pointer hover:border-secondary'
              }`}
              onClick={() => !module.locked && onModuleSelect(module.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline" className="text-xs">
                        Module {module.id}
                      </Badge>
                      {module.completed && (
                        <Badge variant="success" className="text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                      {module.locked && (
                        <Badge variant="secondary" className="text-xs">
                          <Lock className="w-3 h-3 mr-1" />
                          Locked
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-2xl mb-2">{module.title}</CardTitle>
                    <CardDescription className="text-base">
                      {module.description}
                    </CardDescription>
                  </div>
                  {!module.locked && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="ml-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        onModuleSelect(module.id);
                      }}
                    >
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {module.duration}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium">Learning Objective:</span> {module.objective}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer info */}
        <Card className="mt-12 shadow-soft border-secondary/30">
          <CardHeader>
            <CardTitle>About This Training Series</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p className="text-muted-foreground">
              The Nexum Suum Compliance & Optimization Training Series is designed for facility engineers, 
              operations managers, and technical leaders who want to master the intersection of engineering 
              excellence, regulatory compliance, and operational optimization. Each module combines technical 
              depth with practical application, preparing you for the challenges of modern facility management.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
