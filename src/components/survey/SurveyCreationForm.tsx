
// @/components/survey/SurveyCreationForm.tsx
"use client";

// This form is being refactored into a multi-step process.
// The core logic will be moved to:
// - /app/survey/create/page.tsx (Step 1: Type & Info)
// - /app/survey/create/questions/page.tsx (Step 2: Add/Edit Questions)
// - /app/survey/create/preview/page.tsx (Step 3: Preview & Publish)

// This component will be either removed or its reusable parts extracted.
// For now, it can serve as a reference until the refactor is complete.
// Or, it can be simplified to just redirect or show a message.

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "../ui/button";

export default function SurveyCreationForm() {
  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Create New Survey</CardTitle>
        <CardDescription>
            The survey creation process has been updated to a multi-step flow for a better mobile experience.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="mb-4">Please start by selecting your survey type.</p>
        <Button asChild>
            <Link href="/survey/create">
                Start Creating Survey
            </Link>
        </Button>
        <p className="text-xs text-muted-foreground mt-6">
            If you were in the middle of creating a survey, please restart the process.
            Your previous unsaved progress on this old form might be lost.
        </p>
      </CardContent>
    </Card>
  );
}
