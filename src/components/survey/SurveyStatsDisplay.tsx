// @/components/survey/SurveyStatsDisplay.tsx
"use client";

import { BarChart, PieChart, MessageSquareText, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Bar, Pie, Cell, ResponsiveContainer, BarChart as RechartsBarChart, PieChart as RechartsPieChart, XAxis, YAxis, Tooltip as RechartsTooltip, Legend as RechartsLegend } from 'recharts';
import type { Survey, Question, Answer } from '@/types'; 

interface SurveyStatsDisplayProps {
  survey: Survey;
  answers: Answer[]; // Transformed answers, primarily for chartable questions derived from optionCounts
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658'];

export default function SurveyStatsDisplay({ survey, answers }: SurveyStatsDisplayProps) {

  const getChartDataForQuestion = (question: Question, questionAnswers: Answer[]) => {
    if (question.type === 'multiple-choice' || question.type === 'rating') {
      const counts: { [key: string]: number } = {};
      questionAnswers.forEach(ans => {
        if(ans.questionId === question.id) {
          const valueStr = String(ans.value);
          counts[valueStr] = (counts[valueStr] || 0) + 1;
        }
      });
      // Ensure all original options are present in chartData, even with 0 count
      const chartData = question.options?.map(option => ({
        name: option,
        value: counts[option] || 0,
      })) || [];
      
      // For rating, sort by rating value (name)
      if (question.type === 'rating') {
        chartData.sort((a, b) => parseInt(a.name) - parseInt(b.name));
      }
      return chartData;
    }
    return []; 
  };
  
  const getSurveyTitle = (s: Survey) => {
    return s.surveyType === 'single-card' && s.questions && s.questions.length > 0
      ? `Stats for Card: "${s.questions[0].text.substring(0, 50)}${s.questions[0].text.length > 50 ? "..." : ""}"`
      : s.title || "Survey Statistics";
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary">{getSurveyTitle(survey)}</CardTitle>
          <CardDescription>
            Total Responses: {survey.responses || 0} &bull; Total Skips: {survey.skipCount || 0}
          </CardDescription>
        </CardHeader>
      </Card>

      {survey.questions?.map((question, index) => (
        <Card key={question.id} className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Question {index + 1}: {question.text}</CardTitle>
            <CardDescription>Type: {question.type}</CardDescription>
          </CardHeader>
          <CardContent>
            {question.type === 'multiple-choice' || question.type === 'rating' ? (
              (survey.optionCounts && Object.keys(survey.optionCounts).length > 0) || (question.type === 'rating' && survey.responses > 0) ? (
                <div className="h-[350px] w-full"> {/* Increased height for better legend visibility */}
                   <ChartContainer 
                    config={{
                      responses: { label: "Responses", color: "hsl(var(--chart-1))" },
                      ...(question.options?.reduce((acc, option, idx) => {
                        acc[option] = { label: option, color: `hsl(var(--chart-${(idx % 5) + 1}))` };
                        return acc;
                      }, {} as any))
                    }}
                    className="mx-auto aspect-square max-h-[350px]"
                  >
                    {question.type === 'multiple-choice' ? (
                      <RechartsPieChart>
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <RechartsPie
                          data={getChartDataForQuestion(question, answers)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {getChartDataForQuestion(question, answers).map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} name={entry.name} />
                          ))}
                        </RechartsPie>
                         <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                      </RechartsPieChart>
                    ) : ( // Rating questions as Bar chart
                      <RechartsBarChart 
                        data={getChartDataForQuestion(question, answers)}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis dataKey="name" type="category" width={80} />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                        <Bar dataKey="value" name="Responses" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </RechartsBarChart>
                    )}
                  </ChartContainer>
                </div>
              ) : (
                 <div className="flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mb-3" />
                  <p className="text-lg">No responses yet for this question.</p>
                  <p className="text-sm">Check back after some responses have been collected.</p>
                </div>
              )
            ) : question.type === 'text' ? (
              <div className="flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                 <MessageSquareText className="h-12 w-12 mb-3" />
                <p className="text-lg">Text Responses</p>
                <p className="text-sm">Individual text responses are not displayed in this aggregated statistics view.</p>
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
