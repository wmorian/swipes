
// @/services/surveyService.ts
import {
  db,
  serverTimestamp,
  increment,
  type Timestamp,
  type FieldValue,
} from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  addDoc,
  deleteDoc,
  type QueryConstraint,
  limit,
} from 'firebase/firestore';
import type { Survey, UserSurveyAnswer, Question, SurveyCreationData } from '@/types';
import { generateDailyPoll } from '@/ai/flows/generate-daily-poll-flow';

const surveysCol = collection(db, 'surveys');
const userSurveyAnswersCol = collection(db, 'userSurveyAnswers');

const mapTimestampToDate = (data: any, fields: string[]) => {
  const mappedData = { ...data };
  fields.forEach(field => {
    if (mappedData[field] && (mappedData[field] as Timestamp).toDate) {
      mappedData[field] = (mappedData[field] as Timestamp).toDate();
    }
  });
  return mappedData;
};


export const surveyService = {
  fetchPublicSurveyCards: async (): Promise<Survey[]> => {
    const surveyQueryConstraints: QueryConstraint[] = [
      where('privacy', '==', 'Public'),
      where('surveyType', '==', 'single-card'),
      where('status', '==', 'Active'),
      // Removed: where('isDailyPoll', '!=', true), // Daily poll will now be included
      orderBy('createdAt', 'desc'),
    ];
    const surveySnapshot = await getDocs(query(surveysCol, ...surveyQueryConstraints));
    return surveySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...mapTimestampToDate(data, ['createdAt', 'updatedAt']),
      } as Survey;
    });
  },

  fetchUserInteractionsForSurveyCards: async (
    userId: string,
    surveyCardIds: string[]
  ): Promise<Record<string, UserSurveyAnswer & { docId: string }>> => {
    if (surveyCardIds.length === 0) return {};
    const interactionsQuery = query(
      userSurveyAnswersCol,
      where('userId', '==', userId),
      where('surveyId', 'in', surveyCardIds)
    );
    const interactionsSnapshot = await getDocs(interactionsQuery);
    const interactionsMap: Record<string, UserSurveyAnswer & { docId: string }> = {};
    interactionsSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      interactionsMap[data.surveyId] = {
        ...(mapTimestampToDate(data, ['answeredAt']) as UserSurveyAnswer),
        docId: docSnap.id,
      };
    });
    return interactionsMap;
  },

  recordUserInteractionAndUpdateStats: async (params: {
    userId: string;
    survey: Survey; 
    questionId: string;
    currentAnswerValue?: any;
    isCurrentlySkipped: boolean;
    existingInteraction?: UserSurveyAnswer & { docId: string };
  }): Promise<{ updatedSurveyForStats: Survey; interactionProcessed: boolean }> => {
    const {
      userId,
      survey,
      questionId,
      currentAnswerValue,
      isCurrentlySkipped,
      existingInteraction,
    } = params;

    const surveyRef = doc(db, 'surveys', survey.id);
    let finalSurveyUpdates: Record<string, any> = { updatedAt: serverTimestamp() };
    let actualSurveyStatChangesMade = false;

    const previousAnswerValue = existingInteraction?.answerValue;
    const wasPreviouslySkipped = existingInteraction?.isSkipped ?? false;

    if (!existingInteraction) {
      if (isCurrentlySkipped) {
        finalSurveyUpdates.skipCount = increment(1);
      } else {
        finalSurveyUpdates.responses = increment(1);
        if (currentAnswerValue && typeof currentAnswerValue === 'string' && survey.optionCounts?.hasOwnProperty(currentAnswerValue)) {
          finalSurveyUpdates[`optionCounts.${currentAnswerValue}`] = increment(1);
        }
      }
      actualSurveyStatChangesMade = true;
    } else {
      if (wasPreviouslySkipped) {
        if (!isCurrentlySkipped) {
          finalSurveyUpdates.skipCount = increment(-1);
          finalSurveyUpdates.responses = increment(1);
          if (currentAnswerValue && typeof currentAnswerValue === 'string' && survey.optionCounts?.hasOwnProperty(currentAnswerValue)) {
            finalSurveyUpdates[`optionCounts.${currentAnswerValue}`] = increment(1);
          }
          actualSurveyStatChangesMade = true;
        }
      } else { 
        if (isCurrentlySkipped) {
          finalSurveyUpdates.responses = increment(-1);
          if (previousAnswerValue && typeof previousAnswerValue === 'string' && survey.optionCounts?.hasOwnProperty(previousAnswerValue)) {
            finalSurveyUpdates[`optionCounts.${previousAnswerValue}`] = increment(-1);
          }
          finalSurveyUpdates.skipCount = increment(1);
          actualSurveyStatChangesMade = true;
        } else if (currentAnswerValue !== previousAnswerValue) { 
          if (previousAnswerValue && typeof previousAnswerValue === 'string' && survey.optionCounts?.hasOwnProperty(previousAnswerValue)) {
            finalSurveyUpdates[`optionCounts.${previousAnswerValue}`] = increment(-1);
          }
          if (currentAnswerValue && typeof currentAnswerValue === 'string' && survey.optionCounts?.hasOwnProperty(currentAnswerValue)) {
            finalSurveyUpdates[`optionCounts.${currentAnswerValue}`] = increment(1);
          }
          actualSurveyStatChangesMade = true;
        }
      }
    }

    let updatedSurveyForStats: Survey = survey;

    try {
      if (Object.keys(finalSurveyUpdates).length > 1 || actualSurveyStatChangesMade) {
        await updateDoc(surveyRef, finalSurveyUpdates);
      }

      const interactionData: Omit<UserSurveyAnswer, 'id' | 'answeredAt'> & { answeredAt: FieldValue } = {
        userId: userId,
        surveyId: survey.id,
        questionId: questionId,
        answerValue: currentAnswerValue !== undefined ? currentAnswerValue : null,
        isSkipped: isCurrentlySkipped,
        answeredAt: serverTimestamp(),
      };

      if (existingInteraction?.docId) {
        await updateDoc(doc(db, 'userSurveyAnswers', existingInteraction.docId), interactionData);
      } else {
        await addDoc(userSurveyAnswersCol, interactionData);
      }
      
      if (actualSurveyStatChangesMade || Object.keys(finalSurveyUpdates).length > 1) {
        const updatedSurveyDoc = await getDoc(surveyRef);
        if (updatedSurveyDoc.exists()) {
            const data = updatedSurveyDoc.data();
            updatedSurveyForStats = {
              id: updatedSurveyDoc.id, 
              ...mapTimestampToDate(data, ['createdAt', 'updatedAt']),
            } as Survey;
        }
      }
      return { updatedSurveyForStats, interactionProcessed: true };
    } catch (error) {
      console.error("Error in recordUserInteractionAndUpdateStats:", error);
      return { updatedSurveyForStats: survey, interactionProcessed: false };
    }
  },
  
  fetchSurveyById: async (surveyId: string): Promise<Survey | null> => {
    const surveyRef = doc(db, 'surveys', surveyId);
    const surveySnap = await getDoc(surveyRef);
    if (surveySnap.exists()) {
      const data = surveySnap.data();
      return {
        id: surveySnap.id,
        ...mapTimestampToDate(data, ['createdAt', 'updatedAt']),
      } as Survey;
    }
    return null;
  },

  finalizeSurvey: async (
    surveyPayload: Omit<Survey, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: FieldValue, updatedAt: FieldValue },
    existingSurveyId?: string
  ): Promise<string> => {
    if (existingSurveyId) {
      const surveyRef = doc(db, 'surveys', existingSurveyId);
      await updateDoc(surveyRef, surveyPayload);
      return existingSurveyId;
    } else {
      surveyPayload.createdAt = serverTimestamp();
      const docRef = await addDoc(surveysCol, surveyPayload);
      return docRef.id;
    }
  },
  
  deleteSurveyDraft: async (surveyId: string): Promise<void> => {
    const surveyRef = doc(db, 'surveys', surveyId);
    await deleteDoc(surveyRef);
  },

  fetchSurveysByCreator: async (userId: string): Promise<Survey[]> => {
    const q = query(surveysCol, where('createdBy', '==', userId), orderBy('createdAt', 'desc'));
    const surveySnapshot = await getDocs(q);
    return surveySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...mapTimestampToDate(data, ['createdAt', 'updatedAt']),
      } as Survey;
    });
  },

  fetchOrCreateDailyPoll: async (): Promise<Survey | null> => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dailyPollQuery = query(
      surveysCol,
      where('isDailyPoll', '==', true),
      where('status', '==', 'Active'),
      where('createdAt', '>=', twentyFourHoursAgo),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(dailyPollQuery);

    if (!snapshot.empty) {
      const pollDoc = snapshot.docs[0];
      return {
        id: pollDoc.id,
        ...mapTimestampToDate(pollDoc.data(), ['createdAt', 'updatedAt']),
      } as Survey;
    }

    // If no recent daily poll, generate a new one
    try {
      const pollContent = await generateDailyPoll();
      const optionCounts: Record<string, number> = {};
      pollContent.options.forEach(opt => optionCounts[opt] = 0);

      const newPollData: Omit<Survey, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: FieldValue, updatedAt: FieldValue } = {
        title: "Today's Poll", // This title is used if survey.description is not present for the card.
        description: pollContent.questionText, // Use question as description for card UI.
        surveyType: 'single-card',
        questions: [{
          id: `dp_q_${Date.now()}`,
          text: pollContent.questionText, // Also store it in questions array.
          type: 'multiple-choice',
          options: pollContent.options,
        }],
        questionCount: 1,
        responses: 0,
        skipCount: 0,
        status: 'Active',
        privacy: 'Public',
        createdBy: 'SYSTEM_AI',
        isDailyPoll: true,
        optionCounts,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(surveysCol, newPollData);
      const newPollSnap = await getDoc(docRef);
      if (newPollSnap.exists()) {
        return {
          id: newPollSnap.id,
          ...mapTimestampToDate(newPollSnap.data(), ['createdAt', 'updatedAt']),
        } as Survey;
      }
      return null;
    } catch (error) {
      console.error("Error generating or creating daily poll:", error);
      return null;
    }
  },
};

