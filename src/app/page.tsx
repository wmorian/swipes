// @/app/page.tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Zap, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center space-y-12">
      <section className="text-center py-16">
        <h1 className="text-5xl font-bold font-headline text-primary mb-6">
          Welcome to CardSurvey
        </h1>
        <p className="text-xl text-foreground mb-8 max-w-2xl mx-auto">
          Create, share, and analyze engaging surveys with a unique card-by-card experience. Get feedback faster and more effectively.
        </p>
        <div className="space-x-4">
          <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href="/survey/create">Create Your First Survey</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/#features">Learn More</Link>
          </Button>
        </div>
      </section>

      <section id="features" className="w-full max-w-5xl grid md:grid-cols-3 gap-8">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <Zap className="h-12 w-12 text-accent" />
            </div>
            <CardTitle className="text-center font-headline">Engaging Experience</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-center">
              One question at a time keeps users focused and increases completion rates.
            </CardDescription>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-accent" />
            </div>
            <CardTitle className="text-center font-headline">Easy Creation</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-center">
              Intuitive tools to build beautiful surveys in minutes. No coding required.
            </CardDescription>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <Users className="h-12 w-12 text-accent" />
            </div>
            <CardTitle className="text-center font-headline">Actionable Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-center">
              Collect responses and visualize data to make informed decisions.
            </CardDescription>
          </CardContent>
        </Card>
      </section>

      <section className="w-full max-w-4xl py-12">
        <h2 className="text-3xl font-bold font-headline text-center text-primary mb-8">How It Works</h2>
        <div className="relative flex justify-center">
            <Image 
                src="https://placehold.co/800x450.png" 
                alt="Card survey demonstration" 
                width={800} 
                height={450} 
                className="rounded-lg shadow-xl"
                data-ai-hint="survey interface"
            />
        </div>
        <p className="text-center mt-6 text-lg text-foreground">
          Users interact with survey questions presented as individual cards, swiping or tapping to progress.
        </p>
      </section>
    </div>
  );
}
