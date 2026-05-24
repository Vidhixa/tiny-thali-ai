
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-weekly-food-calendar.ts';
import '@/ai/flows/regenerate-single-suggestion.ts';
import '@/ai/flows/evaluate-food-item-nutrients.ts';
import '@/ai/flows/analyze-recipe-nutrients-detailed.ts';
