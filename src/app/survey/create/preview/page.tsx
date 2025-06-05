
// @/app/survey/create/preview/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useSurveyCreation } from "@/context/SurveyCreationContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import SurveyCard from "@/components/survey/SurveyCard"; 
import type { Question as SurveyCardQuestion } from "@/types";
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function CreateSurveyPreviewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { surveyData, setCurrentStep, resetSurveyCreation } = useSurveyCreation();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/survey/create/preview');
      return;
    }
    if (!surveyData.surveyType || surveyData.questions.length === 0 || surveyData.questions.some(q => !q.text.trim() || q.options.some(opt => !opt.trim()))) {
        toast({ title: "Incomplete Survey", description: "Please complete previous steps and ensure all questions/options are filled.", variant: "destructive"});
        router.push(surveyData.surveyType ? '/survey/create/questions' : '/survey/create');
        return;
    }
    setCurrentStep(3);
  }, [user, authLoading, router, surveyData, setCurrentStep, toast]);
  
  const mapContextQuestionToSurveyCardQuestion = (cq: typeof surveyData.questions[0]): SurveyCardQuestion => ({
    id: cq.id,
    text: cq.text,
    type: cq.type,
    options: cq.options,
  });

  const handlePublish = async () => {
    // In a real app, this would submit surveyData to the backend
    console.log("Publishing survey:", surveyData);
    toast({
      title: "Survey Published (Simulated)",
      description: `Your survey "${surveyData.title || 'Single Card Survey'}" has been created.`,
      variant: "default"
    });
    // Here you would typically get the ID of the newly created survey from backend
    // For simulation, just log and redirect
    const newSurveyId = `sim-${Date.now()}`; 
    
    resetSurveyCreation(); 
    router.push(user ? `/dashboard?newSurveyId=${newSurveyId}` : `/survey/${newSurveyId}`); // Redirect to dashboard or the new survey page
  };

  const handleBack = () => {
    setCurrentStep(2);
    router.push("/survey/create/questions");
  };

  if (authLoading || (!user && !authLoading)) {
     return <div className="text-center py-10">{authLoading ? "Loading preview..." : "Redirecting to login..."}</div>;
  }
   if (!surveyData.surveyType || surveyData.questions.length === 0) {
    return <div className="text-center py-10">Loading survey data or incomplete configuration...</div>;
  }


  // For single-card or the first card of a deck preview
  const firstQuestion = surveyData.questions[0];
  const surveyCardQuestion = mapContextQuestionToSurveyCardQuestion(firstQuestion);

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Create New Survey - Step 3 of 3: Preview & Publish</CardTitle>
        <CardDescription>
            Review your survey. If it looks good, publish it! The preview below shows the first card (or the single card) and is constrained to a mobile-like width.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center mb-4 p-4 border rounded-lg bg-muted/50">
            <h3 className="text-xl font-semibold text-primary">{surveyData.title || "Single Public Card"}</h3>
            {surveyData.description && <p className="text-sm text-muted-foreground mt-1">{surveyData.description}</p>}
            {surveyData.surveyType === 'card-deck' && surveyData.privacy && (
                <p className="text-xs text-muted-foreground mt-1">Privacy: {surveyData.privacy.charAt(0).toUpperCase() + surveyData.privacy.slice(1)}</p>
            )}
             <p className="text-xs text-muted-foreground mt-1">Type: {surveyData.surveyType === 'single-card' ? 'Single Card' : 'Card Deck'}</p>
             <p className="text-xs text-muted-foreground mt-1">Questions: {surveyData.questions.length}</p>
        </div>

        <div className="w-full max-w-xs sm:max-w-sm mx-auto bg-muted p-4 rounded-lg shadow-inner">
          {surveyCardQuestion ? (
            <SurveyCard
              question={surveyCardQuestion}
              questionNumber={1}
              totalQuestions={surveyData.questions.length} // Show total for context, even if only one is previewed
              onAnswer={() => {}} 
              onNext={() => { alert("This is a static preview. Navigation is disabled.")}} 
              onPrevious={() => {alert("This is a static preview. Navigation is disabled.")}}
              isFirstQuestion={true}
              isLastQuestion={surveyData.questions.length === 1} // Previewing only one card
            />
          ) : (
            <p className="text-center text-destructive">No question available for preview.</p>
          )}
          {surveyData.surveyType === 'card-deck' && surveyData.questions.length > 1 && (
             <p className="text-center text-xs text-muted-foreground mt-3">
                Showing a preview of the first card. Your deck contains {surveyData.questions.length} cards in total.
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center mt-8 pt-6 border-t">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Questions
          </Button>
          <Button onClick={handlePublish} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <CheckCircle className="mr-2 h-4 w-4" /> Publish Survey
          </Button>
        </CardFooter>
    </Card>
  );
}
