
// @/context/SurveyCreationContext.tsx
"use client";

import type { Survey, Question } from '@/types';
import React, { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';
import * as z from "zod";

// Re-define schema parts here or import if sharable and stable
// For simplicity, re-defining relevant parts for context value
const questionSchema = z.object({
  text: z.string().min(5, "Question text must be at least 5 characters."),
  type: z.literal("multiple-choice"),
  options: z.array(z.string().min(1, "Option text cannot be empty."))
    .min(1, "At least one option is required.")
    .max(5, "A maximum of 5 options are allowed."),
});

export const surveyCreationStep1Schema = z.object({
  title: z.string().optional(), // Title is optional for single card
  description: z.string().optional(),
  surveyType: z.enum(["single-card", "card-deck", "add-to-existing"], {
    required_error: "Please select a survey type.",
  }),
  privacy: z.enum(["public", "invite-only"]).optional(),
}).superRefine((data, ctx) => {
  if (data.surveyType === "card-deck") {
    if (!data.title || data.title.length < 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Survey title must be at least 5 characters for Card Decks.",
        path: ["title"],
      });
    }
    if (!data.privacy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Privacy setting is required for Card Decks.",
        path: ["privacy"],
      });
    }
  }
});

export type SurveyCreationData = {
  surveyType?: "single-card" | "card-deck" | "add-to-existing";
  title?: string;
  description?: string;
  privacy?: "public" | "invite-only";
  questions: Array<z.infer<typeof questionSchema>>;
};

interface SurveyCreationContextType {
  surveyData: SurveyCreationData;
  setSurveyData: Dispatch<SetStateAction<SurveyCreationData>>;
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  updateStep1Data: (data: Partial<Pick<SurveyCreationData, 'surveyType' | 'title' | 'description' | 'privacy'>>) => void;
  addQuestion: (question: z.infer<typeof questionSchema>) => void;
  updateQuestion: (index: number, question: z.infer<typeof questionSchema>) => void;
  removeQuestion: (index: number) => void;
  resetSurveyCreation: () => void;
}

const defaultSurveyData: SurveyCreationData = {
  surveyType: undefined,
  title: "",
  description: "",
  privacy: "public",
  questions: [{ text: "", type: "multiple-choice", options: [""] }],
};

const SurveyCreationContext = createContext<SurveyCreationContextType | undefined>(undefined);

export function SurveyCreationProvider({ children }: { children: ReactNode }) {
  const [surveyData, setSurveyData] = useState<SurveyCreationData>(defaultSurveyData);
  const [currentStep, setCurrentStep] = useState(1);

  const updateStep1Data = (data: Partial<Pick<SurveyCreationData, 'surveyType' | 'title' | 'description' | 'privacy'>>) => {
    setSurveyData(prev => ({
      ...prev,
      ...data,
      // Reset questions if type changes to single-card and there's more than one question
      questions: data.surveyType === 'single-card' && prev.questions.length !== 1 
                    ? [{ text: "", type: "multiple-choice", options: [""] }] 
                    : prev.questions,
      // Ensure at least one question if type changes and questions are empty
      questions: (data.surveyType && prev.questions.length === 0)
                    ? [{ text: "", type: "multiple-choice", options: [""] }]
                    : prev.questions,
      // If changing to single-card, clear title (handled by form logic, but good to enforce here too)
      title: data.surveyType === 'single-card' ? undefined : (data.title !== undefined ? data.title : prev.title),
      // If changing to single-card, clear privacy
      privacy: data.surveyType === 'single-card' ? undefined : (data.privacy !== undefined ? data.privacy : prev.privacy),
    }));
  };

  const addQuestion = (question: z.infer<typeof questionSchema>) => {
    if (surveyData.surveyType === "single-card" && surveyData.questions.length >= 1) {
        // Optionally, show a toast or message here
        console.warn("Cannot add more than one question to a single-card survey.");
        return;
    }
    setSurveyData(prev => ({
      ...prev,
      questions: [...prev.questions, question],
    }));
  };

  const updateQuestion = (index: number, question: z.infer<typeof questionSchema>) => {
    setSurveyData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => (i === index ? question : q)),
    }));
  };

  const removeQuestion = (index: number) => {
     if (surveyData.surveyType === "single-card") {
        // Optionally, show a toast or message here
        console.warn("Cannot remove the question from a single-card survey.");
        return;
    }
    if (surveyData.questions.length <= 1) {
        // Optionally, show a toast or message
        console.warn("Survey must have at least one question.");
        return;
    }
    setSurveyData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  };
  
  const resetSurveyCreation = () => {
    setSurveyData(defaultSurveyData);
    setCurrentStep(1);
  };

  return (
    <SurveyCreationContext.Provider value={{ 
        surveyData, 
        setSurveyData, 
        currentStep, 
        setCurrentStep,
        updateStep1Data,
        addQuestion,
        updateQuestion,
        removeQuestion,
        resetSurveyCreation
    }}>
      {children}
    </SurveyCreationContext.Provider>
  );
}

export function useSurveyCreation() {
  const context = useContext(SurveyCreationContext);
  if (context === undefined) {
    throw new Error('useSurveyCreation must be used within a SurveyCreationProvider');
  }
  return context;
}
