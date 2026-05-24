
'use server';
/**
 * @fileOverview AI agent that analyzes a recipe to provide a detailed nutritional breakdown
 * (protein, fats, carbohydrates) and estimated ingredients for a baby.
 *
 * - analyzeRecipeNutrientsDetailed - A function that performs the analysis.
 * - RecipeAnalysisInput - The input type for the function.
 * - RecipeAnalysisOutput - The return type for the function.
 * - EstimatedRecipeNutrients - Detailed nutrient breakdown for the recipe.
 * - IngredientDetail - Nutrient breakdown for a single ingredient.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EstimatedRecipeNutrientsSchema = z.object({
  proteinGrams: z.number().describe("Total estimated protein in grams for the serving."),
  fatGrams: z.number().describe("Total estimated fat in grams for the serving."),
  carbohydratesGrams: z.number().describe("Total estimated carbohydrates in grams for the serving."),
});
export type EstimatedRecipeNutrients = z.infer<typeof EstimatedRecipeNutrientsSchema>;

const IngredientDetailSchema = z.object({
  ingredient: z.string().describe("Name of the ingredient. If a substitution for a similar ingredient was made due to lack of data, note it here (e.g., 'Sorghum (estimated similar to Oats)')."),
  quantity: z.string().describe("Estimated quantity of the ingredient used in the serving (e.g., '1/2 cup', '30g', '1 small')."),
  proteinGrams: z.number().describe("Estimated protein in grams for this quantity of the ingredient."),
  fatGrams: z.number().describe("Estimated fat in grams for this quantity of the ingredient."),
  carbohydratesGrams: z.number().describe("Estimated carbohydrates in grams for this quantity of the ingredient."),
});
export type IngredientDetail = z.infer<typeof IngredientDetailSchema>;

const RecipeAnalysisInputSchema = z.object({
  recipeName: z.string().describe("The name of the recipe to analyze (e.g., 'Mashed Banana and Oatmeal', 'Spinach Dal')."),
  babyAgeMonths: z.number().min(6).max(24).describe("The baby's age in months, to adjust serving size and ingredient appropriateness."),
});
export type RecipeAnalysisInput = z.infer<typeof RecipeAnalysisInputSchema>;

const RecipeAnalysisOutputSchema = z.object({
  estimatedTotalNutrients: EstimatedRecipeNutrientsSchema.describe("The total estimated macronutrients for one serving of the recipe."),
  detailedBreakdown: z.array(IngredientDetailSchema).describe("A list of identified ingredients with their estimated quantities and macronutrient contributions."),
  servingSizeNotes: z.string().describe("Notes about the estimated serving size, e.g., 'Estimated for one serving for a X-month-old baby.'"),
});
export type RecipeAnalysisOutput = z.infer<typeof RecipeAnalysisOutputSchema>;


export async function analyzeRecipeNutrientsDetailed(input: RecipeAnalysisInput): Promise<RecipeAnalysisOutput> {
  return analyzeRecipeNutrientsDetailedFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeRecipeNutrientsDetailedPrompt',
  input: {schema: RecipeAnalysisInputSchema},
  output: {schema: RecipeAnalysisOutputSchema},
  prompt: `You are an expert pediatric nutritionist AI.
Your task is to analyze a given recipe name, estimate its ingredients and their quantities for an age-appropriate serving for a baby, and then calculate the total protein, fats, and carbohydrates for that serving.

Recipe Name: {{recipeName}}
Baby's Age: {{babyAgeMonths}} months

Follow these steps carefully:
1.  **Identify Common Ingredients**: Based on the '{{recipeName}}', list the most common and primary ingredients. For example, for "Mashed Banana and Oatmeal," ingredients would be "Banana" and "Rolled Oats." For "Spinach Dal," ingredients would be "Spinach," "Lentils (e.g., Moong Dal)," "Ghee/Oil," and optionally "Tomato," "Onion," "minimal spices."
2.  **Estimate Serving Size & Ingredient Quantities**: Determine a typical, single serving size of the '{{recipeName}}' appropriate for a baby of {{babyAgeMonths}} months. Then, estimate the quantity of each identified ingredient within that single serving (e.g., Banana: 1/2 medium, Rolled Oats: 2 tablespoons dry, Cooked Moong Dal: 1/4 cup). Be realistic about portion sizes for this age.
3.  **Lookup Nutritional Facts**: For each ingredient and its estimated quantity from step 2, find its protein (g), fat (g), and carbohydrate (g) content.
    -   Prioritize reliable nutritional databases as your primary source.
    -   State the form of the ingredient if relevant (e.g., "cooked", "raw", "steamed") in the 'ingredient' field description if not part of the main name.
    -   **Handling Missing Data (Prioritized Order):**
        1.  **Specific Preparation Not Found:** If nutritional data for a specific preparation (e.g., "steamed carrots") isn't available, use the data for the closest raw or commonly prepared equivalent of the *same* ingredient (e.g., "raw carrots" or "boiled carrots"). Make a best estimate and note the form used in the 'ingredient' name if it clarifies (e.g. "Carrots, raw equivalent").
        2.  **Ingredient Data Scarce:** If nutritional data for the ingredient *itself* (even in raw or other common forms) is very scarce or unavailable, as a last resort, you may estimate using data from a *functionally similar* ingredient (e.g., if 'amaranth flour' data is unavailable, you might *cautiously* reference 'whole wheat flour' data). If you do this, YOU MUST explicitly mention the substitution in the 'ingredient' field (e.g., "Amaranth Flour (estimated similar to Whole Wheat Flour)"). This should be used sparingly and only when no reasonable direct data for the original ingredient can be found. If no similar ingredient can be used for a reasonable estimate, omit the problematic ingredient from the breakdown and note its omission in 'servingSizeNotes'.
4.  **Calculate Total Nutrients**: Sum the protein, fat, and carbohydrate values from all ingredients (from step 3) to get the total estimated nutritional content for the recipe serving.
5.  **Provide Breakdown**: In the 'detailedBreakdown' array, list each ingredient, its estimated quantity (as a string like "1/2 cup"), and its individual contribution to protein, fat, and carbs for that quantity.
6.  **Serving Size Notes**: Briefly describe the basis for your serving size estimation in 'servingSizeNotes'. If any ingredients were omitted from breakdown due to lack of data, mention it here.

IMPORTANT:
- Focus ONLY on protein, fat, and carbohydrates. Do not include other micronutrients in this analysis.
- Ensure all numeric fields in the output (grams) are numbers, not strings.
- The 'quantity' field for each ingredient should be a descriptive string.
- If the recipe name is too generic or seems like a single ingredient (e.g., "Apple Slices", "Water"), make a best effort to treat it as such for the purpose of providing a breakdown if possible, or indicate if a breakdown is not meaningful in servingSizeNotes. For "Apple Slices", the ingredient would be "Apple".
- Output strictly according to the defined JSON schema.

Example for 'Mashed Banana and Oatmeal' for a 7-month-old:
{
  "estimatedTotalNutrients": {
    "proteinGrams": 2.5,
    "fatGrams": 1.8,
    "carbohydratesGrams": 20.0
  },
  "detailedBreakdown": [
    {
      "ingredient": "Banana, ripe, mashed",
      "quantity": "1/2 medium (approx 60g)",
      "proteinGrams": 0.6,
      "fatGrams": 0.2,
      "carbohydratesGrams": 13.7
    },
    {
      "ingredient": "Rolled Oats, dry (cooked with water)",
      "quantity": "2 tablespoons (approx 15g dry)",
      "proteinGrams": 1.9,
      "fatGrams": 1.6,
      "carbohydratesGrams": 10.3
    }
  ],
  "servingSizeNotes": "Estimated for one serving (approx 1/2 to 3/4 cup prepared) for a 7-month-old baby."
}
`,
});

const analyzeRecipeNutrientsDetailedFlow = ai.defineFlow(
  {
    name: 'analyzeRecipeNutrientsDetailedFlow',
    inputSchema: RecipeAnalysisInputSchema,
    outputSchema: RecipeAnalysisOutputSchema,
  },
  async (input) => {
    const result = await prompt(input);
    if (!result.output) {
      console.warn(`[analyzeRecipeNutrientsDetailedFlow] AI did not return output for "${input.recipeName}".`);
      throw new Error(`The AI could not provide a nutritional analysis for "${input.recipeName}".`);
    }
    console.log(`[analyzeRecipeNutrientsDetailedFlow] AI output for "${input.recipeName}":`, JSON.stringify(result.output));
    return result.output;
  }
);

