import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Local shadcn/ui primitive, using Radix Slot for semantic links.
const variants = cva("button", {
  variants: {
    variant: {
      default: "button-primary",
      outline: "button-outline",
      ghost: "button-ghost",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Button({
  asChild = false,
  variant,
  className,
  ...props
}: ComponentProps<"button"> &
  VariantProps<typeof variants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : "button";
  return (
    <Component className={cn(variants({ variant }), className)} {...props} />
  );
}
