
// @/types/index.ts
import type { Timestamp } from 'firebase/firestore';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

export interface Question {
  id:string;
  text: string;
  type: "multiple-choice" | "text" | "rating"; // Add more types as needed
  options?: string[]; // For multiple-choice, etc.
}

export interface Survey {
  id: string; // Firestore document ID
  title: string; // Optional for single-card, but kept for structure; will be empty.
  description?: string;
  surveyType?: "single-card" | "card-deck"; // Type of survey
  questions?: Question[];
  questionCount: number;
  responses: number; // Number of actual answers
  status: "Draft" | "Active" | "Closed";
  privacy: "Public" | "Invite-Only"; // Relevant for card-deck, single-card is implicitly public
  createdBy?: string; // User ID of the creator
  createdAt?: Timestamp | Date; // Firestore Timestamp or Date for local construction
  updatedAt?: Timestamp | Date; // Firestore Timestamp or Date for local construction
  optionCounts?: Record<string, number>; // For multiple-choice stats: { "Option1": 10, "Option2": 5 }
  skipCount?: number; // How many times this card was skipped
}

export interface Answer { // This type seems more for aggregated answers/stats, might deprecate if not used elsewhere
  questionId: string;
  value: any; // Can be string for text/multiple-choice, number for rating
  userId?: string; // Optional: if tracking who answered
}

export interface UserSurveyAnswer {
  id?: string; // Firestore document ID for this specific answer record
  userId: string;
  surveyId: string;
  questionId: string;
  answerValue: any | null; // Store null if skipped, actual value if answered
  isSkipped: boolean;
  answeredAt: Timestamp | Date;
}
