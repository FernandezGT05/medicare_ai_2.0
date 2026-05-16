import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import styles from "./ScrollToTopButton.module.css";

const SCROLL_ROOT_SELECTOR = "[data-scroll-root]";
const SHOW_AFTER_PX = 400;

function getScrollRoot(): HTMLElement | null {
  return document.querySelector(SCROLL_ROOT_SELECTOR);
}

function getScrollOffset(): number {
  const root = getScrollRoot();
  const rootScroll = root?.scrollTop ?? 0;
  const windowScroll =
    window.scrollY || document.documentElement.scrollTop || 0;
  return Math.max(rootScroll, windowScroll);
}

export function ScrollToTopButton() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  const updateVisibility = useCallback(() => {
    setVisible(getScrollOffset() > SHOW_AFTER_PX);
  }, []);

  useEffect(() => {
    updateVisibility();

    window.addEventListener("scroll", updateVisibility, { passive: true });
    const root = getScrollRoot();
    root?.addEventListener("scroll", updateVisibility, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateVisibility);
      root?.removeEventListener("scroll", updateVisibility);
    };
  }, [location.pathname, updateVisibility]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    getScrollRoot()?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      className={`${styles.button} ${visible ? styles.buttonVisible : ""}`}
      onClick={scrollToTop}
      aria-label="Scroll to top"
      title="Back to top"
    >
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
