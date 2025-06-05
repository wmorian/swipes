
// @/app/page.tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import SurveyCard from '@/components/survey/SurveyCard';
import type { Survey, Question, UserSurveyAnswer } from '@/types';
import { useAuth } from '@/context/AuthContext'; 
import { ArrowRight, RefreshCw } from 'lucide-react';
import { db, serverTimestamp, increment, type Timestamp } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  doc, 
  updateDoc, 
  getDoc,
  addDoc,
  // limit, // Consider re-adding if pagination is needed
  QueryConstraint
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { user, loading: authLoading } = useAuth(); 
  const router = useRouter();
  const [publicCards, setPublicCards] = useState<Survey[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [allCardsViewed, setAllCardsViewed] = useState(false);
  const [isLoading, setIsLoading] = useState(true); 
  const [statsForCard, setStatsForCard] = useState<Survey | null>(null);
  const [userCardInteractions, setUserCardInteractions] = useState<Record<string, UserSurveyAnswer & { docId: string }>>({});

  const fetchSurveyData = async () => {
    if (!user) { 
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setAllCardsViewed(false);
    setCurrentCardIndex(0);
    setStatsForCard(null);
    setUserCardInteractions({});

    try {
      const surveysCol = collection(db, "surveys");
      const surveyQueryConstraints: QueryConstraint[] = [
        where("privacy", "==", "Public"), 
        where("surveyType", "==", "single-card"),
        where("status", "==", "Active"),
        orderBy("createdAt", "desc"),
        // limit(10) // Example: limit to 10 cards
      ];
      const surveySnapshot = await getDocs(query(surveysCol, ...surveyQueryConstraints));
      const fetchedSurveys = surveySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: (data.createdAt as Timestamp)?.toDate(),
          updatedAt: (data.updatedAt as Timestamp)?.toDate(),
        } as Survey;
      });
      setPublicCards(fetchedSurveys);

      if (user && fetchedSurveys.length > 0) {
        const surveyIds = fetchedSurveys.map(s => s.id);
        if (surveyIds.length > 0) { 
          const interactionsQuery = query(
            collection(db, "userSurveyAnswers"),
            where("userId", "==", user.id),
            where("surveyId", "in", surveyIds)
          );
          const interactionsSnapshot = await getDocs(interactionsQuery);
          const interactionsMap: Record<string, UserSurveyAnswer & { docId: string }> = {};
          interactionsSnapshot.forEach(docSnap => {
            interactionsMap[docSnap.data().surveyId] = { 
              ...(docSnap.data() as UserSurveyAnswer), 
              docId: docSnap.id 
            };
          });
          setUserCardInteractions(interactionsMap);
        }
      }

      if (fetchedSurveys.length === 0) {
        setAllCardsViewed(true);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setPublicCards([]);
      setAllCardsViewed(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        fetchSurveyData();
      } else {
        router.push('/login');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]); // Removed router from deps as it doesn't change

  // Core logic for processing interactions (both answers and explicit skips from non-answered cards)
  const processCardInteraction = async (
    currentSurvey: Survey, 
    currentQuestion: Question,
    interactionType: 'answer' | 'skip', // 'skip' here means an explicit skip on a non-answered card
    submittedAnswer?: any // undefined if interactionType is 'skip'
  ): Promise<{ updatedSurveyForStats: Survey; interactionProcessed: boolean }> => {
    if (!user) return { updatedSurveyForStats: currentSurvey, interactionProcessed: false };

    const existingUserInteraction = userCardInteractions[currentSurvey.id];
    const surveyRef = doc(db, "surveys", currentSurvey.id);
    const finalSurveyUpdates: Record<string, any> = { updatedAt: serverTimestamp() };
    let actualSurveyStatChangesMade = false;

    const previousAnswerValue = existingUserInteraction?.answerValue;
    const wasPreviouslySkipped = existingUserInteraction?.isSkipped ?? true; // Default to true if no interaction yet

    // Determine current state based on interaction
    const isCurrentlySkipped = interactionType === 'skip';
    const currentAnswerValue = isCurrentlySkipped ? undefined : submittedAnswer;
    
    // Logic to determine changes to survey's global stats
    if (!existingUserInteraction) { // First interaction
      if (isCurrentlySkipped) {
        finalSurveyUpdates.skipCount = increment(1);
      } else { // New answer
        finalSurveyUpdates.responses = increment(1);
        if (currentAnswerValue && typeof currentAnswerValue === 'string' && currentSurvey.optionCounts?.hasOwnProperty(currentAnswerValue)) {
          finalSurveyUpdates[`optionCounts.${currentAnswerValue}`] = increment(1);
        }
      }
      actualSurveyStatChangesMade = true;
    } else { // Existing interaction
      if (wasPreviouslySkipped) { // Was skipped
        if (!isCurrentlySkipped) { // Now answered
          finalSurveyUpdates.skipCount = increment(-1);
          finalSurveyUpdates.responses = increment(1);
          if (currentAnswerValue && typeof currentAnswerValue === 'string' && currentSurvey.optionCounts?.hasOwnProperty(currentAnswerValue)) {
            finalSurveyUpdates[`optionCounts.${currentAnswerValue}`] = increment(1);
          }
          actualSurveyStatChangesMade = true;
        }
        // If re-skipping a previously skipped card, no stat change needed.
      } else { // Was answered
        if (isCurrentlySkipped) { // Now skipping (this path shouldn't be hit if Req 4 is handled by handleCardSkip's early exit)
          // This case implies user answered, then somehow triggered a 'skip' type interaction to undo.
          // For safety, let's assume this means clearing their answer and marking as skip.
          finalSurveyUpdates.responses = increment(-1);
          if (previousAnswerValue && typeof previousAnswerValue === 'string' && currentSurvey.optionCounts?.hasOwnProperty(previousAnswerValue)) {
            finalSurveyUpdates[`optionCounts.${previousAnswerValue}`] = increment(-1);
          }
          finalSurveyUpdates.skipCount = increment(1);
          actualSurveyStatChangesMade = true;
        } else if (currentAnswerValue !== previousAnswerValue) { // Changed answer
          if (previousAnswerValue && typeof previousAnswerValue === 'string' && currentSurvey.optionCounts?.hasOwnProperty(previousAnswerValue)) {
            finalSurveyUpdates[`optionCounts.${previousAnswerValue}`] = increment(-1);
          }
          if (currentAnswerValue && typeof currentAnswerValue === 'string' && currentSurvey.optionCounts?.hasOwnProperty(currentAnswerValue)) {
            finalSurveyUpdates[`optionCounts.${currentAnswerValue}`] = increment(1);
          }
          actualSurveyStatChangesMade = true; // responses count remains the same
        }
        // If re-answering with the same answer, no stat change needed.
      }
    }
    
    let updatedSurveyForStats: Survey = currentSurvey;

    try {
      // Update survey (global) stats if they changed
      if (actualSurveyStatChangesMade) { 
          await updateDoc(surveyRef, finalSurveyUpdates);
      } else if (existingUserInteraction) { // If no stat changes but there was an interaction, still update timestamp
          await updateDoc(surveyRef, { updatedAt: serverTimestamp() });
      }

      // Prepare data for userSurveyAnswers collection
      const interactionData: Omit<UserSurveyAnswer, 'id' | 'answeredAt'> & { answeredAt: any } = {
        userId: user.id,
        surveyId: currentSurvey.id,
        questionId: currentQuestion.id,
        answerValue: currentAnswerValue !== undefined ? currentAnswerValue : null,
        isSkipped: isCurrentlySkipped,
        answeredAt: serverTimestamp(),
      };

      const newInteractionForLocalState = { ...interactionData, answeredAt: new Date() };

      // Update or create user's specific interaction record
      if (existingUserInteraction?.docId) {
        await updateDoc(doc(db, "userSurveyAnswers", existingUserInteraction.docId), interactionData);
        setUserCardInteractions(prev => ({ ...prev, [currentSurvey.id]: { ...newInteractionForLocalState, docId: existingUserInteraction.docId }}));
      } else {
        const newDocRef = await addDoc(collection(db, "userSurveyAnswers"), interactionData);
        setUserCardInteractions(prev => ({ ...prev, [currentSurvey.id]: { ...newInteractionForLocalState, docId: newDocRef.id }}));
      }
      
      // Fetch fresh survey data for stats display if actual stats changed OR if it was an answer submission
      if (actualSurveyStatChangesMade || interactionType === 'answer') { 
        const updatedSurveyDoc = await getDoc(surveyRef);
        if (updatedSurveyDoc.exists()) {
            const data = updatedSurveyDoc.data();
            updatedSurveyForStats = {
              id: updatedSurveyDoc.id, ...data,
              createdAt: (data.createdAt as Timestamp)?.toDate(),
              updatedAt: (data.updatedAt as Timestamp)?.toDate(),
            } as Survey;
            // Update the card in the main publicCards list as well
            setPublicCards(prevCards => prevCards.map(card => card.id === currentSurvey.id ? updatedSurveyForStats : card));
        }
      }
      return { updatedSurveyForStats, interactionProcessed: true };
    } catch (error) {
      console.error("Error in processCardInteraction:", error);
      return { updatedSurveyForStats: currentSurvey, interactionProcessed: false };
    }
  };

  // Handles submission of an answer (Next/Finish button)
  const handleCardAnswerSubmission = async (submittedAnswer?: any) => {
    if (publicCards.length === 0 || !publicCards[currentCardIndex]) return;
    const currentSurvey = publicCards[currentCardIndex];
    const currentQuestion = currentSurvey.questions?.[0];

    if (!currentQuestion) { // Should not happen if survey has questions
      proceedToNextCard(); 
      return;
    }
    // Requirement 5: Next button is only enabled if an answer is selected.
    // So, submittedAnswer should always have a value here.
    if (submittedAnswer === undefined) {
        console.warn("handleCardAnswerSubmission called without an answer. This should not happen if 'Next' button is properly disabled.");
        // Optionally, treat as a skip or do nothing and let user skip explicitly
        // For now, proceed to next card to avoid getting stuck
        proceedToNextCard();
        return;
    }

    const { updatedSurveyForStats } = await processCardInteraction(currentSurvey, currentQuestion, 'answer', submittedAnswer);
    setStatsForCard(updatedSurveyForStats); // Show stats after answering
  };

  // Handles explicit skip button click
  const handleCardSkip = async () => {
    if (publicCards.length === 0 || !publicCards[currentCardIndex]) return;
    const currentSurvey = publicCards[currentCardIndex];
    const currentQuestion = currentSurvey.questions?.[0];

    if (!currentQuestion) {
      proceedToNextCard(); 
      return;
    }

    const existingUserInteraction = userCardInteractions[currentSurvey.id];

    // Requirement 4: If a card is already answered and is skipped, keep the previous answer and just move on.
    if (existingUserInteraction && !existingUserInteraction.isSkipped) {
      proceedToNextCard(); // Just move to next card, don't show stats, don't update Firestore for this skip.
      return;
    }

    // Requirement 1: If a card is not answered (or previously skipped) and is skipped now, mark it as skipped.
    // This will call processCardInteraction with 'skip' type.
    await processCardInteraction(currentSurvey, currentQuestion, 'skip');
    proceedToNextCard(); // Directly proceed without showing stats for the skipped card.
  };


  const proceedToNextCard = () => {
    setStatsForCard(null); 
    if (currentCardIndex < publicCards.length - 1) {
      setCurrentCardIndex(prevIndex => prevIndex + 1);
    } else {
      setAllCardsViewed(true);
    }
  };
  
  const resetCardView = () => {
    // Re-fetch data to get latest versions and reset user interactions from scratch
    // This also handles if new cards were added by others.
    fetchSurveyData(); 
  };

  if (authLoading) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><p className="text-lg text-muted-foreground">Loading...</p></div>;
  }
  if (!user && !authLoading) {
    // Redirect handled by useEffect, this is a fallback display.
    return <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><p className="text-lg text-muted-foreground">Redirecting to login...</p></div>;
  }
  if (isLoading && user) { // Show loading if user is present but data is still fetching
     return <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><p className="text-lg text-muted-foreground">Loading cards...</p></div>;
  }
  
  if (statsForCard) {
    const cardToDisplayStats = statsForCard; // This should be the updated survey from processCardInteraction
    const questionText = cardToDisplayStats.questions?.[0]?.text || "Survey Question";
    const totalResponses = cardToDisplayStats.responses || 0;
    const totalSkips = cardToDisplayStats.skipCount || 0;
    const totalInteractions = totalResponses + totalSkips;

    return (
      <div className="flex flex-col items-center justify-center flex-grow py-6 md:py-10 px-4">
        <Card className="w-full max-w-xs sm:max-w-sm shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-primary">"{questionText}" - Results</CardTitle>
            <CardDescription>Total Interactions: {totalInteractions}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {cardToDisplayStats.optionCounts && Object.entries(cardToDisplayStats.optionCounts).map(([option, count]) => {
              const numericCount = Number(count); 
              const percentage = totalResponses > 0 && !isNaN(numericCount) ? ((numericCount / totalResponses) * 100).toFixed(1) : "0.0";
              return (
                <div key={option} className="text-sm">
                  <p><strong>{option}:</strong> {isNaN(numericCount) ? 'N/A' : numericCount} vote{numericCount === 1 ? '' : 's'} ({percentage}%)</p>
                  <div className="w-full bg-muted rounded-full h-2.5 my-1">
                    <div className="bg-primary h-2.5 rounded-full" style={{ width: `${totalResponses > 0 && !isNaN(numericCount) ? (numericCount / totalResponses) * 100 : 0}%` }}></div>
                  </div>
                </div>
              );
            })}
             <p className="text-sm pt-2"><strong>Skips:</strong> {totalSkips}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={proceedToNextCard} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              Next Card <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (allCardsViewed || publicCards.length === 0 && !isLoading) { // Added !isLoading here
    return (
      <div className="flex flex-col items-center justify-center text-center min-h-[calc(100vh-10rem)] space-y-6 px-4">
        <Card className="p-6 md:p-10 shadow-xl w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-primary">
              {publicCards.length === 0 && !isLoading ? "No Public Cards Yet!" : "You've Seen All Cards!"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-md mb-6">
              {publicCards.length === 0 && !isLoading ? "Check back later for engaging public survey cards, or create your own." : "Thanks for participating! Check back later for new cards."}
            </CardDescription>
            {publicCards.length > 0 && ( // Only show "View Again" if there were cards
                 <Button onClick={resetCardView} variant="outline" className="mb-4 w-full sm:w-auto">
                    <RefreshCw className="mr-2 h-4 w-4" /> View Cards Again
                </Button>
            )}
            <Button size="lg" asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/survey/create">
                Create Your Own Survey Card
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentSurvey = publicCards[currentCardIndex];
  const currentQuestion = currentSurvey?.questions?.[0]; 
  const currentUserInitialAnswer = userCardInteractions[currentSurvey?.id]?.isSkipped ? null : userCardInteractions[currentSurvey?.id]?.answerValue;


  if (!currentSurvey || !currentQuestion) { 
    // This can happen briefly if publicCards is populated but currentCardIndex is momentarily out of sync,
    // or if a survey somehow has no questions.
    return <div className="text-center py-10 text-muted-foreground">Loading card data or no question available...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center flex-grow py-6 md:py-10 px-4">
      <div className="w-full max-w-xs sm:max-w-sm space-y-4 sm:space-y-6">
        {currentSurvey.description && (
          <div className="text-center">
            <p className="text-md font-medium text-primary">{currentSurvey.description}</p>
          </div>
        )}
         <p className="text-xs text-muted-foreground text-center">Public Card {currentCardIndex + 1} of {publicCards.length}</p>
        <SurveyCard
          question={currentQuestion}
          questionNumber={currentCardIndex + 1}
          totalQuestions={publicCards.length}
          onNext={handleCardAnswerSubmission} 
          onSkip={handleCardSkip}         
          isLastQuestion={currentCardIndex === publicCards.length - 1}
          initialAnswer={currentUserInitialAnswer}
        />
         <div className="pt-2 text-center">
            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/survey/create">
                Create a Survey Card <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
        </div>
      </div>
    </div>
  );
}
