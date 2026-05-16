import { branding } from "../config/branding";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.disclaimer}>
        <strong>Medical disclaimer:</strong> {branding.appName} provides general
        health information only and is not a substitute for professional
        medical advice, diagnosis, or treatment. In an emergency, call your
        local emergency number immediately.
      </div>
      <div className={styles.bottom}>
        <p className={styles.copy}>
          © {new Date().getFullYear()} {branding.appName}. Avatar powered by{" "}
          <a
            href="https://beyondpresence.ai"
            target="_blank"
            rel="noopener noreferrer"
          >
            Beyond Presence
          </a>
          .
        </p>
        <p className={styles.contact}>
          <a href={`mailto:${branding.brandEmail}`}>{branding.brandEmail}</a>
          {" · "}
          <a href={branding.brandWebsite}>Website</a>
        </p>
      </div>
    </footer>
  );
}
