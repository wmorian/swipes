
'use server';
/**
 * @fileOverview Generates a daily poll question and options.
 *
 * - generateDailyPoll - A function that creates a poll question with multiple choice options.
 * - GenerateDailyPollOutput - The return type for the generateDailyPoll function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// No specific input needed for a generic daily poll, but schema is good practice
const GenerateDailyPollInputSchema = z.object({
  theme: z.string().optional().describe('Optional theme for the poll question (e.g., "food", "travel", "technology"). If not provided, a general interest question will be generated.'),
});
export type GenerateDailyPollInput = z.infer<typeof GenerateDailyPollInputSchema>;


const GenerateDailyPollOutputSchema = z.object({
  questionText: z.string().describe('The engaging poll question.'),
  options: z.array(z.string()).length(3, "Must provide exactly 3 options.").describe('An array of 3 plausible multiple-choice answers for the poll question.'),
});
export type GenerateDailyPollOutput = z.infer<typeof GenerateDailyPollOutputSchema>;

export async function generateDailyPoll(input?: GenerateDailyPollInput): Promise<GenerateDailyPollOutput> {
  return dailyPollFlow(input || {});
}

const prompt = ai.definePrompt({
  name: 'dailyPollPrompt',
  input: {schema: GenerateDailyPollInputSchema},
  output: {schema: GenerateDailyPollOutputSchema},
  prompt: `
    You are an AI that creates engaging daily poll questions for a general audience.
    Your goal is to generate a single, interesting multiple-choice question with exactly 3 distinct and plausible answer options.
    The question should be light-hearted, thought-provoking, or fun. Avoid controversial topics.
    {{#if theme}}
    Generate a question related to the theme: {{{theme}}}.
    {{else}}
    Generate a general interest question. It could be a "this or that" type, a fun fact based question, or a simple preference question.
    {{/if}}
    Ensure the question is clear and concise.
    Provide exactly 3 unique answer options. The options should be brief.
  `,
  config: {
    temperature: 0.8, // Slightly more creative
     safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  }
});

const dailyPollFlow = ai.defineFlow(
  {
    name: 'dailyPollFlow',
    inputSchema: GenerateDailyPollInputSchema,
    outputSchema: GenerateDailyPollOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("Failed to generate daily poll content.");
    }
    // Ensure options array has exactly 3 items, pad if necessary (though schema should enforce)
    // This is a fallback, ideally the model adheres to the count.
    while (output.options.length < 3) {
      output.options.push("Another option");
    }
    if (output.options.length > 3) {
        output.options = output.options.slice(0, 3);
    }
    return output;
  }
);
