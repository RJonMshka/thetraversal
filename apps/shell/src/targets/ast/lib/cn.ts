import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// The AST's own copy: targets import nothing from the shell.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
