
// @/app/page.tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import SurveyCard from '@/components/survey/SurveyCard';
import type { Survey, Question } from '@/types';
import { useAuth } from '@/context/AuthContext'; 
import { ArrowRight, RefreshCw, BarChartHorizontalBig } from 'lucide-react';

// Enhanced Mock data for public single-card surveys with stats fields
const initialMockPublicCardsData: Survey[] = [
  {
    id: 'pub-card-101',
    title: '', 
    description: 'Quick poll: Morning person or night owl?',
    surveyType: 'single-card',
    questions: [
      { id: 'q-pc101', text: 'Are you more of a morning person or a night owl?', type: 'multiple-choice', options: ['Morning Person', 'Night Owl', 'Both equally', 'Neither'] }
    ],
    questionCount: 1,
    responses: 0, 
    status: 'Active',
    privacy: 'Public',
    createdBy: 'system-user',
    optionCounts: {'Morning Person': 0, 'Night Owl': 0, 'Both equally': 0, 'Neither': 0},
    skipCount: 0,
  },
  {
    id: 'pub-card-102',
    title: '',
    description: 'Let\'s talk about coffee!',
    surveyType: 'single-card',
    questions: [
      { id: 'q-pc102', text: 'How do you take your coffee?', type: 'multiple-choice', options: ['Black', 'With milk/cream', 'With sugar', 'With milk & sugar', 'I prefer tea'] }
    ],
    questionCount: 1,
    responses: 0,
    status: 'Active',
    privacy: 'Public',
    createdBy: 'system-user',
    optionCounts: {'Black': 0, 'With milk/cream': 0, 'With sugar': 0, 'With milk & sugar': 0, 'I prefer tea': 0},
    skipCount: 0,
  },
  {
    id: 'pub-card-103',
    title: '',
    description: 'A question about your favorite way to unwind.',
    surveyType: 'single-card',
    questions: [
      { id: 'q-pc103', text: 'Favorite way to unwind after a long day?', type: 'multiple-choice', options: ['Reading a book', 'Watching TV/Movies', 'Exercising', 'Listening to music', 'Spending time with loved ones'] }
    ],
    questionCount: 1,
    responses: 0,
    status: 'Active',
    privacy: 'Public',
    createdBy: 'system-user',
    optionCounts: {'Reading a book': 0, 'Watching TV/Movies': 0, 'Exercising': 0, 'Listening to music': 0, 'Spending time with loved ones': 0},
    skipCount: 0,
  },
];

export default function HomePage() {
  const { user } = useAuth(); 
  const [publicCards, setPublicCards] = useState<Survey[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [allCardsViewed, setAllCardsViewed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [statsForCard, setStatsForCard] = useState<Survey | null>(null);

  useEffect(() => {
    // Simulate fetching data and initializing optionCounts if not present
    const initializedData = initialMockPublicCardsData.map(card => {
      const options = card.questions?.[0]?.options || [];
      const initialCounts = options.reduce((acc, option) => {
        acc[option] = card.optionCounts?.[option] || 0;
        return acc;
      }, {} as Record<string, number>);
      return {
        ...card,
        optionCounts: initialCounts,
        skipCount: card.skipCount || 0,
        responses: card.responses || 0,
      };
    });
    setTimeout(() => {
      setPublicCards(initializedData);
      setIsLoading(false);
      if (initializedData.length === 0) {
        setAllCardsViewed(true);
      }
    }, 500);
  }, []);

  const handleAnswer = (answer: any) => {
    if (publicCards.length > 0 && publicCards[currentCardIndex] && publicCards[currentCardIndex].questions) {
      const currentQuestionId = publicCards[currentCardIndex].questions![0].id;
      setAnswers(prev => ({ ...prev, [currentQuestionId]: answer }));
    }
  };

  const handleCardInteractionCompletion = () => {
    if (publicCards.length === 0) return;

    const currentSurvey = publicCards[currentCardIndex];
    const currentQuestion = currentSurvey.questions?.[0];
    let interactionRecorded = false;

    if (currentQuestion) {
      const answerForCurrentCard = answers[currentQuestion.id];
      
      setPublicCards(prevCards => prevCards.map((card, index) => {
        if (index === currentCardIndex) {
          interactionRecorded = true;
          const updatedCard = { ...card };
          updatedCard.optionCounts = { ...(updatedCard.optionCounts || {}) };

          if (answerForCurrentCard !== undefined && updatedCard.optionCounts.hasOwnProperty(answerForCurrentCard)) {
            updatedCard.responses = (updatedCard.responses || 0) + 1;
            updatedCard.optionCounts[answerForCurrentCard] = (updatedCard.optionCounts[answerForCurrentCard] || 0) + 1;
            console.log(`Answer for card ${updatedCard.id}: ${answerForCurrentCard}`);
          } else {
            updatedCard.skipCount = (updatedCard.skipCount || 0) + 1;
            console.log(`Card ${updatedCard.id} skipped.`);
          }
          setStatsForCard(updatedCard); // Show stats for the updated card
          return updatedCard;
        }
        return card;
      }));

      // Clear answer for the current question
      setAnswers(prevAns => {
        const newAns = {...prevAns};
        delete newAns[currentQuestion.id];
        return newAns;
      });

      if (!interactionRecorded) { // Should not happen if logic is correct
         setStatsForCard(currentSurvey); 
      }
    } else {
        // If no question, just move to next, this is an error state for a card
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
    setCurrentCardIndex(0);
    setAllCardsViewed(false);
    setStatsForCard(null);
    // Optionally re-initialize mock data if we want stats to reset too, or fetch fresh.
    // For now, stats persist on the mock data.
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
              {publicCards.length === 0 ? "No Public Cards Yet!" : "You've Seen All Cards!"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-md mb-6">
              {publicCards.length === 0 ? "Check back later for engaging public survey cards." : "Thanks for participating! Check back later for new cards."}
            </CardDescription>
            {publicCards.length > 0 && (
                 <Button onClick={resetCardView} variant="outline" className="mb-4 w-full sm:w-auto">
                    <RefreshCw className="mr-2 h-4 w-4" /> View Again
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
  const currentQuestion = currentSurvey.questions?.[0];

  if (!currentQuestion) {
    return <div className="text-center py-10 text-destructive">Error: Current card has no question.</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center flex-grow py-6 md:py-10 px-4">
      <div className="w-full max-w-xs sm:max-w-sm space-y-4 sm:space-y-6"> {/* Phone-sized container */}
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
          onNext={handleCardInteractionCompletion} // Changed to new handler
          onPrevious={() => {}} // No previous for public feed
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
