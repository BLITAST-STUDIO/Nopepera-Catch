import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-opacity transition-transform duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/40 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] select-none",
  {
    variants: {
      variant: {
        primary: "bg-fg text-bg hover:opacity-90 border border-transparent",
        ghost: "bg-transparent text-fg border border-border hover:bg-surface",
        catch: "bg-fg text-bg tracking-wide hover:opacity-90 border border-transparent",
      },
      size: {
        md: "h-12 px-6 text-sm rounded-md",
        lg: "h-14 px-8 text-base rounded-lg",
        xl: "h-16 px-10 text-lg rounded-lg min-w-48",
        icon: "size-12 rounded-md",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
