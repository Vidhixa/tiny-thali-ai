'use client';

import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from 'lucide-react';

interface FoodCardProps {
  id: string;
  name: string;
  icon?: LucideIcon;
  imageHint?: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

export function FoodCard({ id, name, icon: Icon, imageHint, isSelected, onSelect, disabled }: FoodCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 ease-in-out transform hover:scale-105 shadow-lg rounded-xl border-2",
        isSelected ? "border-primary ring-2 ring-primary bg-primary/10" : "border-border hover:border-accent",
        disabled && !isSelected ? "opacity-50 cursor-not-allowed hover:scale-100" : ""
      )}
      onClick={() => !disabled && onSelect(id)}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          onSelect(id);
        }
      }}
      role="checkbox"
      aria-checked={isSelected}
      aria-label={name}
    >
      <CardHeader className="p-3 pb-0 items-center">
        {isSelected && <CheckCircle2 className="absolute top-2 right-2 h-6 w-6 text-primary" />}
        <CardTitle className="text-md font-medium text-center font-poppins tracking-tight">{name}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 flex flex-col items-center justify-center">
        {Icon ? (
          <Icon className="h-16 w-16 text-primary mb-2" />
        ) : (
          <Image
            src={`https://placehold.co/100x100/E3A3B2/F8F5F0.png?text=${name.charAt(0)}`}
            alt={name}
            width={80}
            height={80}
            className="rounded-md mb-2"
            data-ai-hint={imageHint || name.toLowerCase()}
          />
        )}
      </CardContent>
    </Card>
  );
}
