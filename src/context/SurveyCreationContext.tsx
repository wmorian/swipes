// @/context/SurveyCreationContext.tsx
"use client";

import type { Survey, Question } from '@/types';
import React, { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction, useCallback } from 'react';
import * as z from "zod";

const questionSchema = z.object({
  id: z.string().default(() => `q_${new Date().getTime()}_${Math.random().toString(36).substring(2, 7)}`), 
  text: z.string().min(1, "Question text cannot be empty."), 
  type: z.literal("multiple-choice"),
  options: z.array(z.string().min(1, "Option text cannot be empty."))
    .min(1, "At least one option is required.")
    .max(5, "A maximum of 5 options are allowed."),
});
export type SurveyQuestionContext = z.infer<typeof questionSchema>;

export type SurveyCreationData = {
  surveyType: "single-card"; // For now, only single-card is supported
  title?: string; // Will be "" for single-card
  description: string; // Optional short description for the card
  privacy?: "public" | "invite-only"; // Will be "Public" for single-card
  questions: Array<SurveyQuestionContext>; 
};

interface SurveyCreationContextType {
  surveyData: SurveyCreationData;
  setSurveyData: Dispatch<SetStateAction<SurveyCreationData>>;
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  addQuestion: () => void; 
  updateQuestion: (index: number, question: SurveyQuestionContext) => void;
  removeQuestion: (index: number) => void;
  resetSurveyCreation: () => void;
}

const getDefaultQuestion = (): SurveyQuestionContext => ({
  id: `q_${new Date().getTime()}_${Math.random().toString(36).substring(2, 7)}`,
  text: "", 
  type: "multiple-choice", 
  options: [""] // Start with one empty option string
});

const defaultSurveyData: SurveyCreationData = {
  surveyType: "single-card",
  title: "", // Not used for single-card UI, but set for data consistency
  description: "", // Not used for single-card UI, but can be stored
  privacy: "Public", // Single cards are always public
  questions: [getDefaultQuestion()],
};

const SurveyCreationContext = createContext<SurveyCreationContextType | undefined>(undefined);

export function SurveyCreationProvider({ children }: { children: ReactNode }) {
  const [surveyData, setSurveyData] = useState<SurveyCreationData>(defaultSurveyData);
  const [currentStep, setCurrentStep] = useState(1); // Start at step 1 (questions page)

  const addQuestion = useCallback(() => {
    setSurveyData(prev => {
        // For single-card, we should only allow one question.
        // This logic might need adjustment if we re-introduce "card-deck".
        // For now, this will prevent adding more than one question if it's single-card.
        if (prev.surveyType === "single-card" && prev.questions.length >= 1) {
            console.warn("Cannot add more than one question to a single-card survey.");
            return prev;
        }
        return {
            ...prev,
            questions: [...prev.questions, getDefaultQuestion()],
        };
    });
  }, []);

  const updateQuestion = useCallback((index: number, question: SurveyQuestionContext) => {
    setSurveyData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => (i === index ? question : q)),
    }));
  }, []);

  const removeQuestion = useCallback((index: number) => {
    setSurveyData(prev => {
        // For single-card, we should not allow removing the only question.
        if (prev.surveyType === "single-card") {
            console.warn("Cannot remove the question from a single-card survey. Edit it instead.");
            return prev;
        }
        if (prev.questions.length <= 1) { // For card-decks, ensure at least one question remains
            console.warn("Survey must have at least one question.");
            return prev;
        }
        return {
            ...prev,
            questions: prev.questions.filter((_, i) => i !== index),
        };
    });
  }, []);
  
  const resetSurveyCreation = useCallback(() => {
    setSurveyData({
        surveyType: "single-card",
        title: "",
        description: "",
        privacy: "Public",
        questions: [getDefaultQuestion()],
    });
    setCurrentStep(1); // Reset to the first step (questions page)
  }, []);

  return (
    <SurveyCreationContext.Provider value={{ 
        surveyData, 
        setSurveyData, 
        currentStep, 
        setCurrentStep,
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
