
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useFirebase } from '@/contexts/FirebaseContext';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogInIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
// Removed useSetup and getUserData imports as SetupContext will handle profile loading

const loginFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { auth } = useFirebase(); 
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(data: LoginFormValues) {
    if (!auth) { 
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
      await signInWithEmailAndPassword(auth, data.email, data.password);
      // User object is available in userCredential.user if needed, but not directly used for profile loading here.
      // SetupContext will detect the auth state change and load the profile.

      toast({
        title: "👋 Welcome back!",
        description: "Loading your TinyThali experience...",
        className: "bg-primary/10 border-primary text-primary-foreground [&>svg]:text-primary-foreground",
      });
      router.push('/'); 

    } catch (error: any) {
      let errorMessage = "Failed to log in. Please check your credentials.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password. Please try again.";
      }
      // console.error("Login Error:", error); // Removed to reduce console noise for handled errors
      toast({
        variant: "default",
        className: "bg-accent/10 border-accent text-accent-foreground [&>svg]:text-accent-foreground",
        title: "Login Failed",
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
            <LogInIcon className="h-10 w-10" />
        </div>
        <CardTitle className="text-3xl font-baloo text-primary">Log In to TinyThali</CardTitle>
        <CardDescription className="text-md text-muted-foreground">
          Access your saved baby profile and menus.
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
                "w-full py-6 text-lg rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300",
                isLoading
                  ? "bg-accent hover:bg-accent/90 text-accent-foreground"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              )}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                "Log In"
              )}
            </Button>
          </form>
        </Form>
        <Button variant="link" className="mt-4 w-full text-muted-foreground" onClick={() => router.push('/auth/signup')} disabled={isLoading}>
            Don't have an account? Sign up
        </Button>
      </CardContent>
    </>
  );
}
