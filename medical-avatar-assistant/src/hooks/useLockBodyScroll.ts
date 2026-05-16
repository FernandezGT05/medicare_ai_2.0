import { useEffect } from "react";

/**
 * Locks the document scroll position while an embedded consultation is active.
 * Prevents the page from jumping when typing in the Bey iframe chat (focus scroll).
 */
export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const scrollY = window.scrollY;
    const { style } = document.body;

    const prevOverflow = style.overflow;
    const prevPosition = style.position;
    const prevTop = style.top;
    const prevWidth = style.width;
    const prevPaddingRight = style.paddingRight;

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    style.overflow = "hidden";
    style.position = "fixed";
    style.top = `-${scrollY}px`;
    style.width = "100%";
    if (scrollbarWidth > 0) {
      style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      style.overflow = prevOverflow;
      style.position = prevPosition;
      style.top = prevTop;
      style.width = prevWidth;
      style.paddingRight = prevPaddingRight;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}
