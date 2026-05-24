
'use server';
/**
 * @fileOverview AI agent that estimates the nutritional content of a single food item.
 *
 * - evaluateFoodItemNutrients - A function that estimates nutrients for a food item.
 * - EvaluateFoodItemNutrientsInput - The input type for the function.
 * - EvaluateFoodItemNutrientsOutput - The return type for the function.
 * - EstimatedNutrients - TypeScript type for the nutrient breakdown.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Schema is defined internally and not exported directly
const EstimatedNutrientsSchemaInternal = z.object({
  proteinGrams: z.number().optional().describe("Estimated protein in grams. Provide a numeric estimate if at all possible. Omit only if truly unknown after best effort."),
  fatGrams: z.number().optional().describe("Estimated fat in grams. Provide a numeric estimate if at all possible. Omit only if truly unknown after best effort."),
  carbohydratesGrams: z.number().optional().describe("Estimated carbohydrates in grams. Provide a numeric estimate if at all possible. Omit only if truly unknown after best effort."),
  calciumMg: z.number().optional().describe("Estimated calcium in milligrams. Provide a numeric estimate if at all possible. Omit only if truly unknown after best effort."),
  ironMg: z.number().optional().describe("Estimated iron in milligrams. Provide a numeric estimate if at all possible. Omit only if truly unknown after best effort."),
  energyKcal: z.number().optional().describe("Estimated energy in kilocalories. Provide a numeric estimate if at all possible. Omit only if truly unknown after best effort."),
});
export type EstimatedNutrients = z.infer<typeof EstimatedNutrientsSchemaInternal>;

const EvaluateFoodItemNutrientsInputSchema = z.object({
  itemName: z.string().describe("The name of the food item to evaluate (e.g., 'Mashed Banana', 'Lentil Soup')."),
  babyAgeMonths: z.number().min(6).max(24).describe("The baby's age in months, to consider portion size and typical preparations."),
});
export type EvaluateFoodItemNutrientsInput = z.infer<typeof EvaluateFoodItemNutrientsInputSchema>;

const EvaluateFoodItemNutrientsOutputSchema = z.object({
  estimatedNutrients: EstimatedNutrientsSchemaInternal.nullable().describe("The estimated nutritional content of the item. Null if evaluation is not possible or item is too generic."),
});
export type EvaluateFoodItemNutrientsOutput = z.infer<typeof EvaluateFoodItemNutrientsOutputSchema>;


export async function evaluateFoodItemNutrients(input: EvaluateFoodItemNutrientsInput): Promise<EvaluateFoodItemNutrientsOutput> {
  return evaluateFoodItemNutrientsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'evaluateFoodItemNutrientsPrompt',
  input: {schema: EvaluateFoodItemNutrientsInputSchema},
  output: {schema: EvaluateFoodItemNutrientsOutputSchema},
  prompt: `You are a nutritional analysis AI.
Given a food item name and a baby's age in months, estimate its typical nutritional content for a single, age-appropriate serving.
Food Item: {{itemName}}
Baby's Age: {{babyAgeMonths}} months

Derive common ingredients for this item if it's a simple dish (e.g., 'Mashed Banana' is banana; 'Lentil Soup' is lentils, vegetables). For single ingredients, analyze directly.
Derive serving size based on the age of the baby.
Provide estimates for: protein (grams), fat (grams), carbohydrates (grams), calcium (mg), iron (mg), and energy (kcal).

CRITICAL INSTRUCTION: If a specific nutrient value cannot be reasonably estimated as a number, OMIT that field entirely from the 'estimatedNutrients' object. Do NOT set individual nutrient fields to 'null', 'N/A', 'unknown', or any string. The field must either be a number or be absent.
Strive to provide all requested nutrient fields if a reasonable numeric estimate can be made.
If no nutrients can be estimated at all (e.g., for water or a very generic term like 'snack'), the entire 'estimatedNutrients' field should be 'null'.
Do not include units in the numeric values, only the numbers.
Output strictly according to the schema.

Example for 'Mashed Banana' for a 7-month-old (approx 1/2 medium banana):
{ "estimatedNutrients": { "proteinGrams": 0.6, "fatGrams": 0.2, "carbohydratesGrams": 13, "calciumMg": 3, "ironMg": 0.2, "energyKcal": 55 } }
Example for 'Lentil Soup' for a 10-month-old (approx 1/2 cup):
{ "estimatedNutrients": { "proteinGrams": 5, "fatGrams": 2, "carbohydratesGrams": 15, "calciumMg": 20, "ironMg": 2, "energyKcal": 100 } }
Example for 'Cooked Spinach' for an 8-month-old where iron is hard to estimate precisely but others are known (AI should still try for iron, but if it can't, it omits ironMg):
{ "estimatedNutrients": { "proteinGrams": 1.5, "carbohydratesGrams": 2, "calciumMg": 50, "energyKcal": 15 } }
Example for 'Water':
{ "estimatedNutrients": null }
Example for 'Some obscure food with no data' where only protein is estimable:
{ "estimatedNutrients": { "proteinGrams": 1.2 } }
`,
});


const evaluateFoodItemNutrientsFlow = ai.defineFlow(
  {
    name: 'evaluateFoodItemNutrientsFlow',
    inputSchema: EvaluateFoodItemNutrientsInputSchema,
    outputSchema: EvaluateFoodItemNutrientsOutputSchema,
  },
  async (input) => {
    const genericTerms = ["fruit", "vegetable", "snack", "meal", "cereal", "drink", "idea", "refresh"];
    if (genericTerms.some(term => input.itemName.toLowerCase().includes(term) && input.itemName.toLowerCase().split(" ").length < 4) || input.itemName.toLowerCase() === "water" || input.itemName.toLowerCase().includes("tap refresh")) {
      console.log(`[evaluateFoodItemNutrientsFlow] Item "${input.itemName}" is too generic or a placeholder, returning null.`);
      return { estimatedNutrients: null };
    }

    const result = await prompt(input);
    if (!result.output) {
      console.warn(`[evaluateFoodItemNutrientsFlow] AI did not return output for "${input.itemName}".`);
      return { estimatedNutrients: null };
    }
    // Ensure that if estimatedNutrients is an empty object, it becomes null
    if (result.output.estimatedNutrients && Object.keys(result.output.estimatedNutrients).length === 0) {
        console.log(`[evaluateFoodItemNutrientsFlow] AI returned empty estimatedNutrients object for "${input.itemName}", converting to null.`);
        result.output.estimatedNutrients = null;
    }
    console.log(`[evaluateFoodItemNutrientsFlow] AI output for "${input.itemName}":`, JSON.stringify(result.output));
    return result.output;
  }
);
