
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
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { user, loading: authLoading } = useAuth(); 
  const router = useRouter();
  const [publicCards, setPublicCards] = useState<Survey[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [allCardsViewed, setAllCardsViewed] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // For survey data loading
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
  }, [user, authLoading, router]);

  const handleCardInteractionCompletion = async (submittedAnswer?: any) => {
    if (!user || publicCards.length === 0 || !publicCards[currentCardIndex]) return;

    const currentSurvey = publicCards[currentCardIndex];
    const currentQuestion = currentSurvey.questions?.[0];
    if (!currentQuestion) {
      proceedToNextCard(); 
      return;
    }

    const existingUserInteraction = userCardInteractions[currentSurvey.id];
    const surveyRef = doc(db, "surveys", currentSurvey.id);
    const finalSurveyUpdates: Record<string, any> = { updatedAt: serverTimestamp() };
    let actualSurveyStatChangesMade = false;

    const previousAnswerValue = existingUserInteraction?.answerValue;
    const wasPreviouslySkipped = existingUserInteraction?.isSkipped ?? true; 

    const currentAnswerValue = submittedAnswer; 
    const isCurrentlySkipped = currentAnswerValue === undefined;

    if (!existingUserInteraction) { 
        if (isCurrentlySkipped) {
            finalSurveyUpdates.skipCount = increment(1);
        } else {
            finalSurveyUpdates.responses = increment(1);
            if (currentAnswerValue && typeof currentAnswerValue === 'string' && currentSurvey.optionCounts?.hasOwnProperty(currentAnswerValue)) {
                finalSurveyUpdates[`optionCounts.${currentAnswerValue}`] = increment(1);
            }
        }
        actualSurveyStatChangesMade = true;
    } else { 
        if (wasPreviouslySkipped) {
            if (!isCurrentlySkipped) { 
                finalSurveyUpdates.skipCount = increment(-1);
                finalSurveyUpdates.responses = increment(1);
                if (currentAnswerValue && typeof currentAnswerValue === 'string' && currentSurvey.optionCounts?.hasOwnProperty(currentAnswerValue)) {
                    finalSurveyUpdates[`optionCounts.${currentAnswerValue}`] = increment(1);
                }
                actualSurveyStatChangesMade = true;
            }
        } else { 
            if (isCurrentlySkipped) { 
                finalSurveyUpdates.responses = increment(-1);
                if (previousAnswerValue && typeof previousAnswerValue === 'string' && currentSurvey.optionCounts?.hasOwnProperty(previousAnswerValue)) {
                    finalSurveyUpdates[`optionCounts.${previousAnswerValue}`] = increment(-1);
                }
                finalSurveyUpdates.skipCount = increment(1);
                actualSurveyStatChangesMade = true;
            } else if (currentAnswerValue !== previousAnswerValue) { 
                if (previousAnswerValue && typeof previousAnswerValue === 'string' && currentSurvey.optionCounts?.hasOwnProperty(previousAnswerValue)) {
                    finalSurveyUpdates[`optionCounts.${previousAnswerValue}`] = increment(-1);
                }
                if (currentAnswerValue && typeof currentAnswerValue === 'string' && currentSurvey.optionCounts?.hasOwnProperty(currentAnswerValue)) {
                    finalSurveyUpdates[`optionCounts.${currentAnswerValue}`] = increment(1);
                }
                actualSurveyStatChangesMade = true; 
            }
        }
    }
    
    try {
      if (actualSurveyStatChangesMade || Object.keys(finalSurveyUpdates).length > 1) { 
          await updateDoc(surveyRef, finalSurveyUpdates);
      } else if (!actualSurveyStatChangesMade && existingUserInteraction) { 
          // If stats didn't change but there was an existing interaction (e.g. user re-confirmed answer or re-skipped), 
          // we still want to update the userSurveyAnswer's timestamp, so proceed to that, but only touch survey's updatedAt.
          await updateDoc(surveyRef, { updatedAt: serverTimestamp() });
      }

      const interactionData: Omit<UserSurveyAnswer, 'id' | 'answeredAt'> & { answeredAt: any } = {
        userId: user.id,
        surveyId: currentSurvey.id,
        questionId: currentQuestion.id,
        answerValue: currentAnswerValue !== undefined ? currentAnswerValue : null,
        isSkipped: isCurrentlySkipped,
        answeredAt: serverTimestamp(),
      };

      if (existingUserInteraction?.docId) {
        await updateDoc(doc(db, "userSurveyAnswers", existingUserInteraction.docId), interactionData);
        setUserCardInteractions(prev => ({
          ...prev,
          [currentSurvey.id]: { ...interactionData, docId: existingUserInteraction.docId, answeredAt: new Date() } 
        }));
      } else {
        const newDocRef = await addDoc(collection(db, "userSurveyAnswers"), interactionData);
        setUserCardInteractions(prev => ({
          ...prev,
          [currentSurvey.id]: { ...interactionData, docId: newDocRef.id, answeredAt: new Date() } 
        }));
      }
      
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
          setPublicCards(prevCards => prevCards.map(card => card.id === currentSurvey.id ? updatedCardForStatsDisplay! : card));
      }
      setStatsForCard(updatedCardForStatsDisplay || currentSurvey); 

    } catch (error) {
      console.error("Error updating card/interaction:", error);
      setStatsForCard(currentSurvey); 
    }
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
    fetchSurveyData(); 
  };

  if (authLoading || (isLoading && user)) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><p className="text-lg text-muted-foreground">Loading...</p></div>;
  }

  if (!user && !authLoading) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><p className="text-lg text-muted-foreground">Redirecting to login...</p></div>;
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
  const currentUserInitialAnswer = userCardInteractions[currentSurvey?.id]?.answerValue;

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
          questionNumber={currentCardIndex + 1}
          totalQuestions={publicCards.length}
          onNext={handleCardInteractionCompletion} 
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
