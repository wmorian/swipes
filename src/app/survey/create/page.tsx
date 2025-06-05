// @/app/survey/create/page.tsx
import SurveyCreationForm from "@/components/survey/SurveyCreationForm";
import { Suspense } from "react";

export default function CreateSurveyPage() {
  return (
    <div className="py-8">
      <Suspense fallback={<div>Loading form...</div>}>
         <SurveyCreationForm />
      </Suspense>
    </div>
  );
}
