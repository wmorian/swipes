// @/app/survey/[id]/stats/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SurveyStatsDisplay from '@/components/survey/SurveyStatsDisplay';
import type { Survey, Answer } from '@/types'; // Removed Question as it's part of Survey
import { useAuth } from '@/context/AuthContext';
import { surveyService } from '@/services/surveyService'; // Import surveyService
import { Loader2, ShieldAlert } from 'lucide-react';

export default function SurveyStatsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const surveyId = params.id as string;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]); 
  const [dataLoading, setDataLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?redirect=/survey/${surveyId}/stats`);
    }
  }, [user, authLoading, router, surveyId]);
  
  useEffect(() => {
    if (user && surveyId) {
      const fetchSurveyStats = async () => {
        setDataLoading(true);
        setAccessDenied(false);
        try {
          const fetchedSurvey = await surveyService.fetchSurveyById(surveyId);

          if (fetchedSurvey) {
            if (fetchedSurvey.createdBy !== user.id) {
              setAccessDenied(true);
              setSurvey(null);
              setDataLoading(false);
              return;
            }
            
            setSurvey(fetchedSurvey);

            let transformedAnswers: Answer[] = [];
            if (fetchedSurvey.questions && fetchedSurvey.questions.length > 0 && fetchedSurvey.optionCounts) {
              const firstQuestion = fetchedSurvey.questions[0]; 
              if (firstQuestion && (firstQuestion.type === 'multiple-choice' || firstQuestion.type === 'rating')) {
                Object.entries(fetchedSurvey.optionCounts).forEach(([optionValue, count]) => {
                  for (let i = 0; i < count; i++) {
                    transformedAnswers.push({ questionId: firstQuestion.id, value: optionValue });
                  }
                });
              }
            }
            setAnswers(transformedAnswers);

          } else {
            setSurvey(null); 
          }
        } catch (error) {
          console.error("Error fetching survey statistics:", error);
          setSurvey(null);
        } finally {
          setDataLoading(false);
        }
      };
      fetchSurveyStats();
    } else if (!authLoading && !user) {
      setDataLoading(false); 
    }
  }, [surveyId, user, authLoading]);

  if (authLoading || (user && dataLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading survey statistics...</p>
      </div>
    );
  }

  if (!user && !authLoading) {
     return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
            <ShieldAlert className="h-12 w-12 text-destructive" />
            <p className="mt-4 text-lg text-center">Redirecting to login...</p>
        </div>
     );
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground mt-2">You do not have permission to view these statistics.</p>
        <button onClick={() => router.push('/dashboard')} className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          Go to Dashboard
        </button>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive">Survey Not Found</h1>
        <p className="text-muted-foreground mt-2">The requested survey statistics could not be found or loaded.</p>
         <button onClick={() => router.push('/dashboard')} className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="py-8">
      <SurveyStatsDisplay survey={survey} answers={answers} />
    </div>
  );
}
