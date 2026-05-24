
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, BookOpen, CheckCircle } from 'lucide-react';
import { analyzeRecipeNutrientsDetailed, type RecipeAnalysisInput, type RecipeAnalysisOutput } from '@/ai/flows/analyze-recipe-nutrients-detailed';
import { useSetup } from '@/contexts/SetupContext';
import { useFirebase } from '@/contexts/FirebaseContext';
import { updateUserWeeklyMenu } from '@/lib/firebaseService';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface DetailedNutrientAnalysisDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  recipeName: string | null;
  babyAgeMonths: number | null;
  dayIndex?: number; // For context update
  suggestionIndex?: number; // For context update
  existingDetailedInfo?: RecipeAnalysisOutput | null; // Pass existing data to avoid re-fetch
}

export const DetailedNutrientAnalysisDialog: React.FC<DetailedNutrientAnalysisDialogProps> = ({
  isOpen,
  onOpenChange,
  recipeName,
  babyAgeMonths,
  dayIndex,
  suggestionIndex,
  existingDetailedInfo,
}) => {
  const [analysisResult, setAnalysisResult] = useState<RecipeAnalysisOutput | null>(existingDetailedInfo || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setupData, updateSingleFoodSuggestionDetailedNutrients } = useSetup();
  const { userId, db } = useFirebase();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && recipeName && babyAgeMonths && !existingDetailedInfo) {
      fetchAnalysis();
    } else if (existingDetailedInfo) {
        setAnalysisResult(existingDetailedInfo);
        setIsLoading(false);
        setError(null);
    }
    // Reset when dialog closes or recipe changes
    if (!isOpen) {
        setAnalysisResult(null);
        setIsLoading(false);
        setError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, recipeName, babyAgeMonths, existingDetailedInfo]);

  const fetchAnalysis = async () => {
    if (!recipeName || !babyAgeMonths) return;

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    const input: RecipeAnalysisInput = { recipeName, babyAgeMonths };

    try {
      const result = await analyzeRecipeNutrientsDetailed(input);
      setAnalysisResult(result);

      if (typeof dayIndex === 'number' && typeof suggestionIndex === 'number' && result) {
        updateSingleFoodSuggestionDetailedNutrients(dayIndex, suggestionIndex, result);
        // Save the updated menu to Firebase
        if (userId && db && setupData.currentWeeklyMenu) {
          // Construct the menu to save based on the *latest* context data
          // This requires a way to get the latest menu after context update or pass it
          // For now, we assume setupData.currentWeeklyMenu will be updated enough by the time this runs.
          // A more robust solution might involve getting the menu state directly before saving.
           const updatedMenuForSave = { ...setupData.currentWeeklyMenu };
           if(updatedMenuForSave.calendar[dayIndex].suggestions[suggestionIndex]) {
             updatedMenuForSave.calendar[dayIndex].suggestions[suggestionIndex].detailedNutritionalInfo = result;
           }
           await updateUserWeeklyMenu(db, userId, updatedMenuForSave);
           toast({ title: "Nutritional Analysis Saved", description: `Details for ${recipeName} stored.`, className: "bg-primary/10 border-primary text-primary-foreground [&>svg]:text-primary-foreground" });
        }
      }

    } catch (e: any) {
      console.error("Error fetching detailed nutritional analysis:", e);
      const errorMessage = e.message || "Could not analyze recipe nutrients.";
      setError(errorMessage);
      toast({ variant: "default", className: "bg-accent/10 border-accent text-accent-foreground [&>svg]:text-accent-foreground", title: "Analysis Failed", description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };
  
  const formatNumber = (num?: number) => (num !== undefined && num !== null ? num.toFixed(1) : 'N/A');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[80svh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center text-2xl font-baloo text-primary">
            <BookOpen className="mr-2 h-6 w-6" />
            Nutritional Analysis: {recipeName}
          </DialogTitle>
          <DialogDescription>
            Estimated nutritional content per serving for a {babyAgeMonths}-month-old.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow pr-6 -mr-6">
          <div className="py-4 space-y-6 ">
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-40">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-3" />
                <p className="text-muted-foreground">Analyzing recipe, please wait...</p>
              </div>
            )}
            {error && !isLoading && (
              <div className="flex flex-col items-center justify-center h-40 text-center p-4 bg-accent/10 rounded-md">
                <AlertCircle className="h-10 w-10 text-accent-foreground mb-3" />
                <p className="text-accent-foreground font-semibold">Analysis Error</p>
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button onClick={fetchAnalysis} variant="outline" size="sm" className="mt-3">Try Again</Button>
              </div>
            )}
            {analysisResult && !isLoading && !error && (
              <>
                <div className="p-4 bg-secondary/30 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-secondary-foreground mb-2">Estimated Total Nutrients (per serving)</h3>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Protein</p>
                      <p className="text-xl font-bold text-primary">{formatNumber(analysisResult.estimatedTotalNutrients.proteinGrams)}g</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Fat</p>
                      <p className="text-xl font-bold text-primary">{formatNumber(analysisResult.estimatedTotalNutrients.fatGrams)}g</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Carbs</p>
                      <p className="text-xl font-bold text-primary">{formatNumber(analysisResult.estimatedTotalNutrients.carbohydratesGrams)}g</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 text-center italic">{analysisResult.servingSizeNotes}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Detailed Ingredient Breakdown</h3>
                  {analysisResult.detailedBreakdown.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ingredient</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">P (g)</TableHead>
                          <TableHead className="text-right">F (g)</TableHead>
                          <TableHead className="text-right">C (g)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysisResult.detailedBreakdown.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.ingredient}</TableCell>
                            <TableCell className="text-right text-xs">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatNumber(item.proteinGrams)}</TableCell>
                            <TableCell className="text-right">{formatNumber(item.fatGrams)}</TableCell>
                            <TableCell className="text-right">{formatNumber(item.carbohydratesGrams)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground">No detailed ingredient breakdown available.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-auto pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
