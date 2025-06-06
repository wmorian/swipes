
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
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import type { Survey } from '@/types';
// EFAB related imports are no longer needed here as it's global.

// Mock data - replace with actual data fetching
const mockSurveys: Survey[] = [
  { id: '1', title: 'Customer Satisfaction Q3', questionCount: 10, responses: 152, status: 'Active', privacy: 'Public' },
  { id: '2', title: 'Employee Feedback 2024', questionCount: 15, responses: 88, status: 'Draft', privacy: 'Invite-Only' },
  { id: '3', title: 'New Feature Ideas', questionCount: 5, responses: 230, status: 'Closed', privacy: 'Public' },
];

const mockActivity = [
  { id: 'a1', text: "You created 'Customer Satisfaction Q3'", timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'a2', text: "Responded to 'UX Improvements Survey'", timestamp: new Date(Date.now() - 3600000 * 5).toISOString() },
  { id: 'a3', text: "Shared 'New Feature Ideas' with team", timestamp: new Date(Date.now() - 3600000 * 24).toISOString() },
];

export default function DashboardClient() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [activity, setActivity] = useState<typeof mockActivity>([]);
  // isFabOpen state is now managed globally by FabContext

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      // Fetch user-specific data here
      setSurveys(mockSurveys);
      setActivity(mockActivity);
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  if (!user) {
    return <div className="text-center py-10">Redirecting to login...</div>;
  }
  
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
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

  // handleComingSoon and EFAB related UI is now in GlobalFab.tsx

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
            <div className="text-2xl font-bold">{surveys.length}</div>
            <p className="text-xs text-muted-foreground">Created by you</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{surveys.reduce((acc, s) => acc + (s.responses || 0), 0)}</div>
            <p className="text-xs text-muted-foreground">Across all your surveys</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Surveys</CardTitle>
            <BarChart2 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{surveys.filter(s => s.status === 'Active').length}</div>
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
          {surveys.length === 0 ? (
            <p className="text-muted-foreground">You haven&apos;t created any surveys yet.</p>
          ) : (
            <div className="space-y-4">
              {surveys.map((survey) => (
                <Card key={survey.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-grow">
                      <h3 className="text-lg font-semibold text-primary">{survey.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {survey.questionCount} questions &bull; {survey.responses} responses &bull; Status: <span className={`font-medium ${survey.status === 'Active' ? 'text-green-600' : survey.status === 'Draft' ? 'text-yellow-600' : 'text-red-600'}`}>{survey.status}</span> &bull; Privacy: {survey.privacy}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/survey/${survey.id}/stats`}><BarChart2 className="mr-1 h-4 w-4" /> Stats</Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/survey/${survey.id}/edit`}><Edit3 className="mr-1 h-4 w-4" /> Edit</Link>
                      </Button>
                       <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive/70 hover:text-destructive">
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

      {/* Expanding Floating Action Button is now GlobalFab.tsx, rendered in layout */}
    </div>
  );
}
