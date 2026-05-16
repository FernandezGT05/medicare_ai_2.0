import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPlaceIntents, fetchProfile } from "../api/client";
import type { PlaceIntent, PlaceSuggestion } from "../types/api";
import { useSession } from "../context/SessionContext";
import styles from "./NearbyPlacesPanel.module.css";

function formatDistance(meters: number | null): string {
  if (meters == null) return "";
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function NearbyPlacesPanel() {
  const {
    consultationActive,
    selectedSpecialty,
    isSetupComplete,
    nearbyPlaces,
    placesLoading,
    placesMessage,
    placesBlocked,
    placesSearchArea,
    pendingPlaceIntent,
    setPendingPlaceIntent,
    requestNearbyPlaces,
    clearNearbyPlaces,
    activeConsultationId,
    placesConsultationId,
  } = useSession();

  const placesMatchCurrentVisit =
    consultationActive &&
    Boolean(activeConsultationId) &&
    placesConsultationId === activeConsultationId;
  const visiblePlaces = placesMatchCurrentVisit ? nearbyPlaces : [];

  const [intents, setIntents] = useState<PlaceIntent[]>([]);
  const [savedLocationLabel, setSavedLocationLabel] = useState<string | null>(
    null,
  );

  useEffect(() => {
    void fetchProfile()
      .then((data) => {
        const label = data.health?.location?.label?.trim();
        if (label) setSavedLocationLabel(label);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedSpecialty || !isSetupComplete) return;
    void fetchPlaceIntents(selectedSpecialty)
      .then((data) => setIntents(data.intents))
      .catch(() => setIntents([]));
  }, [selectedSpecialty, isSetupComplete]);

  if (!isSetupComplete || !selectedSpecialty) {
    return (
      <div className={styles.card}>
        <h2 className={styles.title}>Nearby resources</h2>
        <p className={styles.desc}>
          Choose a specialty and agent above to see nearby pharmacies, clinics, and
          other resources.
        </p>
      </div>
    );
  }

  const showPrompt =
    consultationActive &&
    visiblePlaces.length === 0 &&
    !placesLoading &&
    !placesBlocked &&
    intents.length > 0;

  return (
    <div id="nearby-resources" className={styles.card}>
      <h2 className={styles.title}>Nearby resources</h2>
      <p className={styles.desc}>
        {consultationActive
          ? "Suggestions for this visit only — pick a category below."
          : "Start your visit, then pick a category for nearby suggestions."}
      </p>
      {(placesSearchArea?.label ?? savedLocationLabel) && (
        <p className={styles.area}>
          Searching near:{" "}
          <strong>{placesSearchArea?.label ?? savedLocationLabel}</strong>
          {placesSearchArea?.label &&
            savedLocationLabel &&
            placesSearchArea.label !== savedLocationLabel && (
              <>
                {" "}
                <Link to="/dashboard?tab=profile" className={styles.profileLink}>
                  Update location
                </Link>
              </>
            )}
        </p>
      )}

      {placesMessage && (
        <p className={styles.message} role="status">
          {placesMessage}
          {/location/i.test(placesMessage) && (
            <>
              {" "}
              <Link to="/dashboard?tab=profile" className={styles.profileLink}>
                Add location in Profile
              </Link>
            </>
          )}
        </p>
      )}

      {showPrompt && (
        <div className={styles.prompt} role="region" aria-label="Nearby places prompt">
          <p className={styles.promptText}>
            Would you like nearby options for{" "}
            <strong>{intents[0]?.label ?? "care resources"}</strong>?
          </p>
          <button
            type="button"
            className={styles.btnYes}
            disabled={placesLoading}
            onClick={() => void requestNearbyPlaces(intents[0]?.id)}
          >
            Yes, show nearby places
          </button>
        </div>
      )}

      <div className={styles.intentRow}>
        {intents.map((intent) => (
          <button
            key={intent.id}
            type="button"
            className={`${styles.intentChip} ${
              pendingPlaceIntent === intent.id ? styles.intentChipActive : ""
            }`}
            disabled={placesLoading || !consultationActive}
            onClick={() => {
              setPendingPlaceIntent(intent.id);
              void requestNearbyPlaces(intent.id);
            }}
          >
            {intent.label}
          </button>
        ))}
      </div>

      {placesLoading && (
        <p className={styles.loading} role="status">
          Finding places near you… (may take a few seconds)
        </p>
      )}

      {visiblePlaces.length > 0 && (
        <>
          <ul className={styles.placeList}>
            {visiblePlaces.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </ul>
          <button
            type="button"
            className={styles.clearBtn}
            onClick={clearNearbyPlaces}
          >
            Clear suggestions
          </button>
        </>
      )}

      {!placesLoading &&
        visiblePlaces.length === 0 &&
        !placesMessage &&
        !placesBlocked &&
        intents.length > 0 &&
        consultationActive && (
          <p className={styles.hint}>
            Tap a category (e.g. Pharmacy) for suggestions for this visit.
          </p>
        )}
    </div>
  );
}

function PlaceCard({ place }: { place: PlaceSuggestion }) {
  return (
    <li className={styles.placeItem}>
      <div className={styles.placeHeader}>
        <span className={styles.placeName}>{place.name}</span>
        {place.distanceMeters != null && (
          <span className={styles.distance}>
            {formatDistance(place.distanceMeters)}
          </span>
        )}
      </div>
      <p className={styles.placeAddress}>{place.address}</p>
      <p className={styles.placeReason}>{place.reason}</p>
      {place.mapsUrl && (
        <a
          href={place.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.mapsLink}
        >
          View on map
        </a>
      )}
    </li>
  );
}
