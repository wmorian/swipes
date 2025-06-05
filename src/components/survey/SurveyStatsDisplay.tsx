// @/components/survey/SurveyStatsDisplay.tsx
"use client";

import { BarChart, PieChart, List } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Bar, Pie, Cell, ResponsiveContainer, BarChart as RechartsBarChart, PieChart as RechartsPieChart, XAxis, YAxis, Tooltip as RechartsTooltip, Legend as RechartsLegend } from 'recharts';
import type { Survey, Question, Answer } from '@/types'; // Assuming type definitions

interface SurveyStatsDisplayProps {
  survey: Survey;
  answers: Answer[]; // Assuming answers are fetched and processed
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']; // Colors for charts

export default function SurveyStatsDisplay({ survey, answers }: SurveyStatsDisplayProps) {

  const getChartDataForQuestion = (question: Question) => {
    const questionAnswers = answers.filter(ans => ans.questionId === question.id);
    
    if (question.type === 'multiple-choice' || question.type === 'rating') {
      const counts: { [key: string]: number } = {};
      questionAnswers.forEach(ans => {
        const valueStr = String(ans.value);
        counts[valueStr] = (counts[valueStr] || 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }
    return []; // Text answers handled separately
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary">{survey.title} - Statistics</CardTitle>
          <CardDescription>Total Responses: {answers.length}</CardDescription>
        </CardHeader>
      </Card>

      {survey.questions?.map((question, index) => (
        <Card key={question.id} className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Question {index + 1}: {question.text}</CardTitle>
          </CardHeader>
          <CardContent>
            {question.type === 'multiple-choice' || question.type === 'rating' ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {question.type === 'multiple-choice' ? (
                    <RechartsPieChart>
                      <RechartsPie
                        data={getChartDataForQuestion(question)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {getChartDataForQuestion(question).map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </RechartsPie>
                      <RechartsTooltip />
                      <RechartsLegend />
                    </RechartsPieChart>
                  ) : ( // Rating questions as Bar chart
                    <RechartsBarChart data={getChartDataForQuestion(question)}>
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <RechartsTooltip />
                      <RechartsLegend />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                  )}
                </ResponsiveContainer>
              </div>
            ) : question.type === 'text' ? (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {answers.filter(ans => ans.questionId === question.id).length > 0 ? 
                  answers.filter(ans => ans.questionId === question.id).map((ans, ansIdx) => (
                    <div key={ansIdx} className="p-3 border rounded-md bg-muted/30 text-sm">
                      {String(ans.value)}
                    </div>
                  )) : <p className="text-muted-foreground">No text responses for this question yet.</p>}
              </div>
            ) : (
              <p className="text-muted-foreground">No visualization available for this question type.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
