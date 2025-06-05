// @/components/layout/Header.tsx
"use client";

import Link from 'next/link';
import { ActivitySquare, Home, PlusSquare, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UserNav from './UserNav';
import { useAuth } from '@/context/AuthContext';

export default function Header() {
  const { user } = useAuth();

  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-primary font-headline flex items-center gap-2">
          <ActivitySquare className="h-7 w-7 text-accent" />
          CardSurvey
        </Link>
        <nav className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/" className="flex items-center gap-1">
              <Home size={18} /> Home
            </Link>
          </Button>
          {user && (
            <>
              <Button variant="ghost" asChild>
                <Link href="/dashboard" className="flex items-center gap-1">
                  <UserCircle size={18} /> Dashboard
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/survey/create" className="flex items-center gap-1">
                  <PlusSquare size={18} /> Create Survey
                </Link>
              </Button>
            </>
          )}
          {user ? (
            <UserNav />
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
