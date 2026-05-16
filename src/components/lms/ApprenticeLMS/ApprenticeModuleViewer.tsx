import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BookOpen, FileText, ClipboardCheck, MessageSquare, ArrowLeft, ArrowRight } from "lucide-react";
import { ApprenticeModuleContent, ApprenticeQuizQuestion } from "@/types/lms/apprentice";
import { ApprenticeQuiz } from "./ApprenticeQuiz";

interface ApprenticeModuleViewerProps {
  content: ApprenticeModuleContent;
  moduleNumber: number;
  onBack: () => void;
  onComplete: () => void;
}

export const ApprenticeModuleViewer = ({ 
  content, 
  moduleNumber,
  onBack, 
  onComplete 
}: ApprenticeModuleViewerProps) => {
  const [activeTab, setActiveTab] = useState("lesson");
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizPassed, setQuizPassed] = useState(false);

  const handleQuizComplete = (passed: boolean) => {
    if (passed) {
      setQuizPassed(true);
      setShowQuiz(false);
      onComplete();
    }
  };

  if (showQuiz) {
    return (
      <ApprenticeQuiz
        questions={content.quiz}
        passingScore={70}
        onComplete={handleQuizComplete}
        onBack={() => setShowQuiz(false)}
        moduleTitle={content.title}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Modules
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline">Module {moduleNumber}</Badge>
            {quizPassed && <Badge className="bg-success text-success-foreground">Quiz Passed</Badge>}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{content.title}</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="lesson"><BookOpen className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Lesson</span></TabsTrigger>
            <TabsTrigger value="scenario"><FileText className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Scenario</span></TabsTrigger>
            <TabsTrigger value="standards"><ClipboardCheck className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Standards</span></TabsTrigger>
            <TabsTrigger value="reflection"><MessageSquare className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Reflect</span></TabsTrigger>
          </TabsList>

          <TabsContent value="lesson">
            <Card><CardHeader><CardTitle><BookOpen className="w-5 h-5 text-secondary inline mr-2" />Lesson Content</CardTitle></CardHeader>
              <CardContent><div className="prose prose-sm max-w-none">{content.narration.split('\n\n').map((p, i) => <p key={i} className="text-foreground/90 leading-relaxed mb-4">{p}</p>)}</div></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scenario">
            <Card><CardHeader><CardTitle><FileText className="w-5 h-5 text-secondary inline mr-2" />{content.scenario.title}</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted/50 p-4 rounded-lg border"><p className="text-foreground/90">{content.scenario.description}</p></div>
                <div><h4 className="font-semibold">Key Question:</h4><p className="text-muted-foreground italic">"{content.scenario.question}"</p></div>
                <div className="bg-secondary/10 border border-secondary/30 p-4 rounded-lg"><h4 className="font-semibold mb-2">Answer:</h4><p>{content.scenario.correctAnswer}</p></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="standards">
            <Card><CardHeader><CardTitle><ClipboardCheck className="w-5 h-5 text-secondary inline mr-2" />Industry Standards</CardTitle></CardHeader>
              <CardContent><ul className="space-y-3">{content.standards.map((s, i) => <li key={i} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"><span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">{i+1}</span><span>{s}</span></li>)}</ul></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reflection">
            <Card><CardHeader><CardTitle><MessageSquare className="w-5 h-5 text-secondary inline mr-2" />Professional Reflection</CardTitle></CardHeader>
              <CardContent><div className="bg-accent/10 border border-accent/30 p-6 rounded-lg"><p className="italic">"{content.reflection}"</p></div></CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="mt-8 border-secondary/30 bg-gradient-to-r from-secondary/5 to-accent/5">
          <CardContent className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div><h3 className="font-semibold text-lg">Ready to Test Your Knowledge?</h3><p className="text-sm text-muted-foreground">Pass the quiz with 70% to unlock the next module</p></div>
            <Button size="lg" onClick={() => setShowQuiz(true)}>Take Quiz<ArrowRight className="w-4 h-4 ml-2" /></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
