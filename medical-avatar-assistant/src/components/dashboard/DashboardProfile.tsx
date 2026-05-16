import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { fetchProfile, updateProfile } from "../../api/client";
import { LocationInput } from "../LocationInput";
import { useAuth } from "../../context/AuthContext";
import { setSessionToken } from "../../lib/authStorage";
import type { UserProfile } from "../../types/api";
import panel from "./DashboardPanel.module.css";
import styles from "./DashboardProfile.module.css";

interface DashboardProfileProps {
  initialProfile?: UserProfile | null;
}

export function DashboardProfile({ initialProfile }: DashboardProfileProps) {
  const { user, setUserFromProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [pictureUrl, setPictureUrl] = useState(user?.picture ?? "");
  const [locationLabel, setLocationLabel] = useState("");
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [locationCity, setLocationCity] = useState<string | null>(null);
  const [locationRegion, setLocationRegion] = useState<string | null>(null);
  const [locationCountry, setLocationCountry] = useState<string | null>(null);
  const [locationPostal, setLocationPostal] = useState<string | null>(null);
  const [locationUsePrecise, setLocationUsePrecise] = useState(true);
  const [hasLocation, setHasLocation] = useState(false);
  const [locationFromGps, setLocationFromGps] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const source = initialProfile ?? user;
    if (!source) return;
    setName(source.name);
    setPhone(source.phone ?? "");
    setBio(source.bio ?? "");
    setPictureUrl(source.picture ?? "");
  }, [initialProfile, user]);

  useEffect(() => {
    void fetchProfile()
      .then((data) => {
        const loc = data.health?.location;
        if (loc) {
          setLocationLabel(loc.label ?? "");
          setLocationLat(loc.lat);
          setLocationLng(loc.lng);
          setLocationCity(loc.city);
          setLocationRegion(loc.region);
          setLocationCountry(loc.country);
          setLocationPostal(loc.postal);
          setLocationUsePrecise(loc.usePrecise);
          setLocationFromGps(false);
        }
        setHasLocation(data.health?.hasLocation ?? false);
      })
      .catch(() => {});
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationLat(pos.coords.latitude);
        setLocationLng(pos.coords.longitude);
        setLocationLabel((prev) => prev.trim() || "Current location");
        setLocationFromGps(true);
        setError(null);
      },
      () => setError("Could not access your location."),
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const { profile, token, health } = await updateProfile({
        name: name.trim(),
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        picture: pictureUrl.trim() || null,
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
      });
      setLocationFromGps(false);
      setSessionToken(token);
      setUserFromProfile(profile);
      setHasLocation(health?.hasLocation ?? false);
      setMessage("Profile saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={panel.panel} role="tabpanel" aria-label="Profile">
      <header className={panel.panelHeader}>
        <h2 className={panel.panelTitle}>Profile</h2>
        <p className={panel.panelSubhead}>
          Update how you appear in the app. Your email is managed through Google
          sign-in.
        </p>
      </header>

      <form className={styles.form} onSubmit={(e) => void handleSubmit(e)}>
        <div className={styles.avatarRow}>
          {pictureUrl ? (
            <img
              src={pictureUrl}
              alt=""
              className={styles.avatar}
              width={72}
              height={72}
            />
          ) : (
            <span className={styles.avatarFallback} aria-hidden>
              {name.charAt(0).toUpperCase() || "?"}
            </span>
          )}
          <div className={styles.avatarFields}>
            <label className={styles.label} htmlFor="profile-picture">
              Photo URL
            </label>
            <input
              id="profile-picture"
              type="url"
              className={styles.input}
              value={pictureUrl}
              onChange={(e) => setPictureUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="profile-email">
            Email
          </label>
          <input
            id="profile-email"
            type="email"
            className={`${styles.input} ${styles.inputReadonly}`}
            value={user?.email ?? ""}
            readOnly
            aria-readonly="true"
          />
          <p className={styles.hint}>Synced from your Google account.</p>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="profile-name">
            Display name
          </label>
          <input
            id="profile-name"
            type="text"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
          />
        </div>

        <fieldset className={styles.locationSection}>
          <legend className={styles.locationLegend}>Location</legend>
          <p className={styles.hint}>
            Required for nearby pharmacy, clinic, and other suggestions.{" "}
            {hasLocation ? (
              <span className={styles.locationOk}>Saved</span>
            ) : (
              <span className={styles.locationMissing}>Not set</span>
            )}
          </p>
          <LocationInput
            id="profile-location"
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
            Use precise location for nearby search
          </label>
        </fieldset>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="profile-phone">
            Phone
          </label>
          <input
            id="profile-phone"
            type="tel"
            className={styles.input}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Optional"
            maxLength={30}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="profile-bio">
            About you
          </label>
          <textarea
            id="profile-bio"
            className={styles.textarea}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Optional notes for your care team or personal reference"
            maxLength={500}
            rows={4}
          />
          <p className={styles.hint}>{bio.length}/500 characters</p>
        </div>

        {error && (
          <div className={styles.messageError} role="alert">
            {error}
          </div>
        )}
        {message && (
          <p className={styles.messageSuccess} role="status">
            {message}
          </p>
        )}

        <button type="submit" className={styles.submit} disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>

      {!hasLocation && (
        <p className={styles.footerNote}>
          Or complete location in{" "}
          <Link to="/onboarding">onboarding</Link>.
        </p>
      )}
    </div>
  );
}