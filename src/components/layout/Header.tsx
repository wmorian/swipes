// @/components/layout/Header.tsx
"use client";

import Link from 'next/link';
import { ActivitySquare, Home, PlusSquare, UserCircle, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UserNav from './UserNav';
import { useAuth } from '@/context/AuthContext';
import { Sheet, SheetContent, SheetClose, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';

export default function Header() {
  const { user } = useAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const commonNavLinks = (isMobile: boolean) => (
    <>
      {isMobile ? (
        <Button variant="ghost" size="icon" asChild onClick={() => setIsSheetOpen(false)} aria-label="Home">
          <Link href="/"> <Home size={24} /> </Link>
        </Button>
      ) : (
        <Button variant="ghost" asChild onClick={() => setIsSheetOpen(false)}>
          <Link href="/" className="flex items-center gap-1"> <Home size={18} /> Home </Link>
        </Button>
      )}

      {user && (
        <>
          {isMobile ? (
            <Button variant="ghost" size="icon" asChild onClick={() => setIsSheetOpen(false)} aria-label="Dashboard">
              <Link href="/dashboard"> <UserCircle size={24} /> </Link>
            </Button>
          ) : (
            <Button variant="ghost" asChild onClick={() => setIsSheetOpen(false)}>
              <Link href="/dashboard" className="flex items-center gap-1"> <UserCircle size={18} /> Dashboard </Link>
            </Button>
          )}
          {isMobile ? (
            <Button variant="ghost" size="icon" asChild onClick={() => setIsSheetOpen(false)} aria-label="Create Survey">
              <Link href="/survey/create/questions"> <PlusSquare size={24} /> </Link>
            </Button>
          ) : (
            <Button variant="ghost" asChild onClick={() => setIsSheetOpen(false)}>
              <Link href="/survey/create/questions" className="flex items-center gap-1"> <PlusSquare size={18} /> Create Survey </Link>
            </Button>
          )}
        </>
      )}
    </>
  );

  const authActions = (isMobile: boolean) => (
    <>
      {user ? (
        <div className={isMobile ? "mt-auto pt-4 border-t border-border" : ""}>
           <UserNav />
        </div>
      ) : (
        <div className={`flex items-center gap-2 ${isMobile ? 'flex-col space-y-2 w-full pt-4 border-t border-border' : ''}`}>
          <Button variant="outline" asChild className={isMobile ? 'w-full' : ''} onClick={() => setIsSheetOpen(false)}>
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild className={`bg-accent hover:bg-accent/90 text-accent-foreground ${isMobile ? 'w-full' : ''}`} onClick={() => setIsSheetOpen(false)}>
            <Link href="/signup">Sign Up</Link>
          </Button>
        </div>
      )}
    </>
  );

  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-primary font-headline flex items-center gap-2">
          <ActivitySquare className="h-7 w-7 text-accent" />
          CardSurvey
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2">
          {commonNavLinks(false)}
          {authActions(false)}
        </nav>

        {/* Mobile Navigation Trigger */}
        <div className="md:hidden">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[80px] sm:w-[90px] p-0 flex flex-col items-center">
              <SheetHeader className="p-4 border-b w-full">
                <SheetTitle className="flex justify-center">
                  <Link 
                    href="/" 
                    className="text-xl font-bold text-primary font-headline flex items-center"
                    onClick={() => setIsSheetOpen(false)}
                  >
                    <ActivitySquare className="h-7 w-7 text-accent" />
                    {/* <span className="sr-only">CardSurvey</span> */}
                  </Link>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-3 p-4 flex-grow items-center">
                {commonNavLinks(true)}
              </nav>
              <div className="p-4 w-full flex justify-center">
                {authActions(true)}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
