import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModuleContent } from "@/types/lms/course";
import { ArrowLeft, BookOpen, FileText, AlertCircle, CheckCircle2, Lightbulb } from "lucide-react";
import { QuizSection } from "./QuizSection";
import moduleBackground from "@/assets/module-background.jpeg";

interface ModuleViewerProps {
  content: ModuleContent;
  onBack: () => void;
  onComplete: () => void;
}

export const ModuleViewer = ({ content, onBack, onComplete }: ModuleViewerProps) => {
  const [quizCompleted, setQuizCompleted] = useState(false);

  return (
    <div className="min-h-screen bg-background py-8 relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 opacity-10 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{ backgroundImage: `url(${moduleBackground})` }}
      />
      
      {/* Content */}
      <div className="container mx-auto px-4 max-w-5xl relative z-10">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="mb-4"
          >
            <ArrowLeft className="mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Badge variant="secondary" className="mb-3">
                Module {content.id}
              </Badge>
              <h1 className="text-4xl font-bold mb-3">{content.title}</h1>
              <p className="text-lg text-muted-foreground mb-4">{content.objective}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="w-4 h-4" />
                <span>{content.duration}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content tabs */}
        <Tabs defaultValue="lesson" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="lesson">Lesson</TabsTrigger>
            <TabsTrigger value="scenario">Scenario</TabsTrigger>
            <TabsTrigger value="standards">Standards</TabsTrigger>
            <TabsTrigger value="quiz">Quiz</TabsTrigger>
            <TabsTrigger value="reflection">Reflection</TabsTrigger>
          </TabsList>

          {/* Lesson content */}
          <TabsContent value="lesson" className="space-y-6">
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-secondary" />
                  Narrated Lesson
                </CardTitle>
                <CardDescription>
                  Read or listen to this comprehensive lesson on {content.title.toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {content.narrationScript.map((paragraph, index) => (
                  <p key={index} className="text-base leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scenario */}
          <TabsContent value="scenario" className="space-y-6">
            <Card className="shadow-medium border-accent/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-accent" />
                  {content.scenario.title}
                </CardTitle>
                <CardDescription>{content.scenario.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
                  <h4 className="font-semibold mb-3 text-accent-foreground">Real-World Situation:</h4>
                  <p className="text-base leading-relaxed">{content.scenario.situation}</p>
                </div>
                <div className="prose prose-sm max-w-none">
                  <p className="text-muted-foreground italic">
                    Consider how you would respond to this situation. What data would you collect? 
                    What systems would you check? What documentation would you review? 
                    Think through your systematic approach before continuing to the quiz.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Standards */}
          <TabsContent value="standards" className="space-y-6">
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  {content.standards.title}
                </CardTitle>
                <CardDescription>
                  Key regulatory standards and codes referenced in this module
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {content.standards.items.map((item, index) => (
                    <li 
                      key={index} 
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-smooth"
                    >
                      <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quiz */}
          <TabsContent value="quiz" className="space-y-6">
            <QuizSection 
              questions={content.quiz}
              onComplete={() => setQuizCompleted(true)}
            />
          </TabsContent>

          {/* Reflection */}
          <TabsContent value="reflection" className="space-y-6">
            <Card className="shadow-medium border-secondary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-secondary" />
                  Reflection & Application
                </CardTitle>
                <CardDescription>
                  Apply what you've learned to your own facility context
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-6">
                  <h4 className="font-semibold mb-3">Reflection Prompt:</h4>
                  <p className="text-base leading-relaxed mb-4">{content.reflectionPrompt}</p>
                  <textarea 
                    className="w-full min-h-[200px] p-4 rounded-lg border border-input bg-background resize-y"
                    placeholder="Write your reflection here..."
                  />
                </div>

                <div>
                  <h4 className="font-semibold mb-4">Key Takeaways:</h4>
                  <ul className="space-y-3">
                    {content.keyTakeaways.map((takeaway, index) => (
                      <li 
                        key={index} 
                        className="flex items-start gap-3 p-3 rounded-lg bg-card border shadow-soft"
                      >
                        <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-secondary">{index + 1}</span>
                        </div>
                        <span className="text-sm leading-relaxed">{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 border-t">
                  <Button 
                    variant="secondary" 
                    size="lg"
                    onClick={onComplete}
                    disabled={!quizCompleted}
                    className="w-full shadow-medium"
                  >
                    {quizCompleted ? "Complete Module" : "Complete Quiz to Finish Module"}
                    <CheckCircle2 className="ml-2" />
                  </Button>
                  {!quizCompleted && (
                    <p className="text-sm text-muted-foreground text-center mt-3">
                      Complete the quiz section before finishing this module
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
