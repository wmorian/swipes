// @/app/survey/create/preview/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useSurveyCreation } from "@/context/SurveyCreationContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SurveyCard from "@/components/survey/SurveyCard"; 
import type { Question as SurveyCardQuestion, Survey } from "@/types";
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { db, serverTimestamp } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export default function CreateSurveyPreviewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { surveyData, setCurrentStep, resetSurveyCreation } = useSurveyCreation();
  const { toast } = useToast();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRedirectingAfterPublish, setIsRedirectingAfterPublish] = useState(false);

  useEffect(() => {
    if (isRedirectingAfterPublish || isPublishing) { 
      return;
    }

    if (!authLoading && !user) {
      router.push('/login?redirect=/survey/create/preview');
      return;
    }

    // Since Step 1 (details) is removed, surveyType is always "single-card" by context default.
    // Description is also handled by context default ("").
    if (surveyData.questions.length === 0 || surveyData.questions.some(q => !q.text.trim() || q.options.some(opt => !opt.trim()))) {
        toast({ title: "Incomplete Question", description: "Please ensure your question and options are filled out.", variant: "destructive"});
        router.push('/survey/create/questions'); // Go back to questions (new Step 1)
        return;
    }
    setCurrentStep(2); // This is now Step 2
  }, [user, authLoading, router, surveyData, setCurrentStep, toast, isPublishing, isRedirectingAfterPublish]);
  
  const mapContextQuestionToSurveyCardQuestion = (cq: typeof surveyData.questions[0]): SurveyCardQuestion => ({
    id: cq.id,
    text: cq.text,
    type: cq.type, 
    options: cq.options,
  });

  const handlePublish = async () => {
    if (!user) {
        toast({ title: "Authentication Error", description: "You must be logged in to publish.", variant: "destructive"});
        return;
    }
    if (surveyData.questions.length === 0 || !surveyData.questions[0]) {
      toast({ title: "No Question", description: "Cannot publish a card without a question.", variant: "destructive" });
      return;
    }

    setIsPublishing(true);

    // Ensure these defaults for single-card, even if context might have them.
    const finalDescription = surveyData.description || ""; // Use context description or default to empty.

    const newSurveyFirestoreData: Omit<Survey, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: any, updatedAt: any } = {
        title: "", // Single cards don't have titles in UI
        description: finalDescription, // Use the description from context (which defaults to "")
        surveyType: "single-card",
        questions: surveyData.questions,
        questionCount: 1,
        responses: 0,
        status: 'Active',
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
        title: "Survey Card Published!",
        description: `Your single card survey has been created. ID: ${docRef.id}`,
        variant: "default"
      });
      setIsRedirectingAfterPublish(true); 
      resetSurveyCreation(); 
      router.push(user ? `/dashboard?newSurveyId=${docRef.id}` : `/`);
    } catch (error) {
      console.error("Error publishing survey: ", error);
      toast({
        title: "Publishing Failed",
        description: "Could not publish your survey card. Please try again.",
        variant: "destructive"
      });
      setIsPublishing(false); 
    }
  };

  const handleBack = () => {
    setCurrentStep(1); // Go back to Step 1 (Questions page)
    router.push("/survey/create/questions");
  };

  if (authLoading || (!user && !authLoading) || isRedirectingAfterPublish) {
     return <div className="text-center py-10">{isRedirectingAfterPublish ? "Redirecting..." : (authLoading ? "Loading preview..." : "Redirecting to login...")}</div>;
  }
   if (surveyData.questions.length === 0) { // surveyType is always single-card
    return <div className="text-center py-10">Loading question data or incomplete configuration...</div>;
  }

  const firstQuestion = surveyData.questions[0];
  const surveyCardQuestion = mapContextQuestionToSurveyCardQuestion(firstQuestion);

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Preview & Publish</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        <div className="w-full max-w-xs sm:max-w-sm mx-auto bg-muted p-4 rounded-lg shadow-inner">
          {surveyCardQuestion ? (
            <SurveyCard
              question={surveyCardQuestion}
              questionNumber={1}
              totalQuestions={1} 
              onNext={() => { alert("This is a static preview. Navigation is disabled.")}} 
              onSkip={() => { alert("This is a static preview. Navigation is disabled.")}}
              isLastQuestion={true}
            />
          ) : (
            <p className="text-center text-destructive">No question available for preview.</p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center mt-8 pt-6 border-t">
          <Button variant="outline" onClick={handleBack} disabled={isPublishing}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button onClick={handlePublish} className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isPublishing || isRedirectingAfterPublish}>
            {isPublishing || isRedirectingAfterPublish ? "Publishing..." : <><CheckCircle className="mr-2 h-4 w-4" /> Publish</>}
          </Button>
        </CardFooter>
    </Card>
  );
}
