
// @/components/survey/SurveyCard.tsx
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import type { Question } from "@/types"; // Assuming Question type definition
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SurveyCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: any) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  initialAnswer?: string | undefined | null;
}

export default function SurveyCard({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  onNext,
  onPrevious,
  isFirstQuestion,
  isLastQuestion,
  initialAnswer,
}: SurveyCardProps) {
  const [selectedValue, setSelectedValue] = useState<string | undefined>(undefined);
  const [textAnswer, setTextAnswer] = useState<string>("");

  useEffect(() => {
    if (question.type === "multiple-choice" || question.type === "rating") {
      setSelectedValue(initialAnswer || undefined);
    } else if (question.type === "text") {
      setTextAnswer(initialAnswer || "");
    }
    
    // Clear selection if initialAnswer is explicitly null/undefined (e.g. new card or no prior answer)
    if (initialAnswer === null || initialAnswer === undefined) {
        setSelectedValue(undefined);
        setTextAnswer("");
    }
  }, [initialAnswer, question.id, question.type]);

  const handleNext = () => {
    let answer;
    if (question.type === "multiple-choice" || question.type === "rating") {
      answer = selectedValue;
    } else if (question.type === "text") {
      answer = textAnswer;
    }
    // Pass undefined if no answer is selected (for skip logic)
    onAnswer(answer); 
    onNext();
    // Don't reset selectedValue/textAnswer here, useEffect will handle it based on initialAnswer for next card
  };

  const handlePrevious = () => {
    onPrevious();
    // Don't reset selectedValue/textAnswer here either
  }

  const renderQuestionInput = () => {
    switch (question.type) {
      case "multiple-choice":
        return (
          <RadioGroup value={selectedValue} onValueChange={setSelectedValue} className="space-y-2">
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors">
                <RadioGroupItem value={option} id={`${question.id}-option-${index}`} />
                <Label htmlFor={`${question.id}-option-${index}`} className="cursor-pointer flex-grow">{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );
      case "text":
        return (
          <Textarea
            placeholder="Type your answer here..."
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            rows={4}
          />
        );
      case "rating":
        return (
          <RadioGroup value={selectedValue} onValueChange={setSelectedValue} className="flex space-x-2 justify-center">
            {[1, 2, 3, 4, 5].map((rating) => (
              <div key={rating} className="flex flex-col items-center space-y-1">
                <Label htmlFor={`${question.id}-rating-${rating}`} className="text-sm">{rating}</Label>
                <RadioGroupItem value={String(rating)} id={`${question.id}-rating-${rating}`} className="h-6 w-6"/>
              </div>
            ))}
          </RadioGroup>
        );
      default:
        return <p>Unsupported question type.</p>;
    }
  };

  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500">
      <CardHeader>
        <CardTitle className="text-xl font-headline text-primary">{question.text}</CardTitle>
        <CardDescription>
          Question {questionNumber} of {totalQuestions}
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-[150px]">
        {renderQuestionInput()}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handlePrevious} disabled={isFirstQuestion}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Previous
        </Button>
        <Button onClick={handleNext} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          {isLastQuestion ? "Finish" : "Next"} <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
