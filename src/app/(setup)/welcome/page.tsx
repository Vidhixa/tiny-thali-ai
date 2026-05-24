
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useSetup } from '@/contexts/SetupContext';
import { ArrowRight, CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { format, differenceInMonths, subYears } from "date-fns";

const today = new Date();
today.setHours(0, 0, 0, 0);

const MIN_AGE_MONTHS = 6;
const MAX_AGE_MONTHS = 24;

const welcomeFormSchema = z.object({
  babyName: z.string().min(1, { message: "Please enter Baby's name" }).max(50, "Baby's name cannot exceed 50 characters."),
  babyBirthDate: z.date({
    required_error: "Baby's birth date is required.",
    invalid_type_error: "Please select a valid date.",
  }),
}).refine(data => {
  if (data.babyBirthDate) {
    const ageInMonths = differenceInMonths(new Date(), data.babyBirthDate);
    return ageInMonths >= MIN_AGE_MONTHS && ageInMonths <= MAX_AGE_MONTHS;
  }
  return true; // If date is not set, let the required validation handle it
}, {
  message: `Baby's age must be between ${MIN_AGE_MONTHS} and ${MAX_AGE_MONTHS} months.`,
  path: ['babyBirthDate'], // Assign error to babyBirthDate field
});

type WelcomeFormValues = z.infer<typeof welcomeFormSchema>;

export default function WelcomePage() {
  const router = useRouter();
  const { setupData, updateSetupData } = useSetup();
  const [isProcessingNext, setIsProcessingNext] = useState(false);

  const form = useForm<WelcomeFormValues>({
    resolver: zodResolver(welcomeFormSchema),
    defaultValues: {
      babyName: setupData.babyName || '',
      babyBirthDate: setupData.babyBirthDate || undefined,
    },
  });

  function onSubmit(data: WelcomeFormValues) {
    setIsProcessingNext(true);
    const ageInMonths = differenceInMonths(new Date(), data.babyBirthDate);
    updateSetupData({ 
      babyName: data.babyName, 
      babyBirthDate: data.babyBirthDate,
      babyAgeMonths: ageInMonths 
    });
    router.push('/food-preferences');
  }

  return (
    <>
      <CardHeader className="text-center mb-6 p-0">
        <CardTitle className="text-4xl font-baloo mb-2 text-primary">Welcome to TinyThali 👋</CardTitle>
        <CardDescription className="text-lg text-muted-foreground">
          Let’s set up a thali your baby will love!
        </CardDescription>
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="babyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-md font-medium text-foreground">Baby's Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="E.g., Aanya, Rohan"
                    {...field}
                    className="py-6 text-md rounded-lg shadow-sm focus:ring-2 focus:ring-primary"
                    disabled={isProcessingNext}
                  />
                </FormControl>
                <FormMessage className="text-accent-foreground">{form.formState.errors.babyName?.message}</FormMessage>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="babyBirthDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-md font-medium text-foreground">Baby's Birth Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal py-6 text-md rounded-lg shadow-sm focus:ring-2 focus:ring-primary",
                          !field.value && "text-muted-foreground",
                          isProcessingNext && "opacity-50 cursor-not-allowed"
                        )}
                        disabled={isProcessingNext}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date: Date) => date > new Date() || isProcessingNext} // Disable future dates & when processing
                      initialFocus
                      fromYear={subYears(today, 10).getFullYear()} 
                      toYear={today.getFullYear()} 
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage className="text-accent-foreground">{form.formState.errors.babyBirthDate?.message}</FormMessage>
              </FormItem>
            )}
          />
          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              className={cn(
                "w-full py-6 text-lg rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300",
                isProcessingNext
                  ? "bg-accent hover:bg-accent/90 text-accent-foreground"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              )}
              disabled={isProcessingNext}
            >
              {isProcessingNext ?
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> :
                  (<>Next <ArrowRight className="ml-2 h-5 w-5" /></>)
              }
            </Button>
            <Button
                type="button"
                variant="link"
                className="w-full text-muted-foreground underline"
                onClick={() => router.push('/auth/login')}
                disabled={isProcessingNext}
            >
                I already have an account
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
