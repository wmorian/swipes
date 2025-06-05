// @/components/survey/SurveyCreationForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

const questionSchema = z.object({
  text: z.string().min(5, "Question text must be at least 5 characters."),
  type: z.enum(["multiple-choice", "text", "rating"], { required_error: "Question type is required." }),
  options: z.array(z.string().min(1, "Option text cannot be empty.")).optional(),
});

const surveyCreationSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters."),
  description: z.string().optional(),
  surveyType: z.enum(["single-card", "card-deck", "add-to-existing"], {
    required_error: "Please select a survey type.",
  }),
  questions: z.array(questionSchema).min(1, "Survey must have at least one question."),
  privacy: z.enum(["public", "invite-only"]).optional(),
}).refine(data => {
  if (data.surveyType === "card-deck" && !data.privacy) {
    return false; 
  }
  return true;
}, {
  message: "Privacy setting is required for Card Decks.",
  path: ["privacy"],
}).refine(data => {
  if (data.surveyType === "single-card" && data.questions.length !== 1) {
    return false;
  }
  return true;
}, {
  message: "Single Card surveys must have exactly one question.",
  path: ["questions"], 
});

type SurveyCreationValues = z.infer<typeof surveyCreationSchema>;

export default function SurveyCreationForm() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [formProcessing, setFormProcessing] = useState(false);

  const form = useForm<SurveyCreationValues>({
    resolver: zodResolver(surveyCreationSchema),
    defaultValues: {
      title: "",
      description: "",
      surveyType: "card-deck", // Default to card-deck
      questions: [{ text: "", type: "text", options: [] }],
      privacy: "public",
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  const watchedSurveyType = form.watch("surveyType");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);
  
  useEffect(() => {
    // When surveyType changes to 'single-card' and there's more than one question, remove extras.
    if (watchedSurveyType === "single-card" && fields.length > 1) {
      // Keep only the first question
      for (let i = fields.length - 1; i > 0; i--) {
        remove(i);
      }
    }
    // If survey type is 'single-card', ensure privacy is not set or is public
    if (watchedSurveyType === "single-card") {
        form.setValue("privacy", undefined); // Or "public", depending on backend expectation
    }
  }, [watchedSurveyType, fields.length, remove, form]);


  function addOption(questionIndex: number) {
    const options = form.getValues(`questions.${questionIndex}.options`) || [];
    // Using update from useFieldArray to ensure re-render
    const currentQuestion = fields[questionIndex];
    update(questionIndex, { ...currentQuestion, options: [...options, ""] });
  }

  function removeOption(questionIndex: number, optionIndex: number) {
    const options = form.getValues(`questions.${questionIndex}.options`) || [];
    options.splice(optionIndex, 1);
    const currentQuestion = fields[questionIndex];
    update(questionIndex, { ...currentQuestion, options: options });
  }

  async function onSubmit(data: SurveyCreationValues) {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to create a survey.", variant: "destructive" });
      return;
    }
    if (data.surveyType === "add-to-existing") {
        toast({ title: "Feature Not Implemented", description: "'Add to Existing Deck' is coming soon!", variant: "default" });
        return;
    }

    setFormProcessing(true);
    console.log("Survey data:", data);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setFormProcessing(false);
    toast({
      title: "Survey Created!",
      description: `Your survey "${data.title}" has been successfully created.`,
    });
    router.push("/dashboard");
  }

  if (authLoading) {
    return <div className="text-center py-10">Loading form...</div>;
  }

  if (!user) {
    return <div className="text-center py-10">Redirecting to login...</div>;
  }

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Create New Survey</CardTitle>
        <CardDescription>Build your survey content and set its properties.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Survey Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Customer Feedback Survey" {...field} />
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
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Briefly describe your survey." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="surveyType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Survey Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="single-card" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Single Card (one question, shared publicly)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="card-deck" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Card Deck (a series of questions)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="add-to-existing" disabled />
                        </FormControl>
                        <FormLabel className="font-normal text-muted-foreground">
                          Add to Existing Deck (coming soon)
                        </FormLabel>
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
                name="privacy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Privacy Settings (for Card Deck)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || "public"}>
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


            <div>
              <FormLabel className="text-lg font-medium">Questions</FormLabel>
              {fields.map((field, index) => (
                <Card key={field.id} className="mt-4 p-4 space-y-4 bg-muted/50 border relative">
                  <div className="flex items-center justify-between">
                     <FormLabel className="text-md">Question {index + 1}</FormLabel>
                     <div className="flex items-center gap-2">
                        {(fields.length > 1 || watchedSurveyType !== "single-card") && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => remove(index)} 
                            className="text-destructive/80 hover:text-destructive"
                            disabled={watchedSurveyType === "single-card" && fields.length <= 1}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        )}
                     </div>
                  </div>
                  <FormField
                    control={form.control}
                    name={`questions.${index}.text`}
                    render={({ field: qField }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Enter your question text" {...qField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`questions.${index}.type`}
                    render={({ field: qField }) => (
                      <FormItem>
                        <Select onValueChange={qField.onChange} defaultValue={qField.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select question type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="text">Text Input</SelectItem>
                            <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                            <SelectItem value="rating">Rating (1-5)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {form.watch(`questions.${index}.type`) === 'multiple-choice' && (
                    <div className="space-y-2 pl-4 border-l-2 border-accent ml-2">
                      <FormLabel className="text-sm">Options</FormLabel>
                      {form.watch(`questions.${index}.options`)?.map((_, optionIndex) => (
                        <FormField
                          key={`${field.id}-option-${optionIndex}`}
                          control={form.control}
                          name={`questions.${index}.options.${optionIndex}`}
                          render={({ field: optionField }) => (
                            <FormItem className="flex items-center gap-2">
                              <FormControl>
                                <Input placeholder={`Option ${optionIndex + 1}`} {...optionField} />
                              </FormControl>
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(index, optionIndex)} className="text-destructive/70 hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => addOption(index)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Option
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => append({ text: "", type: "text", options: [] })}
                disabled={watchedSurveyType === "single-card" && fields.length >= 1}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Question
              </Button>
            </div>

            <Button type="submit" className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" disabled={formProcessing || authLoading || watchedSurveyType === "add-to-existing"}>
             {formProcessing ? "Creating Survey..." : "Create Survey"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
