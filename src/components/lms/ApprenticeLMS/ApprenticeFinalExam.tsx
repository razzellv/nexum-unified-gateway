import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, ArrowRight, ArrowLeft, Clock, Award } from "lucide-react";
import { apprenticeFinalExam, ExamQuestion } from "@/data/lms/apprenticeFinalExam";

interface ApprenticeFinalExamProps {
  onComplete: (passed: boolean, score: number) => void;
  onBack: () => void;
}

export const ApprenticeFinalExam = ({ onComplete, onBack }: ApprenticeFinalExamProps) => {
  const [started, setStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);

  const questions = apprenticeFinalExam;
  const passingScore = 75;
  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "concepts": return "Concepts & Definitions";
      case "scenarios": return "Scenario Analysis";
      case "judgment": return "Operational Judgment";
      default: return category;
    }
  };

  const handleNext = () => {
    if (selectedAnswer === null) return;
    
    const newAnswers = [...answers, selectedAnswer];
    setAnswers(newAnswers);
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
    } else {
      setShowResults(true);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    answers.forEach((answer, index) => {
      if (answer === questions[index].correctAnswer) {
        correct++;
      }
    });
    return (correct / questions.length) * 100;
  };

  if (!started) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" onClick={onBack} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Modules
          </Button>

          <Card className="shadow-strong">
            <CardHeader className="text-center">
              <div className="w-20 h-20 gradient-secondary rounded-full mx-auto flex items-center justify-center mb-4 shadow-glow">
                <Award className="w-10 h-10 text-secondary-foreground" />
              </div>
              <CardTitle className="text-2xl">Facility Intelligence Apprentice</CardTitle>
              <p className="text-lg text-muted-foreground">Final Certification Exam</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-3xl font-bold text-foreground">60</p>
                  <p className="text-sm text-muted-foreground">Questions</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-3xl font-bold text-foreground">75%</p>
                  <p className="text-sm text-muted-foreground">To Pass</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Topics Covered:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-secondary" />
                    Facility Intelligence concepts and definitions
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-secondary" />
                    Database and data structure fundamentals
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-secondary" />
                    Data quality and integrity practices
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-secondary" />
                    HVAC system metrics and relationships
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-secondary" />
                    Operational efficiency interpretation
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-secondary" />
                    Compliance-aware thinking
                  </li>
                </ul>
              </div>

              <div className="bg-accent/10 border border-accent/30 p-4 rounded-lg">
                <p className="text-sm text-foreground/90">
                  <strong>Note:</strong> Once you begin, you must complete the entire exam. 
                  Your progress cannot be saved. Allow approximately 45-60 minutes.
                </p>
              </div>

              <Button onClick={() => setStarted(true)} size="lg" className="w-full">
                Begin Certification Exam
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (showResults) {
    const score = calculateScore();
    const passed = score >= passingScore;
    const correctCount = answers.filter((a, i) => a === questions[i].correctAnswer).length;

    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className={`shadow-strong ${passed ? 'border-success/30' : 'border-destructive/30'}`}>
            <CardHeader className="text-center">
              <div className={`
                w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-4
                ${passed ? 'bg-success shadow-glow' : 'bg-destructive'}
              `}>
                {passed ? (
                  <Award className="w-12 h-12 text-success-foreground" />
                ) : (
                  <XCircle className="w-12 h-12 text-destructive-foreground" />
                )}
              </div>
              <CardTitle className="text-2xl">
                {passed ? 'Certification Exam Passed!' : 'Exam Not Passed'}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className="space-y-2">
                <p className="text-5xl font-bold text-foreground">{score.toFixed(0)}%</p>
                <p className="text-muted-foreground">
                  {correctCount} of {questions.length} correct
                </p>
                <p className="text-sm text-muted-foreground">
                  Required: {passingScore}%
                </p>
              </div>

              {passed ? (
                <div className="bg-success/10 border border-success/30 p-4 rounded-lg">
                  <p className="font-semibold text-foreground">
                    Congratulations! You are now a certified Facility Intelligence Apprentice.
                  </p>
                </div>
              ) : (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-muted-foreground">
                    Review the module content and try again when ready.
                  </p>
                </div>
              )}

              <Button 
                onClick={() => onComplete(passed, score)} 
                size="lg" 
                className="w-full"
              >
                {passed ? 'Claim Your Certificate' : 'Return to Modules'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline">{getCategoryLabel(question.category)}</Badge>
            <span className="text-sm text-muted-foreground">
              Question {currentQuestion + 1} of {questions.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="text-lg leading-relaxed">
              {question.question}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {question.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              
              return (
                <div
                  key={index}
                  className={`
                    border-2 p-4 rounded-lg cursor-pointer transition-all
                    ${isSelected 
                      ? 'border-secondary bg-secondary/10' 
                      : 'border-border hover:border-secondary/50'
                    }
                  `}
                  onClick={() => setSelectedAnswer(index)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`
                      w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
                      ${isSelected 
                        ? 'border-secondary bg-secondary text-secondary-foreground' 
                        : 'border-muted-foreground'
                      }
                    `}>
                      <span className="text-xs font-bold">
                        {String.fromCharCode(65 + index)}
                      </span>
                    </div>
                    <span className="text-sm">{option}</span>
                  </div>
                </div>
              );
            })}

            <div className="pt-4">
              <Button 
                onClick={handleNext} 
                disabled={selectedAnswer === null}
                className="w-full"
              >
                {currentQuestion < questions.length - 1 ? 'Next Question' : 'Submit Exam'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
