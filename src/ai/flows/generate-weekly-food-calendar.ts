'use server';
/**
 * @fileOverview AI agent that generates a 7-day food calendar (names only) for a baby, considering nutritional needs.
 *
 * - generateWeeklyFoodCalendar - A function that generates the weekly food calendar names.
 * - GenerateWeeklyFoodCalendarInput - The input type for the function.
 * - GenerateWeeklyFoodCalendarOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { NUTRITIONAL_REQUIREMENTS_DATA, type NutritionalRequirement } from '@/lib/constants';

// Schema for a single day's food suggestion names
const DailyFoodSuggestionNamesSchema = z.object({
  day: z.string().describe("Name of the day, e.g., Monday, Tuesday."),
  suggestions: z.array(z.string()).length(3).describe("A list of exactly 3 food suggestion NAMES for the day (breakfast, lunch, dinner)."),
});

// Input schema for the main flow
const GenerateWeeklyFoodCalendarInputSchema = z.object({
  babyName: z.string().describe("The baby's name for personalization."),
  babyAgeMonths: z.number().min(6).max(24).describe("The baby's age in months."),
  allergies: z.array(z.string()).describe("A list of the baby's known allergies."),
  foodPreferences: z.array(z.string()).min(1).describe("A list of the baby's favorite foods."),
});
export type GenerateWeeklyFoodCalendarInput = z.infer<typeof GenerateWeeklyFoodCalendarInputSchema>;

// Schema for nutritional requirements (remains the same)
const NutritionalRequirementSchema = z.object({
  ageMonthsRange: z.string(),
  energyKcalPerDay: z.string(),
  proteinGramsPerDay: z.number(),
  fatGramsPerDay: z.number(),
  carbohydratesPercentEnergy: z.string(),
  calciumMgPerDay: z.number(),
  ironMgPerDay: z.number(),
  vitaminDIUPerDay: z.number(),
});

// Output schema for the main flow: calendar with food names and the targets used
// Suggestions are now just names (strings). Nutrient evaluation is done on-demand by the client.
const GenerateWeeklyFoodCalendarOutputSchema = z.object({
  calendar: z.array(DailyFoodSuggestionNamesSchema).length(7).describe("A 7-day calendar of food suggestion names."),
  nutritionalTargetsUsed: NutritionalRequirementSchema.describe("The daily nutritional targets used as a guideline."),
});
export type GenerateWeeklyFoodCalendarOutput = z.infer<typeof GenerateWeeklyFoodCalendarOutputSchema>;

// Internal schema for the prompt, including target nutrients
const GenerateWeeklyFoodCalendarPromptInputSchema = GenerateWeeklyFoodCalendarInputSchema.extend({
  targetNutrients: NutritionalRequirementSchema,
});


export async function generateWeeklyFoodCalendar(input: GenerateWeeklyFoodCalendarInput): Promise<GenerateWeeklyFoodCalendarOutput> {
  return generateWeeklyFoodCalendarFlow(input);
}

// AI prompt to generate only food suggestion names
const generateFoodNamesPrompt = ai.definePrompt({
  name: 'generateWeeklyFoodNamesPrompt',
  input: {schema: GenerateWeeklyFoodCalendarPromptInputSchema},
  output: {schema: GenerateWeeklyFoodCalendarOutputSchema.pick({ calendar: true }) }, // Output only names
  prompt: `You are a pediatric nutritionist AI, expert in creating balanced and age-appropriate weekly food suggestions for babies.
The baby's name is {{babyName}}. The baby is {{babyAgeMonths}} months old.
Known allergies: {{#if allergies}}{{#each allergies}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}None specified{{/if}}.
Baby's favorite foods: {{#if foodPreferences}}{{#each foodPreferences}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}None specified{{/if}}.

Daily Nutritional Targets for a baby in the {{targetNutrients.ageMonthsRange}} months age range:
- Energy: {{{targetNutrients.energyKcalPerDay}}} kcal
- Protein: {{{targetNutrients.proteinGramsPerDay}}} g
- Fat: {{{targetNutrients.fatGramsPerDay}}} g
- Carbohydrates: {{{targetNutrients.carbohydratesPercentEnergy}}} of total energy
- Calcium: {{{targetNutrients.calciumMgPerDay}}} mg
- Iron: {{{targetNutrients.ironMgPerDay}}} mg
- Vitamin D: {{{targetNutrients.vitaminDIUPerDay}}} IU

Dietary Requirements: All suggestions must be vegetarian (no meat, no fish). Eggs are acceptable. Focus on plant-based proteins and a variety of vegetables and fruits.

Generate a 7-day food calendar. For each day, provide a list of exactly three diverse food suggestion NAMES.
These names should be appropriate for breakfast, lunch, and dinner respectively.
The combination of these three suggestions for each day should aim to meet the specified daily nutritional targets.
The output must be for 7 distinct days.
Ensure variety. Focus on simple, nutritious options that avoid allergens and try to incorporate favorite foods.
The response should strictly follow the output schema (only the calendar array with day names and lists of food suggestion STRINGS).
Do NOT include any preparation tips, nutritional breakdowns per meal, or any other information beyond the food names.`,
});

// Main flow definition
const generateWeeklyFoodCalendarFlow = ai.defineFlow(
  {
    name: 'generateWeeklyFoodCalendarFlow',
    inputSchema: GenerateWeeklyFoodCalendarInputSchema,
    outputSchema: GenerateWeeklyFoodCalendarOutputSchema,
  },
  async (input: GenerateWeeklyFoodCalendarInput) : Promise<GenerateWeeklyFoodCalendarOutput> => {
    let determinedTargetNutrients: NutritionalRequirement | undefined;
    const age = input.babyAgeMonths;

    if (age >= 6 && age <= 8) {
      determinedTargetNutrients = NUTRITIONAL_REQUIREMENTS_DATA.find(n => n.ageMonthsRange === "6-8");
    } else if (age >= 9 && age <= 11) {
      determinedTargetNutrients = NUTRITIONAL_REQUIREMENTS_DATA.find(n => n.ageMonthsRange === "9-11");
    } else if (age >= 12 && age <= 17) {
      determinedTargetNutrients = NUTRITIONAL_REQUIREMENTS_DATA.find(n => n.ageMonthsRange === "12-17");
    } else if (age >= 18 && age <= 24) {
      determinedTargetNutrients = NUTRITIONAL_REQUIREMENTS_DATA.find(n => n.ageMonthsRange === "18-24");
    }

    if (!determinedTargetNutrients) {
      throw new Error(`Could not determine nutritional requirements for age ${age} months.`);
    }
    
    const promptInput = { // Type assertion is okay here as we've validated determinedTargetNutrients
      ...input,
      targetNutrients: determinedTargetNutrients
    };

    const namesResult = await generateFoodNamesPrompt(promptInput);
    if (!namesResult.output || !namesResult.output.calendar) {
      throw new Error("No calendar (food names) received from the AI model.");
    }

    return {
      calendar: namesResult.output.calendar,
      nutritionalTargetsUsed: determinedTargetNutrients,
    };
  }
);
