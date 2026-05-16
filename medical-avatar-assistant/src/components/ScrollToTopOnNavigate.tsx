import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { scrollToHashTarget } from "../lib/scrollToHash";

/** Reset window scroll on route changes; scroll to hash targets when present. */
export function ScrollToTopOnNavigate() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const frame = requestAnimationFrame(() => {
        scrollToHashTarget(hash);
      });
      return () => cancelAnimationFrame(frame);
    }

    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
