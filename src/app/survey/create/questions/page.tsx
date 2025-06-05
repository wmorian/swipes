
// @/app/survey/create/questions/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useSurveyCreation, type SurveyQuestionContext } from "@/context/SurveyCreationContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, PlusCircle, Trash2, XCircle } from 'lucide-react';
import SurveyCard from "@/components/survey/SurveyCard";
import type { Question as SurveyCardQuestion } from "@/types"; // For SurveyCard props
import { useToast } from "@/hooks/use-toast";

export default function CreateSurveyQuestionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { surveyData, setCurrentStep, addQuestion, updateQuestion, removeQuestion } = useSurveyCreation();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/survey/create/questions');
      return;
    }
    if (!surveyData.surveyType) {
      toast({ title: "Missing Details", description: "Survey type not set. Please start from step 1.", variant: "destructive"});
      router.push('/survey/create');
      return;
    }
    setCurrentStep(2);
  }, [user, authLoading, router, surveyData.surveyType, setCurrentStep, toast]);

  const handleQuestionTextChange = (index: number, text: string) => {
    const updatedQuestion = { ...surveyData.questions[index], text };
    updateQuestion(index, updatedQuestion);
  };

  const handleOptionChange = (qIndex: number, optIndex: number, value: string) => {
    const questionToUpdate = { ...surveyData.questions[qIndex] };
    const updatedOptions = [...questionToUpdate.options];
    updatedOptions[optIndex] = value;
    updateQuestion(qIndex, { ...questionToUpdate, options: updatedOptions });
  };

  const handleAddOption = (qIndex: number) => {
    const questionToUpdate = { ...surveyData.questions[qIndex] };
    if (questionToUpdate.options.length < 5) {
      updateQuestion(qIndex, { ...questionToUpdate, options: [...questionToUpdate.options, ""] });
    } else {
      toast({ title: "Option Limit Reached", description: "Maximum of 5 options allowed.", variant: "default"});
    }
  };

  const handleRemoveOption = (qIndex: number, optIndex: number) => {
    const questionToUpdate = { ...surveyData.questions[qIndex] };
    if (questionToUpdate.options.length > 1) {
      const updatedOptions = questionToUpdate.options.filter((_, i) => i !== optIndex);
      updateQuestion(qIndex, { ...questionToUpdate, options: updatedOptions });
    } else {
       toast({ title: "Minimum Options", description: "At least one option is required.", variant: "default"});
    }
  };
  
  const validateQuestions = (): boolean => {
    if (surveyData.questions.length === 0) {
        toast({ title: "No Questions", description: "Please add at least one question.", variant: "destructive"});
        return false;
    }
    for (const q of surveyData.questions) {
        if (!q.text.trim()) {
            toast({ title: "Incomplete Question", description: `Question "${q.id}" is missing text.`, variant: "destructive"});
            return false;
        }
        if (q.options.length === 0) {
            toast({ title: "No Options", description: `Question "${q.text || q.id}" has no options.`, variant: "destructive"});
            return false;
        }
        for (const opt of q.options) {
            if (!opt.trim()) {
                toast({ title: "Empty Option", description: `Question "${q.text || q.id}" has an empty option.`, variant: "destructive"});
                return false;
            }
        }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateQuestions()) {
        return;
    }
    setCurrentStep(3);
    router.push("/survey/create/preview");
  };

  const handleBack = () => {
    setCurrentStep(1);
    router.push("/survey/create");
  };
  
  const mapContextQuestionToSurveyCardQuestion = (cq: SurveyQuestionContext): SurveyCardQuestion => ({
    id: cq.id,
    text: cq.text || "Preview Question Text...",
    type: cq.type,
    options: cq.options.map(opt => opt || "Option"),
  });

  if (authLoading || (!user && !authLoading)) {
    return <div className="text-center py-10">{authLoading ? "Loading question editor..." : "Redirecting to login..."}</div>;
  }
  
  if (!surveyData.surveyType) {
     return <div className="text-center py-10">Loading configuration...</div>;
  }


  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Create New Survey - Step 2 of 3</CardTitle>
        <CardDescription>
            {surveyData.surveyType === "single-card" ? "Define your single question." : "Add questions to your card deck."}
             All questions are multiple-choice with up to 5 options.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {surveyData.questions.map((question, qIndex) => (
          <Card key={question.id || qIndex} className="p-4 space-y-4 shadow-md">
            <div className="flex justify-between items-center">
              <Label htmlFor={`qtext-${qIndex}`} className="text-lg font-semibold text-primary">
                Question {qIndex + 1}
              </Label>
              {surveyData.surveyType === "card-deck" && surveyData.questions.length > 1 && (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeQuestion(qIndex)} 
                    className="text-destructive hover:text-destructive/80"
                    aria-label="Remove question"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              )}
            </div>
            <Textarea
              id={`qtext-${qIndex}`}
              placeholder="Enter your question text here..."
              value={question.text}
              onChange={(e) => handleQuestionTextChange(qIndex, e.target.value)}
              rows={3}
              className="text-base"
            />
            
            <div className="space-y-3">
              <Label className="text-md font-medium">Options</Label>
              {question.options.map((option, optIndex) => (
                <div key={optIndex} className="flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder={`Option ${optIndex + 1}`}
                    value={option}
                    onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                    className="text-sm"
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleRemoveOption(qIndex, optIndex)}
                    disabled={question.options.length <= 1}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove option"
                  >
                    <XCircle className="h-5 w-5" />
                  </Button>
                </div>
              ))}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleAddOption(qIndex)}
                disabled={question.options.length >= 5}
                className="mt-2"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Option
              </Button>
            </div>

            <div className="mt-6">
              <Label className="text-md font-medium block mb-2 text-center text-muted-foreground">Live Preview (Mobile)</Label>
              <div className="w-full max-w-xs mx-auto bg-muted p-3 rounded-lg shadow-inner">
                 <SurveyCard
                    question={mapContextQuestionToSurveyCardQuestion(question)}
                    questionNumber={1} // Preview is always for a single card context
                    totalQuestions={1}
                    onAnswer={() => {}} 
                    onNext={() => {}} 
                    onPrevious={() => {}}
                    isFirstQuestion={true}
                    isLastQuestion={true}
                  />
              </div>
            </div>
          </Card>
        ))}

        {surveyData.surveyType === "card-deck" && (
          <Button onClick={addQuestion} variant="secondary" className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-5 w-5" /> Add Another Question
          </Button>
        )}
      </CardContent>
      <CardFooter className="flex justify-between mt-8 pt-6 border-t">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Details
          </Button>
          <Button onClick={handleNext} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Next: Preview Survey <ArrowRight className="mr-2 h-4 w-4" />
          </Button>
      </CardFooter>
    </Card>
  );
}
