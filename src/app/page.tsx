
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/contexts/FirebaseContext';
import { useSetup } from '@/contexts/SetupContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogOut, CalendarDays, Settings, AlertCircle, Soup, Sparkles, Utensils } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from '@/hooks/use-toast';

export default function HomePage() {
  const router = useRouter();
  const { userId, auth, loading: firebaseLoading } = useFirebase();
  const { setupData, isProfileLoading, resetSetupData } = useSetup();
  const [currentDayName, setCurrentDayName] = useState('');
  const [greeting, setGreeting] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    // Wait until firebase and profile loading is complete before making decisions.
    if (firebaseLoading || isProfileLoading) {
      return;
    }

    if (!userId) {
      // If user is not logged in, go to signup.
      router.replace('/auth/signup');
    } else if (!setupData.babyName || !setupData.babyAgeMonths) {
      // If user is logged in but profile is incomplete, go to profile setup.
      router.replace('/welcome');
    }
  }, [firebaseLoading, isProfileLoading, userId, setupData.babyName, setupData.babyAgeMonths, router]);

  useEffect(() => {
    setCurrentDayName(format(new Date(), 'EEEE'));
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  const dayIndex = setupData.currentWeeklyMenu?.calendar.findIndex(plan => plan.day === currentDayName) ?? -1;
  const todaysPlan = dayIndex !== -1 && setupData.currentWeeklyMenu ? setupData.currentWeeklyMenu.calendar[dayIndex] : undefined;

  const handleLogout = async () => {
    if (auth) {
      try {
        await auth.signOut();
        resetSetupData();
        // The main useEffect will handle redirecting to signup after state updates.
        toast({
          title: "Logged Out",
          description: "You have been successfully logged out.",
          className: "bg-primary/10 border-primary text-primary-foreground [&>svg]:text-primary-foreground",
        });
      } catch (error) {
        console.error("Logout failed:", error);
         toast({
            variant: "default",
            className: "bg-accent/10 border-accent text-accent-foreground [&>svg]:text-accent-foreground",
            title: "Logout Error",
            description: "Failed to log out. Please try again."
          });
      }
    }
  };

  const handleEditProfile = () => {
    router.push('/welcome');
  };

  // While any loading or redirect checks are in progress, show a full-screen loader.
  // The useEffect handles the routing logic. This prevents flashing the "Incomplete Profile" card.
  if (firebaseLoading || isProfileLoading || !userId || !setupData.babyName || !setupData.babyAgeMonths) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-primary/10 via-background to-secondary/10 text-center">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
        <p className="text-xl text-foreground font-medium">Loading your TinyThali experience...</p>
      </div>
    );
  }

  // The code will now only reach here if the user is authenticated and has a complete profile.
  return (
    <div className="flex flex-col items-center min-h-screen p-4 sm:p-6 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <header className="w-full max-w-3xl mx-auto flex justify-between items-center py-4 mb-6">
        <div className="flex items-center">
          <Utensils className="h-10 w-10 text-primary mr-2 p-1 bg-primary/10 rounded-full shadow-sm" />
          <h1 className="text-2xl font-baloo text-primary">TinyThali</h1>
        </div>
        <div className="flex items-center space-x-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleEditProfile} className="text-muted-foreground hover:text-primary">
                  <Settings className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Edit Profile & Settings</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-primary">
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Logout</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      <main className="w-full max-w-3xl mx-auto">
        <section className="mb-8 text-center">
          <h2 className="text-3xl font-baloo text-foreground mb-1">{greeting}, {setupData.babyName}!</h2>
          {setupData.babyAgeMonths && (
            <p className="text-md text-muted-foreground">
              Your little one is {setupData.babyAgeMonths} months old. {setupData.currentWeeklyMenuLastUpdatedAt ? `Menu last updated: ${format(new Date(setupData.currentWeeklyMenuLastUpdatedAt), "PP")}` : ""}
            </p>
          )}
        </section>

        <Card className="w-full shadow-xl mb-6 border-primary/30">
          <CardHeader className="bg-primary/5 rounded-t-lg">
            <CardTitle className="text-2xl font-baloo text-primary flex items-center">
              <CalendarDays className="mr-3 h-6 w-6" /> Today's Thali ({currentDayName})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {todaysPlan && todaysPlan.suggestions.length > 0 ? (
              todaysPlan.suggestions.map((suggestion, index) => (
                <div key={index} className="pb-3 mb-3 border-b border-border last:border-b-0 last:pb-0 last:mb-0">
                  <h3 className="font-semibold text-lg text-foreground mb-1">
                    {index === 0 ? 'Breakfast' : index === 1 ? 'Lunch' : 'Dinner'}: <span className="font-normal">{suggestion.name}</span>
                  </h3>
                </div>
              ))
            ) : setupData.currentWeeklyMenu && setupData.currentWeeklyMenu.calendar.length > 0 ? (
                 <div className="text-center py-4">
                    <p className="text-md text-foreground">
                      No specific meals found for {currentDayName} in your current plan.
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                        You can view your full week or generate a new menu.
                    </p>
                </div>
            ) : (
              <div className="text-center py-4">
                <AlertCircle className="h-12 w-12 text-accent mx-auto mb-3"/>
                <p className="text-md text-foreground">
                  No weekly menu found. Let's create one!
                </p>
                 <Button onClick={() => router.push('/weekly-menu')} className="mt-4 text-md py-3 px-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg">
                    <CalendarDays className="mr-2 h-5 w-5" /> Create Weekly Menu
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {userId && setupData.babyName && (setupData.currentWeeklyMenu || !isProfileLoading) && (
          <section className="mt-10 mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                onClick={() => router.push('/weekly-menu')}
                className={cn(
                  "flex flex-col items-center justify-center p-6 rounded-xl shadow-lg cursor-pointer transition-all duration-300 ease-in-out hover:shadow-2xl hover:scale-105",
                  "bg-primary/80 text-primary-foreground hover:bg-primary"
                )}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && router.push('/weekly-menu')}
              >
                <CalendarDays className="h-10 w-10 mb-3" />
                <span className="text-lg font-semibold text-center">Weekly Menu</span>
              </div>
              <div
                className={cn(
                  "flex flex-col items-center justify-center p-6 rounded-xl shadow-lg transition-all duration-300 ease-in-out",
                  "bg-muted text-muted-foreground opacity-60 cursor-not-allowed"
                )}
                role="button"
                aria-disabled="true"
              >
                <Soup className="h-10 w-10 mb-3" />
                <span className="text-lg font-semibold text-center">Add Recipes</span>
              </div>
              <div
                className={cn(
                  "flex flex-col items-center justify-center p-6 rounded-xl shadow-lg transition-all duration-300 ease-in-out",
                  "bg-muted text-muted-foreground opacity-60 cursor-not-allowed"
                )}
                role="button"
                aria-disabled="true"
              >
                <Sparkles className="h-10 w-10 mb-3" />
                <span className="text-lg font-semibold text-center">Explore More</span>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
