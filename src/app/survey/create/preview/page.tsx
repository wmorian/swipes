
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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/survey/create/preview');
      return;
    }
    if (surveyData.surveyType !== "single-card") {
        toast({ title: "Configuration Error", description: "Currently only single card creation is supported. Please restart.", variant: "destructive"});
        router.push('/survey/create');
        return;
    }
    if (surveyData.questions.length === 0 || surveyData.questions.some(q => !q.text.trim() || q.options.some(opt => !opt.trim()))) {
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
    if (!user) {
        toast({ title: "Authentication Error", description: "You must be logged in to publish.", variant: "destructive"});
        return;
    }
    if (surveyData.questions.length === 0 || !surveyData.questions[0]) {
      toast({ title: "No Question", description: "Cannot publish a card without a question.", variant: "destructive" });
      return;
    }

    setIsPublishing(true);

    const newSurveyFirestoreData: Omit<Survey, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: any, updatedAt: any } = {
        title: "", // Single cards don't have titles
        description: surveyData.description || "",
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
      resetSurveyCreation(); 
      router.push(user ? `/dashboard?newSurveyId=${docRef.id}` : `/`); // Redirect to home if not dashboard focus
    } catch (error) {
      console.error("Error publishing survey: ", error);
      toast({
        title: "Publishing Failed",
        description: "Could not publish your survey card. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleBack = () => {
    setCurrentStep(2);
    router.push("/survey/create/questions");
  };

  if (authLoading || (!user && !authLoading)) {
     return <div className="text-center py-10">{authLoading ? "Loading preview..." : "Redirecting to login..."}</div>;
  }
   if (surveyData.surveyType !== "single-card" || surveyData.questions.length === 0) {
    return <div className="text-center py-10">Loading survey data or incomplete configuration...</div>;
  }

  const firstQuestion = surveyData.questions[0];
  const surveyCardQuestion = mapContextQuestionToSurveyCardQuestion(firstQuestion);

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Create New Survey - Step 3 of 3: Preview & Publish</CardTitle>
        <CardDescription>
            Review your single public card. If it looks good, publish it!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center mb-4 p-4 border rounded-lg bg-muted/50">
            <h3 className="text-xl font-semibold text-primary">{"Single Public Card"}</h3>
            {surveyData.description && <p className="text-sm text-muted-foreground mt-1">{surveyData.description}</p>}
             <p className="text-xs text-muted-foreground mt-1">Type: Single Card (Public)</p>
             <p className="text-xs text-muted-foreground mt-1">Questions: 1</p>
        </div>

        <div className="w-full max-w-xs sm:max-w-sm mx-auto bg-muted p-4 rounded-lg shadow-inner">
          {surveyCardQuestion ? (
            <SurveyCard
              question={surveyCardQuestion}
              questionNumber={1}
              totalQuestions={1} 
              onAnswer={() => {}} 
              onNext={() => { alert("This is a static preview. Navigation is disabled.")}} 
              onPrevious={() => {alert("This is a static preview. Navigation is disabled.")}}
              isFirstQuestion={true}
              isLastQuestion={true}
            />
          ) : (
            <p className="text-center text-destructive">No question available for preview.</p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center mt-8 pt-6 border-t">
          <Button variant="outline" onClick={handleBack} disabled={isPublishing}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Question
          </Button>
          <Button onClick={handlePublish} className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isPublishing}>
            {isPublishing ? "Publishing..." : <><CheckCircle className="mr-2 h-4 w-4" /> Publish Card</>}
          </Button>
        </CardFooter>
    </Card>
  );
}
