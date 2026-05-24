
'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useState, useCallback } from 'react';
import { useSetup, type WeeklyMenuData, type FoodSuggestion } from '@/contexts/SetupContext';
import { useFirebase } from '@/contexts/FirebaseContext';
import { generateWeeklyFoodCalendar, type GenerateWeeklyFoodCalendarInput } from '@/ai/flows/generate-weekly-food-calendar';
import { regenerateSingleSuggestion, type RegenerateSingleSuggestionInput } from '@/ai/flows/regenerate-single-suggestion';
import { updateUserWeeklyMenu } from '@/lib/firebaseService';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Loader2, AlertCircle, CalendarDays, Utensils, Home, RefreshCcw, Terminal, X, Sparkles, Info, BookOpen } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { EstimatedNutrients } from '@/ai/flows/evaluate-food-item-nutrients';
import { DetailedNutrientAnalysisDialog } from '@/components/DetailedNutrientAnalysisDialog'; // Import new dialog
import type { RecipeAnalysisOutput } from '@/ai/flows/analyze-recipe-nutrients-detailed'; // Import for type hint

const MIN_AGE_MONTHS = 6;
const MAX_AGE_MONTHS = 24;

const NutrientDisplayMini: React.FC<{ nutrients: EstimatedNutrients | null | undefined, isLoading?: boolean }> = ({ nutrients, isLoading }) => {
  if (isLoading) {
    return <p className="text-xs text-muted-foreground italic flex items-center"><Loader2 className="h-3 w-3 animate-spin mr-1" />Loading nutrients...</p>;
  }
  if (nutrients === undefined) {
    return <p className="text-xs text-muted-foreground italic">Nutrients not evaluated.</p>;
  }
  if (!nutrients || Object.keys(nutrients).length === 0) {
    return <p className="text-xs text-muted-foreground italic">Nutrients N/A.</p>;
  }
  const displayNutrients = ['P', 'F', 'C', 'Fe', 'Ca'];
  const nutrientValues = [
    nutrients.proteinGrams,
    nutrients.fatGrams,
    nutrients.carbohydratesGrams,
    nutrients.ironMg,
    nutrients.calciumMg
  ];

  return (
    <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5">
      {displayNutrients.map((label, index) => {
        const value = nutrientValues[index];
        return value !== undefined && value !== null ? (
          <span key={label}>{label}: <span className="font-medium">{typeof value === 'number' ? value.toFixed(1) : value}</span></span>
        ) : null;
      })}
       {nutrients.energyKcal !== undefined && nutrients.energyKcal !== null ? (
         <span>Kcal: <span className="font-medium">{typeof nutrients.energyKcal === 'number' ? nutrients.energyKcal.toFixed(1) : nutrients.energyKcal}</span></span>
       ): null}
    </div>
  );
};


