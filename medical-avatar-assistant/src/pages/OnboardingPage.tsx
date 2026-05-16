import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { fetchOnboarding, saveOnboarding } from "../api/client";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { LocationInput } from "../components/LocationInput";
import { useAuth } from "../context/AuthContext";
import { setSessionToken } from "../lib/authStorage";
import layout from "../App.module.css";
import styles from "./OnboardingPage.module.css";

const STEPS = ["About you", "Health basics", "Your location"] as const;

export function OnboardingPage() {
  const { isAuthenticated, authReady, user, setUserFromProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [allergiesText, setAllergiesText] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [locationCity, setLocationCity] = useState<string | null>(null);
  const [locationRegion, setLocationRegion] = useState<string | null>(null);
  const [locationCountry, setLocationCountry] = useState<string | null>(null);
  const [locationPostal, setLocationPostal] = useState<string | null>(null);
  const [locationUsePrecise, setLocationUsePrecise] = useState(true);
  const [locationFromGps, setLocationFromGps] = useState(false);
  const [alreadyComplete, setAlreadyComplete] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    void fetchOnboarding()
      .then((data) => {
        setAlreadyComplete(data.completed);
        setName(data.health.name || user?.name || "");
        setDateOfBirth(data.health.dateOfBirth ?? "");
        setGender(data.health.gender ?? "");
        setWeightKg(
          data.health.weightKg != null ? String(data.health.weightKg) : "",
        );
        setHeightCm(
          data.health.heightCm != null ? String(data.health.heightCm) : "",
        );
        setAllergiesText(data.health.allergies.join(", "));
        setLocationLabel(data.health.location.label ?? "");
        setLocationLat(data.health.location.lat);
        setLocationLng(data.health.location.lng);
        setLocationCity(data.health.location.city);
        setLocationRegion(data.health.location.region);
        setLocationCountry(data.health.location.country);
        setLocationPostal(data.health.location.postal);
        setLocationUsePrecise(data.health.location.usePrecise);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load profile.");
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, user?.name]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationLat(pos.coords.latitude);
        setLocationLng(pos.coords.longitude);
        setLocationLabel("Current location");
        setLocationFromGps(true);
        setError(null);
      },
      () => setError("Could not access your location. Enter an address instead."),
    );
  };

  const submit = useCallback(
    async (complete: boolean) => {
      setSaving(true);
      setError(null);
      try {
        const allergies = allergiesText
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean);
        const { profile, token } = await saveOnboarding({
          name: name.trim(),
          dateOfBirth: dateOfBirth || null,
          gender: gender || null,
          weightKg: weightKg ? Number(weightKg) : null,
          heightCm: heightCm ? Number(heightCm) : null,
          allergies,
          locationLabel: locationLabel.trim() || null,
          locationLat,
          locationLng,
          locationCity,
          locationRegion,
          locationCountry,
          locationPostal,
          locationUsePrecise,
          useCurrentLocation:
            locationFromGps && locationLat != null && locationLng != null,
          completeOnboarding: complete,
        });
        setLocationFromGps(false);
        setSessionToken(token);
        setUserFromProfile(profile);
        if (complete) {
          navigate("/consultation", { replace: true });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save.");
      } finally {
        setSaving(false);
      }
    },
    [
      allergiesText,
      dateOfBirth,
      gender,
      heightCm,
      locationCity,
      locationCountry,
      locationLabel,
      locationLat,
      locationLng,
      locationPostal,
      locationRegion,
      locationUsePrecise,
      locationFromGps,
      name,
      navigate,
      setUserFromProfile,
      weightKg,
    ],
  );

  const handleNext = (event: FormEvent) => {
    event.preventDefault();
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    void submit(true);
  };

  if (!authReady) return null;
  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }
  if (!loading && alreadyComplete) {
    return <Navigate to="/consultation" replace />;
  }

  return (
    <div className={layout.layout}>
      <Header />
      <main className={`${layout.main} ${styles.main}`}>
        <p className={layout.eyebrow}>Welcome</p>
        <h1 className={styles.title}>Set up your care profile</h1>
        <p className={styles.subhead}>
          A few details help personalize consultations and suggest nearby
          resources. This is not a medical record.
        </p>

        <div className={styles.progress} aria-label="Progress">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={`${styles.progressStep} ${i <= step ? styles.progressStepActive : ""}`}
            >
              {label}
            </span>
          ))}
        </div>

        {loading ? (
          <p role="status">Loading…</p>
        ) : (
          <form className={styles.form} onSubmit={handleNext}>
            {step === 0 && (
              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>About you</legend>
                <label className={styles.label}>
                  Display name
                  <input
                    className={styles.input}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </label>
                <p className={styles.hint}>Email: {user?.email}</p>
              </fieldset>
            )}

            {step === 1 && (
              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>Health basics</legend>
                <label className={styles.label}>
                  Date of birth
                  <input
                    type="date"
                    className={styles.input}
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </label>
                <label className={styles.label}>
                  Gender (optional)
                  <select
                    className={styles.input}
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="">Prefer not to say</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <div className={styles.row}>
                  <label className={styles.label}>
                    Weight (kg)
                    <input
                      type="number"
                      className={styles.input}
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      min={0}
                      step={0.1}
                    />
                  </label>
                  <label className={styles.label}>
                    Height (cm)
                    <input
                      type="number"
                      className={styles.input}
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      min={0}
                    />
                  </label>
                </div>
                <label className={styles.label}>
                  Allergies (comma-separated, optional)
                  <input
                    className={styles.input}
                    value={allergiesText}
                    onChange={(e) => setAllergiesText(e.target.value)}
                    placeholder="e.g. penicillin, peanuts"
                  />
                </label>
              </fieldset>
            )}

            {step === 2 && (
              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>Your location</legend>
                <p className={styles.hint}>
                  Used to suggest nearby pharmacies, clinics, and other resources
                  related to your conversations.
                </p>
                <LocationInput
                  id="onboarding-location"
                  value={locationLabel}
                  onChange={(val) => {
                    setLocationLabel(val);
                    setLocationLat(null);
                    setLocationLng(null);
                    setLocationFromGps(false);
                  }}
                />
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={useMyLocation}
                >
                  Use my current location
                </button>
                <label className={styles.checkLabel}>
                  <input
                    type="checkbox"
                    checked={locationUsePrecise}
                    onChange={(e) => setLocationUsePrecise(e.target.checked)}
                  />
                  Use precise location for nearby suggestions
                </label>
              </fieldset>
            )}

            {error && (
              <div className={styles.error} role="alert">
                {error}
              </div>
            )}

            <div className={styles.actions}>
              {step > 0 && (
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setStep(step - 1)}
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={saving}
              >
                {step < STEPS.length - 1
                  ? "Continue"
                  : saving
                    ? "Saving…"
                    : "Finish setup"}
              </button>
              {step === STEPS.length - 1 && (
                <button
                  type="button"
                  className={styles.btnGhost}
                  disabled={saving}
                  onClick={() => void submit(true)}
                >
                  Skip location for now
                </button>
              )}
            </div>
          </form>
        )}

        <p className={styles.footerNote}>
          Already finished? <Link to="/consultation">Go to consultation</Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}
