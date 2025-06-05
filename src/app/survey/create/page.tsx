
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
      title: surveyData.title || "",
      description: surveyData.description || "",
      surveyType: surveyData.surveyType || "card-deck",
      privacy: surveyData.privacy || "public",
    },
  });

  const watchedSurveyType = form.watch("surveyType");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/survey/create');
      return; 
    }
    
    const effectiveSurveyType = surveyData.surveyType || "card-deck";

    form.reset({
        title: (effectiveSurveyType === "single-card") ? "" : (surveyData.title || ""),
        description: surveyData.description || "",
        surveyType: effectiveSurveyType,
        privacy: (effectiveSurveyType === "single-card") ? undefined : (surveyData.privacy || "public"),
    });
  }, [
    user, 
    authLoading, 
    router, 
    surveyData.title, 
    surveyData.description, 
    surveyData.surveyType, 
    surveyData.privacy, 
    form 
  ]);

  useEffect(() => {
    const currentFormValues = form.getValues();
    let dataToUpdate: Partial<SurveyCreationData> = {
        surveyType: watchedSurveyType,
        description: currentFormValues.description,
    };

    if (watchedSurveyType === "single-card") {
      if (form.getValues("title") !== "") form.setValue("title", ""); 
      if (form.getValues("privacy") !== undefined) form.setValue("privacy", undefined);
      
      dataToUpdate.title = undefined;
      dataToUpdate.privacy = undefined;
    } else if (watchedSurveyType === "card-deck") {
      dataToUpdate.title = currentFormValues.title;
      if (!currentFormValues.privacy) {
          form.setValue("privacy", "public"); 
          dataToUpdate.privacy = "public";
      } else {
          dataToUpdate.privacy = currentFormValues.privacy as "public" | "invite-only";
      }
    }
    
    updateStep1Data(dataToUpdate);

  }, [watchedSurveyType, form, updateStep1Data]);


  function onSubmit(data: Step1FormValues) {
    setFormProcessing(true);
    if (data.surveyType === "add-to-existing") {
        toast({ title: "Feature Not Implemented", description: "'Add to Existing Deck' is coming soon!", variant: "default" });
        setFormProcessing(false);
        return;
    }
    
    let dataToSubmit: Partial<SurveyCreationData> = {
        surveyType: data.surveyType,
        description: data.description,
    };

    if (data.surveyType === "card-deck") {
        dataToSubmit.title = data.title;
        dataToSubmit.privacy = data.privacy;
    } else if (data.surveyType === "single-card") {
        dataToSubmit.title = undefined; 
        dataToSubmit.privacy = undefined; 
    }
    
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
        <CardDescription>Select the type of survey and provide basic details.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="surveyType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-lg">1. What type of survey are you creating?</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => {
                        field.onChange(value);
                      }}
                      value={field.value || "card-deck"} 
                      className="flex flex-col space-y-2" // Adjusted for consistent stacking of options
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md hover:bg-muted/50 transition-colors flex-1">
                        <RadioGroupItem value="single-card" id={`${field.name}-single-card`} />
                        <div className="cursor-pointer flex-1" onClick={() => field.onChange("single-card")}>
                            <Label htmlFor={`${field.name}-single-card`} className="font-medium cursor-pointer">Single Card</Label>
                            <p className="text-xs text-muted-foreground">One question, shared publicly, no title needed.</p>
                        </div>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md hover:bg-muted/50 transition-colors flex-1">
                        <RadioGroupItem value="card-deck" id={`${field.name}-card-deck`} />
                         <div className="cursor-pointer flex-1" onClick={() => field.onChange("card-deck")}>
                            <Label htmlFor={`${field.name}-card-deck`} className="font-medium cursor-pointer">Card Deck</Label>
                            <p className="text-xs text-muted-foreground">A series of questions, requires a title.</p>
                        </div>
                      </FormItem>
                      {/* Moved the "add-to-existing" FormItem inside the RadioGroup */}
                      <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md bg-muted/30 cursor-not-allowed flex-1 mt-2">
                        <RadioGroupItem value="add-to-existing" disabled id={`${field.name}-add-to-existing`} />
                        <div className="opacity-50 flex-1">
                           <Label htmlFor={`${field.name}-add-to-existing`} className="font-medium text-muted-foreground cursor-not-allowed">Add to Existing Deck</Label>
                           <p className="text-xs text-muted-foreground cursor-not-allowed">Coming soon.</p>
                        </div>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedSurveyType === "card-deck" && (
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg">2. Survey Title (for Card Deck)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Customer Feedback Q3" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg">{watchedSurveyType === "card-deck" ? "3.": "2."} Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                        placeholder={watchedSurveyType === "single-card" ? "Describe your single card's purpose (e.g., 'Quick poll about daily habits')" : "Briefly describe your card deck."} 
                        {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {watchedSurveyType === "card-deck" && (
              <FormField
                control={form.control}
                name="privacy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg">4. Privacy Settings (for Card Deck)</FormLabel>
                    <Select 
                        onValueChange={field.onChange} 
                        value={field.value || "public"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select privacy level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="public">Public (Anyone can respond)</SelectItem>
                        <SelectItem value="invite-only">Invite-Only (Only specific users)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Control who can access and respond to your card deck.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="flex justify-end">
                <Button 
                    type="submit" 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground" 
                    disabled={formProcessing || authLoading || watchedSurveyType === "add-to-existing"}
                >
                 Next: Add Questions <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

    