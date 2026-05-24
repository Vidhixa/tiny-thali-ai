
import type { LucideIcon } from 'lucide-react';
import { 
  Apple, 
  Banana, 
  Carrot, 
  Egg, 
  Milk, 
  Utensils, 
  Wheat, 
  Salad, 
  Leaf, 
  Shell, 
  Beef, 
  CircleHelp,
  Citrus, 
  Grape,  
  Bean,   
  Sprout, 
} from 'lucide-react';

export const COMMON_ALLERGENS: { id: string; label: string; icon?: LucideIcon }[] = [
  { id: 'peanuts', label: 'Peanuts', icon: Leaf },
  { id: 'wheat', label: 'Wheat', icon: Wheat },
  { id: 'dairy', label: 'Dairy', icon: Milk },
  { id: 'soy', label: 'Soy', icon: Salad },
  { id: 'tree nuts', label: 'Tree Nuts', icon: Leaf },
  { id: 'eggs', label: 'Eggs', icon: Egg },
  { id: 'fish', label: 'Fish', icon: Beef }, 
  { id: 'shellfish', label: 'Shellfish', icon: Shell },
  { id: 'other', label: 'Other', icon: CircleHelp },
];

export interface FoodItem {
  id: string;
  name: string;
  icon?: LucideIcon;
  imageHint?: string; 
}

export const FOOD_ITEMS: FoodItem[] = [
  { id: 'papaya', name: 'Papaya', icon: Leaf, imageHint: "papaya fruit" },
  { id: 'beetroot', name: 'Beetroot', icon: Carrot, imageHint: "beetroot vegetable" },
  { id: 'lychee', name: 'Lychee', icon: Leaf, imageHint: "lychee fruit" },
  { id: 'ridge-gourd', name: 'Ridge Gourd', icon: Leaf, imageHint: "ridge gourd" },
  { id: 'brinjal', name: 'Brinjal', icon: Leaf, imageHint: "brinjal eggplant" },
  { id: 'mango', name: 'Mango', icon: Apple, imageHint: "mango fruit" },
  { id: 'apple', name: 'Apple', icon: Apple, imageHint: "apple fruit" },
  { id: 'potato', name: 'Potato', icon: Utensils, imageHint: "potato vegetable" },
  { id: 'custard-apple', name: 'Custard Apple', icon: Apple, imageHint: "custard apple" },
  { id: 'drumsticks', name: 'Drumsticks', icon: Bean, imageHint: "drumsticks vegetable" },
  { id: 'kiwi', name: 'Kiwi', icon: Leaf, imageHint: "kiwi fruit" },
  { id: 'tomato', name: 'Tomato', icon: Apple, imageHint: "tomato fruit" },
  { id: 'dates', name: 'Dates', icon: Leaf, imageHint: "dates fruit" },
  { id: 'pomegranate', name: 'Pomegranate', icon: Apple, imageHint: "pomegranate fruit" },
  { id: 'methi-leaves', name: 'Methi Leaves', icon: Sprout, imageHint: "methi fenugreek" },
  { id: 'green-peas', name: 'Green Peas', icon: Bean, imageHint: "green peas" },
  { id: 'sweet-potato', name: 'Sweet Potato', icon: Carrot, imageHint: "sweet potato" },
  { id: 'zucchini', name: 'Zucchini', icon: Leaf, imageHint: "zucchini vegetable" },
  { id: 'broccoli', name: 'Broccoli', icon: Leaf, imageHint: "broccoli vegetable" },
  { id: 'carrot', name: 'Carrot', icon: Carrot, imageHint: "carrot vegetable" },
  { id: 'cauliflower', name: 'Cauliflower', icon: Leaf, imageHint: "cauliflower vegetable" },
  { id: 'orange', name: 'Orange', icon: Citrus, imageHint: "orange fruit" },
  { id: 'guava', name: 'Guava', icon: Apple, imageHint: "guava fruit" },
  { id: 'banana', name: 'Banana', icon: Banana, imageHint: "banana fruit" },
  { id: 'garlic', name: 'Garlic', icon: Utensils, imageHint: "garlic vegetable" },
  { id: 'turnip', name: 'Turnip', icon: Carrot, imageHint: "turnip vegetable" },
  { id: 'bottle-gourd', name: 'Bottle Gourd', icon: Leaf, imageHint: "bottle gourd" }, // Lauki is Bottle Gourd
  { id: 'jackfruit', name: 'Jackfruit', icon: Apple, imageHint: "jackfruit fruit" },
  { id: 'spinach', name: 'Spinach', icon: Sprout, imageHint: "spinach leaves" },
  { id: 'onion', name: 'Onion', icon: Utensils, imageHint: "onion vegetable" },
  { id: 'corn', name: 'Corn', icon: Wheat, imageHint: "corn vegetable" },
  { id: 'chikoo', name: 'Chikoo', icon: Apple, imageHint: "chikoo fruit" },
  { id: 'cabbage', name: 'Cabbage', icon: Leaf, imageHint: "cabbage vegetable" },
  { id: 'amaranth-leaves', name: 'Amaranth Leaves', icon: Sprout, imageHint: "amaranth leaves" },
  { id: 'muskmelon', name: 'Muskmelon', icon: Apple, imageHint: "muskmelon fruit" },
  { id: 'avocado', name: 'Avocado', icon: Leaf, imageHint: "avocado fruit" },
  { id: 'peaches', name: 'Peaches', icon: Apple, imageHint: "peach fruit" },
  { id: 'apple-gourd', name: 'Apple Gourd', icon: Leaf, imageHint: "apple gourd" },
  { id: 'pear', name: 'Pear', icon: Apple, imageHint: "pear fruit" },
  { id: 'pumpkin', name: 'Pumpkin', icon: Leaf, imageHint: "pumpkin vegetable" },
  { id: 'watermelon', name: 'Watermelon', icon: Apple, imageHint: "watermelon fruit" },
  { id: 'grapes', name: 'Grapes', icon: Grape, imageHint: "grapes fruit" },
  { id: 'curd', name: 'Curd', icon: Milk, imageHint: "curd yogurt" },
  { id: 'beans', name: 'Beans', icon: Bean, imageHint: "beans legumes" },
];

