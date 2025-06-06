
// @/app/page.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
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
  QueryConstraint
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type FilterType = 'not-responded' | 'responded' | 'skipped';

export default function HomePage() {
  const { user, loading: authLoading } = useAuth(); 
  const router = useRouter();
  
  const [publicCards, setPublicCards] = useState<Survey[]>([]);
  const [displayedCards, setDisplayedCards] = useState<Survey[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  // const [allCardsViewed, setAllCardsViewed] = useState(false); // Replaced by direct logic
  const [isLoading, setIsLoading] = useState(true); 
  const [statsForCard, setStatsForCard] = useState<Survey | null>(null);
  const [userCardInteractions, setUserCardInteractions] = useState<Record<string, UserSurveyAnswer & { docId: string }>>({});
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('not-responded');
  const prevSelectedFilterRef = useRef<FilterType>(selectedFilter);

  const fetchSurveyData = async () => {
    if (!user) { 
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    // setAllCardsViewed(false); // Not needed
    setCurrentCardIndex(0); // Reset index on full data fetch
    setStatsForCard(null);

    try {
      const surveysCol = collection(db, "surveys");
      const surveyQueryConstraints: QueryConstraint[] = [
        where("privacy", "==", "Public"), 
        where("surveyType", "==", "single-card"),
        where("status", "==", "Active"),
        orderBy("createdAt", "desc"),
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
        } else {
           setUserCardInteractions({});
        }
      } else {
        setUserCardInteractions({});
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setPublicCards([]);
      setUserCardInteractions({});
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
  }, [user, authLoading]); 

  useEffect(() => {
    if (authLoading || isLoading) return; 
    if (!user) {
      setDisplayedCards([]);
      setCurrentCardIndex(0);
      return;
    }

    let newFilteredCards: Survey[] = [];
    if (publicCards.length > 0) {
      if (selectedFilter === 'not-responded') {
        newFilteredCards = publicCards.filter(card => !userCardInteractions[card.id]);
      } else if (selectedFilter === 'responded') {
        newFilteredCards = publicCards.filter(card =>
          userCardInteractions[card.id] && !userCardInteractions[card.id].isSkipped
        );
      } else if (selectedFilter === 'skipped') {
        newFilteredCards = publicCards.filter(card =>
          userCardInteractions[card.id]?.isSkipped === true
        );
      }
    }
    
    setDisplayedCards(newFilteredCards);

    if (prevSelectedFilterRef.current !== selectedFilter) {
      setCurrentCardIndex(0); // Reset index ONLY if filter string changed
    }
    // If only userCardInteractions changed, currentCardIndex (potentially advanced by proceedToNextCard) is preserved.

    prevSelectedFilterRef.current = selectedFilter;

  }, [publicCards, userCardInteractions, selectedFilter, authLoading, isLoading, user]);


  const processCardInteraction = async (
    currentSurvey: Survey, 
    currentQuestion: Question,
    interactionType: 'answer' | 'skip', 
    submittedAnswer?: any 
  ): Promise<{ updatedSurveyForStats: Survey; interactionProcessed: boolean }> => {
    if (!user) return { updatedSurveyForStats: currentSurvey, interactionProcessed: false };

    const existingUserInteraction = userCardInteractions[currentSurvey.id];
    const surveyRef = doc(db, "surveys", currentSurvey.id);
    const finalSurveyUpdates: Record<string, any> = { updatedAt: serverTimestamp() };
    let actualSurveyStatChangesMade = false;

    const previousAnswerValue = existingUserInteraction?.answerValue;
    const wasPreviouslySkipped = existingUserInteraction?.isSkipped ?? false; 

    const isCurrentlySkipped = interactionType === 'skip';
    const currentAnswerValue = isCurrentlySkipped ? undefined : submittedAnswer;
    
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
    
    let updatedSurveyForStats: Survey = currentSurvey;

    try {
      if (actualSurveyStatChangesMade) { 
          await updateDoc(surveyRef, finalSurveyUpdates);
      }
      
      const interactionData: Omit<UserSurveyAnswer, 'id' | 'answeredAt'> & { answeredAt: any } = {
        userId: user.id,
        surveyId: currentSurvey.id,
        questionId: currentQuestion.id,
        answerValue: currentAnswerValue !== undefined ? currentAnswerValue : null,
        isSkipped: isCurrentlySkipped,
        answeredAt: serverTimestamp(),
      };

      const newInteractionForLocalState = { ...interactionData, answeredAt: new Date() };
      let newDocId = existingUserInteraction?.docId;

      if (existingUserInteraction?.docId) {
        await updateDoc(doc(db, "userSurveyAnswers", existingUserInteraction.docId), interactionData);
      } else {
        newDocId = (await addDoc(collection(db, "userSurveyAnswers"), interactionData)).id;
      }
      
      setUserCardInteractions(prev => ({ ...prev, [currentSurvey.id]: { ...newInteractionForLocalState, docId: newDocId! }}));
      
      if (actualSurveyStatChangesMade || (interactionType === 'answer' && !existingUserInteraction)) { 
        const updatedSurveyDoc = await getDoc(surveyRef);
        if (updatedSurveyDoc.exists()) {
            const data = updatedSurveyDoc.data();
            updatedSurveyForStats = {
              id: updatedSurveyDoc.id, ...data,
              createdAt: (data.createdAt as Timestamp)?.toDate(),
              updatedAt: (data.updatedAt as Timestamp)?.toDate(),
            } as Survey;
            setPublicCards(prevCards => prevCards.map(card => card.id === currentSurvey.id ? updatedSurveyForStats : card));
        }
      }
      return { updatedSurveyForStats, interactionProcessed: true };
    } catch (error) {
      console.error("Error in processCardInteraction:", error);
      return { updatedSurveyForStats: currentSurvey, interactionProcessed: false };
    }
  };

  const handleCardAnswerSubmission = async (submittedAnswer?: any) => {
    if (displayedCards.length === 0 || !displayedCards[currentCardIndex]) return;
    const currentSurvey = displayedCards[currentCardIndex];
    const currentQuestion = currentSurvey.questions?.[0];

    if (!currentQuestion) { 
      proceedToNextCard(); 
      return;
    }
    if (submittedAnswer === undefined) {
        console.warn("handleCardAnswerSubmission called without an answer.");
        proceedToNextCard();
        return;
    }

    const { updatedSurveyForStats } = await processCardInteraction(currentSurvey, currentQuestion, 'answer', submittedAnswer);
    setStatsForCard(updatedSurveyForStats); 
  };

  const handleCardSkip = async () => {
    if (displayedCards.length === 0 || !displayedCards[currentCardIndex]) return;
    const currentSurvey = displayedCards[currentCardIndex];
    const currentQuestion = currentSurvey.questions?.[0];

    if (!currentQuestion) {
      proceedToNextCard(); 
      return;
    }

    await processCardInteraction(currentSurvey, currentQuestion, 'skip');
    proceedToNextCard(); 
  };

  const proceedToNextCard = () => {
    setStatsForCard(null); 
    if (currentCardIndex < displayedCards.length - 1) {
      setCurrentCardIndex(prevIndex => prevIndex + 1);
    } else {
      setCurrentCardIndex(displayedCards.length); // Go past the end to trigger all viewed state
    }
  };
  
  const resetCardView = () => {
    fetchSurveyData(); 
  };

  const handleFilterChange = (value: string) => {
    setSelectedFilter(value as FilterType);
  };


  if (authLoading) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><p className="text-lg text-muted-foreground">Loading authentication...</p></div>;
  }
  if (!user && !authLoading) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><p className="text-lg text-muted-foreground">Redirecting to login...</p></div>;
  }
  if (isLoading && user) { 
     return <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><p className="text-lg text-muted-foreground">Loading cards...</p></div>;
  }
  
  if (statsForCard) {
    const cardToDisplayStats = statsForCard; 
    const questionText = cardToDisplayStats.questions?.[0]?.text || "Survey Question";
    const totalResponses = cardToDisplayStats.responses || 0;
    const totalSkips = cardToDisplayStats.skipCount || 0;
    const totalInteractions = totalResponses + totalSkips;

    return (
      <div className="flex flex-col items-center justify-center flex-grow py-6 md:py-10 px-4">
        <Tabs value={selectedFilter} onValueChange={handleFilterChange} className="w-full max-w-xs sm:max-w-sm mb-4 sm:mb-6 mx-auto">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="not-responded">New</TabsTrigger>
            <TabsTrigger value="responded">Answered</TabsTrigger>
            <TabsTrigger value="skipped">Skipped</TabsTrigger>
          </TabsList>
        </Tabs>
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

  let emptyStateTitle = "You've Seen All Cards!";
  let emptyStateDescription = "Thanks for participating! Check back later for new cards or try another filter.";
  let showViewAgainCta = true; 
  
  // Determine if we should show the "empty state" or "all viewed" card
  const showEmptyOrAllViewedState = !isLoading && user && (
    (displayedCards.length === 0) || 
    (currentCardIndex >= displayedCards.length && displayedCards.length > 0)
  );

  if (showEmptyOrAllViewedState) {
    if (publicCards.length === 0) { // No cards in the system at all
        emptyStateTitle = "No Public Cards Yet!";
        emptyStateDescription = "Check back later for engaging public survey cards, or create your own.";
        showViewAgainCta = false;
    } else if (displayedCards.length === 0 && publicCards.length > 0) { // Cards exist, but none for this filter
        if (selectedFilter === 'not-responded') {
          emptyStateTitle = "All New Cards Viewed!";
          emptyStateDescription = "You've seen all the brand new cards. Try another filter or check back later!";
        } else if (selectedFilter === 'responded') {
          emptyStateTitle = "No Answered Cards Yet";
          emptyStateDescription = "You haven't answered any survey cards. Switch to 'New' to get started!";
        } else if (selectedFilter === 'skipped') {
          emptyStateTitle = "No Skipped Cards Yet";
          emptyStateDescription = "You haven't skipped any cards. Skipped cards will appear here.";
        }
        showViewAgainCta = false; 
    } else if (displayedCards.length > 0 && currentCardIndex >= displayedCards.length) { // All cards in current filter viewed
        emptyStateTitle = `All ${selectedFilter === 'responded' ? 'Answered' : selectedFilter === 'skipped' ? 'Skipped' : 'New'} Cards Viewed!`;
        emptyStateDescription = "You've gone through all available cards for this filter.";
        showViewAgainCta = true; // Allow reset if there were cards in this filter
    }
    
    return (
      <div className="flex flex-col items-center justify-center text-center min-h-[calc(100vh-10rem)] space-y-6 px-4">
         <Tabs value={selectedFilter} onValueChange={handleFilterChange} className="w-full max-w-xs sm:max-w-sm mb-0 -mt-8 sm:mb-6 mx-auto">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="not-responded">New</TabsTrigger>
            <TabsTrigger value="responded">Answered</TabsTrigger>
            <TabsTrigger value="skipped">Skipped</TabsTrigger>
          </TabsList>
        </Tabs>
        <Card className="p-6 md:p-10 shadow-xl w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-primary">
              {emptyStateTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-md mb-6">
              {emptyStateDescription}
            </CardDescription>
            {showViewAgainCta && ( // Only show "View Again" if there were cards to view again for this filter
                 <Button onClick={resetCardView} variant="outline" className="mb-4 w-full sm:w-auto">
                    <RefreshCw className="mr-2 h-4 w-4" /> View Cards Again
                </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentSurvey = displayedCards[currentCardIndex];
  const currentQuestion = currentSurvey?.questions?.[0]; 
  const currentUserInitialAnswer = userCardInteractions[currentSurvey?.id]?.isSkipped ? null : userCardInteractions[currentSurvey?.id]?.answerValue;

  if (!currentSurvey || !currentQuestion) { 
    // This state might occur briefly if displayedCards updates and currentCardIndex is temporarily out of sync
    // or if data is malformed.
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Tabs value={selectedFilter} onValueChange={handleFilterChange} className="w-full max-w-xs sm:max-w-sm mb-4 sm:mb-6 mx-auto">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="not-responded">New</TabsTrigger>
            <TabsTrigger value="responded">Answered</TabsTrigger>
            <TabsTrigger value="skipped">Skipped</TabsTrigger>
          </TabsList>
        </Tabs>
        Preparing card...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-grow py-6 md:py-10 px-4">
      <Tabs value={selectedFilter} onValueChange={handleFilterChange} className="w-full max-w-xs sm:max-w-sm mb-4 sm:mb-6 mx-auto">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="not-responded">New</TabsTrigger>
          <TabsTrigger value="responded">Answered</TabsTrigger>
          <TabsTrigger value="skipped">Skipped</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="w-full max-w-xs sm:max-w-sm space-y-4 sm:space-y-6">
        {currentSurvey.description && (
          <div className="text-center">
            <p className="text-md font-medium text-primary">{currentSurvey.description}</p>
          </div>
        )}
         <p className="text-xs text-muted-foreground text-center">Public Card {currentCardIndex + 1} of {displayedCards.length}</p>
        <SurveyCard
          question={currentQuestion}
          questionNumber={currentCardIndex + 1}
          totalQuestions={displayedCards.length}
          onNext={handleCardAnswerSubmission} 
          onSkip={handleCardSkip}         
          isLastQuestion={currentCardIndex === displayedCards.length - 1}
          initialAnswer={currentUserInitialAnswer}
        />
      </div>
    </div>
  );
}
    
