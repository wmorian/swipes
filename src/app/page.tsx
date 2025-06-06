
// @/app/page.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import SurveyCard from '@/components/survey/SurveyCard';
import type { Survey, Question, UserSurveyAnswer } from '@/types';
import { useAuth } from '@/context/AuthContext'; 
import { ArrowRight, RefreshCw, Filter, ArrowUpDown, SlidersHorizontal } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(true); 
  const [statsForCard, setStatsForCard] = useState<Survey | null>(null);
  const [userInitialSelection, setUserInitialSelection] = useState<string | undefined>(undefined);
  const [userCardInteractions, setUserCardInteractions] = useState<Record<string, UserSurveyAnswer & { docId: string }>>({});
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('not-responded');
  const prevSelectedFilterRef = useRef<FilterType>(selectedFilter);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

  const fetchSurveyData = async () => {
    if (!user) { 
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setCurrentCardIndex(0); 
    setStatsForCard(null);
    setUserInitialSelection(undefined);

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
      setCurrentCardIndex(0); 
      setStatsForCard(null); 
      setUserInitialSelection(undefined);
    }
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
    let finalSurveyUpdates: Record<string, any> = { updatedAt: serverTimestamp() };
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
      } else { // Was previously answered
        if (isCurrentlySkipped) { 
          finalSurveyUpdates.responses = increment(-1); 
          if (previousAnswerValue && typeof previousAnswerValue === 'string' && currentSurvey.optionCounts?.hasOwnProperty(previousAnswerValue)) {
            finalSurveyUpdates[`optionCounts.${previousAnswerValue}`] = increment(-1);
          }
          finalSurveyUpdates.skipCount = increment(1);
          actualSurveyStatChangesMade = true;
        } else if (currentAnswerValue !== previousAnswerValue) { // Answer changed
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
      if (Object.keys(finalSurveyUpdates).length > 1 || actualSurveyStatChangesMade) {
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
      
      if (actualSurveyStatChangesMade) { 
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
        await processCardInteraction(currentSurvey, currentQuestion, 'skip'); 
        setStatsForCard(null); 
        setUserInitialSelection(undefined);
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
  
  const resetCardView = () => {
    fetchSurveyData(); 
  };

  const handleFilterChange = (value: string) => {
    setSelectedFilter(value as FilterType);
    setIsFilterPopoverOpen(false);
  };

  const handleTopicFilterClick = () => {
    console.log('Topic filter clicked - coming soon!');
    setIsFilterPopoverOpen(false);
  }

  const handleSortClick = () => {
    console.log('Sort clicked - coming soon!');
    setIsFilterPopoverOpen(false);
  }


  if (authLoading) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><p className="text-lg text-muted-foreground">Loading authentication...</p></div>;
  }
  if (!user && !authLoading) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><p className="text-lg text-muted-foreground">Redirecting to login...</p></div>;
  }
  if (isLoading && user) {
     return <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><p className="text-lg text-muted-foreground">Loading cards...</p></div>;
  }
  
  const filterSortControlsPopoverContent = (
    <div className="p-4 space-y-4">
      <div>
        <h4 className="text-sm font-medium mb-2 text-foreground">Filter By Status</h4>
        <Tabs value={selectedFilter} onValueChange={handleFilterChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="not-responded">New</TabsTrigger>
            <TabsTrigger value="responded">Answered</TabsTrigger>
            <TabsTrigger value="skipped">Skipped</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
       <div>
        <h4 className="text-sm font-medium mb-1 text-foreground">Filter By Topic</h4>
        <Button variant="outline" className="w-full justify-start" onClick={handleTopicFilterClick}>
          <Filter className="mr-2 h-4 w-4" /> Topics: All
        </Button>
      </div>
      <div>
        <h4 className="text-sm font-medium mb-1 text-foreground">Sort By</h4>
        <Button variant="outline" className="w-full justify-start" onClick={handleSortClick}>
          <ArrowUpDown className="mr-2 h-4 w-4" /> Sort: Newest
        </Button>
      </div>
    </div>
  );

  const renderPageContent = () => {
    if (statsForCard) {
      const cardToDisplayStats = statsForCard;
      const questionText = cardToDisplayStats.questions?.[0]?.text || "Survey Question";
      const totalResponses = cardToDisplayStats.responses || 0;
      const totalSkips = cardToDisplayStats.skipCount || 0;
      const totalInteractions = totalResponses + totalSkips;
      const currentOptionCounts = cardToDisplayStats.optionCounts || {};

      return (
          <Card className="w-full max-w-xs sm:max-w-sm shadow-xl mt-3">
            <CardHeader>
              <CardTitle className="text-xl font-headline text-primary">"{questionText}" - Results</CardTitle>
              <CardDescription>Total Interactions: {totalInteractions}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.keys(currentOptionCounts).length > 0 ? (
                Object.entries(currentOptionCounts).map(([option, count]) => {
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
                <p className="text-sm text-muted-foreground">No responses yet for these options.</p>
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
    let showRefreshButton = false;
    let refreshButtonText = "View Cards Again";
    
    const showEmptyOrAllViewedState = !isLoading && user && (
      (displayedCards.length === 0) || 
      (currentCardIndex >= displayedCards.length && displayedCards.length > 0) 
    );

    if (showEmptyOrAllViewedState) {
      if (publicCards.length === 0) {
          emptyStateTitle = "No Public Cards Yet!";
          emptyStateDescription = "Check back later for engaging public survey cards, or create your own.";
          showRefreshButton = false; 
      } else if (displayedCards.length === 0 && publicCards.length > 0) { 
          if (selectedFilter === 'not-responded') {
            emptyStateTitle = "All New Cards Viewed!";
            emptyStateDescription = "You've seen all available new cards. You can check for more or try another filter.";
            showRefreshButton = true;
            refreshButtonText = "Check for New Cards";
          } else if (selectedFilter === 'responded') {
            emptyStateTitle = "No Answered Cards Yet";
            emptyStateDescription = "You haven't answered any survey cards. Switch to 'New' to get started!";
            showRefreshButton = false;
          } else if (selectedFilter === 'skipped') {
            emptyStateTitle = "No Skipped Cards Yet";
            emptyStateDescription = "You haven't skipped any cards. Skipped cards will appear here.";
            showRefreshButton = false;
          }
      } else if (displayedCards.length > 0 && currentCardIndex >= displayedCards.length) { 
          let filterName = "Cards";
          if (selectedFilter === 'not-responded') filterName = "New Cards";
          else if (selectedFilter === 'responded') filterName = "Answered Cards";
          else if (selectedFilter === 'skipped') filterName = "Skipped Cards";
          
          emptyStateTitle = `All ${filterName.replace(" Cards", "")} Cards Viewed!`;
          emptyStateDescription = "You've gone through all available cards for this filter.";
          showRefreshButton = true;
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
              {showRefreshButton && (
                   <Button onClick={resetCardView} variant="outline" className="mb-4 w-full sm:w-auto">
                      <RefreshCw className="mr-2 h-4 w-4" /> {refreshButtonText}
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
        </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-start flex-grow pt-3 md:pt-4 pb-6 md:pb-10 px-4">
      <div className="w-full max-w-xs sm:max-w-sm mx-auto mb-3">
        <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full"
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filter & Sort
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-2rem)] max-w-xs sm:max-w-sm p-0" align="start">
            {filterSortControlsPopoverContent}
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="flex flex-col items-center justify-center flex-grow w-full">
        {renderPageContent()}
      </div>
    </div>
  );
}
    

    
