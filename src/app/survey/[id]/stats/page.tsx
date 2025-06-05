// @/app/survey/[id]/stats/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SurveyStatsDisplay from '@/components/survey/SurveyStatsDisplay';
import type { Survey, Answer } from '@/types';
import { useAuth } from '@/context/AuthContext';

// Mock data
const mockSurveyData: Survey = {
  id: '123',
  title: 'Sample Feedback Survey',
  questionCount: 3,
  responses: 5, 
  status: 'Active',
  privacy: 'Public',
  questions: [
    { id: 'q1', text: 'How satisfied are you with our service?', type: 'rating', options: [] },
    { id: 'q2', text: 'What features would you like to see improved?', type: 'text', options: [] },
    { id: 'q3', text: 'Would you recommend us to a friend?', type: 'multiple-choice', options: ['Yes', 'No', 'Maybe'] },
  ]
};

const mockAnswersData: Answer[] = [
  { questionId: 'q1', value: 5 }, { questionId: 'q1', value: 4 }, { questionId: 'q1', value: 5 }, { questionId: 'q1', value: 3 }, { questionId: 'q1', value: 4 },
  { questionId: 'q2', value: 'Faster loading times.' }, { questionId: 'q2', value: 'More customization options.' }, { questionId: 'q2', value: 'Better mobile support.' }, { questionId: 'q2', value: 'Nothing, it is great!' }, { questionId: 'q2', value: 'Integrations with other tools' },
  { questionId: 'q3', value: 'Yes' }, { questionId: 'q3', value: 'Yes' }, { questionId: 'q3', value: 'No' }, { questionId: 'q3', value: 'Maybe' }, { questionId: 'q3', value: 'Yes' },
];


export default function SurveyStatsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const surveyId = params.id as string;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?redirect=/survey/${surveyId}/stats`);
    }
  }, [user, authLoading, router, surveyId]);
  
  useEffect(() => {
    if (user && surveyId) { // Only fetch data if user is logged in
      // In a real app, fetch survey and answers data by surveyId
      // Ensure only authorized users can see stats (e.g., survey owner)
      setTimeout(() => { // Simulate API call
        setSurvey(mockSurveyData); 
        setAnswers(mockAnswersData.filter(ans => mockSurveyData.questions?.some(q => q.id === ans.questionId)));
        setDataLoading(false);
      }, 500);
    } else if (!authLoading && !user) {
      // If not logged in and auth is resolved, no need to load data
      setDataLoading(false);
    }
  }, [surveyId, user, authLoading]);

  if (authLoading || (user && dataLoading)) { // Show loading if auth is loading OR (user exists AND data is loading)
    return <div className="text-center py-10">Loading survey statistics...</div>;
  }

  if (!user) {
     return <div className="text-center py-10">Redirecting to login...</div>;
  }

  if (!survey) {
    return <div className="text-center py-10">Survey statistics not found or you do not have permission to view them.</div>;
  }

  return (
    <div className="py-8">
      <SurveyStatsDisplay survey={survey} answers={answers} />
    </div>
  );
}
