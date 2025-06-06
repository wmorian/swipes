
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/layout/Header';
import { AuthProvider } from '@/context/AuthContext';
import { FabProvider } from '@/context/FabContext';
import GlobalFab from '@/components/layout/GlobalFab';

export const metadata: Metadata = {
  title: 'CardSurvey',
  description: 'Create and share engaging card-based surveys.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen">
        <AuthProvider>
          <FabProvider>
            <Header />
            <main className="flex-grow container mx-auto px-4 pt-8 md:pb-8 pb-24">
              {children}
            </main>
            <GlobalFab />
            <Toaster />
          </FabProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
