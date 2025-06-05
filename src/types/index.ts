
// @/types/index.ts

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
  id: string;
  title: string; // Optional for single-card, but kept for structure; will be empty.
  description?: string;
  surveyType?: "single-card" | "card-deck"; // Type of survey
  questions?: Question[];
  questionCount: number;
  responses: number; // Number of actual answers
  status: "Draft" | "Active" | "Closed";
  privacy: "Public" | "Invite-Only"; // Relevant for card-deck, single-card is implicitly public
  createdBy?: string; // User ID of the creator
  createdAt?: string; // ISO Date string
  optionCounts?: Record<string, number>; // For multiple-choice stats: { "Option1": 10, "Option2": 5 }
  skipCount?: number; // How many times this card was skipped
}

export interface Answer {
  questionId: string;
  value: any; // Can be string for text/multiple-choice, number for rating
  userId?: string; // Optional: if tracking who answered
}

