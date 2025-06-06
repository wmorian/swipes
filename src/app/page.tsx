// @/app/page.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import SurveyCard from '@/components/survey/SurveyCard';
import type { Survey, Question, UserSurveyAnswer } from '@/types';
import { useAuth } from '@/context/AuthContext'; 
import { ArrowRight, RefreshCw, Loader2, SlidersHorizontal, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { surveyService } from '@/services/surveyService'; // Import surveyService

type FilterType = 'not-responded' | 'responded' | 'skipped';

export default function HomePage() {
  const { user, loading: authLoading } = useAuth(); 
  const router = useRouter();
  
  const [publicCards, setPublicCards] = useState<Survey[]>([]);
  const [displayedCards, setDisplayedCards] = useState<Survey[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true); 
  const [statsForCard, setStatsForCard] = useState<Survey | null>(null);
  const [userInitialSelection, setUserInitialSelection] = useState<string | undefined>(undefined);
  const [userCardInteractions, setUserCardInteractions] = useState<Record<string, UserSurveyAnswer & { docId: string }>>({});
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('not-responded');
  const prevSelectedFilterRef = useRef<FilterType>(selectedFilter);
  const [isRefreshingCards, setIsRefreshingCards] = useState(false);


  const fetchSurveyData = async (isManualRefresh: boolean = false) => {
    if (!user) { 
      if (!isManualRefresh) setIsLoading(false);
      return;
    }
    if (!isManualRefresh || (isManualRefresh && isLoading)) {
      setIsLoading(true);
    } else if (isManualRefresh) {
      setIsRefreshingCards(true); // For button spinner
      setCurrentCardIndex(0); 
      setStatsForCard(null);
      setUserInitialSelection(undefined);
    }
    
    try {
      const fetchedSurveys = await surveyService.fetchPublicSurveyCards();
      setPublicCards(fetchedSurveys);

      if (user && fetchedSurveys.length > 0) {
        const surveyIds = fetchedSurveys.map(s => s.id);
        const interactionsMap = await surveyService.fetchUserInteractionsForSurveyCards(user.id, surveyIds);
        setUserCardInteractions(interactionsMap);
      } else {
        setUserCardInteractions({});
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setPublicCards([]);
      setUserCardInteractions({});
    } finally {
      if (!isManualRefresh || (isManualRefresh && isLoading)) { 
        setIsLoading(false);
      }
      if (isManualRefresh) {
        setIsRefreshingCards(false);
      }
    }
  };
  
  useEffect(() => {
    if (!authLoading) {
      if (user) {
        fetchSurveyData(false); 
      } else {
        router.push('/login');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]); 

  useEffect(() => {
    if (authLoading || (isLoading && publicCards.length === 0 && !isRefreshingCards)) return; 
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
      setCurrentCardIndex(0); 
      setStatsForCard(null); 
      setUserInitialSelection(undefined);
    }
    prevSelectedFilterRef.current = selectedFilter;

  }, [publicCards, userCardInteractions, selectedFilter, authLoading, isLoading, user, isRefreshingCards]);


  const processCardInteraction = async (
    currentSurvey: Survey, 
    currentQuestion: Question,
    interactionType: 'answer' | 'skip', 
    submittedAnswer?: any 
  ): Promise<{ updatedSurveyForStats: Survey; interactionProcessed: boolean }> => {
    if (!user) return { updatedSurveyForStats: currentSurvey, interactionProcessed: false };

    const existingUserInteraction = userCardInteractions[currentSurvey.id];
    
    try {
      const result = await surveyService.recordUserInteractionAndUpdateStats({
        userId: user.id,
        survey: currentSurvey, // Pass the whole survey object
        questionId: currentQuestion.id,
        currentAnswerValue: interactionType === 'skip' ? undefined : submittedAnswer,
        isCurrentlySkipped: interactionType === 'skip',
        existingInteraction: existingUserInteraction,
      });

      if (result.interactionProcessed) {
        // Update local state for userCardInteractions
        const updatedInteractionData = await surveyService.fetchUserInteractionsForSurveyCards(user.id, [currentSurvey.id]);
        if (updatedInteractionData[currentSurvey.id]) {
          setUserCardInteractions(prev => ({ ...prev, [currentSurvey.id]: updatedInteractionData[currentSurvey.id] }));
        }
        
        // Update local publicCards with the potentially updated survey (e.g., counts)
        setPublicCards(prevCards => prevCards.map(card => card.id === currentSurvey.id ? result.updatedSurveyForStats : card));
      }
      return result;
    } catch (error) {
      console.error("Error in processCardInteraction (page):", error);
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
        // This path should ideally not be hit if SurveyCard directly calls onNext with selectedValue
        // and skip has its own handler. But as a fallback:
        await processCardInteraction(currentSurvey, currentQuestion, 'skip'); 
        setStatsForCard(null); 
        setUserInitialSelection(undefined);
        proceedToNextCard(); // Proceed after skip if no stats are shown for skips.
        return;
    }

    const { updatedSurveyForStats } = await processCardInteraction(currentSurvey, currentQuestion, 'answer', submittedAnswer);
    setStatsForCard(updatedSurveyForStats); 
    setUserInitialSelection(submittedAnswer);
  };

  const handleCardSkip = async () => {
    if (displayedCards.length === 0 || !displayedCards[currentCardIndex]) return;
    
    setStatsForCard(null); 
    setUserInitialSelection(undefined);

    if (selectedFilter === 'responded') {
        proceedToNextCard();
        return;
    }
    
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
    setUserInitialSelection(undefined);
    if (currentCardIndex < displayedCards.length - 1) {
      setCurrentCardIndex(prevIndex => prevIndex + 1);
    } else {
      setCurrentCardIndex(displayedCards.length); 
    }
  };
  
  const resetCardView = async () => {
    await fetchSurveyData(true); 
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
  if (isLoading && user && publicCards.length === 0 && !isRefreshingCards) {
     return <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><p className="text-lg text-muted-foreground">Loading cards...</p></div>;
  }
  
  const renderPageContent = () => {
    if (statsForCard) {
      const cardToDisplayStats = statsForCard; // This should be the updated survey from processCardInteraction
      const questionText = cardToDisplayStats.questions?.[0]?.text || "Survey Question";
      const totalResponses = cardToDisplayStats.responses || 0;
      const totalSkips = cardToDisplayStats.skipCount || 0;
      const totalInteractions = totalResponses + totalSkips;
      const currentOptionCounts = cardToDisplayStats.optionCounts || {};
      const originalOptions = cardToDisplayStats.questions?.[0]?.options || [];

      return (
          <Card className="w-full max-w-xs sm:max-w-sm shadow-xl mt-3">
            <CardHeader>
              <CardTitle className="text-xl font-headline text-primary">"{questionText}" - Results</CardTitle>
              <CardDescription>Total Interactions: {totalInteractions}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {originalOptions.length > 0 ? (
                originalOptions.map((option) => {
                  const count = currentOptionCounts[option] || 0;
                  const numericCount = Number(count); 
                  const percentage = totalResponses > 0 && !isNaN(numericCount) ? ((numericCount / totalResponses) * 100).toFixed(1) : "0.0";
                  const isSelectedOption = option === userInitialSelection;
                  return (
                    <div key={option} className={`text-sm p-3 rounded-md border ${isSelectedOption ? 'bg-accent/10 border-accent shadow-md' : 'bg-muted/50 border-border'}`}>
                      <div className="flex justify-between items-center mb-1">
                          <span className={`font-medium ${isSelectedOption ? 'text-foreground' : 'text-foreground'}`}>{option}</span>
                          <span className={`text-xs ${isSelectedOption ? 'text-foreground/80' : 'text-muted-foreground'}`}>
                              {isNaN(numericCount) ? 'N/A' : numericCount} vote{numericCount === 1 ? '' : 's'} ({percentage}%)
                          </span>
                      </div>
                      <div className="w-full bg-background rounded-full h-2.5">
                        <div className={`${isSelectedOption ? 'bg-accent' : 'bg-primary'} h-2.5 rounded-full`} style={{ width: `${totalResponses > 0 && !isNaN(numericCount) ? (numericCount / totalResponses) * 100 : 0}%` }}></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">No options defined for this question, or no responses yet.</p>
              )}
              <p className="text-sm pt-2"><strong>Skips:</strong> {totalSkips}</p>
            </CardContent>
            <CardFooter>
              <Button onClick={proceedToNextCard} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                Next Card <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardFooter>
          </Card>
      );
    }

    let emptyStateTitle = "You've Seen All Cards!";
    let emptyStateDescription = "Thanks for participating! Check back later for new cards or try another filter.";
    let showRefreshButtonInEmptyState = false;
    let refreshButtonText = "View Cards Again";
    
    const showEmptyOrAllViewedState = (!isLoading || publicCards.length > 0 ) && user && ( 
      (displayedCards.length === 0) || 
      (currentCardIndex >= displayedCards.length && displayedCards.length > 0) 
    );

    if (showEmptyOrAllViewedState) {
      if (publicCards.length === 0) {
          emptyStateTitle = "No Public Cards Yet!";
          emptyStateDescription = "Check back later for engaging public survey cards, or create your own.";
          showRefreshButtonInEmptyState = false; 
      } else if (displayedCards.length === 0 && publicCards.length > 0) { 
          if (selectedFilter === 'not-responded') {
            emptyStateTitle = "All New Cards Viewed!";
            emptyStateDescription = "You've seen all available new cards. You can check for more or try refreshing.";
            showRefreshButtonInEmptyState = true;
            refreshButtonText = "Check for New Cards";
          } else if (selectedFilter === 'responded') {
            emptyStateTitle = "No Answered Cards Yet";
            emptyStateDescription = "You haven't answered any survey cards. Switch to 'New' to get started!";
            showRefreshButtonInEmptyState = false;
          } else if (selectedFilter === 'skipped') {
            emptyStateTitle = "No Skipped Cards Yet";
            emptyStateDescription = "You haven't skipped any cards. Skipped cards will appear here.";
            showRefreshButtonInEmptyState = false;
          }
      } else if (displayedCards.length > 0 && currentCardIndex >= displayedCards.length) { 
          let filterName = "Cards";
          if (selectedFilter === 'not-responded') filterName = "New Cards";
          else if (selectedFilter === 'responded') filterName = "Answered Cards";
          else if (selectedFilter === 'skipped') filterName = "Skipped Cards";
          
          emptyStateTitle = `All ${filterName.replace(" Cards", "")} Cards Viewed!`;
          emptyStateDescription = "You've gone through all available cards for this filter.";
          showRefreshButtonInEmptyState = true;
          refreshButtonText = `Refresh ${filterName}`;
      }
      
      return (
          <Card className="p-6 md:p-10 shadow-xl w-full max-w-md mt-3">
            <CardHeader>
              <CardTitle className="text-2xl font-headline text-primary">
                {emptyStateTitle}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-md mb-6">
                {emptyStateDescription}
              </CardDescription>
              {showRefreshButtonInEmptyState && (
                   <Button onClick={resetCardView} variant="outline" className="mb-4 w-full sm:w-auto" disabled={isRefreshingCards}>
                      {isRefreshingCards ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4 text-muted-foreground" />
                      )}
                      {refreshButtonText}
                  </Button>
              )}
            </CardContent>
          </Card>
      );
    }

    const currentSurvey = displayedCards[currentCardIndex];
    const currentQuestion = currentSurvey?.questions?.[0]; 
    const currentUserInitialAnswerForCard = userCardInteractions[currentSurvey?.id]?.isSkipped 
                                            ? null 
                                            : userCardInteractions[currentSurvey?.id]?.answerValue;

    if (!currentSurvey || !currentQuestion) { 
      return <p className="text-muted-foreground mt-3">Preparing card...</p>;
    }

    return (
        <div className="w-full max-w-xs sm:max-w-sm space-y-4 sm:space-y-6 mt-3">
          {currentSurvey.description && (
            <div className="text-center">
              <p className="text-md font-medium text-primary">{currentSurvey.description}</p>
            </div>
          )}
          <SurveyCard
            question={currentQuestion}
            questionNumber={currentCardIndex + 1} 
            totalQuestions={displayedCards.length}
            onNext={handleCardAnswerSubmission} 
            onSkip={handleCardSkip}         
            isLastQuestion={currentCardIndex === displayedCards.length - 1}
            initialAnswer={currentUserInitialAnswerForCard} 
          />
          {selectedFilter === 'responded' && !statsForCard && (
             <Button onClick={proceedToNextCard} className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground">
                Next Answered Card <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
          )}
        </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-start flex-grow pt-3 md:pt-4 pb-6 md:pb-10 px-4">
      <div className="w-full max-w-xs sm:max-w-sm mx-auto mb-3">
        <Tabs value={selectedFilter} onValueChange={handleFilterChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="not-responded">New</TabsTrigger>
            <TabsTrigger value="responded">Answered</TabsTrigger>
            <TabsTrigger value="skipped">Skipped</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="flex flex-col items-center justify-center flex-grow w-full">
        {renderPageContent()}
      </div>
    </div>
  );
}
