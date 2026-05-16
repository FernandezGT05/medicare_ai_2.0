import { useEffect } from "react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { branding } from "../config/branding";
import { useAuth } from "../context/AuthContext";
import {
  resolveSignInReturn,
  type SignInLocationState,
} from "../lib/authNavigation";
import styles from "./SignInPage.module.css";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function LogoIcon() {
  return (
    <svg className={styles.logoIcon} viewBox="0 0 32 32" fill="none" aria-hidden>
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

export function SignInPage() {
  const { isAuthenticated, signInWithGoogleCredential } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = resolveSignInReturn(
    (location.state as SignInLocationState | null)?.from,
  );

  useEffect(() => {
    document.title = `Sign in — ${branding.appName}`;
    return () => {
      document.title = `${branding.appName} — Medical Virtual Assistant`;
    };
  }, []);

  if (isAuthenticated) {
    return <Navigate to={returnTo} replace />;
  }

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) return;
    try {
      await signInWithGoogleCredential(response.credential);
      navigate(returnTo, { replace: true });
      window.scrollTo(0, 0);
    } catch {
      /* GoogleLogin shows its own error UI */
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <LogoIcon />
          <div>
            <h1 className={styles.title}>{branding.appName}</h1>
            <p className={styles.tagline}>{branding.tagline}</p>
          </div>
        </div>

        <div className={styles.divider} role="presentation" />

        <h2 className={styles.heading}>Sign in to continue</h2>
        <p className={styles.description}>
          Use your Google account to access your virtual health assistant and
          saved sessions.
        </p>

        {googleClientId ? (
          <div className={styles.googleWrap}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => {
                /* GoogleLogin shows its own error UI */
              }}
              useOneTap={false}
              theme="outline"
              size="large"
              text="continue_with"
              shape="rectangular"
              width="320"
            />
          </div>
        ) : (
          <div className={styles.setupNotice} role="alert">
            <p className={styles.setupTitle}>Google sign-in not configured</p>
            <p className={styles.setupText}>
              Add your OAuth client ID to <code>.env</code> as{" "}
              <code>VITE_GOOGLE_CLIENT_ID</code>. Create credentials in the{" "}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Cloud Console
              </a>{" "}
              (Web application) and set authorized JavaScript origins to{" "}
              <code>http://localhost:5173</code>.
            </p>
          </div>
        )}

        <p className={styles.disclaimer}>
          By signing in, you agree to our terms of service and privacy policy.
          This demo provides general wellness information only — not medical
          diagnosis or emergency care.
        </p>
      </div>

    </div>
  );
}
