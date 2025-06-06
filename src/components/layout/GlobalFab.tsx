
// @/components/layout/GlobalFab.tsx
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  PlusCircle, 
  FilePlus,
  Layers,
  ListPlus,
  X
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useFab } from '@/context/FabContext';

export default function GlobalFab() {
  const { isFabOpen, setIsFabOpen, toggleFab } = useFab();
  const { toast } = useToast();

  const handleComingSoon = (featureName: string) => {
    toast({
      title: "Coming Soon!",
      description: `${featureName} will be available in a future update.`,
    });
    setIsFabOpen(false); // Close FAB after interaction
  };

  const handleNavigation = () => {
    setIsFabOpen(false); // Close FAB after navigation
  };

  return (
    <div className="fixed bottom-[5.5rem] right-6 md:bottom-8 md:right-8 z-50 flex flex-col items-center">
      {/* Sub-action buttons container */}
      <div 
        className={`flex flex-col items-center space-y-2 mb-3 transition-all duration-300 ease-in-out ${
          isFabOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                className="h-12 w-12 rounded-full p-0 shadow-md flex items-center justify-center"
                onClick={() => handleComingSoon("Adding to existing decks")}
                aria-label="Add to existing deck"
              >
                <ListPlus className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-background border shadow-md text-foreground">
              <p>Add to Existing Deck</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
               <Button
                variant="secondary"
                className="h-12 w-12 rounded-full p-0 shadow-md flex items-center justify-center"
                onClick={() => handleComingSoon("Creating new survey decks")}
                aria-label="Create new survey deck"
              >
                <Layers className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-background border shadow-md text-foreground">
              <p>Create New Deck</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                variant="secondary"
                className="h-12 w-12 rounded-full p-0 shadow-md flex items-center justify-center"
                aria-label="Create single survey card"
              >
                <Link href="/survey/create/questions" onClick={handleNavigation}>
                  <FilePlus className="h-6 w-6" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-background border shadow-md text-foreground">
              <p>Create Single Card</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Main FAB toggle button */}
      <Button
        className="h-16 w-16 rounded-full p-0 shadow-xl bg-accent hover:bg-accent/90 text-accent-foreground flex items-center justify-center"
        aria-label={isFabOpen ? "Close create options" : "Open create options"}
        onClick={toggleFab}
      >
        {isFabOpen ? <X className="h-8 w-8" /> : <PlusCircle className="h-8 w-8" />}
      </Button>
    </div>
  );
}