export interface NutritionalRequirement {
  ageMonthsRange: string; // e.g., "6-8", "9-11", "12-17", "18-24"
  energyKcalPerDay: string; // e.g., "600-650", "1000"
  proteinGramsPerDay: number;
  fatGramsPerDay: number;
  carbohydratesPercentEnergy: string; // e.g., "40-50%"
  calciumMgPerDay: number;
  ironMgPerDay: number;
  vitaminDIUPerDay: number;
}

export const NUTRITIONAL_REQUIREMENTS_DATA: NutritionalRequirement[] = [
  {
    ageMonthsRange: "6-8",
    energyKcalPerDay: "600-650",
    proteinGramsPerDay: 9.1,
    fatGramsPerDay: 30,
    carbohydratesPercentEnergy: "40-50%",
    calciumMgPerDay: 260,
    ironMgPerDay: 11,
    vitaminDIUPerDay: 400,
  },
  {
    ageMonthsRange: "9-11",
    energyKcalPerDay: "700-750",
    proteinGramsPerDay: 11,
    fatGramsPerDay: 30,
    carbohydratesPercentEnergy: "45-55%",
    calciumMgPerDay: 270,
    ironMgPerDay: 11,
    vitaminDIUPerDay: 400,
  },
  {
    ageMonthsRange: "12-17",
    energyKcalPerDay: "800-900",
    proteinGramsPerDay: 13,
    fatGramsPerDay: 30,
    carbohydratesPercentEnergy: "50-55%",
    calciumMgPerDay: 700,
    ironMgPerDay: 7,
    vitaminDIUPerDay: 400,
  },
  {
    ageMonthsRange: "18-24",
    energyKcalPerDay: "1000",
    proteinGramsPerDay: 13,
    fatGramsPerDay: 30,
    carbohydratesPercentEnergy: "50-55%",
    calciumMgPerDay: 700,
    ironMgPerDay: 7,
    vitaminDIUPerDay: 600,
  },
];

    