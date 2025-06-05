
// @/context/SurveyCreationContext.tsx
"use client";

import type { Survey, Question } from '@/types';
import React, { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction, useCallback } from 'react';
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

  const updateStep1Data = useCallback((data: Partial<Pick<SurveyCreationData, 'surveyType' | 'title' | 'description' | 'privacy'>>) => {
    setSurveyData(prev => {
      const newSurveyType = data.surveyType !== undefined ? data.surveyType : prev.surveyType;
      let newQuestions = prev.questions;

      // Handle question array changes when surveyType switches
      if (data.surveyType === 'single-card' && prev.surveyType !== 'single-card') {
        // Switching TO single-card: reset questions to one default
        newQuestions = [{ text: "", type: "multiple-choice", options: [""] }];
      } else if (data.surveyType === 'single-card') {
        // Already single-card: ensure it's just one question (e.g. defensive coding)
        if (newQuestions.length === 0) {
            newQuestions = [{ text: "", type: "multiple-choice", options: [""] }];
        } else if (newQuestions.length > 1) {
            newQuestions = [newQuestions[0]]; // Keep first, or reset: [{ text: "", type: "multiple-choice", options: [""] }];
        }
      } else if (newSurveyType !== 'single-card' && newQuestions.length === 0) {
        // For non-single-card types (like card-deck), ensure at least one question if array is empty
        newQuestions = [{ text: "", type: "multiple-choice", options: [""] }];
      }

      return {
        ...prev,
        ...data, // Applies updates from 'data' (surveyType, title, description, privacy from form)
        questions: newQuestions,
        // Ensure title and privacy are correctly set according to the final surveyType
        title: newSurveyType === 'single-card' ? undefined : (data.title !== undefined ? data.title : prev.title),
        privacy: newSurveyType === 'single-card' ? undefined : (data.privacy !== undefined ? data.privacy : prev.privacy),
      };
    });
  }, [setSurveyData]);

  const addQuestion = useCallback((question: z.infer<typeof questionSchema>) => {
    setSurveyData(prev => {
        if (prev.surveyType === "single-card" && prev.questions.length >= 1) {
            console.warn("Cannot add more than one question to a single-card survey.");
            return prev;
        }
        return {
            ...prev,
            questions: [...prev.questions, question],
        };
    });
  }, [setSurveyData]);

  const updateQuestion = useCallback((index: number, question: z.infer<typeof questionSchema>) => {
    setSurveyData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => (i === index ? question : q)),
    }));
  }, [setSurveyData]);

  const removeQuestion = useCallback((index: number) => {
    setSurveyData(prev => {
        if (prev.surveyType === "single-card") {
            console.warn("Cannot remove the question from a single-card survey.");
            return prev;
        }
        if (prev.questions.length <= 1) {
            console.warn("Survey must have at least one question.");
            return prev;
        }
        return {
            ...prev,
            questions: prev.questions.filter((_, i) => i !== index),
        };
    });
  }, [setSurveyData]);
  
  const resetSurveyCreation = useCallback(() => {
    setSurveyData(defaultSurveyData);
    setCurrentStep(1);
  }, [setSurveyData, setCurrentStep]);

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
