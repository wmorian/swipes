
// @/app/page.tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import SurveyCard from '@/components/survey/SurveyCard';
import type { Survey, Question } from '@/types';
import { useAuth } from '@/context/AuthContext'; 
import { ArrowRight, RefreshCw } from 'lucide-react';
import { db, serverTimestamp, increment, type Timestamp } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';

export default function HomePage() {
  const { user } = useAuth(); 
  const [publicCards, setPublicCards] = useState<Survey[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [allCardsViewed, setAllCardsViewed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [statsForCard, setStatsForCard] = useState<Survey | null>(null);

  const fetchPublicCards = async () => {
    setIsLoading(true);
    setAllCardsViewed(false);
    setCurrentCardIndex(0);
    setStatsForCard(null);
    setAnswers({});
    try {
      const surveysCol = collection(db, "surveys");
      const q = query(surveysCol, 
        where("privacy", "==", "Public"), 
        where("surveyType", "==", "single-card"),
        where("status", "==", "Active"),
        orderBy("createdAt", "desc") // Show newest first
      );
      const surveySnapshot = await getDocs(q);
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
      if (fetchedSurveys.length === 0) {
        setAllCardsViewed(true);
      }
    } catch (error) {
      console.error("Error fetching public cards:", error);
      setPublicCards([]);
      setAllCardsViewed(true); // Assume no cards if error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicCards();
  }, []);

  const handleAnswer = (answer: any) => {
    if (publicCards.length > 0 && publicCards[currentCardIndex] && publicCards[currentCardIndex].questions) {
      const currentQuestionId = publicCards[currentCardIndex].questions![0].id;
      setAnswers(prev => ({ ...prev, [currentQuestionId]: answer }));
    }
  };

  const handleCardInteractionCompletion = async () => {
    if (publicCards.length === 0 || !publicCards[currentCardIndex]) return;

    const currentSurvey = publicCards[currentCardIndex];
    const currentQuestion = currentSurvey.questions?.[0];
    let interactionRecorded = false;

    if (currentQuestion) {
      const answerForCurrentCard = answers[currentQuestion.id];
      const surveyRef = doc(db, "surveys", currentSurvey.id);
      const updates: Record<string, any> = { updatedAt: serverTimestamp() };
      let updatedCardForStatsDisplay = { ...currentSurvey, optionCounts: { ...(currentSurvey.optionCounts || {}) } };

      if (answerForCurrentCard !== undefined && updatedCardForStatsDisplay.optionCounts && updatedCardForStatsDisplay.optionCounts.hasOwnProperty(answerForCurrentCard)) {
        updates.responses = increment(1);
        updates[`optionCounts.${answerForCurrentCard}`] = increment(1);
        
        updatedCardForStatsDisplay.responses = (updatedCardForStatsDisplay.responses || 0) + 1;
        updatedCardForStatsDisplay.optionCounts[answerForCurrentCard] = (updatedCardForStatsDisplay.optionCounts[answerForCurrentCard] || 0) + 1;
        interactionRecorded = true;
      } else {
        updates.skipCount = increment(1);
        updatedCardForStatsDisplay.skipCount = (updatedCardForStatsDisplay.skipCount || 0) + 1;
        interactionRecorded = true; // Skip is an interaction
      }
      
      try {
        await updateDoc(surveyRef, updates);
        console.log(`Stats updated for card ${currentSurvey.id} in Firestore.`);
        
        // Update local publicCards array for optimistic UI update for *this specific card*
        setPublicCards(prevCards => prevCards.map(card => card.id === currentSurvey.id ? updatedCardForStatsDisplay : card));
        setStatsForCard(updatedCardForStatsDisplay);

      } catch (error) {
        console.error("Error updating card stats in Firestore:", error);
        // If Firestore update fails, show stats based on local optimistic update anyway for UX,
        // or revert optimistic update and show an error. For now, show optimistic.
        setStatsForCard(updatedCardForStatsDisplay);
      }


      // Clear answer for the current question
      setAnswers(prevAns => {
        const newAns = {...prevAns};
        delete newAns[currentQuestion.id];
        return newAns;
      });
    } else {
      // If no question (error state for a card), just move to next
      proceedToNextCard();
    }
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
    // Re-fetch cards to get latest data, including any new cards or updated stats from others
    fetchPublicCards(); 
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
            {publicCards.length > 0 && ( // Only show if there were cards to view
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
  const currentQuestion = currentSurvey?.questions?.[0]; // Add optional chaining for safety

  if (!currentSurvey || !currentQuestion) { // Check if currentSurvey itself is defined
    // This can happen briefly if cards are being re-fetched or if there's an issue
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
          onAnswer={handleAnswer}
          onNext={handleCardInteractionCompletion} 
          onPrevious={() => {}} 
          isFirstQuestion={true}
          isLastQuestion={true}
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
