"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Moves focus to the main content area after route changes.
 * This ensures screen readers announce the new page content.
 */
export function useFocusOnNavigate() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip on initial load — browser handles initial focus
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // After navigation, focus the main content element
    const main = document.getElementById("main-content");
    if (main) {
      // Make it focusable temporarily if it isn't already
      if (!main.hasAttribute("tabindex")) {
        main.setAttribute("tabindex", "-1");
        main.style.outline = "none";
      }
      main.focus();
    }
  }, [pathname]);
}
