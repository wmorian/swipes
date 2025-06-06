
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

    if (user && editId && (!surveyData.id || surveyData.id !== editId) && !isLoadingSurveyForEdit) {
      loadSurveyForEditing(editId, user.id).then(success => {
        if (!success) router.push('/dashboard');
      });
    } else if (surveyData.questions.length === 0 || surveyData.questions.some(q => !q.text.trim() || q.options.some(opt => !opt.trim()))) {
        if (!isLoadingSurveyForEdit && !editId) {
            toast({ title: "Incomplete Question", description: "Please ensure your question and options are filled out.", variant: "destructive"});
            router.push(`/survey/create/questions${editId ? `?editId=${editId}` : ''}`);
            return;
        }
    }
    setCurrentStep(2);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, router, surveyData.id, surveyData.questions, setCurrentStep, toast, isFinalizing, isRedirectingAfterFinalize, editId, isLoadingSurveyForEdit, loadSurveyForEditing]);

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
        title: "", // Single-card surveys don't use a main title
        description: finalDescription,
        surveyType: "single-card",
        questions: surveyData.questions,
        questionCount: 1,
        responses: surveyData.responses ?? 0,
        status: statusToSet,
        privacy: 'Public', // Single cards are public
        createdBy: user.id,
        optionCounts: surveyData.optionCounts ??
                      surveyData.questions[0].options.reduce((acc, option) => {
                        acc[option] = 0;
                        return acc;
                      }, {} as Record<string, number>),
        skipCount: surveyData.skipCount ?? 0,
        updatedAt: serverTimestamp(),
    };

    try {
      let finalizedSurveyId = surveyData.id;
      let toastTitle = "";
      let toastDescription = "";

      if (finalizedSurveyId) { // Editing existing draft
        const surveyRef = doc(db, "surveys", finalizedSurveyId);
        await updateDoc(surveyRef, surveyPayload);
        toastTitle = statusToSet === 'Active' ? "Draft Published!" : "Draft Updated!";
        toastDescription = `Your survey card has been ${statusToSet === 'Active' ? 'published' : 'updated'}. ID: ${finalizedSurveyId}`;
      } else { // Creating new survey
        surveyPayload.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, "surveys"), surveyPayload);
        finalizedSurveyId = docRef.id;
        toastTitle = statusToSet === 'Active' ? "Survey Card Published!" : "Survey Card Saved as Draft!";
        toastDescription = `Your single card survey has been ${statusToSet === 'Active' ? 'published' : 'saved'}. ID: ${finalizedSurveyId}`;
      }

      toast({
          title: toastTitle,
          description: toastDescription,
          variant: "default"
      });

      setIsRedirectingAfterFinalize(true);
      resetSurveyCreation();
      router.push(user ? `/dashboard?surveyMsgId=${finalizedSurveyId}` : `/`);
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
    return <div className="text-center py-10">Loading question data or incomplete configuration... <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button></div>;
  }

  const firstQuestion = surveyData.questions[0];
  if (!firstQuestion) {
     return <div className="text-center py-10">Question data not available. Please go back and define a question.</div>;
  }
  const surveyCardQuestion = mapContextQuestionToSurveyCardQuestion(firstQuestion);

  const mainButtonText = surveyData.id ? "Publish Draft" : "Publish";
  const dropdownItemText = surveyData.id ? "Update Draft" : "Save as Draft";

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
          
          <div className="flex items-center">
            <Button
              onClick={() => handleFinalizeSurvey('Active')}
              className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-r-none"
              disabled={isFinalizing || isRedirectingAfterFinalize}
            >
              {isFinalizing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {mainButtonText}
                </>
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="default"
                  size="icon"
                  className="bg-accent hover:bg-accent/80 text-accent-foreground rounded-l-none border-l border-accent-foreground/20 px-2"
                  disabled={isFinalizing || isRedirectingAfterFinalize}
                  aria-label="More finalize options"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleFinalizeSurvey('Draft')}
                  disabled={isFinalizing || isRedirectingAfterFinalize}
                >
                  {dropdownItemText}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardFooter>
    </Card>
  );
}
