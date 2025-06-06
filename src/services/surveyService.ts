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
} from 'firebase/firestore';
import type { Survey, UserSurveyAnswer, Question, SurveyCreationData } from '@/types';

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
    // Firestore 'in' queries are limited to 30 elements in the array.
    // If surveyCardIds can exceed this, batching is needed. For now, assume it's within limits.
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
    survey: Survey; // Pass the whole survey object
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
      } else { // Was previously answered
        if (isCurrentlySkipped) {
          finalSurveyUpdates.responses = increment(-1);
          if (previousAnswerValue && typeof previousAnswerValue === 'string' && survey.optionCounts?.hasOwnProperty(previousAnswerValue)) {
            finalSurveyUpdates[`optionCounts.${previousAnswerValue}`] = increment(-1);
          }
          finalSurveyUpdates.skipCount = increment(1);
          actualSurveyStatChangesMade = true;
        } else if (currentAnswerValue !== previousAnswerValue) { // Answer changed
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

      let newDocId = existingInteraction?.docId;

      if (existingInteraction?.docId) {
        await updateDoc(doc(db, 'userSurveyAnswers', existingInteraction.docId), interactionData);
      } else {
        const newDocRef = await addDoc(userSurveyAnswersCol, interactionData);
        newDocId = newDocRef.id;
      }
      
      // For UI update, re-fetch the survey to get accurate counts
      if (actualSurveyStatChangesMade) {
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
    // Add additional checks if needed e.g. ensure it's a draft and belongs to user
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
};
