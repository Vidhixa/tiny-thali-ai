
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useSetup } from '@/contexts/SetupContext';
import { COMMON_ALLERGENS } from '@/lib/constants';
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const allergiesFormSchema = z.object({
  selectedAllergies: z.array(z.string()).optional(),
  customAllergy: z.string().max(100).optional(),
}).refine(data => {
  if (data.selectedAllergies?.includes('other') && !data.customAllergy?.trim()) {
    return false;
  }
  return true;
}, {
  message: "Please specify the 'other' allergy.",
  path: ['customAllergy'],
});

type AllergiesFormValues = z.infer<typeof allergiesFormSchema>;

export default function AllergiesPage() {
  const router = useRouter();
  const { setupData, updateSetupData } = useSetup();
  const { toast } = useToast(); // Keep toast for form validation messages if needed
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);
  const [isProceeding, setIsProceeding] = useState(false);

  const form = useForm<AllergiesFormValues>({
    resolver: zodResolver(allergiesFormSchema),
    defaultValues: {
      selectedAllergies: setupData.allergies || [],
      customAllergy: setupData.customAllergy || '',
    },
  });

  const watchSelectedAllergies = form.watch("selectedAllergies", setupData.allergies || []);

  async function onSubmit(data: AllergiesFormValues) {
    setIsProceeding(true);
    try {
      const allergies = data.selectedAllergies || [];
      const finalAllergies = allergies.filter(allergy => allergy !== 'other');
      if (allergies.includes('other') && data.customAllergy?.trim()) {
        finalAllergies.push(data.customAllergy.trim());
      }
      
      updateSetupData({ allergies: finalAllergies, customAllergy: data.customAllergy });
      
      // Navigate to the new save profile prompt page instead of saving to Firebase here
      router.push('/save-profile');

    } catch (e: any) {
      console.error("Error processing allergies:", e);
      toast({
        variant: "default",
        className: "bg-accent/10 border-accent text-accent-foreground [&>svg]:text-accent-foreground",
        title: "Processing Error",
        description: "An unexpected error occurred. Please try again.",
      });
       setIsProceeding(false); 
    }
    // No finally block to reset isProceeding here, as navigation will occur.
    // If navigation fails, it should be caught or the page will remain.
  }

  const handleBack = () => {
    setIsNavigatingBack(true);
    router.push('/food-preferences');
  };

  const isProcessing = isProceeding || isNavigatingBack;

  return (
    <>
      <CardHeader className="text-center mb-6 p-0">
        <CardTitle className="text-4xl font-baloo mb-2 text-primary">Any allergies?</CardTitle>
        <CardDescription className="text-lg text-muted-foreground">
          We’ll keep these out of your baby’s meals!
        </CardDescription>
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormItem>
            <FormLabel className="text-md font-medium">Common Allergens</FormLabel>
            <FormDescription className="text-sm text-muted-foreground mb-2">Select any known allergies.</FormDescription>
            <div className="space-y-3">
              {COMMON_ALLERGENS.map((allergen) => (
                <FormField
                  key={allergen.id}
                  control={form.control}
                  name="selectedAllergies"
                  render={({ field }) => {
                    return (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-3 bg-secondary/30 rounded-lg shadow-sm hover:bg-secondary/50 transition-colors">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(allergen.id)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...(field.value || []), allergen.id])
                                : field.onChange(
                                    (field.value || []).filter(
                                      (value) => value !== allergen.id
                                    )
                                  );
                            }}
                            className="h-5 w-5 rounded border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                            disabled={isProcessing}
                          />
                        </FormControl>
                        <FormLabel className="font-normal text-md flex items-center">
                          {allergen.icon && <allergen.icon className="mr-2 h-5 w-5 text-primary" />}
                          {allergen.label}
                        </FormLabel>
                      </FormItem>
                    );
                  }}
                />
              ))}
            </div>
             <FormMessage className="text-accent-foreground">{form.formState.errors.selectedAllergies?.message}</FormMessage>
          </FormItem>

          {watchSelectedAllergies.includes('other') && (
            <FormField
              control={form.control}
              name="customAllergy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-md font-medium">Other Allergy</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Specify other allergy"
                      {...field}
                      className="py-6 text-md rounded-lg shadow-sm focus:ring-2 focus:ring-primary"
                      disabled={isProcessing}
                    />
                  </FormControl>
                  <FormMessage className="text-accent-foreground">{form.formState.errors.customAllergy?.message}</FormMessage>
                </FormItem>
              )}
            />
          )}
          
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
              type="submit"
              className={cn(
                "w-full py-6 text-lg rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300",
                isProceeding
                  ? "bg-accent hover:bg-accent/90 text-accent-foreground"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              )}
              disabled={isProcessing}
            >
              {isProceeding ?
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> :
                (<>Next <ArrowRight className="ml-2 h-5 w-5" /></>)
              }
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
