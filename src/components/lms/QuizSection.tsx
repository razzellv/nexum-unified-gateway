import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuizQuestion } from "@/types/lms/course";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface QuizSectionProps {
  questions: QuizQuestion[];
  onComplete: () => void;
}

export const QuizSection = ({ questions, onComplete }: QuizSectionProps) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answers, setAnswers] = useState<Array<{ correct: boolean }>>([]);
  const [completed, setCompleted] = useState(false);

  const question = questions[currentQuestion];
  const isLastQuestion = currentQuestion === questions.length - 1;

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) {
      toast.error("Please select an answer");
      return;
    }

    const isCorrect = selectedAnswer === question.correctAnswer;
    setAnswers([...answers, { correct: isCorrect }]);
    setShowExplanation(true);

    if (isCorrect) {
      toast.success("Correct!");
    } else {
      toast.error("Incorrect. Review the explanation.");
    }
  };

  const handleNext = () => {
    if (isLastQuestion) {
      setCompleted(true);
      onComplete();
      const correctCount = answers.filter(a => a.correct).length + (selectedAnswer === question.correctAnswer ? 1 : 0);
      const percentage = Math.round((correctCount / questions.length) * 100);
      toast.success(`Quiz completed! Score: ${percentage}%`);
    } else {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  const correctAnswers = answers.filter(a => a.correct).length;
  const score = answers.length > 0 ? Math.round((correctAnswers / answers.length) * 100) : 0;

  if (completed) {
    return (
      <Card className="shadow-medium border-success/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-success" />
            Quiz Completed!
          </CardTitle>
          <CardDescription>
            You've successfully completed the knowledge check
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-5xl font-bold mb-4 text-success">{score}%</div>
            <p className="text-lg text-muted-foreground mb-6">
              {correctAnswers} out of {questions.length} questions correct
            </p>
            <Badge variant={score >= 70 ? "success" : "destructive"} className="text-lg px-4 py-2">
              {score >= 70 ? "Passed" : "Review Recommended"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-medium">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline">
            Question {currentQuestion + 1} of {questions.length}
          </Badge>
          {answers.length > 0 && (
            <Badge variant="secondary">
              Current Score: {score}%
            </Badge>
          )}
        </div>
        <CardTitle className="text-xl">{question.question}</CardTitle>
        <CardDescription>
          {question.type === 'multiple-choice' ? 'Select the best answer' : 'Provide a short answer'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {question.type === 'multiple-choice' && question.options ? (
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => !showExplanation && setSelectedAnswer(index)}
                disabled={showExplanation}
                className={`w-full text-left p-4 rounded-lg border-2 transition-smooth ${
                  selectedAnswer === index
                    ? showExplanation
                      ? index === question.correctAnswer
                        ? 'border-success bg-success/10'
                        : 'border-destructive bg-destructive/10'
                      : 'border-secondary bg-secondary/10'
                    : showExplanation && index === question.correctAnswer
                    ? 'border-success bg-success/10'
                    : 'border-border hover:border-secondary/50 hover:bg-accent/50'
                } ${showExplanation ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    selectedAnswer === index
                      ? showExplanation
                        ? index === question.correctAnswer
                          ? 'border-success bg-success'
                          : 'border-destructive bg-destructive'
                        : 'border-secondary bg-secondary'
                      : showExplanation && index === question.correctAnswer
                      ? 'border-success bg-success'
                      : 'border-muted-foreground'
                  }`}>
                    {showExplanation && (
                      index === question.correctAnswer ? (
                        <CheckCircle2 className="w-4 h-4 text-success-foreground" />
                      ) : selectedAnswer === index ? (
                        <XCircle className="w-4 h-4 text-destructive-foreground" />
                      ) : null
                    )}
                  </div>
                  <span className="flex-1">{option}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <textarea
            value={selectedAnswer as string || ''}
            onChange={(e) => setSelectedAnswer(e.target.value)}
            disabled={showExplanation}
            placeholder="Type your answer here..."
            className="w-full min-h-[150px] p-4 rounded-lg border-2 border-input bg-background resize-y disabled:opacity-50"
          />
        )}

        {showExplanation && (
          <div className="bg-muted/50 border border-muted rounded-lg p-4">
            <div className="flex items-start gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
              <h4 className="font-semibold">Explanation:</h4>
            </div>
            <p className="text-sm leading-relaxed">{question.explanation}</p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          {!showExplanation ? (
            <Button 
              onClick={handleSubmitAnswer} 
              variant="secondary"
              className="flex-1"
              disabled={selectedAnswer === null}
            >
              Submit Answer
            </Button>
          ) : (
            <Button 
              onClick={handleNext} 
              variant="secondary"
              className="flex-1"
            >
              {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
