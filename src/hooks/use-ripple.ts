"use client";

import { useEffect, useRef } from "react";

/**
 * Adds a material-style ripple effect to any element.
 * The element should have the `.btn-ripple` class (defined in globals.css).
 *
 * Usage:
 *   const ref = useRipple<HTMLButtonElement>();
 *   <button ref={ref} className="btn-ripple ...">click me</button>
 */
export function useRipple<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handlePointerDown = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty("--ripple-x", `${x}%`);
      el.style.setProperty("--ripple-y", `${y}%`);
      el.classList.remove("is-rippling");
      // Force reflow to restart the animation
      void el.offsetWidth;
      el.classList.add("is-rippling");
    };

    const handleAnimationEnd = () => {
      el.classList.remove("is-rippling");
    };

    el.addEventListener("pointerdown", handlePointerDown);
    el.addEventListener("animationend", handleAnimationEnd);

    return () => {
      el.removeEventListener("pointerdown", handlePointerDown);
      el.removeEventListener("animationend", handleAnimationEnd);
    };
  }, []);

  return ref;
}
