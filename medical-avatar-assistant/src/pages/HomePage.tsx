import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Header } from "../components/Header";
import { ContactSection } from "../components/ContactSection";
import { Footer } from "../components/Footer";
import { ServiceShowcase } from "../components/ServiceShowcase";
import { useAuth } from "../context/AuthContext";
import { branding } from "../config/branding";
import layout from "../App.module.css";
import {
  signInReturnState,
  signInToConsultationState,
} from "../lib/authNavigation";
import styles from "./HomePage.module.css";

export function HomePage() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.add("home-scroll-snap");
    return () => {
      document.documentElement.classList.remove("home-scroll-snap");
    };
  }, []);

  return (
    <div className={layout.layout}>
      <Header />
      <main className={styles.page}>
        <section className={styles.heroPanel} aria-label="Welcome">
          <div className={styles.heroStack}>
            <h1 className={styles.heroBanner}>{branding.heroBanner}</h1>

            <div className={styles.heroContent}>
              <p className={layout.eyebrow}>{branding.heroEyebrow}</p>
              <h2 className={layout.headline}>
                Talk to <em>{branding.appName}</em>
              </h2>
              <p className={layout.subhead}>{branding.heroSubhead}</p>

              <div className={styles.actions}>
                <Link
                  to={isAuthenticated ? "/consultation" : "/signin"}
                  state={isAuthenticated ? undefined : signInToConsultationState}
                  className={styles.ctaPrimary}
                >
                  Start conversation
                </Link>
                {!isAuthenticated && (
                  <Link
                    to="/signin"
                    state={signInReturnState(location)}
                    className={styles.ctaSecondary}
                  >
                    Sign in
                  </Link>
                )}
              </div>

              <a href="#symptoms" className={styles.scrollHint}>
                Explore services
                <span className={styles.scrollArrow} aria-hidden>
                  ↓
                </span>
              </a>
            </div>
          </div>
        </section>

        <ServiceShowcase />
      </main>
      <ContactSection snapSection />
      <Footer />
    </div>
  );
}
