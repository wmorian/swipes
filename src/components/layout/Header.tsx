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
      <Button variant="ghost" asChild onClick={() => isMobile && setIsSheetOpen(false)}>
        <Link href="/" className={`flex items-center gap-1 ${isMobile ? 'text-lg py-2' : ''}`}>
          <Home size={isMobile ? 20 : 18} /> Home
        </Link>
      </Button>
      {user && (
        <>
          <Button variant="ghost" asChild onClick={() => isMobile && setIsSheetOpen(false)}>
            <Link href="/dashboard" className={`flex items-center gap-1 ${isMobile ? 'text-lg py-2' : ''}`}>
              <UserCircle size={isMobile ? 20 : 18} /> Dashboard
            </Link>
          </Button>
          <Button variant="ghost" asChild onClick={() => isMobile && setIsSheetOpen(false)}>
            <Link href="/survey/create" className={`flex items-center gap-1 ${isMobile ? 'text-lg py-2' : ''}`}>
              <PlusSquare size={isMobile ? 20 : 18} /> Create Survey
            </Link>
          </Button>
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
          <Button variant="outline" asChild className={isMobile ? 'w-full' : ''} onClick={() => isMobile && setIsSheetOpen(false)}>
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild className={`bg-accent hover:bg-accent/90 text-accent-foreground ${isMobile ? 'w-full' : ''}`} onClick={() => isMobile && setIsSheetOpen(false)}>
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
            <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0 flex flex-col">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>
                  <Link 
                    href="/" 
                    className="text-xl font-bold text-primary font-headline flex items-center gap-2"
                    onClick={() => setIsSheetOpen(false)}
                  >
                    <ActivitySquare className="h-6 w-6 text-accent" />
                    CardSurvey
                  </Link>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-4 flex-grow">
                {commonNavLinks(true)}
              </nav>
              <div className="p-4">
                {authActions(true)}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
