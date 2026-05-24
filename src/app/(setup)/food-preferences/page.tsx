
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSetup } from '@/contexts/SetupContext';
import { FOOD_ITEMS, FoodItem as FoodItemType } from '@/lib/constants';
import { FoodCard } from '@/components/FoodCard';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const MIN_SELECTIONS = 3;

export default function FoodPreferencesPage() {
  const router = useRouter();
  const { setupData, updateSetupData } = useSetup();
  const [selectedFoods, setSelectedFoods] = useState<string[]>(setupData.foodPreferences || []);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectFood = (id: string) => {
    setError(null);
    setSelectedFoods(prev => {
      if (prev.includes(id)) {
        return prev.filter(foodId => foodId !== id);
      }
      return [...prev, id];
    });
  };

  const handleSubmit = () => {
    if (selectedFoods.length < MIN_SELECTIONS) {
      const message = `Please select at least ${MIN_SELECTIONS} favorite foods.`;
      setError(message);
       toast({
        variant: "default", 
        className: "bg-accent/10 border-accent text-accent-foreground [&>svg]:text-accent-foreground",
        title: "Selection Required",
        description: message,
      });
      return;
    }
    setIsSubmitting(true);
    updateSetupData({ foodPreferences: selectedFoods });
    router.push('/allergies');
  };

  const handleBack = () => {
    setIsNavigatingBack(true);
    router.push('/welcome'); 
  };

  const isProcessing = isSubmitting || isNavigatingBack;

  return (
    <>
      <CardHeader className="text-center mb-6 p-0">
        <CardTitle className="text-4xl font-baloo mb-2 text-primary">Baby's Favorites?</CardTitle>
        <CardDescription className="text-lg text-muted-foreground">
          Pick at least {MIN_SELECTIONS} to help us tailor your baby's menus!
        </CardDescription>
      </CardHeader>

      {error && (
        <Alert 
          variant="default" 
          className="mb-4 border-accent text-accent-foreground [&>svg]:text-accent-foreground bg-accent/10"
        >
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {FOOD_ITEMS.map((food: FoodItemType) => (
          <FoodCard
            key={food.id}
            id={food.id}
            name={food.name}
            icon={food.icon}
            imageHint={food.imageHint}
            isSelected={selectedFoods.includes(food.id)}
            onSelect={handleSelectFood}
            disabled={isProcessing}
          />
        ))}
      </div>
      
      <div className="flex gap-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleBack} 
          className="w-full py-6 text-lg rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
          disabled={isProcessing}
        >
          {isNavigatingBack ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ArrowLeft className="mr-2 h-5 w-5" />}
           Back
        </Button>
        <Button 
          onClick={handleSubmit} 
          className={cn(
            "w-full py-6 text-lg rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300",
            isSubmitting
              ? "bg-accent hover:bg-accent/90 text-accent-foreground"
              : "bg-primary hover:bg-primary/90 text-primary-foreground"
          )}
          disabled={isProcessing}
        >
          {isSubmitting ? 
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 
            (<>Next <ArrowRight className="ml-2 h-5 w-5" /></>)
          }
        </Button>
      </div>
    </>
  );
}
