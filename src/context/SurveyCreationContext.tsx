
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


export const surveyCreationStep1Schema = z.object({
  title: z.string().optional(), 
  description: z.string().optional(),
  surveyType: z.enum(["single-card", "card-deck", "add-to-existing"], {
    required_error: "Please select a survey type.",
  }),
  privacy: z.enum(["public", "invite-only"]).optional(),
}).superRefine((data, ctx) => {
  if (data.surveyType === "card-deck") {
    if (!data.title || data.title.length < 3) { 
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Survey title must be at least 3 characters for Card Decks.",
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
  questions: Array<SurveyQuestionContext>; 
};

interface SurveyCreationContextType {
  surveyData: SurveyCreationData;
  setSurveyData: Dispatch<SetStateAction<SurveyCreationData>>;
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  updateStep1Data: (data: Partial<Pick<SurveyCreationData, 'surveyType' | 'title' | 'description' | 'privacy'>>) => void;
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
  surveyType: "single-card", // Default to single-card
  title: "",
  description: "",
  privacy: "public", // Will be overridden to undefined for single-card in effects
  questions: [getDefaultQuestion()],
};

const SurveyCreationContext = createContext<SurveyCreationContextType | undefined>(undefined);

export function SurveyCreationProvider({ children }: { children: ReactNode }) {
  const [surveyData, setSurveyData] = useState<SurveyCreationData>(defaultSurveyData);
  const [currentStep, setCurrentStep] = useState(1);

  const updateStep1Data = useCallback((data: Partial<Pick<SurveyCreationData, 'surveyType' | 'title' | 'description' | 'privacy'>>) => {
    setSurveyData(prev => {
      const newSurveyType = data.surveyType !== undefined ? data.surveyType : prev.surveyType;
      let newQuestions = prev.questions;

      if (data.surveyType === 'single-card' && prev.surveyType !== 'single-card') {
        newQuestions = [getDefaultQuestion()];
      } else if (data.surveyType === 'single-card') {
        if (newQuestions.length === 0) {
            newQuestions = [getDefaultQuestion()];
        } else if (newQuestions.length > 1) {
            newQuestions = [newQuestions[0] || getDefaultQuestion()]; 
        }
      } else if (newSurveyType !== 'single-card' && newQuestions.length === 0) {
        newQuestions = [getDefaultQuestion()];
      }
      
      return {
        ...prev,
        ...data, 
        questions: newQuestions,
        title: newSurveyType === 'single-card' ? undefined : (data.title !== undefined ? data.title : prev.title),
        privacy: newSurveyType === 'single-card' ? undefined : (data.privacy !== undefined ? data.privacy : prev.privacy),
      };
    });
  }, []);

  const addQuestion = useCallback(() => {
    setSurveyData(prev => {
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
  }, []);
  
  const resetSurveyCreation = useCallback(() => {
    setSurveyData({
        surveyType: "single-card",
        title: "",
        description: "",
        privacy: undefined,
        questions: [getDefaultQuestion()],
    });
    setCurrentStep(1);
  }, []);

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
