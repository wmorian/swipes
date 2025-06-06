// @/app/survey/[id]/stats/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SurveyStatsDisplay from '@/components/survey/SurveyStatsDisplay';
import type { Survey, Answer, Question } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { db, type Timestamp } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function SurveyStatsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const surveyId = params.id as string;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]); // Transformed from survey.optionCounts
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
          const surveyRef = doc(db, "surveys", surveyId);
          const surveySnap = await getDoc(surveyRef);

          if (surveySnap.exists()) {
            const fetchedSurveyData = surveySnap.data() as Omit<Survey, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: Timestamp, updatedAt: Timestamp };
            
            if (fetchedSurveyData.createdBy !== user.id) {
              setAccessDenied(true);
              setSurvey(null);
              setDataLoading(false);
              return;
            }
            
            const processedSurvey: Survey = {
              id: surveySnap.id,
              ...fetchedSurveyData,
              createdAt: fetchedSurveyData.createdAt.toDate(),
              updatedAt: fetchedSurveyData.updatedAt.toDate(),
            };
            setSurvey(processedSurvey);

            // Transform optionCounts into Answer[] for SurveyStatsDisplay
            let transformedAnswers: Answer[] = [];
            if (processedSurvey.questions && processedSurvey.questions.length > 0 && processedSurvey.optionCounts) {
              const firstQuestion = processedSurvey.questions[0]; // Assuming single-card survey structure for now
              if (firstQuestion && (firstQuestion.type === 'multiple-choice' || firstQuestion.type === 'rating')) {
                Object.entries(processedSurvey.optionCounts).forEach(([optionValue, count]) => {
                  for (let i = 0; i < count; i++) {
                    transformedAnswers.push({ questionId: firstQuestion.id, value: optionValue });
                  }
                });
              }
            }
            setAnswers(transformedAnswers);

          } else {
            setSurvey(null); // Survey not found
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
      setDataLoading(false); // Not logged in, no data to load
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
