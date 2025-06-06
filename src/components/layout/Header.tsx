
// @/components/layout/Header.tsx
"use client";

import Link from 'next/link';
import { Layers, Home, PlusSquare, LayoutDashboard, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UserNav from './UserNav';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';

export default function Header() {
  const { user } = useAuth();
  const pathname = usePathname();

  // Desktop Nav Links
  const desktopNavLinks = (
    <>
      <Button variant="ghost" asChild>
        <Link href="/" className="flex items-center gap-1"> <Home size={18} /> Home </Link>
      </Button>
      {user && (
        <>
          <Button variant="ghost" asChild>
            <Link href="/dashboard" className="flex items-center gap-1"> <LayoutDashboard size={18} /> Dashboard </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/survey/create/questions" className="flex items-center gap-1"> <PlusSquare size={18} /> Create Survey </Link>
          </Button>
        </>
      )}
    </>
  );

  // Auth Actions (for desktop and mobile top-right)
  const authRelatedActions = (
    <>
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
    </>
  );

  // Define Bottom Nav Items for Mobile
  const mobileBottomNavItems = [
    { href: "/", icon: Home, label: "Home", authRequired: false },
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", authRequired: true },
    { href: "/survey/create/questions", icon: PlusSquare, label: "Create", authRequired: true },
  ];
  const mobileLoginNavItem = { href: "/login", icon: LogIn, label: "Login", authRequired: false };


  return (
    <>
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-primary font-headline flex items-center gap-2">
            <Layers className="h-7 w-7 text-accent" />
            swipes
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {desktopNavLinks}
            {authRelatedActions}
          </nav>

          {/* Mobile Top Right Auth Actions */}
          <div className="md:hidden">
            {authRelatedActions}
          </div>
        </div>
      </header>

      {/* Bottom Navigation Bar - Mobile Only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-t-lg p-1 flex justify-around z-40 h-16">
        {mobileBottomNavItems.map(item => {
          if (item.authRequired && !user) return null;
          const IconComponent = item.icon;
          const isActive = item.href === "/survey/create/questions" ? pathname.startsWith(item.href) : pathname === item.href;
          return (
            <Link key={item.href} href={item.href} passHref className="flex-1 flex justify-center">
              <Button
                variant="ghost"
                size="lg"
                className={`w-full h-full ${isActive ? 'text-primary' : 'text-muted-foreground'} [&_svg]:h-7 [&_svg]:w-7`}
                aria-label={item.label}
              >
                <IconComponent />
              </Button>
            </Link>
          );
        })}
        {!user && (
           <Link href={mobileLoginNavItem.href} passHref className="flex-1 flex justify-center">
             <Button
                variant="ghost"
                size="lg"
                className={`w-full h-full ${pathname === mobileLoginNavItem.href ? 'text-primary' : 'text-muted-foreground'} [&_svg]:h-7 [&_svg]:w-7`}
                aria-label={mobileLoginNavItem.label}
              >
               <mobileLoginNavItem.icon />
             </Button>
           </Link>
        )}
      </nav>
    </>
  );
}
