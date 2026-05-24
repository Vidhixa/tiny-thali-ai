
import type { Firestore, FirestoreError, Timestamp } from 'firebase/firestore';
import { collection, addDoc, serverTimestamp, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import type { SetupData, WeeklyMenuData, FoodSuggestion } from '@/contexts/SetupContext';
import type { NutritionalRequirement } from '@/lib/constants';
import { NUTRITIONAL_REQUIREMENTS_DATA } from '@/lib/constants';
import type { EstimatedNutrients } from '@/ai/flows/evaluate-food-item-nutrients';
import type { RecipeAnalysisOutput } from '@/ai/flows/analyze-recipe-nutrients-detailed';


export async function saveUserData(db: Firestore, userId: string, data: Omit<SetupData, 'createdAt' | 'currentWeeklyMenu' | 'currentWeeklyMenuLastUpdatedAt'>): Promise<string | null> {
  if (!db || !userId) {
    console.error("Firestore DB or UserID is not initialized for saveUserData.");
    return null;
  }
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...data,
      babyBirthDate: data.babyBirthDate instanceof Date ? data.babyBirthDate : data.babyBirthDate,
      createdAt: serverTimestamp(),
    }, { merge: true });
    console.log("User profile data saved successfully with ID: ", userId);
    return userId;
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error("Error saving user profile data: ", firestoreError);
    return null;
  }
}

interface FirestoreFoodSuggestion {
  name: string;
  estimatedNutrients?: EstimatedNutrients | null;
  detailedNutritionalInfo?: RecipeAnalysisOutput | null;
}

interface UserProfileDataFromFirestore {
  babyName: string;
  babyBirthDate: Timestamp;
  babyAgeMonths: number;
  allergies: string[];
  customAllergy?: string;
  foodPreferences: string[];
  createdAt: Timestamp;
  currentWeeklyMenu?: {
    calendar: Array<{ 
      day: string; 
      suggestions: Array<FirestoreFoodSuggestion | string>; // Handle old string format or new object
    }>;
    nutritionalTargetsUsed?: NutritionalRequirement;
  };
  currentWeeklyMenuLastUpdatedAt?: Timestamp;
}

export async function getUserData(db: Firestore, userId: string): Promise<SetupData | null> {
  if (!db || !userId) {
    console.error("Firestore DB or UserID is not initialized for getUserData.");
    return null;
  }
  try {
    const userRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      const dataFromFirestore = docSnap.data() as UserProfileDataFromFirestore;
      
      let weeklyMenuWithStructuredSuggestions: WeeklyMenuData | undefined = undefined;
      if (dataFromFirestore.currentWeeklyMenu && dataFromFirestore.currentWeeklyMenu.calendar) {
        const calendarWithProperSuggestions = dataFromFirestore.currentWeeklyMenu.calendar.map(dayPlan => ({
          ...dayPlan,
          suggestions: dayPlan.suggestions.map(suggestion => {
            const newSuggestion: FoodSuggestion = { name: '' };
            if (typeof suggestion === 'string') {
              newSuggestion.name = suggestion;
              // Ensure new fields are initialized if loading old data
              newSuggestion.estimatedNutrients = undefined; 
              newSuggestion.detailedNutritionalInfo = undefined;
            } else { // It's already an object, hopefully FirestoreFoodSuggestion
              newSuggestion.name = suggestion.name;
              newSuggestion.estimatedNutrients = (suggestion.estimatedNutrients && Object.keys(suggestion.estimatedNutrients).length > 0) ? suggestion.estimatedNutrients : null;
              newSuggestion.detailedNutritionalInfo = (suggestion.detailedNutritionalInfo && Object.keys(suggestion.detailedNutritionalInfo).length > 0) ? suggestion.detailedNutritionalInfo : null;
            }
            return newSuggestion;
          })
        }));

        weeklyMenuWithStructuredSuggestions = {
          calendar: calendarWithProperSuggestions,
          nutritionalTargetsUsed: dataFromFirestore.currentWeeklyMenu.nutritionalTargetsUsed
        };
        
        if (weeklyMenuWithStructuredSuggestions && !weeklyMenuWithStructuredSuggestions.nutritionalTargetsUsed && dataFromFirestore.babyAgeMonths) {
            const age = dataFromFirestore.babyAgeMonths;
            let foundTarget: NutritionalRequirement | undefined;
            if (age >= 6 && age <= 8) foundTarget = NUTRITIONAL_REQUIREMENTS_DATA.find(n => n.ageMonthsRange === "6-8");
            else if (age >= 9 && age <= 11) foundTarget = NUTRITIONAL_REQUIREMENTS_DATA.find(n => n.ageMonthsRange === "9-11");
            else if (age >= 12 && age <= 17) foundTarget = NUTRITIONAL_REQUIREMENTS_DATA.find(n => n.ageMonthsRange === "12-17");
            else if (age >= 18 && age <= 24) foundTarget = NUTRITIONAL_REQUIREMENTS_DATA.find(n => n.ageMonthsRange === "18-24");
            if (foundTarget) {
                weeklyMenuWithStructuredSuggestions.nutritionalTargetsUsed = foundTarget;
            }
        }
      }

      const setupData: SetupData = {
        babyName: dataFromFirestore.babyName,
        babyBirthDate: dataFromFirestore.babyBirthDate ? dataFromFirestore.babyBirthDate.toDate() : null,
        babyAgeMonths: dataFromFirestore.babyAgeMonths,
        allergies: dataFromFirestore.allergies,
        customAllergy: dataFromFirestore.customAllergy,
        foodPreferences: dataFromFirestore.foodPreferences,
        createdAt: dataFromFirestore.createdAt,
        currentWeeklyMenu: weeklyMenuWithStructuredSuggestions,
        currentWeeklyMenuLastUpdatedAt: dataFromFirestore.currentWeeklyMenuLastUpdatedAt ? dataFromFirestore.currentWeeklyMenuLastUpdatedAt.toDate() : undefined,
      };
      console.log("User data (mapped with detailedNutritionalInfo) fetched successfully:", setupData);
      return setupData;
    } else {
      console.log("No such document for user:", userId);
      return null;
    }
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error("Error getting user document:", firestoreError);
    return null;
  }
}

export async function updateUserWeeklyMenu(db: Firestore, userId: string, menuData: WeeklyMenuData): Promise<void> {
  if (!db || !userId) {
    console.error("Firestore DB or UserID is not initialized for updateUserWeeklyMenu.");
    throw new Error("DB or UserID not available");
  }
  try {
    const userRef = doc(db, 'users', userId);
    const menuDataToSave = {
      ...menuData,
      calendar: menuData.calendar.map(day => ({
        ...day,
        suggestions: day.suggestions.map(suggestion => ({
          name: suggestion.name,
          estimatedNutrients: (suggestion.estimatedNutrients && Object.keys(suggestion.estimatedNutrients).length > 0) ? suggestion.estimatedNutrients : null,
          detailedNutritionalInfo: (suggestion.detailedNutritionalInfo && Object.keys(suggestion.detailedNutritionalInfo).length > 0) ? suggestion.detailedNutritionalInfo : null,
        }))
      }))
    };

    await updateDoc(userRef, {
      currentWeeklyMenu: menuDataToSave,
      currentWeeklyMenuLastUpdatedAt: serverTimestamp(),
    });
    console.log("User weekly menu updated successfully (with detailedNutritionalInfo) for user ID: ", userId);
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error("Error updating user weekly menu: ", firestoreError.message, firestoreError.code);
    throw error;
  }
}
