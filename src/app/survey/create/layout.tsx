
// @/app/survey/create/layout.tsx
import { SurveyCreationProvider } from '@/context/SurveyCreationContext';
import type { ReactNode } from 'react';

export default function CreateSurveyLayout({ children }: { children: ReactNode }) {
  return (
    <SurveyCreationProvider>
      <div className="py-8">
        {children}
      </div>
    </SurveyCreationProvider>
  );
}
