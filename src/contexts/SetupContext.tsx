
'use client';

import type { Timestamp } from 'firebase/firestore';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useFirebase } from './FirebaseContext';
import { getUserData } from '@/lib/firebaseService';
import type { Firestore } from 'firebase/firestore';
import type { NutritionalRequirement } from '@/lib/constants';
import type { EstimatedNutrients } from '@/ai/flows/evaluate-food-item-nutrients';
import type { RecipeAnalysisOutput } from '@/ai/flows/analyze-recipe-nutrients-detailed'; // Import new type

// Define structure for a single food suggestion
export interface FoodSuggestion {
  name: string;
  estimatedNutrients?: EstimatedNutrients | null; // From evaluate-food-item-nutrients
  detailedNutritionalInfo?: RecipeAnalysisOutput | null; // From analyze-recipe-nutrients-detailed
}

export interface DailyPlan {
  day: string;
  suggestions: FoodSuggestion[];
}

export interface WeeklyMenuData {
  calendar: DailyPlan[];
  nutritionalTargetsUsed?: NutritionalRequirement;
}

export interface SetupData {
  babyName: string;
  babyBirthDate: Date | null;
  babyAgeMonths: number | null;
  allergies: string[];
  customAllergy?: string;
  foodPreferences: string[];
  createdAt?: Timestamp;
  currentWeeklyMenu?: WeeklyMenuData;
  currentWeeklyMenuLastUpdatedAt?: Timestamp | Date;
}

interface SetupContextType {
  setupData: SetupData;
  updateSetupData: (data: Partial<SetupData>, options?: { mergeWeeklyMenu?: boolean }) => void;
  resetSetupData: () => void;
  isProfileLoading: boolean;
  updateSingleFoodSuggestionNutrients: (dayIndex: number, suggestionIndex: number, nutrients: EstimatedNutrients | null) => void;
  updateSingleFoodSuggestionDetailedNutrients: (dayIndex: number, suggestionIndex: number, detailedInfo: RecipeAnalysisOutput | null) => void;
}

const initialSetupData: SetupData = {
  babyName: '',
  babyBirthDate: null,
  babyAgeMonths: null,
  allergies: [],
  customAllergy: '',
  foodPreferences: [],
  currentWeeklyMenu: undefined,
  currentWeeklyMenuLastUpdatedAt: undefined,
};

const SetupContext = createContext<SetupContextType | undefined>(undefined);

export const SetupProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [setupData, setSetupData] = useState<SetupData>(initialSetupData);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true);
  const { userId, db, loading: firebaseLoading } = useFirebase();

  useEffect(() => {
    const loadProfile = async () => {
      if (userId && db) {
        console.log('[SetupContext] Attempting to load profile for userId:', userId);
        setIsProfileLoading(true);
        const profile = await getUserData(db as Firestore, userId);
        if (profile) {
          if (profile.currentWeeklyMenu && profile.currentWeeklyMenu.calendar) {
            profile.currentWeeklyMenu.calendar = profile.currentWeeklyMenu.calendar.map(dayPlan => ({
              ...dayPlan,
              suggestions: dayPlan.suggestions.map(suggestion => {
                const newSuggestion: FoodSuggestion = { name: '' };
                if (typeof suggestion === 'string') {
                  newSuggestion.name = suggestion;
                  newSuggestion.estimatedNutrients = undefined;
                  newSuggestion.detailedNutritionalInfo = undefined;
                } else {
                  newSuggestion.name = suggestion.name;
                  newSuggestion.estimatedNutrients = (suggestion.estimatedNutrients && Object.keys(suggestion.estimatedNutrients).length > 0) ? suggestion.estimatedNutrients : null;
                  newSuggestion.detailedNutritionalInfo = (suggestion.detailedNutritionalInfo && Object.keys(suggestion.detailedNutritionalInfo).length > 0) ? suggestion.detailedNutritionalInfo : null;
                }
                return newSuggestion;
              })
            }));
          }
          setSetupData(profile);
          console.log('[SetupContext] Profile loaded and mapped:', profile);
        } else {
          console.log('[SetupContext] No profile found for userId.');
          setSetupData(initialSetupData);
        }
        setIsProfileLoading(false);
      } else if (!userId && !firebaseLoading) {
        console.log('[SetupContext] No userId and Firebase not loading. Resetting setupData.');
        setSetupData(initialSetupData);
        setIsProfileLoading(false);
      } else if (firebaseLoading) {
        console.log('[SetupContext] Firebase is loading. Waiting to load profile.');
        setIsProfileLoading(true);
      }
    };

    loadProfile();
  }, [userId, db, firebaseLoading]);

  const updateSetupData = (data: Partial<SetupData>, options?: { mergeWeeklyMenu?: boolean }) => {
    setSetupData((prev) => {
      if (options?.mergeWeeklyMenu && prev.currentWeeklyMenu && data.currentWeeklyMenu) {
        return { ...prev, ...data, currentWeeklyMenu: data.currentWeeklyMenu };
      }
      return { ...prev, ...data };
    });
  };
  
  const updateSingleFoodSuggestionNutrients = (dayIndex: number, suggestionIndex: number, nutrients: EstimatedNutrients | null) => {
    setSetupData(prev => {
      if (!prev.currentWeeklyMenu) return prev;
      const newCalendar = prev.currentWeeklyMenu.calendar.map((day, dIdx) => {
        if (dIdx === dayIndex) {
          const newSuggestions = day.suggestions.map((suggestion, sIdx) => {
            if (sIdx === suggestionIndex) {
              return { ...suggestion, estimatedNutrients: nutrients };
            }
            return suggestion;
          });
          return { ...day, suggestions: newSuggestions };
        }
        return day;
      });
      return { ...prev, currentWeeklyMenu: { ...prev.currentWeeklyMenu, calendar: newCalendar } };
    });
  };

  const updateSingleFoodSuggestionDetailedNutrients = (dayIndex: number, suggestionIndex: number, detailedInfo: RecipeAnalysisOutput | null) => {
    setSetupData(prev => {
      if (!prev.currentWeeklyMenu) return prev;
      const newCalendar = prev.currentWeeklyMenu.calendar.map((day, dIdx) => {
        if (dIdx === dayIndex) {
          const newSuggestions = day.suggestions.map((suggestion, sIdx) => {
            if (sIdx === suggestionIndex) {
              return { ...suggestion, detailedNutritionalInfo: detailedInfo };
            }
            return suggestion;
          });
          return { ...day, suggestions: newSuggestions };
        }
        return day;
      });
      return { ...prev, currentWeeklyMenu: { ...prev.currentWeeklyMenu, calendar: newCalendar } };
    });
  };

  const resetSetupData = () => {
    setSetupData(initialSetupData);
    setIsProfileLoading(false);
  };

  return (
    <SetupContext.Provider value={{ setupData, updateSetupData, resetSetupData, isProfileLoading, updateSingleFoodSuggestionNutrients, updateSingleFoodSuggestionDetailedNutrients }}>
      {children}
    </SetupContext.Provider>
  );
};

export const useSetup = (): SetupContextType => {
  const context = useContext(SetupContext);
  if (context === undefined) {
    throw new Error('useSetup must be used within a SetupProvider');
  }
  return context;
};
