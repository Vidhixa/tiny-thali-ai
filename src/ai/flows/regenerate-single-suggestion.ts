'use server';
/**
 * @fileOverview AI agent that generates a single new food suggestion (name only) for a baby's weekly meal plan.
 *
 * - regenerateSingleSuggestion - A function that generates one new food suggestion name.
 * - RegenerateSingleSuggestionInput - The input type for the function.
 * - RegenerateSingleSuggestionOutput - The return type for the function (the new suggestion name).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input schema for regenerating a single suggestion name
const RegenerateSingleSuggestionInputSchema = z.object({
  babyName: z.string().describe("The baby's name for personalization."),
  babyAgeMonths: z.number().min(6).max(24).describe("The baby's age in months."),
  allergies: z.array(z.string()).describe("A list of the baby's known allergies."),
  foodPreferences: z.array(z.string()).min(1).describe("A list of the baby's favorite foods."),
  dayName: z.string().describe("The name of the day for which the suggestion is needed (e.g., Monday)."),
  existingSuggestionsForDay: z.array(z.string()).describe("A list of OTHER food suggestion NAMES already planned for that day, to ensure variety."),
  itemToReplace: z.string().describe("The specific food item NAME that needs a replacement (could be a placeholder like 'Tap refresh...')."),
});
export type RegenerateSingleSuggestionInput = z.infer<typeof RegenerateSingleSuggestionInputSchema>;

// Output schema is just the name of the new suggestion (string).
const RegenerateSingleSuggestionOutputSchema = z.object({
  newSuggestionName: z.string().describe("The name of the single, new food suggestion."),
});
export type RegenerateSingleSuggestionOutput = z.infer<typeof RegenerateSingleSuggestionOutputSchema>;


export async function regenerateSingleSuggestion(input: RegenerateSingleSuggestionInput): Promise<RegenerateSingleSuggestionOutput> {
  return regenerateSingleSuggestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'regenerateSingleSuggestionNamePrompt',
  input: {schema: RegenerateSingleSuggestionInputSchema},
  output: {schema: RegenerateSingleSuggestionOutputSchema},
  prompt: `You are a pediatric nutritionist AI.
The baby's name is {{babyName}}. The baby is {{babyAgeMonths}} months old.
Known allergies: {{#if allergies}}{{#each allergies}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}None specified{{/if}}.
Baby's favorite foods: {{#if foodPreferences}}{{#each foodPreferences}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}None specified{{/if}}.

Dietary Requirements: The new suggestion must be vegetarian (no meat, no fish). Eggs are acceptable.

The user is planning meals for {{dayName}}.
The food item '{{itemToReplace}}' needs a new suggestion.
Other existing food NAMES for {{dayName}} are: {{#if existingSuggestionsForDay}}{{#each existingSuggestionsForDay}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}None{{/if}}.

Please provide the NAME of a single, new, age-appropriate food suggestion for {{dayName}}.
This new suggestion NAME MUST be different from '{{itemToReplace}}' (if '{{itemToReplace}}' is not a placeholder).
It should ideally also be different from the other existing suggestions for the day to ensure variety.
The suggestion should avoid all listed allergens and try to incorporate some of the favorite foods if appropriate and balanced.
The response must be just the new food suggestion NAME. Do not include any other text, nutritional info, or preparation tips.`,
});

const regenerateSingleSuggestionFlow = ai.defineFlow(
  {
    name: 'regenerateSingleSuggestionFlow',
    inputSchema: RegenerateSingleSuggestionInputSchema,
    outputSchema: RegenerateSingleSuggestionOutputSchema,
  },
  async (input): Promise<RegenerateSingleSuggestionOutput> => {
    const resultFromNamePrompt = await prompt(input);
    
    if (!resultFromNamePrompt.output || !resultFromNamePrompt.output.newSuggestionName) {
      console.warn("AI failed to generate a suggestion name, using fallback.");
      const fallbackSuggestions = ["Steamed apple slices", "Mashed banana", "Cooked sweet potato puree", "Avocado pieces", "Plain yogurt with fruit", "Soft-cooked scrambled egg", "Oatmeal porridge"];
      const randomFallbackName = fallbackSuggestions[Math.floor(Math.random() * fallbackSuggestions.length)];
      return { newSuggestionName: randomFallbackName };
    }
    return { newSuggestionName: resultFromNamePrompt.output.newSuggestionName };
  }
);
