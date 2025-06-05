// @/app/survey/[id]/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SurveyCard from '@/components/survey/SurveyCard';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Survey } from '@/types'; 
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

// Mock survey data - replace with actual data fetching
const mockSurveyData: Survey = {
  id: '123',
  title: 'Sample Feedback Survey',
  questionCount: 3,
  responses: 0,
  status: 'Active',
  privacy: 'Public',
  questions: [
    { id: 'q1', text: 'How satisfied are you with our service?', type: 'rating', options: [] },
    { id: 'q2', text: 'What features would you like to see improved?', type: 'text', options: [] },
    { id: 'q3', text: 'Would you recommend us to a friend?', type: 'multiple-choice', options: ['Yes', 'No', 'Maybe'] },
  ]
};


export default function TakeSurveyPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [surveyLoading, setSurveyLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      // Allowing non-logged in users to take public surveys for now.
      // If all surveys must be protected, uncomment:
      // router.push('/login?redirect=/survey/' + surveyId); 
    }
  }, [user, authLoading, router, surveyId]);

  useEffect(() => {
    // In a real app, fetch survey data by surveyId
    if (surveyId) {
      // Simulate fetching survey data
      setTimeout(() => {
        setSurvey(mockSurveyData); 
        setSurveyLoading(false);
      }, 500);
    } else {
      setSurveyLoading(false);
    }
  }, [surveyId]);

  const handleAnswer = (answer: any) => {
    if (survey && survey.questions) {
      const questionId = survey.questions[currentQuestionIndex].id;
      setAnswers(prev => ({ ...prev, [questionId]: answer }));
    }
  };

  const handleNext = () => {
    if (survey && survey.questions && currentQuestionIndex < survey.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      console.log("Final Answers:", answers);
      setSurveyCompleted(true);
      // In a real app, submit answers to backend here
      // If user is logged in, associate answers with user.id
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };
  
  if (authLoading || surveyLoading) {
    return <div className="text-center py-10">Loading survey...</div>;
  }

  // Example: If a survey is 'Invite-Only' and user is not logged in or not invited, show message.
  // This logic would need actual data and potentially more context.
  // For now, we assume public surveys are accessible.
  // if (survey?.privacy === 'Invite-Only' && !user) {
  //   return (
  //     <div className="text-center py-10">
  //       This survey is invite-only. Please <Link href={`/login?redirect=/survey/${surveyId}`}>login</Link> to participate if you have been invited.
  //     </div>
  //   );
  // }


  if (!survey || !survey.questions) {
    return <div className="text-center py-10">Survey not found or failed to load.</div>;
  }

  if (surveyCompleted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
        <Card className="w-full max-w-md text-center shadow-xl p-8">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-primary">Thank You!</CardTitle>
            <CardDescription>Your responses have been recorded.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-6">We appreciate your feedback on the "{survey.title}" survey.</p>
            <Button onClick={() => router.push(user ? '/dashboard' : '/')} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {user ? 'Back to Dashboard' : 'Back to Home'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const currentQuestion = survey.questions[currentQuestionIndex];
  const progressPercentage = ((currentQuestionIndex + 1) / survey.questions.length) * 100;

  return (
    <div className="flex flex-col items-center space-y-8 py-8">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold font-headline text-center text-primary mb-2">{survey.title}</h1>
        <Progress value={progressPercentage} className="w-full h-3 mb-6" />
      </div>
      <SurveyCard
        question={currentQuestion}
        questionNumber={currentQuestionIndex + 1}
        totalQuestions={survey.questions.length}
        onAnswer={handleAnswer}
        onNext={handleNext}
        onPrevious={handlePrevious}
        isFirstQuestion={currentQuestionIndex === 0}
        isLastQuestion={currentQuestionIndex === survey.questions.length - 1}
      />
    </div>
  );
}
