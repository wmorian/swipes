
// @/components/survey/SurveyCard.tsx
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import type { Question } from "@/types";
import { SkipForward, CheckCircle2, Star } from "lucide-react"; 
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface SurveyCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onNext: (answer?: any) => void; 
  onSkip: () => void;
  isLastQuestion: boolean; 
  initialAnswer?: string | undefined | null;
  isDailyPoll?: boolean;
}

export default function SurveyCard({
  question,
  questionNumber,
  totalQuestions,
  onNext,
  onSkip,
  isLastQuestion, 
  initialAnswer,
  isDailyPoll,
}: SurveyCardProps) {
  const [selectedValue, setSelectedValue] = useState<string | undefined>(undefined);
  const [textAnswer, setTextAnswer] = useState<string>("");

  useEffect(() => {
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
        newSelectedValue = undefined; 
      } else {
        newSelectedValue = option; 
      }
      setSelectedValue(newSelectedValue);
      onNext(newSelectedValue); 
    }
  };
  
  const handleTextAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextAnswer(e.target.value);
  };

  const handleSkipClick = () => {
    onSkip();
  }

  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500">
      <CardHeader>
        {isDailyPoll && (
          <div className="flex items-center justify-center gap-2 mb-2 text-sm font-semibold text-accent">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />
            <span>Today's Poll</span>
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />
          </div>
        )}
        <CardTitle className="text-xl font-headline text-primary">{question.text}</CardTitle>
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
                  role="radio" 
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
        <Button variant="outline" onClick={handleSkipClick}>
          <SkipForward className="mr-2 h-4 w-4" /> Skip
        </Button>
      </CardFooter>
    </Card>
  );
}

