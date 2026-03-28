"use client";

import { useFocusOnNavigate } from "@/hooks/useFocusOnNavigate";

/**
 * Client-side focus manager. Placed in the root layout to handle
 * focus management on route changes for accessibility.
 */
export function FocusManager() {
  useFocusOnNavigate();
  return null;
}
