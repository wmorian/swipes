
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
import { useEffect } from "react";
import { ArrowLeft, ArrowRight, PlusCircle, XCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function CreateSurveyQuestionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { surveyData, setCurrentStep, updateQuestion, setSurveyData } = useSurveyCreation();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/survey/create/questions');
      return;
    }
    // Ensure surveyData is correctly initialized for single-card if not already
    if (surveyData.surveyType !== "single-card" || surveyData.questions.length === 0) {
      setSurveyData(prev => ({
        ...prev,
        surveyType: "single-card",
        title: "",
        description: prev.description || "", 
        privacy: "Public",
        questions: prev.questions.length > 0 && prev.questions[0].type === "multiple-choice" ? [prev.questions[0]] : [{
          id: `q_${new Date().getTime()}_${Math.random().toString(36).substring(2, 7)}`,
          text: "",
          type: "multiple-choice",
          options: ["", ""] // Default to two empty options
        }]
      }));
    }
    setCurrentStep(1); // This is now Step 1
  }, [user, authLoading, router, setCurrentStep, surveyData.surveyType, surveyData.questions, setSurveyData]);

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
        toast({ title: "No Question", description: "Please define your question.", variant: "destructive"});
        return false;
    }
    const q = surveyData.questions[0]; // For single-card, always the first question
    if (!q.text.trim()) {
        toast({ title: "Incomplete Question", description: `Question text is missing.`, variant: "destructive"});
        return false;
    }
    if (q.options.length === 0) {
        toast({ title: "No Options", description: `Question "${q.text || q.id.substring(0,10)}" has no options.`, variant: "destructive"});
        return false;
    }
    for (const opt of q.options) {
        if (!opt.trim()) {
            toast({ title: "Empty Option", description: `Question "${q.text || q.id.substring(0,10)}" has an empty option.`, variant: "destructive"});
            return false;
        }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateQuestions()) {
        return;
    }
    setCurrentStep(2); // Proceed to Step 2 (Preview)
    router.push("/survey/create/preview");
  };

  const handleBack = () => {
    // Navigate back to dashboard as Step 1 (details) is removed
    router.push("/dashboard"); 
  };
  
  if (authLoading || (!user && !authLoading)) {
    return <div className="text-center py-10">{authLoading ? "Loading question editor..." : "Redirecting to login..."}</div>;
  }
  
  if (surveyData.questions.length === 0) {
     return <div className="text-center py-10">Initializing question editor...</div>;
  }

  // For single card, we always edit the first (and only) question.
  const question = surveyData.questions[0];
  const qIndex = 0;

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Create New Survey Card - Step 1 of 2</CardTitle>
        <CardDescription>
            Define your single question. All questions are multiple-choice with up to 5 options.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
          <Card key={question.id || qIndex} className="p-4 space-y-4 shadow-md w-full max-w-xs sm:max-w-sm mx-auto">
            <div className="flex justify-between items-center">
              <Label htmlFor={`qtext-${qIndex}`} className="text-lg font-semibold text-primary">
                Your Question
              </Label>
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
                    aria-label="Remove option"
                  >
                    <XCircle className="h-5 w-5 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleAddOption(qIndex)}
                disabled={question.options.length >= 5}
                className="mt-2 w-full" 
              >
                <PlusCircle className="mr-2 h-4 w-4 text-accent" /> Add Option
              </Button>
            </div>
          </Card>
      </CardContent>
      <CardFooter className="flex justify-between mt-8 pt-6 border-t">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Dashboard</span><span className="md:hidden">Back</span>
          </Button>
          <Button onClick={handleNext} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <span className="hidden md:inline">Preview</span><span className="md:hidden">Next</span> <ArrowRight className="ml-2 h-4 w-4 md:ml-2" />
          </Button>
      </CardFooter>
    </Card>
  );
}

