import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { CourseSelector } from "@/components/lms/CourseSelector";
import { ModuleDashboard } from "@/components/lms/ModuleDashboard";
import { ModuleViewer } from "@/components/lms/ModuleViewer";
import { FinalExam } from "@/components/lms/FinalExam";
import { CompletionCertificate } from "@/components/lms/CompletionCertificate";
import { courses } from "@/data/lms/courses";
import { moduleContent } from "@/data/lms/moduleContent";
import { hvacModuleContent } from "@/data/lms/hvacModuleContent";
import { thermodynamicsModuleContent } from "@/data/lms/thermodynamicsModuleContent";
import { specialistModuleContent } from "@/data/lms/specialistModuleContent";
import { facilityIntelligenceModuleContent } from "@/data/lms/facilityIntelligenceModuleContent";
import { newEquipmentModuleContent } from "@/data/lms/newEquipmentModules";
import { facilityIntelligenceIIModuleContent } from "@/data/lms/facilityIntelligenceIIModuleContent";
import { useUserProgress } from "@/hooks/useUserProgress";
import { useLMSAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type View = "courses" | "dashboard" | "module" | "final-exam" | "certificate";

const COURSE_CONTENT_MAP: Record<string, Record<number, any>> = {
  "facility-optimization":    moduleContent,
  "hvac-optimization":        hvacModuleContent,
  "thermodynamics-tech":      thermodynamicsModuleContent,
  "career-specialist":        specialistModuleContent,
  "facility-intelligence":    facilityIntelligenceModuleContent,
  "new-equipment-systems":    newEquipmentModuleContent,
  "facility-intelligence-ii": facilityIntelligenceIIModuleContent,
};

export default function Courses() {
  const { getCourseModules, getCourseProgress, loading: progressLoading, saveProgress, resetProgress } = useUserProgress();
  const { isReadOnly } = useLMSAuth();
  const [currentView, setCurrentView]     = useState<View>("courses");
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);

  const handleSelectCourse   = (courseId: string) => { setSelectedCourseId(courseId); setCurrentView("dashboard"); };
  const handleModuleSelect   = (moduleId: number) => { setSelectedModuleId(moduleId); setCurrentView("module"); };
  const handleBackToDashboard = () => { setCurrentView("dashboard"); setSelectedModuleId(null); };
  const handleBackToCourses   = () => { setSelectedCourseId(null); setCurrentView("courses"); };

  const handleModuleComplete = () => {
    if (selectedModuleId === null || !selectedCourseId) return;
    if (!isReadOnly) saveProgress(selectedCourseId, selectedModuleId);
    const allCompleted = getCourseModules(selectedCourseId).every(m => m.completed);
    if (allCompleted && !isReadOnly) {
      toast.success("Course completed!");
      handleBackToCourses();
    } else {
      toast.success(isReadOnly ? "Module viewed." : "Module completed!");
      handleBackToDashboard();
    }
  };

  const handleFinalExamComplete = (passed: boolean, score: number) => {
    if (passed) {
      toast.success(`Congratulations! You passed with ${score.toFixed(1)}%`);
      setTimeout(() => setCurrentView("certificate"), 1500);
    } else {
      toast.error(`Score: ${score.toFixed(1)}% — keep studying and try again.`);
    }
  };

  const renderContent = () => {
    if (progressLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Loading courses…</p>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case "courses": {
        const courseProgressMap = courses.reduce((acc, course) => {
          acc[course.id] = getCourseProgress(course.id);
          return acc;
        }, {} as Record<string, { completed: number; total: number }>);
        return (
          <div className="relative">
            {!isReadOnly && (
              <div className="absolute top-0 right-0 z-10">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm"><RotateCcw className="w-4 h-4 mr-2" />Reset Progress</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset All Progress?</AlertDialogTitle>
                      <AlertDialogDescription>This will clear all course progress and cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => { resetProgress(); toast.success("Progress reset"); }}>Reset</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
            <CourseSelector courses={courses} onSelectCourse={handleSelectCourse} courseProgress={courseProgressMap} />
          </div>
        );
      }

      case "dashboard": {
        if (!selectedCourseId) return null;
        return (
          <div className="relative">
            <div className="mb-4">
              <Button variant="outline" size="sm" onClick={handleBackToCourses}>← Back to Courses</Button>
            </div>
            <ModuleDashboard modules={getCourseModules(selectedCourseId)} onModuleSelect={handleModuleSelect} />
          </div>
        );
      }

      case "module": {
        if (selectedModuleId === null || !selectedCourseId) return null;
        const content = (COURSE_CONTENT_MAP[selectedCourseId] || {})[selectedModuleId];
        if (!content) {
          return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <h2 className="text-xl font-semibold">Module content coming soon</h2>
              <p className="text-muted-foreground text-sm">This module is currently being developed.</p>
              <Button onClick={handleBackToDashboard}>← Back</Button>
            </div>
          );
        }
        return <ModuleViewer content={content} onBack={handleBackToDashboard} onComplete={handleModuleComplete} />;
      }

      case "final-exam":
        return <FinalExam onComplete={handleFinalExamComplete} onBack={handleBackToCourses} />;

      case "certificate":
        return (
          <CompletionCertificate
            completionDate={new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          />
        );

      default:
        return null;
    }
  };

  return (
    <MainLayout>
      <div className="p-6">
        {renderContent()}
      </div>
    </MainLayout>
  );
}
