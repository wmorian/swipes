
// @/app/survey/create/preview/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSurveyCreation } from "@/context/SurveyCreationContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import SurveyCard from "@/components/survey/SurveyCard"; // To show the preview
import { ArrowLeft, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CreateSurveyPreviewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { surveyData, setCurrentStep, resetSurveyCreation } = useSurveyCreation();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/survey/create/preview');
    }
    if (!surveyData.surveyType || surveyData.questions.length === 0) {
        // Redirect to first or second step if data is incomplete
        toast({ title: "Incomplete Survey", description: "Please complete previous steps.", variant: "destructive"});
        router.push('/survey/create');
    }
    setCurrentStep(3);
  }, [user, authLoading, router, surveyData, setCurrentStep, toast]);

  const handlePublish = async () => {
    // In a real app, this would submit surveyData to the backend
    console.log("Publishing survey:", surveyData);
    toast({
      title: "Survey Published (Simulated)",
      description: `Your survey "${surveyData.title || 'Single Card'}" has been created.`,
    });
    resetSurveyCreation(); // Clear context
    router.push("/dashboard"); 
  };

  const handleBack = () => {
    setCurrentStep(2);
    router.push("/survey/create/questions");
  };

  if (authLoading || !user || !surveyData.surveyType || surveyData.questions.length === 0) {
    return <div className="text-center py-10">Loading preview...</div>;
  }

  // For single-card or the first card of a deck
  const firstQuestion = surveyData.questions[0];

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Create New Survey - Step 3 of 3: Preview</CardTitle>
        <CardDescription>
            Review your survey. If it looks good, publish it! The preview below is constrained to a mobile-like width.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-primary">{surveyData.title || "Single Public Card"}</h3>
            {surveyData.description && <p className="text-sm text-muted-foreground mt-1">{surveyData.description}</p>}
            {surveyData.surveyType === 'card-deck' && surveyData.privacy && (
                <p className="text-xs text-muted-foreground mt-1">Privacy: {surveyData.privacy}</p>
            )}
        </div>

        <div className="w-full max-w-xs sm:max-w-sm mx-auto bg-muted p-4 rounded-lg">
          {firstQuestion ? (
            <SurveyCard
              question={firstQuestion}
              questionNumber={1}
              totalQuestions={surveyData.questions.length}
              onAnswer={() => {}} // No-op for preview
              onNext={() => { alert("This is a preview. 'Next' is disabled.")}} // No-op
              onPrevious={() => {alert("This is a preview. 'Previous' is disabled.")}} // No-op
              isFirstQuestion={true}
              isLastQuestion={surveyData.questions.length === 1}
            />
          ) : (
            <p className="text-center text-destructive">No question available for preview.</p>
          )}
          {surveyData.surveyType === 'card-deck' && surveyData.questions.length > 1 && (
             <p className="text-center text-xs text-muted-foreground mt-2">
                Showing first card. Full deck preview with navigation will be available. (Currently shows 1 card)
            </p>
          )}
        </div>
        

        <div className="flex justify-between items-center mt-8 pt-6 border-t">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Questions
          </Button>
          <Button onClick={handlePublish} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <CheckCircle className="mr-2 h-4 w-4" /> Publish Survey
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
