
// @/components/dashboard/DashboardClient.tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ListChecks, 
  BarChart2, 
  Edit3, 
  Share2, 
  Trash2, 
  Users, 
  FileText,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import type { Survey } from '@/types';
import { db, type Timestamp } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

// Mock data for activity - this can be replaced with real data later
const mockActivity = [
  { id: 'a1', text: "You viewed the dashboard", timestamp: new Date().toISOString() },
  { id: 'a2', text: "A new public card was added", timestamp: new Date(Date.now() - 3600000 * 5).toISOString() },
];

export default function DashboardClient() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [activity, setActivity] = useState<typeof mockActivity>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchDashboardData(user.id);
      setActivity(mockActivity); // Keep mock activity for now
    } else if (!authLoading && !user) {
      // If auth is done and still no user, no need to fetch data
      setDataLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const fetchDashboardData = async (userId: string) => {
    setDataLoading(true);
    try {
      const surveysCol = collection(db, "surveys");
      const q = query(surveysCol, where("createdBy", "==", userId), orderBy("createdAt", "desc"));
      const surveySnapshot = await getDocs(q);
      const fetchedSurveys = surveySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          // Ensure createdAt and updatedAt are Dates, Firestore Timestamps are converted
          createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate() : data.createdAt,
          updatedAt: (data.updatedAt as Timestamp)?.toDate ? (data.updatedAt as Timestamp).toDate() : data.updatedAt,
        } as Survey;
      });
      setSurveys(fetchedSurveys);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // Optionally, set an error state and display a message to the user
      setSurveys([]); // Clear surveys on error or set to a default error state
    } finally {
      setDataLoading(false);
    }
  };
  
  const formatRelativeTime = (dateInput: string | Date) => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    const minutes = Math.floor(diffInSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (authLoading || (!user && dataLoading)) { // Show loading if auth is loading OR (no user yet AND data is still attempting to load)
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (!user) { // Should be caught by useEffect redirect, but as a fallback
    return <div className="text-center py-10 text-muted-foreground">Redirecting to login...</div>;
  }

  const totalSurveysCount = surveys.length;
  const totalResponsesCount = surveys.reduce((acc, s) => acc + (s.responses || 0), 0);
  const activeSurveysCount = surveys.filter(s => s.status === 'Active').length;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-headline text-primary">My Dashboard</h1>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Surveys</CardTitle>
            <ListChecks className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {dataLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{totalSurveysCount}</div>}
            <p className="text-xs text-muted-foreground">Created by you</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {dataLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{totalResponsesCount}</div>}
            <p className="text-xs text-muted-foreground">Across all your surveys</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Surveys</CardTitle>
            <BarChart2 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {dataLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{activeSurveysCount}</div>}
            <p className="text-xs text-muted-foreground">Currently collecting responses</p>
          </CardContent>
        </Card>
      </div>
      
      {/* My Surveys Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline">My Surveys</CardTitle>
          <CardDescription>Manage your created surveys and view their performance.</CardDescription>
        </CardHeader>
        <CardContent>
          {dataLoading && surveys.length === 0 ? (
            <div className="flex items-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading your surveys...
            </div>
          ) : !dataLoading && surveys.length === 0 ? (
            <p className="text-muted-foreground">You haven&apos;t created any surveys yet. Use the '+' button to create one!</p>
          ) : (
            <div className="space-y-4">
              {surveys.map((survey) => (
                <Card key={survey.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-grow">
                      <h3 className="text-lg font-semibold text-primary">
                        {survey.surveyType === 'single-card' && survey.questions && survey.questions.length > 0 
                          ? `Card: "${survey.questions[0].text.substring(0,50)}${survey.questions[0].text.length > 50 ? "..." : ""}"` 
                          : survey.title || "Untitled Survey"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {survey.surveyType === 'single-card' ? 'Single Card Survey' : `${survey.questionCount || 0} questions`} &bull; {survey.responses || 0} responses &bull; Status: <span className={`font-medium ${survey.status === 'Active' ? 'text-green-600' : survey.status === 'Draft' ? 'text-yellow-600' : 'text-red-600'}`}>{survey.status}</span> 
                        {survey.surveyType !== 'single-card' && ` &bull; Privacy: ${survey.privacy}`}
                      </p>
                       {survey.createdAt && <p className="text-xs text-muted-foreground">Created: {formatRelativeTime(survey.createdAt as Date)}</p>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/survey/${survey.id}/stats`}><BarChart2 className="mr-1 h-4 w-4" /> Stats</Link>
                      </Button>
                      <Button variant="outline" size="sm" disabled> {/* Edit survey functionality to be implemented */}
                        <Edit3 className="mr-1 h-4 w-4" /> Edit
                      </Button>
                       <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" disabled> {/* Share functionality to be implemented */}
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive/70 hover:text-destructive" disabled> {/* Delete functionality to be implemented */}
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline">Recent Activity</CardTitle>
          <CardDescription>A log of your recent actions on CardSurvey.</CardDescription>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-muted-foreground">No recent activity.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm">{item.text}</p>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(item.timestamp)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

