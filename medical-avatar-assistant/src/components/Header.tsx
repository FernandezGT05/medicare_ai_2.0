import type { MouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { scrollToHashTarget } from "../lib/scrollToHash";
import { branding } from "../config/branding";
import {
  signInReturnState,
  signInToConsultationState,
} from "../lib/authNavigation";
import { useAuth } from "../context/AuthContext";
import { useSession } from "../context/SessionContext";
import styles from "./Header.module.css";

function LogoIcon() {
  return (
    <svg
      className={styles.logoIcon}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
    >
      <rect width="32" height="32" rx="8" fill="currentColor" opacity="0.12" />
      <path
        d="M16 8v16M11 13h10M11 19h10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="3" fill="currentColor" />
    </svg>
  );
}

export function Header() {
  const { user, isAuthenticated, signOut } = useAuth();
  const {
    loading,
    connected,
    consultationActive,
    endConsultation,
  } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";

  const goToContact = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (scrollToHashTarget("#contact")) {
      window.history.pushState(null, "", `${location.pathname}#contact`);
      return;
    }
    navigate({ pathname: "/", hash: "#contact" });
  };

  const goHome = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (consultationActive) {
      endConsultation();
    }
    navigate("/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSignOut = () => {
    if (consultationActive) {
      endConsultation();
    }
    signOut();
  };

  const handleSession = () => {
    if (!isAuthenticated) {
      navigate("/signin", { state: signInToConsultationState });
      return;
    }
    if (consultationActive) {
      endConsultation();
    } else {
      navigate("/consultation");
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand} onClick={goHome}>
          <LogoIcon />
          <span className={styles.brandText}>
            <span className={styles.brandName}>{branding.appName}</span>
            <span className={styles.brandTag}>{branding.tagline}</span>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Main">
          <Link
            to={isAuthenticated ? "/consultation" : "/signin"}
            state={isAuthenticated ? undefined : signInToConsultationState}
            className={
              location.pathname === "/consultation"
                ? styles.navLinkActive
                : styles.navLink
            }
          >
            Consultation
          </Link>
          {isAuthenticated && (
            <Link
              to="/dashboard"
              className={
                location.pathname === "/dashboard"
                  ? styles.navLinkActive
                  : styles.navLink
              }
            >
              Dashboard
            </Link>
          )}
          <Link
            to="/"
            className={isHome ? styles.navLinkActive : styles.navLink}
            onClick={goHome}
          >
            Home
          </Link>
          <a href="#contact" className={styles.navLink} onClick={goToContact}>
            Contact
          </a>
        </nav>

        <div className={styles.actions}>
          <span className={styles.planBadge}>Growth</span>
          <span
            className={`${styles.statusPill} ${connected ? styles.statusPillOn : ""}`}
            title={connected ? "API connected" : "API offline"}
          >
            {loading ? "…" : connected ? "Live" : "Offline"}
          </span>

          {isAuthenticated && user ? (
            <>
              <span className={styles.userChip}>
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt=""
                    className={styles.userAvatar}
                    width={28}
                    height={28}
                  />
                ) : (
                  <span className={styles.userInitial} aria-hidden>
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className={styles.userName}>{user.name}</span>
              </span>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/signin"
              state={signInReturnState(location)}
              className={styles.btnGhost}
            >
              Sign in
            </Link>
          )}

          <button
            type="button"
            className={styles.btnPrimary}
            disabled={isAuthenticated && (!connected || loading)}
            onClick={handleSession}
          >
            {consultationActive ? "End session" : "Start session"}
          </button>
        </div>
      </div>
    </header>
  );
}
