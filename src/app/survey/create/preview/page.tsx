
// @/app/survey/create/preview/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSurveyCreation } from "@/context/SurveyCreationContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import SurveyCard from "@/components/survey/SurveyCard"; 
import type { Question as SurveyCardQuestion, Survey } from "@/types";
import { ArrowLeft, CheckCircle, ChevronDown, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { db, serverTimestamp } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";

export default function CreateSurveyPreviewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { surveyData, setCurrentStep, resetSurveyCreation, isLoadingSurveyForEdit, loadSurveyForEditing } = useSurveyCreation();
  const { toast } = useToast();
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isRedirectingAfterFinalize, setIsRedirectingAfterFinalize] = useState(false);
  const editId = searchParams.get('editId');


  useEffect(() => {
    if (isRedirectingAfterFinalize || isFinalizing) { 
      return;
    }

    if (!authLoading && !user) {
      router.push(`/login?redirect=/survey/create/preview${editId ? `?editId=${editId}` : ''}`);
      return;
    }
    
    // If editing, and data isn't loaded for this editId, attempt to load it.
    // This is a fallback in case the user lands here directly via URL with editId
    if (user && editId && (!surveyData.id || surveyData.id !== editId) && !isLoadingSurveyForEdit) {
      loadSurveyForEditing(editId, user.id).then(success => {
        if (!success) router.push('/dashboard'); // Or show error
      });
    } else if (surveyData.questions.length === 0 || surveyData.questions.some(q => !q.text.trim() || q.options.some(opt => !opt.trim()))) {
        if (!isLoadingSurveyForEdit && !editId) { // Only redirect if not loading an edit and not in edit mode
            toast({ title: "Incomplete Question", description: "Please ensure your question and options are filled out.", variant: "destructive"});
            router.push('/survey/create/questions'); 
            return;
        }
    }
    setCurrentStep(2); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, router, surveyData, setCurrentStep, toast, isFinalizing, isRedirectingAfterFinalize, editId, isLoadingSurveyForEdit, loadSurveyForEditing]);
  
  const mapContextQuestionToSurveyCardQuestion = (cq: typeof surveyData.questions[0]): SurveyCardQuestion => ({
    id: cq.id,
    text: cq.text,
    type: cq.type, 
    options: cq.options,
  });

  const handleFinalizeSurvey = async (statusToSet: 'Active' | 'Draft') => {
    if (!user) {
        toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive"});
        return;
    }
    if (surveyData.questions.length === 0 || !surveyData.questions[0]) {
      toast({ title: "No Question", description: "Cannot finalize a card without a question.", variant: "destructive" });
      return;
    }
    if (surveyData.questions.some(q => !q.text.trim() || q.options.some(opt => !opt.trim()))) {
      toast({ title: "Incomplete Question", description: "Please ensure your question and options are filled out.", variant: "destructive"});
      router.push(`/survey/create/questions${editId ? `?editId=${editId}` : ''}`);
      return;
    }


    setIsFinalizing(true);

    const finalDescription = surveyData.description || ""; 

    const surveyPayload: Omit<Survey, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: any, updatedAt: any } = {
        title: "", 
        description: finalDescription, 
        surveyType: "single-card",
        questions: surveyData.questions,
        questionCount: 1,
        responses: surveyData.id ? (surveyData as Survey).responses : 0, // Keep existing responses if editing, else 0
        status: statusToSet, 
        privacy: 'Public', 
        createdBy: user.id,
        optionCounts: surveyData.id 
          ? (surveyData as Survey).optionCounts // Keep existing counts if editing
          : surveyData.questions[0].options.reduce((acc, option) => { // Initialize for new
              acc[option] = 0;
              return acc;
            }, {} as Record<string, number>),
        skipCount: surveyData.id ? (surveyData as Survey).skipCount : 0, // Keep existing if editing, else 0
        updatedAt: serverTimestamp(),
    };

    try {
      let finalizedSurveyId = surveyData.id; // Use existing ID if editing

      if (finalizedSurveyId) { // Editing existing draft
        const surveyRef = doc(db, "surveys", finalizedSurveyId);
        await updateDoc(surveyRef, surveyPayload);
        toast({
          title: statusToSet === 'Active' ? "Survey Card Published!" : "Draft Updated!",
          description: `Your survey card has been ${statusToSet === 'Active' ? 'published' : 'updated'}. ID: ${finalizedSurveyId}`,
          variant: "default"
        });
      } else { // Creating new survey
        surveyPayload.createdAt = serverTimestamp(); // Set createdAt only for new surveys
        const docRef = await addDoc(collection(db, "surveys"), surveyPayload);
        finalizedSurveyId = docRef.id;
        toast({
          title: statusToSet === 'Active' ? "Survey Card Published!" : "Survey Card Saved as Draft!",
          description: `Your single card survey has been ${statusToSet === 'Active' ? 'published' : 'saved'}. ID: ${finalizedSurveyId}`,
          variant: "default"
        });
      }
      
      setIsRedirectingAfterFinalize(true); 
      resetSurveyCreation(); 
      router.push(user ? `/dashboard?surveyMsgId=${finalizedSurveyId}` : `/`); // Use a generic param like surveyMsgId
    } catch (error) {
      console.error("Error finalizing survey: ", error);
      toast({
        title: statusToSet === 'Active' ? "Publishing Failed" : (surveyData.id ? "Update Failed" : "Saving Draft Failed"),
        description: "Could not finalize your survey card. Please try again.",
        variant: "destructive"
      });
      setIsFinalizing(false); 
    }
  };

  const handleBack = () => {
    setCurrentStep(1); 
    router.push(`/survey/create/questions${editId ? `?editId=${editId}` : ''}`);
  };

  if (authLoading || (!user && !authLoading) || isRedirectingAfterFinalize) {
     return <div className="text-center py-10">{isRedirectingAfterFinalize ? "Redirecting..." : (authLoading ? "Loading preview..." : "Redirecting to login...")}</div>;
  }

  if (isLoadingSurveyForEdit) {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading survey data...</p>
      </div>
    );
  }

   if (surveyData.questions.length === 0) { 
    // This might happen if directly navigating here with an invalid editId or data failed to load silently
    return <div className="text-center py-10">Loading question data or incomplete configuration... <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button></div>;
  }

  const firstQuestion = surveyData.questions[0];
  if (!firstQuestion) {
     return <div className="text-center py-10">Question data not available. Please go back and define a question.</div>;
  }
  const surveyCardQuestion = mapContextQuestionToSurveyCardQuestion(firstQuestion);

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">{surveyData.id ? "Preview & Update Draft" : "Preview & Finalize"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        <div className="w-full max-w-xs sm:max-w-sm mx-auto bg-muted p-4 rounded-lg shadow-inner">
          {surveyCardQuestion ? (
            <SurveyCard
              question={surveyCardQuestion}
              questionNumber={1}
              totalQuestions={1} 
              onNext={() => { /* Preview mode, no actual submission */ }} 
              onSkip={() => { /* Preview mode, no actual submission */ }}
              isLastQuestion={true}
              initialAnswer={undefined} 
            />
          ) : (
            <p className="text-center text-destructive">No question available for preview.</p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center mt-8 pt-6 border-t">
          <Button variant="outline" onClick={handleBack} disabled={isFinalizing}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isFinalizing || isRedirectingAfterFinalize}>
                {isFinalizing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : (surveyData.id ? "Update Options" : "Finalize")}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => handleFinalizeSurvey('Active')} 
                disabled={isFinalizing || isRedirectingAfterFinalize}
              >
                <CheckCircle className="mr-2 h-4 w-4" /> {surveyData.id ? "Publish Draft" : "Publish"}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleFinalizeSurvey('Draft')} 
                disabled={isFinalizing || isRedirectingAfterFinalize}
              >
                {surveyData.id ? "Update Draft" : "Save as Draft"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
    </Card>
  );
}
