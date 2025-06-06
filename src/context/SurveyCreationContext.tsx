// @/context/SurveyCreationContext.tsx
"use client";

import type { Survey, Question } from '@/types';
import React, { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction, useCallback } from 'react';
import * as z from "zod";
import { surveyService } from '@/services/surveyService'; // Import surveyService
import { useToast } from '@/hooks/use-toast';

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
  id?: string; 
  surveyType: "single-card";
  title?: string;
  description: string;
  privacy?: "Public"; 
  questions: Array<SurveyQuestionContext>;
  responses?: number;
  optionCounts?: Record<string, number>;
  skipCount?: number;
};

interface SurveyCreationContextType {
  surveyData: SurveyCreationData;
  setSurveyData: Dispatch<SetStateAction<SurveyCreationData>>;
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  isLoadingSurveyForEdit: boolean;
  loadSurveyForEditing: (surveyId: string, currentUserId?: string) => Promise<boolean>;
  addQuestion: () => void;
  updateQuestion: (index: number, question: SurveyQuestionContext) => void;
  removeQuestion: (index: number) => void;
  resetSurveyCreation: () => void;
}

const getDefaultQuestion = (): SurveyQuestionContext => ({
  id: `q_${new Date().getTime()}_${Math.random().toString(36).substring(2, 7)}`,
  text: "",
  type: "multiple-choice",
  options: ["", ""],
});

const defaultSurveyData: SurveyCreationData = {
  surveyType: "single-card",
  title: "",
  description: "",
  privacy: "Public",
  questions: [getDefaultQuestion()],
  responses: 0,
  optionCounts: {},
  skipCount: 0,
};

const SurveyCreationContext = createContext<SurveyCreationContextType | undefined>(undefined);

export function SurveyCreationProvider({ children }: { children: ReactNode }) {
  const [surveyData, setSurveyData] = useState<SurveyCreationData>(defaultSurveyData);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoadingSurveyForEdit, setIsLoadingSurveyForEdit] = useState(false);
  const { toast } = useToast();

  const loadSurveyForEditing = useCallback(async (surveyId: string, currentUserId?: string): Promise<boolean> => {
    setIsLoadingSurveyForEdit(true);
    try {
      const fetchedSurvey = await surveyService.fetchSurveyById(surveyId);

      if (fetchedSurvey) {
        if (fetchedSurvey.createdBy !== currentUserId) {
          toast({ title: "Access Denied", description: "You do not have permission to edit this survey.", variant: "destructive" });
          setIsLoadingSurveyForEdit(false);
          return false;
        }
        if (fetchedSurvey.status !== "Draft") {
          toast({ title: "Cannot Edit", description: "Only draft surveys can be edited.", variant: "destructive" });
          setIsLoadingSurveyForEdit(false);
          return false;
        }

        setSurveyData({
          id: fetchedSurvey.id,
          surveyType: fetchedSurvey.surveyType || "single-card",
          title: fetchedSurvey.title || "",
          description: fetchedSurvey.description || "",
          privacy: "Public",
          questions: fetchedSurvey.questions ? fetchedSurvey.questions.map(q => ({
            id: q.id || `q_${new Date().getTime()}_${Math.random().toString(36).substring(2, 7)}`,
            text: q.text,
            type: q.type as "multiple-choice", // Assuming only multiple-choice for single-card creation
            options: q.options || ["", ""],
          })) : [getDefaultQuestion()],
          responses: fetchedSurvey.responses ?? 0,
          optionCounts: fetchedSurvey.optionCounts ?? {},
          skipCount: fetchedSurvey.skipCount ?? 0,
        });
        setCurrentStep(1);
        setIsLoadingSurveyForEdit(false);
        return true;
      } else {
        toast({ title: "Not Found", description: "Survey not found.", variant: "destructive" });
        setIsLoadingSurveyForEdit(false);
        resetSurveyCreation();
        return false;
      }
    } catch (error) {
      console.error("Error loading survey for editing:", error);
      toast({ title: "Load Failed", description: "Could not load survey for editing.", variant: "destructive" });
      setIsLoadingSurveyForEdit(false);
      resetSurveyCreation();
      return false;
    }
  }, [toast]);

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
            console.warn("Cannot remove the question from a single-card survey. Edit it instead.");
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
        id: undefined,
        surveyType: "single-card",
        title: "",
        description: "",
        privacy: "Public",
        questions: [getDefaultQuestion()],
        responses: 0,
        optionCounts: {},
        skipCount: 0,
    });
    setCurrentStep(1);
    setIsLoadingSurveyForEdit(false);
  }, []);

  return (
    <SurveyCreationContext.Provider value={{
        surveyData,
        setSurveyData,
        currentStep,
        setCurrentStep,
        isLoadingSurveyForEdit,
        loadSurveyForEditing,
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