export default function WeeklyMenuPage() {
  const router = useRouter();
  const { setupData, isProfileLoading, updateSetupData: updateSetupContextData } = useSetup();
  const { userId, db, loading: firebaseLoading } = useFirebase();
  const { toast } = useToast();

  const [isLoadingAi, setIsLoadingAi] = useState(true);
  const [menuData, setMenuData] = useState<WeeklyMenuData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isNavigatingHome, setIsNavigatingHome] = useState(false);
  const [replacingSlot, setReplacingSlot] = useState<{ dayIndex: number; suggestionIndex: number } | null>(null);
  const [draggedItemInfo, setDraggedItemInfo] = useState<{ dayIndex: number; suggestionIndex: number; suggestion: FoodSuggestion } | null>(null);

  const [isAnalysisDialogOpen, setIsAnalysisDialogOpen] = useState(false);
  const [selectedRecipeForAnalysis, setSelectedRecipeForAnalysis] = useState<{name: string, dayIndex: number, suggestionIndex: number, existingInfo?: RecipeAnalysisOutput | null} | null>(null);


  const hasRequiredProfileData = useCallback(() => {
    return !!setupData.babyName && typeof setupData.babyAgeMonths === 'number' && setupData.babyAgeMonths >= MIN_AGE_MONTHS && setupData.babyAgeMonths <= MAX_AGE_MONTHS && setupData.foodPreferences.length > 0;
  }, [setupData.babyName, setupData.babyAgeMonths, setupData.foodPreferences]);

  const saveCurrentMenu = useCallback(async (currentMenu: WeeklyMenuData) => {
    if (!userId || !db) {
      console.log("[WeeklyMenuPage] Not saving menu: User not logged in or DB not available.");
      return;
    }
    try {
      await updateUserWeeklyMenu(db, userId, currentMenu);
      updateSetupContextData({ currentWeeklyMenu: currentMenu, currentWeeklyMenuLastUpdatedAt: new Date() });
      toast({ title: "Menu Saved", description: "Your menu changes have been saved.", className: "bg-primary/10 border-primary text-primary-foreground [&>svg]:text-primary-foreground"});
    } catch (e: any) {
      console.error("Failed to save menu:", e);
      toast({ variant: "default", className: "bg-accent/10 border-accent text-accent-foreground [&>svg]:text-accent-foreground", title: "Save Failed", description: `Could not save menu: ${e.message}` });
    }
  }, [userId, db, toast, updateSetupContextData]);

  const fetchWeeklyMenu = useCallback(async () => {
    console.log('[WeeklyMenuPage] fetchWeeklyMenu called.');
    setIsLoadingAi(true);
    setError(null);
    setReplacingSlot(null);

    if (!hasRequiredProfileData()) {
      console.error('[WeeklyMenuPage] Pre-check failed for AI menu generation. Data:', JSON.stringify(setupData));
      setIsLoadingAi(false);
      return;
    }
    
    const processedAllergies = setupData.allergies.filter(allergy => allergy !== 'other');
    if (setupData.allergies.includes('other') && setupData.customAllergy?.trim()) {
        processedAllergies.push(setupData.customAllergy.trim());
    }

    const input: GenerateWeeklyFoodCalendarInput = {
      babyName: setupData.babyName!,
      babyAgeMonths: setupData.babyAgeMonths!,
      allergies: processedAllergies,
      foodPreferences: setupData.foodPreferences,
    };

    try {
      const resultNamesOnly = await generateWeeklyFoodCalendar(input);
      const fullMenuData: WeeklyMenuData = {
        nutritionalTargetsUsed: resultNamesOnly.nutritionalTargetsUsed,
        calendar: resultNamesOnly.calendar.map(dayPlan => ({
          ...dayPlan,
          suggestions: dayPlan.suggestions.map(name => ({ name, estimatedNutrients: undefined, detailedNutritionalInfo: undefined })) // Initialize new field
        }))
      };
      setMenuData(fullMenuData);
      await saveCurrentMenu(fullMenuData);
    } catch (e: any) {
      const aiErrorMessage = e.message || "Unknown error generating menu."
      setError(`Failed to generate weekly menu: ${aiErrorMessage}`);
      toast({ variant: "default",
        className: "bg-accent/10 border-accent text-accent-foreground [&>svg]:text-accent-foreground",
        title: "AI Error", description: aiErrorMessage });
    } finally {
      setIsLoadingAi(false);
    }
  }, [setupData, toast, hasRequiredProfileData, saveCurrentMenu]);

 useEffect(() => {
    console.log(`[WeeklyMenuPage] Main useEffect. isProfileLoading: ${isProfileLoading}, firebaseLoading: ${firebaseLoading}, userId: ${userId}`);
    
    if (isProfileLoading || firebaseLoading) {
      console.log('[WeeklyMenuPage] Waiting: Profile or Firebase is loading.');
      setIsLoadingAi(true);
      return;
    }

    if (userId) {
      if (setupData.currentWeeklyMenu && setupData.currentWeeklyMenu.calendar.length > 0) {
        const contextMenu = setupData.currentWeeklyMenu;
        const mappedMenu: WeeklyMenuData = {
          ...contextMenu,
          calendar: contextMenu.calendar.map(day => ({
            ...day,
            suggestions: day.suggestions.map(s => {
              if (typeof s === 'string') return { name: s, estimatedNutrients: undefined, detailedNutritionalInfo: undefined };
              return { // Ensure all fields are present
                name: s.name,
                estimatedNutrients: s.estimatedNutrients,
                detailedNutritionalInfo: s.detailedNutritionalInfo,
              };
            })
          }))
        };
        setMenuData(mappedMenu);
        console.log('[WeeklyMenuPage] Logged-in user: Using existing menu from SetupContext:', mappedMenu);
        setIsLoadingAi(false);
      } else if (hasRequiredProfileData()) {
        console.log('[WeeklyMenuPage] Logged-in user: No existing menu, profile complete. Generating new one.');
        fetchWeeklyMenu();
      } else {
        console.log('[WeeklyMenuPage] Logged-in user: Profile data incomplete. Redirecting to welcome.');
        toast({ title: "Profile Incomplete", description: "Let's complete your baby's profile.", className: "bg-accent/10 border-accent text-accent-foreground [&>svg]:text-accent-foreground"});
        router.replace('/welcome');
        setIsLoadingAi(false);
      }
    } else { 
      if (hasRequiredProfileData()) {
        if (setupData.currentWeeklyMenu && setupData.currentWeeklyMenu.calendar.length > 0) {
            const guestMenu = setupData.currentWeeklyMenu;
            const mappedGuestMenu: WeeklyMenuData = {
                ...guestMenu,
                calendar: guestMenu.calendar.map(day => ({
                ...day,
                suggestions: guestMenu.suggestions.map(s => {
                  if (typeof s === 'string') return { name: s, estimatedNutrients: undefined, detailedNutritionalInfo: undefined };
                  return { name: s.name, estimatedNutrients: s.estimatedNutrients, detailedNutritionalInfo: s.detailedNutritionalInfo };
                })
                }))
            };
            setMenuData(mappedGuestMenu);
            console.log('[WeeklyMenuPage] Guest user: Using existing menu from SetupContext.');
            setIsLoadingAi(false);
        } else {
            console.log('[WeeklyMenuPage] Guest user: Profile data from onboarding. Generating new menu (will not be saved).');
            fetchWeeklyMenu();
        }
      } else {
        console.log('[WeeklyMenuPage] Guest user: No onboarding data. Redirecting to welcome.');
        router.replace('/welcome');
        setIsLoadingAi(false);
      }
    }
  }, [isProfileLoading, firebaseLoading, userId, setupData.currentWeeklyMenu, fetchWeeklyMenu, router, toast, hasRequiredProfileData]);


  const handleGoHome = () => {
    setIsNavigatingHome(true);
    router.push('/');
  };

  const handleOpenAnalysisDialog = (recipeName: string, dayIndex: number, suggestionIndex: number, existingInfo?: RecipeAnalysisOutput | null) => {
    setSelectedRecipeForAnalysis({ name: recipeName, dayIndex, suggestionIndex, existingInfo });
    setIsAnalysisDialogOpen(true);
  };

  const handleRemoveSuggestion = (dayIndex: number, suggestionIndex: number) => {
    if (!menuData) return;
    const originalSuggestionName = menuData.calendar[dayIndex].suggestions[suggestionIndex].name;
    setMenuData(prevMenuData => {
      if (!prevMenuData) return null;
      const newCalendar = prevMenuData.calendar.map((dayPlan, dIndex) => {
        if (dIndex === dayIndex) {
          const updatedSuggestions = [...dayPlan.suggestions];
          updatedSuggestions[suggestionIndex] = { name: "Tap refresh to get a new idea!", estimatedNutrients: undefined, detailedNutritionalInfo: undefined };
          return { ...dayPlan, suggestions: updatedSuggestions };
        }
        return dayPlan;
      });
      const newMenuData = { ...prevMenuData, calendar: newCalendar };
      saveCurrentMenu(newMenuData);
      return newMenuData;
    });
    toast({ title: "Suggestion Slot Cleared", description: `"${originalSuggestionName}" removed. Tap refresh icon on the item to get a new idea.`, className: "bg-secondary text-secondary-foreground border-secondary-foreground/30" });
  };

  const handleSwapSuggestion = async (dayIndex: number, suggestionIndex: number) => {
    if (!menuData || !setupData.babyName || setupData.babyAgeMonths === null) return;
    
    const currentSuggestion = menuData.calendar[dayIndex].suggestions[suggestionIndex];
    if (!currentSuggestion || !currentSuggestion.name) return;

    setReplacingSlot({ dayIndex, suggestionIndex });
    const itemToReplaceName = currentSuggestion.name;

    toast({ title: itemToReplaceName === "Tap refresh to get a new idea!" ? "Getting Suggestion..." : "Swapping...", 
            description: itemToReplaceName === "Tap refresh to get a new idea!" ? `Fetching a new food idea...` : `Getting a new idea for ${itemToReplaceName}.`, 
            className: "bg-primary/10 border-primary text-primary-foreground [&>svg]:text-primary-foreground"});

    const existingSuggestionsForDayNames = menuData.calendar[dayIndex].suggestions
      .filter((_, sIndex) => sIndex !== suggestionIndex)
      .map(s => s.name);
      
    const processedAllergies = setupData.allergies.filter(a => a !== 'other');
    if (setupData.allergies.includes('other') && setupData.customAllergy?.trim()) {
      processedAllergies.push(setupData.customAllergy.trim());
    }

    const input: RegenerateSingleSuggestionInput = {
      babyName: setupData.babyName,
      babyAgeMonths: setupData.babyAgeMonths,
      allergies: processedAllergies,
      foodPreferences: setupData.foodPreferences,
      dayName: menuData.calendar[dayIndex].day,
      existingSuggestionsForDay: existingSuggestionsForDayNames,
      itemToReplace: itemToReplaceName,
    };

    try {
      const result = await regenerateSingleSuggestion(input); 
      const newSuggestionObject: FoodSuggestion = { name: result.newSuggestionName, estimatedNutrients: undefined, detailedNutritionalInfo: undefined };

      const updatedMenuData = {
        ...menuData,
        calendar: menuData.calendar.map((d, di) =>
          di === dayIndex ? {
            ...d,
            suggestions: d.suggestions.map((s, si) =>
              si === suggestionIndex ? newSuggestionObject : s
            )
          } : d
        )
      };
      setMenuData(updatedMenuData);
      await saveCurrentMenu(updatedMenuData);
      toast({ title: "Suggestion Updated!", description: `${itemToReplaceName === "Tap refresh to get a new idea!" ? "New item added:" : itemToReplaceName + " replaced with"} ${result.newSuggestionName}.`, className: "bg-primary/10 border-primary text-primary-foreground [&>svg]:text-primary-foreground"});
    } catch (e: any) {
      const msg = e.message || "Error regenerating suggestion."
      toast({ variant: "default", className: "bg-accent/10 border-accent text-accent-foreground [&>svg]:text-accent-foreground", title: "Update Failed", description: msg });
    } finally {
      setReplacingSlot(null);
    }
  };

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, dayIndex: number, suggestionIndex: number, suggestion: FoodSuggestion) => {
    setDraggedItemInfo({ dayIndex, suggestionIndex, suggestion });
    event.dataTransfer.setData('text/plain', suggestion.name);
    event.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (event: React.DragEvent<HTMLDivElement>) => {
    event.currentTarget.style.opacity = '1';
    setDraggedItemInfo(null);
  };
  
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>, targetDayIndex: number, targetSuggestionIndex: number) => {
    event.preventDefault();
    if (!draggedItemInfo || !menuData) return;

    const { dayIndex: sourceDayIndex, suggestionIndex: sourceSuggestionIndex, suggestion: sourceSuggestionObject } = draggedItemInfo;

    if (sourceDayIndex === targetDayIndex && sourceSuggestionIndex === targetSuggestionIndex) {
      return;
    }

    const newCalendar = menuData.calendar.map(day => ({ ...day, suggestions: [...day.suggestions] }));
    
    const [movedItem] = newCalendar[sourceDayIndex].suggestions.splice(sourceSuggestionIndex, 1);
    newCalendar[targetDayIndex].suggestions.splice(targetSuggestionIndex, 0, movedItem);

    const updatedMenuData = { ...menuData, calendar: newCalendar };
    setMenuData(updatedMenuData);
    await saveCurrentMenu(updatedMenuData);

    toast({
      title: "Suggestion Moved",
      description: `${sourceSuggestionObject.name} moved to ${newCalendar[targetDayIndex].day}.`,
      className: "bg-primary/10 border-primary text-primary-foreground [&>svg]:text-primary-foreground"
    });
    setDraggedItemInfo(null);
  };
  
  const isPageLoading = isProfileLoading || firebaseLoading || (isLoadingAi && !menuData && !error);
  const isProcessingPageAction = isNavigatingHome;
  const isItemActionInProgress = replacingSlot !== null || draggedItemInfo !== null;
  const isAnyLoading = isLoadingAi || isProcessingPageAction || isItemActionInProgress;


  if (isPageLoading) {
    return (
      <>
        <CardHeader className="text-center mb-6 p-0">
          <CardTitle className="text-4xl font-baloo mb-2 text-primary flex items-center justify-center">
            <CalendarDays className="mr-3 h-10 w-10" />
            {isProfileLoading || firebaseLoading ? "Loading Profile..." : (setupData.babyName ? `${setupData.babyName}'s Weekly Menu` : "Your Weekly Menu")}
          </CardTitle>
        </CardHeader>
        <CardContent className="w-full space-y-6">
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-foreground">
              {isProfileLoading || firebaseLoading ? "Preparing your Tiny Thali experience..." : (isLoadingAi ? "Crafting your weekly menu..." : "Loading menu details...")}
            </p>
          </div>
        </CardContent>
      </>
    );
  }

  return (
    <>
      <CardHeader className="text-center mb-6 p-0">
        <CardTitle className="text-4xl font-baloo mb-2 text-primary flex items-center justify-center">
          <CalendarDays className="mr-3 h-10 w-10" />
          {setupData.babyName ? `${setupData.babyName}'s Weekly Menu` : "Your Weekly Menu"}
        </CardTitle>
        {menuData?.nutritionalTargetsUsed && (
          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <CardDescription className="text-xs text-muted-foreground mt-1 cursor-help flex items-center justify-center">
                  <Info className="h-3 w-3 mr-1" />
                  AI used daily targets for {menuData.nutritionalTargetsUsed.ageMonthsRange} months: 
                  {menuData.nutritionalTargetsUsed.energyKcalPerDay} kcal, {menuData.nutritionalTargetsUsed.proteinGramsPerDay}g P,...
                </CardDescription>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-center p-2" side="bottom">
                <p className="font-medium">Daily Nutritional Targets ({menuData.nutritionalTargetsUsed.ageMonthsRange} mo):</p>
                <ul className="list-disc list-inside text-left text-xs">
                  <li>Energy: {menuData.nutritionalTargetsUsed.energyKcalPerDay} kcal</li>
                  <li>Protein: {menuData.nutritionalTargetsUsed.proteinGramsPerDay} g</li>
                  <li>Fat: {menuData.nutritionalTargetsUsed.fatGramsPerDay} g</li>
                  <li>Carbs: {menuData.nutritionalTargetsUsed.carbohydratesPercentEnergy}</li>
                  <li>Calcium: {menuData.nutritionalTargetsUsed.calciumMgPerDay} mg</li>
                  <li>Iron: {menuData.nutritionalTargetsUsed.ironMgPerDay} mg</li>
                  <li>Vit D: {menuData.nutritionalTargetsUsed.vitaminDIUPerDay} IU</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CardHeader>

      <CardContent className="w-full space-y-6">
        {error && (
           <Alert variant="default" className="mb-4 border-accent text-accent-foreground [&>svg]:text-accent-foreground bg-accent/10">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Oops! Menu Generation Failed.</AlertTitle>
            <AlertDescription>
              {(error.includes("[503 Service Unavailable]") || error.toLowerCase().includes("model is overloaded") || error.toLowerCase().includes("model processing error")) ? (
                <>
                  The AI model is currently experiencing high demand or a processing hiccup. This is usually temporary.
                  <br />
                  Please try generating the menu again in a few moments.
                </>
              ) : (
                <>
                  {error}
                  <p className="text-xs mt-2">
                    You can try generating the menu again. If the problem persists, please verify your setup or try different preferences.
                  </p>
                </>
              )}
              <Button
                onClick={fetchWeeklyMenu}
                className="mt-3 w-full sm:w-auto"
                size="sm"
                variant="outline"
                disabled={isLoadingAi}
              >
                {isLoadingAi ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!error && menuData && (
          <div className="flex flex-col gap-4">
            <TooltipProvider>
              {menuData.calendar.map((dailyPlan, dayIndex) => (
                <Card key={dailyPlan.day + dayIndex} className="shadow-lg rounded-xl w-full">
                  <CardHeader className="bg-secondary/30 rounded-t-xl p-4">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-xl font-semibold text-primary flex items-center">
                        <Utensils className="mr-2 h-5 w-5" /> {dailyPlan.day}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {dailyPlan.suggestions.map((suggestionObj, sIndex) => (
                      <div
                        key={`${dayIndex}-${sIndex}-${suggestionObj.name}`}
                        className={cn(
                          "flex flex-col text-sm text-foreground p-3 bg-background rounded-md border border-border group cursor-grab",
                          draggedItemInfo?.dayIndex === dayIndex && draggedItemInfo?.suggestionIndex === sIndex && "opacity-50 ring-2 ring-primary"
                        )}
                        draggable
                        onDragStart={(e) => handleDragStart(e, dayIndex, sIndex, suggestionObj)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, dayIndex, sIndex)}
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-medium flex-grow mr-2">{suggestionObj.name}</span>
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" 
                                  onClick={() => handleOpenAnalysisDialog(suggestionObj.name, dayIndex, sIndex, suggestionObj.detailedNutritionalInfo)}
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                  aria-label="Detailed nutritional analysis"
                                  disabled={isProcessingPageAction || isItemActionInProgress || isLoadingAi || suggestionObj.name === "Tap refresh to get a new idea!"}>
                                  <BookOpen className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger><TooltipContent><p>Detailed Analysis</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleSwapSuggestion(dayIndex, sIndex)}
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                  aria-label="Swap suggestion"
                                  disabled={isProcessingPageAction || (isItemActionInProgress && !(replacingSlot?.dayIndex === dayIndex && replacingSlot?.suggestionIndex === sIndex)) || isLoadingAi}>
                                  {replacingSlot?.dayIndex === dayIndex && replacingSlot?.suggestionIndex === sIndex ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                                </Button>
                              </TooltipTrigger><TooltipContent><p>{suggestionObj.name === "Tap refresh to get a new idea!" ? "Get suggestion" : "Get new suggestion"}</p></TooltipContent>
                            </Tooltip>
                            {suggestionObj.name !== "Tap refresh to get a new idea!" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => handleRemoveSuggestion(dayIndex, sIndex)}
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    aria-label="Clear suggestion slot"
                                    disabled={isProcessingPageAction || isItemActionInProgress || isLoadingAi}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger><TooltipContent><p>Clear slot</p></TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                        <NutrientDisplayMini nutrients={suggestionObj.estimatedNutrients} />
                      </div>
                    ))}
                    {dailyPlan.suggestions.length === 0 && <p className="text-sm text-muted-foreground">No suggestions for this day. Try redoing the menu.</p>}
                  </CardContent>
                </Card>
              ))}
            </TooltipProvider>
            {menuData.calendar.length !== 7 && (
               <Alert variant="default" className="mb-4 border-accent text-accent-foreground [&>svg]:text-accent-foreground bg-accent/10 text-center">
                <AlertCircle className="h-6 w-6 mx-auto mb-2" /><AlertTitle className="text-center">Calendar Incomplete</AlertTitle>
                <AlertDescription className="text-center">AI generated plan for {menuData.calendar.length} days. Some days may be missing suggestions.</AlertDescription>
              </Alert>
            )}
             {menuData.calendar.every(day => day.suggestions.every(s => s.name === "Tap refresh to get a new idea!")) && (
                <Alert variant="default" className="border-accent text-accent-foreground [&>svg]:text-accent-foreground bg-accent/10 text-center">
                <AlertCircle className="h-6 w-6 mx-auto mb-2" /><AlertTitle className="text-center">No Suggestions Generated</AlertTitle>
                <AlertDescription className="text-center">The AI couldn't generate any food suggestions based on the current inputs. You might want to adjust preferences or allergies and try redoing the menu.</AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="mt-8 w-full flex flex-col sm:flex-row gap-4">
        {menuData && !error && (
          <Button
              onClick={fetchWeeklyMenu}
              variant="outline"
              className={cn("w-full sm:flex-1 sm:min-w-0 py-6 text-lg rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300",
                  isLoadingAi && !replacingSlot && "bg-accent hover:bg-accent/90 text-accent-foreground"
              )}
              disabled={isAnyLoading}
          >
            {isLoadingAi && !replacingSlot ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
            Redo Menu
          </Button>
        )}
        <Button
            onClick={handleGoHome}
            className={cn("w-full sm:flex-1 sm:min-w-0 py-6 text-lg rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300",
                isNavigatingHome ? "bg-accent hover:bg-accent/90 text-accent-foreground" : "bg-primary hover:bg-primary/90 text-primary-foreground"
            )}
            disabled={isAnyLoading}
        >
          {isNavigatingHome ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Home className="mr-2 h-5 w-5" />}
           Home Page
        </Button>
      </CardFooter>
      {selectedRecipeForAnalysis && (
        <DetailedNutrientAnalysisDialog
          isOpen={isAnalysisDialogOpen}
          onOpenChange={setIsAnalysisDialogOpen}
          recipeName={selectedRecipeForAnalysis.name}
          babyAgeMonths={setupData.babyAgeMonths}
          dayIndex={selectedRecipeForAnalysis.dayIndex}
          suggestionIndex={selectedRecipeForAnalysis.suggestionIndex}
          existingDetailedInfo={selectedRecipeForAnalysis.existingInfo}
        />
      )}
    </>
  );
}

    

    