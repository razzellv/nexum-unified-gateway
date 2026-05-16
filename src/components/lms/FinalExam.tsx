import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { finalExamQuestions } from "@/data/lms/finalExam";
import { FinalExamAttempt } from "@/types/lms/course";

interface FinalExamProps {
  onComplete: (passed: boolean, score: number) => void;
  onBack: () => void;
}

export const FinalExam = ({ onComplete, onBack }: FinalExamProps) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | number>>({});
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [shownHints, setShownHints] = useState<Record<number, number>>({});
  const [attempts, setAttempts] = useState<FinalExamAttempt[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");

  const question = finalExamQuestions[currentQuestion];
  const currentHintLevel = shownHints[currentQuestion] || 0;
  const canUseHint = hintsUsed < 3 && currentHintLevel < 3 && question.hints[currentHintLevel];

  const handleShowHint = () => {
    if (canUseHint) {
      setHintsUsed(hintsUsed + 1);
      setShownHints({ ...shownHints, [currentQuestion]: currentHintLevel + 1 });
    }
  };

  const handleAnswer = () => {
    setAnswers({ ...answers, [currentQuestion]: selectedAnswer });
    
    if (currentQuestion < finalExamQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer("");
    } else {
      calculateResults();
    }
  };

  const calculateResults = () => {
    let correct = 0;
    finalExamQuestions.forEach((q, index) => {
      const userAnswer = answers[index];
      if (q.type === "math") {
        const numAnswer = typeof userAnswer === "string" ? parseFloat(userAnswer) : userAnswer;
        if (Math.abs(numAnswer - Number(q.correctAnswer)) < 0.5) correct++;
      } else {
        if (userAnswer === q.correctAnswer) correct++;
      }
    });

    const score = (correct / finalExamQuestions.length) * 100;
    const attempt: FinalExamAttempt = {
      attemptNumber: attempts.length + 1,
      score,
      timestamp: new Date(),
      hintsUsed,
    };
    
    setAttempts([...attempts, attempt]);
    setShowResults(true);

    const passed = score >= 80;
    onComplete(passed, score);
  };

  const handleRetry = () => {
    if (attempts.length < 3) {
      setCurrentQuestion(0);
      setAnswers({});
      setHintsUsed(0);
      setShownHints({});
      setShowResults(false);
      setSelectedAnswer("");
    }
  };

  if (showResults) {
    const lastAttempt = attempts[attempts.length - 1];
    const passed = lastAttempt.score >= 80;
    const canRetry = attempts.length < 3;

    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center flex items-center justify-center gap-2">
                {passed ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-destructive" />
                )}
                Exam {passed ? "Passed" : "Not Passed"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="text-6xl font-bold mb-2">{lastAttempt.score.toFixed(1)}%</div>
                <p className="text-muted-foreground">
                  {Math.round((lastAttempt.score / 100) * finalExamQuestions.length)} correct out of{" "}
                  {finalExamQuestions.length} questions
                </p>
                <p className="text-sm text-muted-foreground mt-2">Hints used: {lastAttempt.hintsUsed}/3</p>
              </div>

              {!passed && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You need 80% or higher to pass. {canRetry ? `You have ${3 - attempts.length} attempts remaining.` : "No attempts remaining."}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <h3 className="font-semibold">Attempt History</h3>
                {attempts.map((attempt) => (
                  <div key={attempt.attemptNumber} className="flex justify-between items-center p-2 bg-muted rounded">
                    <span>Attempt {attempt.attemptNumber}</span>
                    <Badge variant={attempt.score >= 80 ? "default" : "secondary"}>
                      {attempt.score.toFixed(1)}%
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={onBack} className="flex-1">
                  Back to Courses
                </Button>
                {!passed && canRetry && (
                  <Button onClick={handleRetry} className="flex-1">
                    Retry Exam ({3 - attempts.length} left)
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Badge variant="outline">
            Question {currentQuestion + 1} of {finalExamQuestions.length}
          </Badge>
          <div className="flex gap-4 text-sm">
            <span className="text-muted-foreground">Hints used: {hintsUsed}/3</span>
            <span className="text-muted-foreground">Attempt: {attempts.length + 1}/3</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{question.question}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentHintLevel > 0 && (
              <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200">
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>
                  {question.hints.slice(0, currentHintLevel).map((hint, i) => (
                    <div key={i} className="mb-2 last:mb-0">
                      <strong>Hint {i + 1}:</strong> {hint}
                    </div>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {question.type === "multiple-choice" || question.type === "system-literacy" ? (
              <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                {question.options?.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2 p-3 rounded hover:bg-muted">
                    <RadioGroupItem value={String(index)} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <div>
                <Label htmlFor="math-answer">Enter your answer (round to 2 decimal places)</Label>
                <Input
                  id="math-answer"
                  type="number"
                  step="0.01"
                  value={selectedAnswer}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  placeholder="Enter numerical answer"
                  className="mt-2"
                />
              </div>
            )}

            <div className="flex gap-4">
              {canUseHint && (
                <Button variant="outline" onClick={handleShowHint} className="gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Show Hint ({3 - hintsUsed} remaining)
                </Button>
              )}
              <Button
                onClick={handleAnswer}
                disabled={!selectedAnswer}
                className="ml-auto"
              >
                {currentQuestion < finalExamQuestions.length - 1 ? "Next Question" : "Submit Exam"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
