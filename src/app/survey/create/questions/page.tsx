
// @/app/survey/create/questions/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useSurveyCreation, type SurveyQuestionContext } from "@/context/SurveyCreationContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft, ArrowRight, PlusCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function CreateSurveyQuestionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { 
    surveyData, 
    setCurrentStep, 
    updateQuestion, 
    setSurveyData, 
    resetSurveyCreation,
    isLoadingSurveyForEdit,
    loadSurveyForEditing 
  } = useSurveyCreation();
  const { toast } = useToast();
  const editId = searchParams.get('editId');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?redirect=/survey/create/questions${editId ? `?editId=${editId}` : ''}`);
      return;
    }

    if (editId) {
      // If there's an editId and surveyData is not for this id or not loaded yet, and not currently loading
      if (user && (!surveyData.id || surveyData.id !== editId) && !isLoadingSurveyForEdit) {
        loadSurveyForEditing(editId, user.id).then(success => {
          if (!success) {
            // If loading failed (e.g., permissions, not found), redirect or show error
            router.push('/dashboard'); // Or a more specific error page
          }
        });
      }
    } else {
      // If not editing, and surveyData has an ID (meaning it was for an old edit session)
      // or if it's not initialized for single-card, reset it.
      if (surveyData.id || surveyData.surveyType !== "single-card" || surveyData.questions.length === 0) {
         // Only reset if not currently loading an edit. Prevents wiping state if navigating away and back quickly.
        if(!isLoadingSurveyForEdit) {
            resetSurveyCreation(); // Resets to a new blank single-card survey
        }
      }
    }
    setCurrentStep(1); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, router, editId, isLoadingSurveyForEdit, surveyData.id, loadSurveyForEditing, resetSurveyCreation, setCurrentStep]);


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
    const q = surveyData.questions[0]; 
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
    setCurrentStep(2); 
    router.push(`/survey/create/preview${editId ? `?editId=${editId}` : ''}`);
  };

  const handleBack = () => {
    resetSurveyCreation(); // Clear any draft data if going back
    router.push("/dashboard"); 
  };
  
  if (authLoading || (!user && !authLoading)) {
    return <div className="text-center py-10">{authLoading ? "Loading question editor..." : "Redirecting to login..."}</div>;
  }

  if (isLoadingSurveyForEdit) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading survey for editing...</p>
      </div>
    );
  }
  
  if (surveyData.questions.length === 0 && !editId) { // Ensure there's a question if not loading an edit
     return <div className="text-center py-10">Initializing question editor...</div>;
  }
  // If editId is present but questions are still empty, it means loading might still be in progress or failed silently, rely on isLoadingSurveyForEdit
  if (editId && surveyData.questions.length === 0 && !isLoadingSurveyForEdit && (!surveyData.id || surveyData.id !== editId)) {
    return <div className="text-center py-10">Error: Could not load survey data for editing. Please try again or go back to dashboard.</div>;
  }


  const question = surveyData.questions[0]; // For single card, always the first (and only) question.
  const qIndex = 0;

  if (!question) { // Safety check, though above logic should prevent this
    return <div className="text-center py-10">Error: Question data not available.</div>;
  }


  return (
    <Card key={question.id || qIndex} className="p-4 space-y-4 shadow-xl w-full max-w-3xl sm:max-w-sm mx-auto">
      <div className="flex justify-between items-center">
        <Label htmlFor={`qtext-${qIndex}`} className="text-lg font-semibold text-primary">
          {editId ? "Edit Your Question" : "Your Question"}
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
