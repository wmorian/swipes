// This file is no longer needed as the survey creation flow
// now starts directly at /survey/create/questions for single cards.
// It can be deleted.
// If you try to navigate here, you should be redirected or see an error.
// For a cleaner setup, ensure no links point to /survey/create directly.
// The layout file /app/survey/create/layout.tsx still correctly wraps 
// /questions and /preview.

export default function ObsoleteCreateSurveyPage() {
  // Optionally, redirect users if they somehow land here.
  // import { redirect } from 'next/navigation';
  // redirect('/survey/create/questions'); 
  // For now, just returning null or a message.
  return (
    <div className="text-center py-10">
      <p>This page is no longer in use.</p>
      <p>Survey creation now starts at the questions step.</p>
    </div>
  );
}
