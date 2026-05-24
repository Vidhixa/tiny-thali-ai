
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useSetup } from '@/contexts/SetupContext';
import { useFirebase } from '@/contexts/FirebaseContext';
import { createUserWithEmailAndPassword, updateProfile, type User } from 'firebase/auth';
import { saveUserData } from '@/lib/firebaseService';
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { SetupData } from '@/contexts/SetupContext';

const signupFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type SignupFormValues = z.infer<typeof signupFormSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { setupData, updateSetupData } = useSetup(); // Added updateSetupData
  const { auth, db } = useFirebase();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(data: SignupFormValues) {
    if (!auth || !db) {
      toast({
        variant: "default",
        className: "bg-accent/10 border-accent text-accent-foreground [&>svg]:text-accent-foreground",
        title: "Error",
        description: "Firebase services are not available. Please try again later.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      if (user) {
        console.log("Firebase account created successfully. User ID:", user.uid, "Email:", user.email);
        console.log("User is now automatically logged in.");

        // Optionally update Firebase user's display name if babyName is available from a guest session
        if (setupData.babyName) {
          try {
            await updateProfile(user, { displayName: setupData.babyName });
          } catch (profileError) {
            console.warn("Could not update Firebase user profile display name:", profileError);
          }
        }
        
        // This block attempts to save profile data if it exists from a guest session.
        if (setupData.babyName && typeof setupData.babyAgeMonths === 'number' && setupData.babyBirthDate) {
            const profileDataToSave: Omit<SetupData, 'createdAt'> = {
                babyName: setupData.babyName,
                babyBirthDate: setupData.babyBirthDate,
                babyAgeMonths: setupData.babyAgeMonths,
                allergies: setupData.allergies,
                customAllergy: setupData.customAllergy,
                foodPreferences: setupData.foodPreferences,
            };
            
            updateSetupData(profileDataToSave);
            console.log("[SignupPage] Saving pre-existing profile data from guest session:", profileDataToSave);
            await saveUserData(db, user.uid, profileDataToSave);
        }

        // Regardless of whether profile data was pre-existing, show a consistent message and redirect to profile setup.
        toast({
            title: "🎉 Account created!",
            description: "Let's set up your baby's profile.",
            className: "bg-primary/10 border-primary text-primary-foreground [&>svg]:text-primary-foreground",
        });

        router.push('/welcome');
      }
    } catch (error: any) {
      let errorMessage = "Failed to create account. Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email is already registered. Try logging in.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "The password is too weak.";
      }
      console.error("Signup Error:", error);
      toast({
        variant: "default",
        className: "bg-accent/10 border-accent text-accent-foreground [&>svg]:text-accent-foreground",
        title: "Signup Failed",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <CardHeader className="text-center mb-6">
        <div className="mx-auto bg-primary/10 text-primary p-3 rounded-full w-fit mb-4">
            <UserPlus className="h-10 w-10" />
        </div>
        <CardTitle className="text-3xl font-baloo text-primary">Create Your Account</CardTitle>
        <CardDescription className="text-md text-muted-foreground">
          Save your baby's profile and access it anytime.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-md font-medium text-foreground">Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      {...field}
                      className="py-6 text-md rounded-lg shadow-sm focus:ring-2 focus:ring-primary"
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage className="text-accent-foreground">{form.formState.errors.email?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-md font-medium text-foreground">Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...field}
                      className="py-6 text-md rounded-lg shadow-sm focus:ring-2 focus:ring-primary"
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage className="text-accent-foreground">{form.formState.errors.password?.message}</FormMessage>
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className={cn(
                "w-full py-6 text-base rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300",
                isLoading
                  ? "bg-accent hover:bg-accent/90 text-accent-foreground"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              )}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                "Create Account & Save Profile"
              )}
            </Button>
          </form>
        </Form>
        <Button variant="link" className="mt-4 w-full text-muted-foreground" onClick={() => router.push('/auth/login')} disabled={isLoading}>
            Already have an account? Log in
        </Button>
      </CardContent>
    </>
  );
}
