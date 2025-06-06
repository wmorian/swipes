
// @/components/survey/SurveyCard.tsx
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import type { Question } from "@/types";
import { SkipForward, CheckCircle2 } from "lucide-react"; // Removed ChevronRight
import { cn } from "@/lib/utils";

interface SurveyCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onNext: (answer?: any) => void; // This will now be called on option selection
  onSkip: () => void;
  isLastQuestion: boolean; // This might be less relevant for the button label now
  initialAnswer?: string | undefined | null;
}

export default function SurveyCard({
  question,
  questionNumber,
  totalQuestions,
  onNext,
  onSkip,
  isLastQuestion, // Kept for potential future use, but main submit button is gone
  initialAnswer,
}: SurveyCardProps) {
  const [selectedValue, setSelectedValue] = useState<string | undefined>(undefined);
  const [textAnswer, setTextAnswer] = useState<string>("");

  useEffect(() => {
    // Reset internal state when the question or initialAnswer changes
    if (question.type === "multiple-choice" || question.type === "rating") {
      setSelectedValue(initialAnswer === null ? undefined : initialAnswer);
    } else if (question.type === "text") {
      setTextAnswer(initialAnswer === null ? "" : initialAnswer || "");
    }
  }, [initialAnswer, question.id, question.type]);

  const handleOptionClick = (option: string) => {
    let newSelectedValue: string | undefined;
    if (question.type === "multiple-choice" || question.type === "rating") {
      if (selectedValue === option) {
        newSelectedValue = undefined; // Deselect
      } else {
        newSelectedValue = option; // Select
      }
      setSelectedValue(newSelectedValue);
      onNext(newSelectedValue); // Trigger onNext immediately
    }
  };
  
  const handleTextAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextAnswer(e.target.value);
    // For text answers, onNext could be triggered on blur or via a separate small "submit text" button if desired.
    // For now, let's assume text answers still use a conceptual "next" step from HomePage after stats are shown.
    // Or, if stats are shown immediately for text too, HomePage needs to decide when.
    // Let's keep text simple: onNext will be called by HomePage when user clicks "Next Card" from stats view.
    // OR, if we want immediate stats for text too after typing, this needs more thought.
    // For this change, focusing on multiple-choice triggering stats immediately.
  };

  const handleTextSubmitForStats = () => {
    // This function would only be relevant if text questions also immediately showed stats
    // and had their own small submit button within the SurveyCard.
    // For now, text questions will show stats when HomePage initiates it after a main "Next Card" click.
    // This behavior is mostly for multiple-choice/rating.
    if (question.type === 'text') {
        onNext(textAnswer.trim() === "" ? undefined : textAnswer);
    }
  }

  const handleSkipClick = () => {
    onSkip();
  }

  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500">
      <CardHeader>
        <CardTitle className="text-xl font-headline text-primary">{question.text}</CardTitle>
        {/* Optional: Question X of Y can go here if still relevant for multi-question surveys
        <CardDescription>
          Question {questionNumber} of {totalQuestions}
        </CardDescription> 
        */}
      </CardHeader>
      <CardContent className="min-h-[150px]">
        {question.type === "multiple-choice" ? (
          <div className="space-y-2">
            {question.options?.map((option, index) => {
              const isSelected = selectedValue === option;
              return (
                <div
                  key={index}
                  onClick={() => handleOptionClick(option)}
                  className={cn(
                    "flex items-center space-x-3 p-3 border rounded-md cursor-pointer transition-all duration-150 ease-in-out",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary-foreground/30 shadow-lg ring-2 ring-primary-foreground/20"
                      : "bg-card hover:bg-muted/40 border-border"
                  )}
                  role="radio" // Still acting like a radio group conceptually
                  aria-checked={isSelected}
                  tabIndex={0} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOptionClick(option);
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
            onChange={handleTextAnswerChange}
            // onBlur={handleTextSubmitForStats} // Option: submit text on blur to show stats
            rows={4}
          />
        ) : question.type === "rating" ? (
          <div className="flex space-x-2 justify-center">
            {[1, 2, 3, 4, 5].map((ratingValue) => {
              const ratingString = String(ratingValue);
              const isSelected = ratingString === selectedValue;
              return (
                <Button
                  key={ratingValue}
                  variant={isSelected ? "default" : "outline"}
                  className={cn("h-10 w-10 p-0 rounded-full", isSelected && "bg-primary text-primary-foreground" )}
                  onClick={() => handleOptionClick(ratingString)}
                  aria-pressed={isSelected}
                >
                  {ratingValue}
                </Button>
              );
            })}
          </div>
        ) : <p>Unsupported question type.</p>}
      </CardContent>
      <CardFooter className="flex justify-end"> 
        {/* "Vote & See Results" button removed. Skip is the only primary action here from SurveyCard's perspective now. */}
        <Button variant="outline" onClick={handleSkipClick}>
          <SkipForward className="mr-2 h-4 w-4" /> Skip
        </Button>
      </CardFooter>
    </Card>
  );
}
