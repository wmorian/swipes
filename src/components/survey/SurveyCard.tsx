
// @/components/survey/SurveyCard.tsx
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// Removed RadioGroup, RadioGroupItem imports
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import type { Question } from "@/types";
import { ChevronRight, SkipForward, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SurveyCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onNext: (answer?: any) => void;
  onSkip: () => void;
  isLastQuestion: boolean;
  initialAnswer?: string | undefined | null;
}

export default function SurveyCard({
  question,
  questionNumber,
  totalQuestions,
  onNext,
  onSkip,
  isLastQuestion,
  initialAnswer,
}: SurveyCardProps) {
  const [selectedValue, setSelectedValue] = useState<string | undefined>(undefined);
  const [textAnswer, setTextAnswer] = useState<string>("");

  useEffect(() => {
    setSelectedValue(undefined);
    setTextAnswer("");

    if (question.type === "multiple-choice" || question.type === "rating") {
      setSelectedValue(initialAnswer || undefined);
    } else if (question.type === "text") {
      setTextAnswer(initialAnswer || "");
    }
    if (initialAnswer === null) {
        setSelectedValue(undefined);
        setTextAnswer("");
    }
  }, [initialAnswer, question.id, question.type]);

  const handleSubmitAnswer = () => {
    let answer;
    if (question.type === "multiple-choice" || question.type === "rating") {
      answer = selectedValue;
    } else if (question.type === "text") {
      answer = textAnswer.trim() === "" ? undefined : textAnswer;
    }
    onNext(answer);
  };

  const handleSkipClick = () => {
    onSkip();
  }

  const isAnswerSelectedOrEntered = () => {
    if (question.type === "multiple-choice" || question.type === "rating") {
      return !!selectedValue;
    } else if (question.type === "text") {
      return textAnswer.trim() !== "";
    }
    return false;
  };

  const canSubmit = isAnswerSelectedOrEntered();

  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500">
      <CardHeader>
        <CardTitle className="text-xl font-headline text-primary">{question.text}</CardTitle>
        <CardDescription>
          Question {questionNumber} of {totalQuestions}
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-[150px]">
        {question.type === "multiple-choice" ? (
          <div className="space-y-2">
            {question.options?.map((option, index) => {
              const isSelected = selectedValue === option;
              return (
                <div
                  key={index}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedValue(undefined); // Deselect if already selected
                    } else {
                      setSelectedValue(option);    // Select otherwise
                    }
                  }}
                  className={cn(
                    "flex items-center space-x-3 p-3 border rounded-md cursor-pointer transition-all duration-150 ease-in-out",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary-foreground/30 shadow-lg ring-2 ring-primary-foreground/20"
                      : "bg-card hover:bg-muted/40 border-border"
                  )}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0} // Make it focusable
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                       if (isSelected) {
                        setSelectedValue(undefined);
                      } else {
                        setSelectedValue(option);
                      }
                    }
                  }}
                >
                  {isSelected ? (
                    <CheckCircle2 className="h-5 w-5 text-primary-foreground flex-shrink-0" />
                  ) : (
                    <svg className="h-5 w-5 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle cx="12" cy="12" r="9" strokeWidth="1.5" className={cn(isSelected ? "stroke-primary-foreground" : "stroke-current" )} />
                    </svg>
                  )}
                  <span className="flex-grow text-sm">{option}</span>
                </div>
              );
            })}
          </div>
        ) : question.type === "text" ? (
          <Textarea
            placeholder="Type your answer here..."
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            rows={4}
          />
        ) : question.type === "rating" ? (
          // Rating can keep using RadioGroup for now, or be styled similarly if needed
          // For consistency, we might want to update rating style later.
          // For now, focusing on multiple-choice as per request.
          <div className="flex space-x-2 justify-center">
             {/* Using simple buttons for rating for now, can be styled more like stars or custom inputs later */}
            {[1, 2, 3, 4, 5].map((ratingValue) => {
              const isSelected = String(ratingValue) === selectedValue;
              return (
                <Button
                  key={ratingValue}
                  variant={isSelected ? "default" : "outline"}
                  className={cn("h-10 w-10 p-0 rounded-full", isSelected && "bg-primary text-primary-foreground" )}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedValue(undefined);
                    } else {
                      setSelectedValue(String(ratingValue));
                    }
                  }}
                  aria-pressed={isSelected}
                >
                  {ratingValue}
                </Button>
              );
            })}
          </div>
        ) : <p>Unsupported question type.</p>}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleSkipClick}>
          <SkipForward className="mr-2 h-4 w-4" /> Skip
        </Button>
        <Button 
          onClick={handleSubmitAnswer} 
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
          disabled={!canSubmit}
        >
          {isLastQuestion ? "Finish" : "Next"} <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
