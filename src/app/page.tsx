
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
  writeBatch,
  limit, 
  QueryConstraint
} from 'firebase/firestore';

export default function HomePage() {
  const { user } = useAuth(); 
  const [publicCards, setPublicCards] = useState<Survey[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [userSubmittedAnswers, setUserSubmittedAnswers] = useState<Record<string, any>>({}); // Local answers before showing stats
  const [allCardsViewed, setAllCardsViewed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [statsForCard, setStatsForCard] = useState<Survey | null>(null);
  const [userCardInteractions, setUserCardInteractions] = useState<Record<string, UserSurveyAnswer & { docId: string }>>({});

  const fetchSurveyData = async () => {
    setIsLoading(true);
    setAllCardsViewed(false);
    setCurrentCardIndex(0);
    setStatsForCard(null);
    setUserSubmittedAnswers({});
    setUserCardInteractions({});

    try {
      const surveysCol = collection(db, "surveys");
      const surveyQueryConstraints: QueryConstraint[] = [
        where("privacy", "==", "Public"), 
        where("surveyType", "==", "single-card"),
        where("status", "==", "Active"),
        orderBy("createdAt", "desc"),
        // limit(10) // Optionally limit the number of cards fetched
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
    fetchSurveyData();
  }, [user]); // Re-fetch if user logs in/out to get their interactions

  const handleAnswerSubmission = (answer: any) => {
    if (publicCards.length > 0 && publicCards[currentCardIndex] && publicCards[currentCardIndex].questions) {
      const currentQuestionId = publicCards[currentCardIndex].questions![0].id;
      setUserSubmittedAnswers(prev => ({ ...prev, [currentQuestionId]: answer }));
    }
  };

  const handleCardInteractionCompletion = async () => {
    if (publicCards.length === 0 || !publicCards[currentCardIndex]) return;

    const currentSurvey = publicCards[currentCardIndex];
    const currentQuestion = currentSurvey.questions?.[0];
    if (!currentQuestion) {
      proceedToNextCard(); // Should not happen with valid data
      return;
    }

    const submittedAnswer = userSubmittedAnswers[currentQuestion.id]; // This is the new answer/skip
    const existingUserInteraction = user ? userCardInteractions[currentSurvey.id] : undefined;
    
    const surveyRef = doc(db, "surveys", currentSurvey.id);
    const surveyStatUpdates: Record<string, any> = { updatedAt: serverTimestamp() };

    // 1. Adjust stats based on previous interaction (if any)
    if (existingUserInteraction) {
      if (existingUserInteraction.isSkipped) {
        surveyStatUpdates.skipCount = increment(-1);
      } else if (existingUserInteraction.answerValue !== null && currentSurvey.optionCounts?.hasOwnProperty(existingUserInteraction.answerValue)) {
        surveyStatUpdates.responses = increment(-1);
        surveyStatUpdates[`optionCounts.${existingUserInteraction.answerValue}`] = increment(-1);
      }
    }

    // 2. Apply new interaction to stats
    if (submittedAnswer !== undefined) { // User provided an answer
      surveyStatUpdates.responses = increment(surveyStatUpdates.responses ? surveyStatUpdates.responses.operand + 1 : 1);
      if (currentSurvey.optionCounts?.hasOwnProperty(submittedAnswer)) {
        surveyStatUpdates[`optionCounts.${submittedAnswer}`] = increment(
           currentSurvey.optionCounts.hasOwnProperty(submittedAnswer) && surveyStatUpdates[`optionCounts.${submittedAnswer}`] 
           ? surveyStatUpdates[`optionCounts.${submittedAnswer}`].operand + 1 
           : 1
        );
      }
    } else { // User skipped
      surveyStatUpdates.skipCount = increment(surveyStatUpdates.skipCount ? surveyStatUpdates.skipCount.operand + 1 : 1);
    }
    
    try {
      // Batch Firestore writes if possible, or sequence them
      await updateDoc(surveyRef, surveyStatUpdates);

      // 3. Record/Update user's specific interaction
      if (user) {
        const interactionData: Omit<UserSurveyAnswer, 'id' | 'answeredAt'> & { answeredAt: any } = {
          userId: user.id,
          surveyId: currentSurvey.id,
          questionId: currentQuestion.id,
          answerValue: submittedAnswer !== undefined ? submittedAnswer : null,
          isSkipped: submittedAnswer === undefined,
          answeredAt: serverTimestamp(),
        };

        if (existingUserInteraction?.docId) {
          await updateDoc(doc(db, "userSurveyAnswers", existingUserInteraction.docId), interactionData);
          setUserCardInteractions(prev => ({
            ...prev,
            [currentSurvey.id]: { ...interactionData, docId: existingUserInteraction.docId, answeredAt: new Date() } // Update local state
          }));
        } else {
          const newDocRef = await addDoc(collection(db, "userSurveyAnswers"), interactionData);
          setUserCardInteractions(prev => ({
            ...prev,
            [currentSurvey.id]: { ...interactionData, docId: newDocRef.id, answeredAt: new Date() } // Update local state
          }));
        }
      }
      
      // 4. Fetch updated survey for stats display (or calculate optimistically)
      const updatedSurveyDoc = await getDoc(surveyRef);
      let updatedCardForStatsDisplay: Survey | null = null;
      if (updatedSurveyDoc.exists()) {
          const data = updatedSurveyDoc.data();
          updatedCardForStatsDisplay = {
            id: updatedSurveyDoc.id,
            ...data,
            createdAt: (data.createdAt as Timestamp)?.toDate(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate(),
          } as Survey;

          // Optimistically update the card in the publicCards array for next render if user revisits
          setPublicCards(prevCards => prevCards.map(card => card.id === currentSurvey.id ? updatedCardForStatsDisplay! : card));
      }
      setStatsForCard(updatedCardForStatsDisplay || currentSurvey); // Fallback to currentSurvey if fetch fails

    } catch (error) {
      console.error("Error updating card/interaction:", error);
      // Potentially show an error toast to the user
      // For now, show stats based on local attempt if any optimistic update was done, or currentSurvey
      setStatsForCard(currentSurvey); 
    }

    // Clear submitted answer for the current question
    setUserSubmittedAnswers(prevAns => {
      const newAns = {...prevAns};
      delete newAns[currentQuestion.id];
      return newAns;
    });
  };

  const proceedToNextCard = () => {
    setStatsForCard(null); // Hide stats
    if (currentCardIndex < publicCards.length - 1) {
      setCurrentCardIndex(prevIndex => prevIndex + 1);
    } else {
      setAllCardsViewed(true);
    }
  };
  
  const resetCardView = () => {
    fetchSurveyData(); 
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><p className="text-lg text-muted-foreground">Loading public cards...</p></div>;
  }
  
  if (statsForCard) {
    const cardToDisplayStats = statsForCard;
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
              const percentage = totalResponses > 0 ? ((count / totalResponses) * 100).toFixed(1) : "0.0";
              return (
                <div key={option} className="text-sm">
                  <p><strong>{option}:</strong> {count} vote{count === 1 ? '' : 's'} ({percentage}%)</p>
                  <div className="w-full bg-muted rounded-full h-2.5 my-1">
                    <div className="bg-primary h-2.5 rounded-full" style={{ width: `${totalResponses > 0 ? (count / totalResponses) * 100 : 0}%` }}></div>
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

  if (allCardsViewed || publicCards.length === 0) {
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
            {publicCards.length > 0 && (
                 <Button onClick={resetCardView} variant="outline" className="mb-4 w-full sm:w-auto">
                    <RefreshCw className="mr-2 h-4 w-4" /> View Cards Again
                </Button>
            )}
            <Button size="lg" asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href={user ? "/dashboard" : "/survey/create"}>
                {user ? "Go to Your Dashboard" : "Or Create Your Own Survey"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentSurvey = publicCards[currentCardIndex];
  const currentQuestion = currentSurvey?.questions?.[0]; 
  const currentUserInitialAnswer = user ? userCardInteractions[currentSurvey?.id]?.answerValue : undefined;


  if (!currentSurvey || !currentQuestion) {
    return <div className="text-center py-10 text-muted-foreground">Loading card data or no question available...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center flex-grow py-6 md:py-10 px-4">
      <div className="w-full max-w-xs sm:max-w-sm space-y-4 sm:space-y-6">
        {currentSurvey.description && (
          <div className="text-center">
            <p className="text-md font-medium text-primary">{currentSurvey.description}</p>
            <p className="text-xs text-muted-foreground">Public Card {currentCardIndex + 1} of {publicCards.length}</p>
          </div>
        )}
        <SurveyCard
          question={currentQuestion}
          questionNumber={1}
          totalQuestions={1}
          onAnswer={handleAnswerSubmission}
          onNext={handleCardInteractionCompletion} 
          onPrevious={() => {}} 
          isFirstQuestion={true}
          isLastQuestion={true}
          initialAnswer={currentUserInitialAnswer}
        />
         <div className="pt-2 text-center">
            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
              <Link href={user ? "/dashboard" : "/survey/create"}>
                {user ? "My Dashboard" : "Create a Survey"} <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
        </div>
      </div>
    </div>
  );
}
