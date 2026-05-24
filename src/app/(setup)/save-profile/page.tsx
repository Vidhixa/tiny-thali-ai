
'use client';

import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, LogIn, SkipForward, Loader2 } from "lucide-react";
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function SaveProfilePage() {
  const router = useRouter();
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  const handleCreateAccount = () => {
    setIsCreatingAccount(true);
    router.push('/auth/signup');
  };

  const handleSkipForNow = () => {
    setIsSkipping(true);
    router.push('/weekly-menu');
  };

  const isProcessing = isCreatingAccount || isSkipping;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 bg-background">
      <Card className="w-full max-w-md bg-card p-6 sm:p-8 rounded-xl shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 text-primary p-3 rounded-full w-fit mb-4">
            <LogIn className="h-10 w-10" />
          </div>
          <CardTitle className="text-3xl font-baloo text-primary">Save Your Baby's Profile?</CardTitle>
          <CardDescription className="text-md text-muted-foreground mt-2">
            
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-foreground">
          <p>Creating a free account lets you:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Save your baby's name, DOB, and food preferences</li>
            <li>Access personalized menus on any device</li>
            <li>Easily update allergies and track favorites</li>
          </ul>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 mt-6">
          <Button
            onClick={handleCreateAccount}
            className={cn(
              "w-full py-6 text-base rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 bg-primary hover:bg-primary/90 text-primary-foreground border border-transparent",
              isCreatingAccount && "bg-accent hover:bg-accent/90 text-accent-foreground"
            )}
            disabled={isProcessing}
          >
            {isCreatingAccount ? 
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 
              <CheckCircle className="mr-2 h-5 w-5" />
            }
            Yes, Create Account
          </Button>
          <Button
            variant="outline"
            onClick={handleSkipForNow}
            className="w-full py-6 text-base rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
            disabled={isProcessing}
          >
            {isSkipping ? 
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 
              <SkipForward className="mr-2 h-5 w-5" />
            }
            Skip for Now
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
