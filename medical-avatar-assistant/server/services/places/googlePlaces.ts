/** Location services — OpenStreetMap Nominatim (no Google billing required). */
export {
  geocodeAddress,
  reverseGeocode,
  searchPlacesNearby,
  searchPlacesWithFallbacks,
  type PlaceSearchResult as GooglePlaceResult,
} from "./nominatim.js";
