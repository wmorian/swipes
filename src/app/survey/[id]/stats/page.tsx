// @/app/survey/[id]/stats/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import SurveyStatsDisplay from '@/components/survey/SurveyStatsDisplay';
import type { Survey, Answer, Question } from '@/types';

// Mock data
const mockSurveyData: Survey = {
  id: '123',
  title: 'Sample Feedback Survey',
  questionCount: 3,
  responses: 5, // Let's assume 5 responses
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
  const params = useParams();
  const surveyId = params.id as string;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);

  useEffect(() => {
    // In a real app, fetch survey and answers data by surveyId
    if (surveyId) {
      setSurvey(mockSurveyData); 
      setAnswers(mockAnswersData.filter(ans => mockSurveyData.questions?.some(q => q.id === ans.questionId)));
    }
  }, [surveyId]);

  if (!survey) {
    return <div className="text-center py-10">Loading survey statistics...</div>;
  }

  return (
    <div className="py-8">
      <SurveyStatsDisplay survey={survey} answers={answers} />
    </div>
  );
}
