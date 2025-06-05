
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
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Eye } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

const questionSchema = z.object({
  text: z.string().min(5, "Question text must be at least 5 characters."),
  type: z.literal("multiple-choice"), // Only multiple-choice is allowed for now
  options: z.array(z.string().min(1, "Option text cannot be empty."))
    .min(1, "At least one option is required.")
    .max(5, "A maximum of 5 options are allowed."),
});

const surveyCreationSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").optional(),
  description: z.string().optional(),
  surveyType: z.enum(["single-card", "card-deck", "add-to-existing"], {
    required_error: "Please select a survey type.",
  }),
  questions: z.array(questionSchema).min(1, "Survey must have at least one question."),
  privacy: z.enum(["public", "invite-only"]).optional(),
}).superRefine((data, ctx) => {
  if (data.surveyType === "card-deck") {
    if (!data.title) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Survey title is required for Card Decks.",
        path: ["title"],
      });
    }
    if (!data.privacy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Privacy setting is required for Card Decks.",
        path: ["privacy"],
      });
    }
  }
  if (data.surveyType === "single-card") {
    if (data.questions.length !== 1) {
       ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Single Card surveys must have exactly one question.",
        path: ["questions"],
      });
    }
  }
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
      surveyType: "card-deck",
      questions: [{ text: "", type: "multiple-choice", options: [""] }],
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
    if (watchedSurveyType === "single-card") {
      if (fields.length > 1) {
        for (let i = fields.length - 1; i > 0; i--) {
          remove(i);
        }
      }
      if (fields.length === 0) {
        append({ text: "", type: "multiple-choice", options: [""] });
      }
      form.setValue("privacy", undefined); 
    } else if (watchedSurveyType === "card-deck") {
      if (!form.getValues("privacy")) {
        form.setValue("privacy", "public");
      }
       if (fields.length === 0) { // Ensure at least one question for card-deck if empty
        append({ text: "", type: "multiple-choice", options: [""] });
      }
    }
  }, [watchedSurveyType, fields.length, remove, append, form]);


  function addOption(questionIndex: number) {
    const currentOptions = form.getValues(`questions.${questionIndex}.options`) || [];
    if (currentOptions.length < 5) {
      const currentQuestion = fields[questionIndex];
      update(questionIndex, { ...currentQuestion, options: [...currentOptions, ""] });
    }
  }

  function removeOption(questionIndex: number, optionIndex: number) {
    const currentOptions = form.getValues(`questions.${questionIndex}.options`) || [];
    if (currentOptions.length > 1) { // Prevent removing the last option
        currentOptions.splice(optionIndex, 1);
        const currentQuestion = fields[questionIndex];
        update(questionIndex, { ...currentQuestion, options: currentOptions });
    } else {
        toast({
            title: "Cannot Remove Option",
            description: "A multiple-choice question must have at least one option.",
            variant: "default"
        });
    }
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
    if (data.surveyType === "single-card") {
        data.title = undefined; 
    }

    setFormProcessing(true);
    console.log("Survey data:", data);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setFormProcessing(false);
    toast({
      title: "Survey Created!",
      description: `Your survey "${data.title || 'Single Card'}" has been successfully created.`,
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
              name="surveyType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>1. What type of survey are you creating?</FormLabel>
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
                          Single Card (one question, shared publicly, no title needed)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="card-deck" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Card Deck (a series of questions, requires a title)
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
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>2. Survey Title (for Card Deck)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Customer Feedback Survey" {...field} />
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
                  <FormLabel>{watchedSurveyType === "card-deck" ? "3.": "2."} Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Briefly describe your survey or the single card's purpose." {...field} />
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
                    <FormLabel>4. Privacy Settings (for Card Deck)</FormLabel>
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
              <FormLabel className="text-lg font-medium">
                {watchedSurveyType === "single-card" ? "3. Your Question" : 
                 watchedSurveyType === "card-deck" ? "5. Questions" : "Questions"}
              </FormLabel>
              {fields.map((item, index) => (
                <div key={item.id} className="mt-4 p-4 space-y-4 bg-muted/50 border rounded-lg relative">
                  <div className="flex items-center justify-between">
                     <FormLabel className="text-md">
                       {watchedSurveyType === "single-card" ? "Question Content" : `Question ${index + 1}`}
                     </FormLabel>
                     {watchedSurveyType !== "single-card" && fields.length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => remove(index)} 
                          className="text-destructive/80 hover:text-destructive"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                     )}
                  </div>
                  <FormField
                    control={form.control}
                    name={`questions.${index}.text`}
                    render={({ field: qField }) => (
                      <FormItem>
                        <FormLabel>Question Text</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your question text" {...qField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                 
                  <FormItem>
                    <FormLabel>Question Type</FormLabel>
                    <Input value="Multiple Choice" disabled className="bg-card" />
                    <FormDescription>Currently, only multiple-choice questions are supported.</FormDescription>
                  </FormItem>
                  
                  {/* Hidden field to ensure 'type' is part of the form data */}
                  <FormField
                    control={form.control}
                    name={`questions.${index}.type`}
                    defaultValue="multiple-choice"
                    render={({ field: qField }) => (
                      <input type="hidden" {...qField} />
                    )}
                  />

                  <div className="space-y-2 pl-4 border-l-2 border-accent ml-2">
                    <FormLabel className="text-sm">Options (max 5)</FormLabel>
                    {(form.watch(`questions.${index}.options`) || []).map((_, optionIndex) => (
                      <FormField
                        key={`${item.id}-option-${optionIndex}`}
                        control={form.control}
                        name={`questions.${index}.options.${optionIndex}`}
                        render={({ field: optionField }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormControl>
                              <Input placeholder={`Option ${optionIndex + 1}`} {...optionField} />
                            </FormControl>
                            {(form.getValues(`questions.${index}.options`) || []).length > 1 && (
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(index, optionIndex)} className="text-destructive/70 hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => addOption(index)}
                      disabled={(form.watch(`questions.${index}.options`) || []).length >= 5}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Option
                    </Button>
                    <FormMessage>{form.formState.errors.questions?.[index]?.options?.message}</FormMessage>
                  </div>

                  {/* Preview Section */}
                  <Card className="mt-6 bg-background shadow-md">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center"><Eye className="mr-2 h-5 w-5 text-muted-foreground" /> Card Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="p-4 border border-dashed rounded-lg min-h-[100px]">
                        <p className="font-semibold mb-3 text-primary">
                          {form.watch(`questions.${index}.text`) || "Your question will appear here..."}
                        </p>
                        <RadioGroup className="space-y-2">
                          {(form.watch(`questions.${index}.options`) || []).filter(opt => opt.trim() !== "").map((opt, optIdx) => (
                            <div key={`preview-${item.id}-opt-${optIdx}`} className="flex items-center space-x-3 p-2.5 border rounded-md bg-card hover:bg-muted/20 transition-colors">
                              <RadioGroupItem 
                                value={opt || `option-${optIdx}`} 
                                id={`preview-item-${item.id}-opt-${optIdx}`} 
                                disabled 
                                className="border-primary/50 data-[state=checked]:bg-primary/30"
                              />
                              <Label 
                                htmlFor={`preview-item-${item.id}-opt-${optIdx}`} 
                                className="flex-grow text-sm cursor-default text-card-foreground/80"
                              >
                                {opt}
                              </Label>
                            </div>
                          ))}
                          {(!form.watch(`questions.${index}.options`) || form.watch(`questions.${index}.options`)?.every(o => o.trim() === "")) && (
                            <p className="text-xs text-muted-foreground italic py-2">Options you add will appear here.</p>
                          )}
                        </RadioGroup>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
              {watchedSurveyType !== "single-card" && watchedSurveyType !== "add-to-existing" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => append({ text: "", type: "multiple-choice", options: [""] })}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Question
                </Button>
              )}
            </div>

            <Button 
                type="submit" 
                className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" 
                disabled={formProcessing || authLoading || watchedSurveyType === "add-to-existing"}
            >
             {formProcessing ? "Creating Survey..." : "Create Survey"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

    