
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
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SurveyCard from "@/components/survey/SurveyCard"; 
import type { Question as SurveyCardQuestion, Survey } from "@/types";
import { ArrowLeft, CheckCircle, ChevronDown } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { db, serverTimestamp } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export default function CreateSurveyPreviewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { surveyData, setCurrentStep, resetSurveyCreation } = useSurveyCreation();
  const { toast } = useToast();
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isRedirectingAfterFinalize, setIsRedirectingAfterFinalize] = useState(false);

  useEffect(() => {
    if (isRedirectingAfterFinalize || isFinalizing) { 
      return;
    }

    if (!authLoading && !user) {
      router.push('/login?redirect=/survey/create/preview');
      return;
    }

    if (surveyData.questions.length === 0 || surveyData.questions.some(q => !q.text.trim() || q.options.some(opt => !opt.trim()))) {
        toast({ title: "Incomplete Question", description: "Please ensure your question and options are filled out.", variant: "destructive"});
        router.push('/survey/create/questions'); 
        return;
    }
    setCurrentStep(2); 
  }, [user, authLoading, router, surveyData, setCurrentStep, toast, isFinalizing, isRedirectingAfterFinalize]);
  
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

    setIsFinalizing(true);

    const finalDescription = surveyData.description || ""; 

    const newSurveyFirestoreData: Omit<Survey, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: any, updatedAt: any } = {
        title: "", 
        description: finalDescription, 
        surveyType: "single-card",
        questions: surveyData.questions,
        questionCount: 1,
        responses: 0,
        status: statusToSet, // Use the passed status
        privacy: 'Public', 
        createdBy: user.id,
        optionCounts: surveyData.questions[0].options.reduce((acc, option) => {
            acc[option] = 0;
            return acc;
        }, {} as Record<string, number>),
        skipCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    try {
      const docRef = await addDoc(collection(db, "surveys"), newSurveyFirestoreData);
      toast({
        title: statusToSet === 'Active' ? "Survey Card Published!" : "Survey Card Saved as Draft!",
        description: `Your single card survey has been ${statusToSet === 'Active' ? 'published' : 'saved'}. ID: ${docRef.id}`,
        variant: "default"
      });
      setIsRedirectingAfterFinalize(true); 
      resetSurveyCreation(); 
      router.push(user ? `/dashboard?newSurveyId=${docRef.id}` : `/`);
    } catch (error) {
      console.error("Error finalizing survey: ", error);
      toast({
        title: statusToSet === 'Active' ? "Publishing Failed" : "Saving Draft Failed",
        description: "Could not finalize your survey card. Please try again.",
        variant: "destructive"
      });
      setIsFinalizing(false); 
    }
  };

  const handleBack = () => {
    setCurrentStep(1); 
    router.push("/survey/create/questions");
  };

  if (authLoading || (!user && !authLoading) || isRedirectingAfterFinalize) {
     return <div className="text-center py-10">{isRedirectingAfterFinalize ? "Redirecting..." : (authLoading ? "Loading preview..." : "Redirecting to login...")}</div>;
  }
   if (surveyData.questions.length === 0) { 
    return <div className="text-center py-10">Loading question data or incomplete configuration...</div>;
  }

  const firstQuestion = surveyData.questions[0];
  const surveyCardQuestion = mapContextQuestionToSurveyCardQuestion(firstQuestion);

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Preview & Finalize</CardTitle>
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
              initialAnswer={undefined} // No initial answer in preview
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
                {isFinalizing ? "Processing..." : "Finalize"}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => handleFinalizeSurvey('Active')} 
                disabled={isFinalizing || isRedirectingAfterFinalize}
              >
                <CheckCircle className="mr-2 h-4 w-4" /> Publish
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleFinalizeSurvey('Draft')} 
                disabled={isFinalizing || isRedirectingAfterFinalize}
              >
                Save as Draft
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
    </Card>
  );
}
