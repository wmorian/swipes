
// @/app/survey/create/page.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSurveyCreation, surveyCreationStep1Schema, type SurveyCreationData } from "@/context/SurveyCreationContext";
import { ArrowRight } from "lucide-react";

type Step1FormValues = z.infer<typeof surveyCreationStep1Schema>;

export default function CreateSurveyStep1Page() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { surveyData, updateStep1Data, setCurrentStep } = useSurveyCreation();
  
  const [formProcessing, setFormProcessing] = useState(false);

  const form = useForm<Step1FormValues>({
    resolver: zodResolver(surveyCreationStep1Schema),
    defaultValues: { 
      title: surveyData.title || "", // Will be unused for single-card but schema expects it
      description: surveyData.description || "",
      surveyType: "single-card", // Default to single-card
      privacy: surveyData.privacy || "public", // Will be unused for single-card
    },
  });

  const watchedSurveyType = form.watch("surveyType");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/survey/create');
      return; 
    }
    // Force single-card type for now
    const effectiveSurveyType = "single-card";

    form.reset({
        title: "", // Not used for single-card
        description: surveyData.description || "",
        surveyType: effectiveSurveyType,
        privacy: undefined, // Not used for single-card
    });
    // Also update context if it's not already single-card
     if (surveyData.surveyType !== "single-card") {
        updateStep1Data({
            surveyType: "single-card",
            title: undefined,
            privacy: undefined,
            description: surveyData.description, // preserve description
        });
    }

  }, [
    user, 
    authLoading, 
    router, 
    surveyData.description, // only description matters for form reset under single-card
    surveyData.surveyType, // to check if context needs update
    form,
    updateStep1Data // Added updateStep1Data to dependencies
  ]);

  useEffect(() => {
    // This effect primarily ensures context is in sync if user somehow changes type,
    // but UI will restrict to single-card.
    if (watchedSurveyType !== "single-card") {
      // If for some reason watchedSurveyType changes from single-card, reset it.
      // This is a safeguard as UI is disabled.
      form.setValue("surveyType", "single-card");
      updateStep1Data({ surveyType: "single-card", title: undefined, privacy: undefined });
    } else {
      // Ensure title and privacy are not set for single-card in context
      updateStep1Data({ 
        surveyType: "single-card", 
        title: undefined, 
        privacy: undefined,
        description: form.getValues("description") 
      });
    }
  }, [watchedSurveyType, form, updateStep1Data]);


  function onSubmit(data: Step1FormValues) {
    setFormProcessing(true);
    
    let dataToSubmit: Partial<SurveyCreationData> = {
        surveyType: "single-card", // Force single-card
        description: data.description,
        title: undefined, 
        privacy: undefined, 
    };
    
    updateStep1Data(dataToSubmit); 
    setCurrentStep(2);
    router.push("/survey/create/questions");
  }

  if (authLoading) {
    return <div className="text-center py-10">Loading form...</div>;
  }

  if (!user) {
    return <div className="text-center py-10">Redirecting to login...</div>;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Create New Survey - Step 1 of 3</CardTitle>
        <CardDescription>Define your single public survey card.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="surveyType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-lg">1. Survey Type (Single Card Only)</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => {
                        // Field change is locked to single-card by UI and effects
                         if (value === "single-card") field.onChange(value);
                      }}
                      value={"single-card"} // Locked to single-card
                      className="flex flex-col space-y-2"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md bg-muted/80 flex-1">
                        <RadioGroupItem value="single-card" id={`${field.name}-single-card`} checked={true} />
                        <div className="cursor-default flex-1">
                            <Label htmlFor={`${field.name}-single-card`} className="font-medium cursor-default">Single Card (Public)</Label>
                            <p className="text-xs text-muted-foreground">One question, shared publicly, no title needed.</p>
                        </div>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md bg-muted/30 cursor-not-allowed flex-1 opacity-50">
                        <RadioGroupItem value="card-deck" id={`${field.name}-card-deck`} disabled />
                         <div className="opacity-50 flex-1">
                            <Label htmlFor={`${field.name}-card-deck`} className="font-medium text-muted-foreground cursor-not-allowed">Card Deck (Coming Soon)</Label>
                            <p className="text-xs text-muted-foreground cursor-not-allowed">A series of questions, requires a title.</p>
                        </div>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md bg-muted/30 cursor-not-allowed flex-1 opacity-50">
                        <RadioGroupItem value="add-to-existing" disabled id={`${field.name}-add-to-existing`} />
                        <div className="opacity-50 flex-1">
                           <Label htmlFor={`${field.name}-add-to-existing`} className="font-medium text-muted-foreground cursor-not-allowed">Add to Existing Deck (Coming Soon)</Label>
                           <p className="text-xs text-muted-foreground cursor-not-allowed">Coming soon.</p>
                        </div>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg">2. Card Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                        placeholder={"Describe your single card's purpose (e.g., 'Quick poll about daily habits')"} 
                        {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end">
                <Button 
                    type="submit" 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground" 
                    disabled={formProcessing || authLoading}
                >
                 Next: Add Question <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
