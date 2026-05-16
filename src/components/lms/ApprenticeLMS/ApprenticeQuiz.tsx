import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, ArrowRight, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ApprenticeQuizQuestion } from "@/types/lms/apprentice";

interface ApprenticeQuizProps {
  questions: ApprenticeQuizQuestion[];
  passingScore: number;
  onComplete: (passed: boolean, score: number) => void;
  onBack: () => void;
  moduleTitle: string;
}

export const ApprenticeQuiz = ({ questions, passingScore, onComplete, onBack, moduleTitle }: ApprenticeQuizProps) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<{ selected: number; correct: boolean }[]>([]);
  const [quizComplete, setQuizComplete] = useState(false);

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleSubmit = () => {
    if (selectedAnswer === null) return;
    const isCorrect = selectedAnswer === question.correctAnswer;
    setAnswers([...answers, { selected: selectedAnswer, correct: isCorrect }]);
    setShowResult(true);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      const correctCount = [...answers, { selected: selectedAnswer!, correct: selectedAnswer === question.correctAnswer }].filter(a => a.correct).length;
      const score = (correctCount / questions.length) * 100;
      setQuizComplete(true);
      if (score >= passingScore) toast.success(`Passed with ${score.toFixed(0)}%`);
      else toast.error(`Score: ${score.toFixed(0)}%. Need ${passingScore}% to pass.`);
    }
  };

  const handleRetry = () => { setCurrentQuestion(0); setSelectedAnswer(null); setShowResult(false); setAnswers([]); setQuizComplete(false); };

  if (quizComplete) {
    const correctCount = answers.filter(a => a.correct).length + (selectedAnswer === question.correctAnswer ? 1 : 0);
    const score = (correctCount / questions.length) * 100;
    const passed = score >= passingScore;
    return (
      <div className="min-h-screen bg-background py-8 px-4"><div className="max-w-2xl mx-auto">
        <Card className={`shadow-strong ${passed ? 'border-success/30' : 'border-destructive/30'}`}>
          <CardHeader className="text-center pb-2">
            <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4 ${passed ? 'bg-success' : 'bg-destructive'}`}>
              {passed ? <CheckCircle className="w-10 h-10 text-success-foreground" /> : <XCircle className="w-10 h-10 text-destructive-foreground" />}
            </div>
            <CardTitle className="text-2xl">{passed ? 'Quiz Passed!' : 'Quiz Not Passed'}</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div><p className="text-4xl font-bold">{score.toFixed(0)}%</p><p className="text-muted-foreground">{correctCount} of {questions.length} correct</p></div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              {passed ? <Button onClick={() => onComplete(true, score)} size="lg">Complete Module<ArrowRight className="w-4 h-4 ml-2" /></Button>
                : <><Button onClick={handleRetry} variant="outline" size="lg"><RotateCcw className="w-4 h-4 mr-2" />Retry</Button><Button onClick={onBack} variant="ghost" size="lg">Review Content</Button></>}
            </div>
          </CardContent>
        </Card>
      </div></div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4"><div className="max-w-2xl mx-auto">
      <div className="mb-6"><Button variant="ghost" onClick={onBack} className="mb-4">← Back</Button>
        <h1 className="text-xl font-bold mb-2">{moduleTitle} Quiz</h1>
        <div className="flex justify-between text-sm text-muted-foreground mb-2"><span>Question {currentQuestion + 1} of {questions.length}</span><span>Passing: {passingScore}%</span></div>
        <Progress value={progress} className="h-2" />
      </div>
      <Card className="shadow-medium">
        <CardHeader><CardTitle className="text-lg leading-relaxed">{question.question}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = index === question.correctAnswer;
            let cls = "border-2 p-4 rounded-lg cursor-pointer transition-all ";
            if (showResult) cls += isCorrect ? "border-success bg-success/10" : isSelected ? "border-destructive bg-destructive/10" : "border-border opacity-50";
            else cls += isSelected ? "border-secondary bg-secondary/10" : "border-border hover:border-secondary/50";
            return <div key={index} className={cls} onClick={() => !showResult && setSelectedAnswer(index)}>
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${showResult && isCorrect ? 'border-success bg-success text-success-foreground' : ''} ${showResult && isSelected && !isCorrect ? 'border-destructive bg-destructive text-destructive-foreground' : ''} ${!showResult && isSelected ? 'border-secondary bg-secondary text-secondary-foreground' : ''} ${!showResult && !isSelected ? 'border-muted-foreground' : ''}`}>
                  {showResult && isCorrect && <CheckCircle className="w-4 h-4" />}
                  {showResult && isSelected && !isCorrect && <XCircle className="w-4 h-4" />}
                  {!showResult && <span className="text-xs font-bold">{String.fromCharCode(65 + index)}</span>}
                </div>
                <span className="text-sm">{option}</span>
              </div>
            </div>;
          })}
          {showResult && <div className="mt-4 p-4 bg-muted rounded-lg"><p className="text-sm font-semibold mb-1">Explanation:</p><p className="text-sm text-muted-foreground">{question.explanation}</p></div>}
          <div className="pt-4">{!showResult ? <Button onClick={handleSubmit} disabled={selectedAnswer === null} className="w-full">Submit Answer</Button> : <Button onClick={handleNext} className="w-full">{currentQuestion < questions.length - 1 ? 'Next Question' : 'View Results'}<ArrowRight className="w-4 h-4 ml-2" /></Button>}</div>
        </CardContent>
      </Card>
    </div></div>
  );
};
