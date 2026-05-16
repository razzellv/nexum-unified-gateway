import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, BookOpen, ArrowRight, GraduationCap } from "lucide-react";
import { apprenticeModules } from "@/data/lms/apprenticeModules";
import { apprenticeModuleContent } from "@/data/lms/apprenticeModuleContent";
import { ApprenticeModule } from "@/types/lms/apprentice";
import { ApprenticeProgress } from "@/components/lms/ApprenticeLMS/ApprenticeProgress";
import { ApprenticeModuleCard } from "@/components/lms/ApprenticeLMS/ApprenticeModuleCard";
import { ApprenticeModuleViewer } from "@/components/lms/ApprenticeLMS/ApprenticeModuleViewer";
import { ApprenticeFinalExam } from "@/components/lms/ApprenticeLMS/ApprenticeFinalExam";
import { ApprenticeCertificate } from "@/components/lms/ApprenticeLMS/ApprenticeCertificate";
import { toast } from "sonner";

type View = "landing" | "modules" | "module-content" | "final-exam" | "certificate";

const STORAGE_KEY = "facility-intelligence-apprentice-progress";

interface ProgressData {
  completedModules: number[];
  examPassed: boolean;
  examScore: number;
}

export default function ApprenticeLMSPage() {
  const [view, setView] = useState<View>("landing");
  const [modules, setModules] = useState<ApprenticeModule[]>(apprenticeModules);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [examPassed, setExamPassed] = useState(false);
  const [examScore, setExamScore] = useState(0);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data: ProgressData = JSON.parse(saved);
        const updatedModules = apprenticeModules.map((m, index) => ({
          ...m,
          completed: data.completedModules.includes(m.id),
          locked: index === 0 ? false : !data.completedModules.includes(apprenticeModules[index - 1].id),
        }));
        setModules(updatedModules);
        setExamPassed(data.examPassed);
        setExamScore(data.examScore);
      } catch {}
    }
  }, []);

  const saveProgress = (completedModules: number[], passed: boolean, score: number) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ completedModules, examPassed: passed, examScore: score }));
  };

  const handleModuleSelect = (moduleId: number) => {
    const mod = modules.find(m => m.id === moduleId);
    if (mod && !mod.locked) { setSelectedModuleId(moduleId); setView("module-content"); }
  };

  const handleModuleComplete = () => {
    if (selectedModuleId === null) return;
    const updatedModules = modules.map((m, index) => {
      if (m.id === selectedModuleId) return { ...m, completed: true };
      if (index > 0 && modules[index - 1].id === selectedModuleId) return { ...m, locked: false };
      return m;
    });
    setModules(updatedModules);
    saveProgress(updatedModules.filter(m => m.completed).map(m => m.id), examPassed, examScore);
    toast.success("Module completed! Next module unlocked.");
    setView("modules");
    setSelectedModuleId(null);
  };

  const handleExamComplete = (passed: boolean, score: number) => {
    if (passed) {
      setExamPassed(true);
      setExamScore(score);
      saveProgress(modules.filter(m => m.completed).map(m => m.id), true, score);
      setView("certificate");
    } else {
      setView("modules");
    }
  };

  const allModulesCompleted = modules.every(m => m.completed);

  const renderContent = () => {
    if (view === "landing") {
      return (
        <div className="max-w-4xl mx-auto py-12 text-center space-y-8">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
              <GraduationCap className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <div className="space-y-3">
            <Badge variant="secondary" className="text-sm px-4 py-1">Nexum Suum — Facility Intelligence™</Badge>
            <h1 className="text-4xl font-bold tracking-tight">Facility Intelligence Apprentice Certification</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Foundations of Facility Data, Systems Thinking, and Operational Metrics
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <BookOpen className="w-10 h-10 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold text-lg">3 Core Modules</h3>
                <p className="text-sm text-muted-foreground">Structured learning path with quizzes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Award className="w-10 h-10 mx-auto mb-3 text-yellow-500" />
                <h3 className="font-semibold text-lg">60-Question Exam</h3>
                <p className="text-sm text-muted-foreground">Comprehensive certification assessment</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <GraduationCap className="w-10 h-10 mx-auto mb-3 text-green-500" />
                <h3 className="font-semibold text-lg">PDF Certificate</h3>
                <p className="text-sm text-muted-foreground">Downloadable upon completion</p>
              </CardContent>
            </Card>
          </div>
          <Card className="text-left">
            <CardHeader><CardTitle>Program Requirements</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-muted-foreground">
              <p>• Module Quizzes: 70% passing score to unlock next module</p>
              <p>• Final Exam: 75% passing score for certification</p>
              <p>• Progress saved in your browser session</p>
              <p>• Self-paced — complete at your own schedule</p>
            </CardContent>
          </Card>
          <Button size="lg" onClick={() => setView("modules")} className="px-8 py-6 text-lg">
            Begin Certification Program <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      );
    }

    if (view === "modules") {
      return (
        <div className="max-w-5xl mx-auto py-8">
          <div className="mb-8">
            <Button variant="ghost" onClick={() => setView("landing")} className="mb-4">← Back to Overview</Button>
            <h1 className="text-3xl font-bold">Facility Intelligence Apprentice</h1>
            <p className="text-muted-foreground">Complete all modules to unlock the certification exam</p>
          </div>
          <ApprenticeProgress
            modules={modules}
            currentModuleId={selectedModuleId ?? undefined}
            examUnlocked={allModulesCompleted}
            examPassed={examPassed}
          />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
            {modules.map(module => (
              <ApprenticeModuleCard key={module.id} module={module} onSelect={handleModuleSelect} />
            ))}
          </div>
          <Card className={allModulesCompleted ? "border-primary/50" : "opacity-60"}>
            <CardContent className="py-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${allModulesCompleted ? "bg-primary" : "bg-muted"}`}>
                    <Award className={`w-7 h-7 ${allModulesCompleted ? "text-primary-foreground" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Final Certification Exam</h3>
                    <p className="text-sm text-muted-foreground">
                      {examPassed ? `Passed with ${examScore.toFixed(0)}%` : allModulesCompleted ? "60 questions • 75% to pass" : "Complete all modules to unlock"}
                    </p>
                  </div>
                </div>
                <Button size="lg" disabled={!allModulesCompleted} onClick={() => setView(examPassed ? "certificate" : "final-exam")}>
                  {examPassed ? "View Certificate" : "Start Exam"} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (view === "module-content" && selectedModuleId !== null) {
      const content = apprenticeModuleContent[selectedModuleId];
      if (!content) {
        return (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <p className="text-muted-foreground">Module content not available yet.</p>
            <Button onClick={() => setView("modules")}>Back to Modules</Button>
          </div>
        );
      }
      return (
        <ApprenticeModuleViewer
          content={content}
          moduleNumber={selectedModuleId}
          onBack={() => { setView("modules"); setSelectedModuleId(null); }}
          onComplete={handleModuleComplete}
        />
      );
    }

    if (view === "final-exam") {
      return <ApprenticeFinalExam onComplete={handleExamComplete} onBack={() => setView("modules")} />;
    }

    if (view === "certificate") {
      return <ApprenticeCertificate score={examScore} onStartOver={() => setView("modules")} />;
    }

    return null;
  };

  return (
    <MainLayout>
      <div className="p-6">
        {renderContent()}
      </div>
    </MainLayout>
  );
}
