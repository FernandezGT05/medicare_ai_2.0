import styles from "./LocationInput.module.css";

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
}

export function LocationInput({
  value,
  onChange,
  disabled,
  id = "location-input",
}: LocationInputProps) {
  return (
    <div className={styles.wrap}>
      <label className={styles.label} htmlFor={id}>
        City or address
      </label>
      <input
        id={id}
        type="text"
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Colombo 7, Sri Lanka (include country)"
        disabled={disabled}
        autoComplete="street-address"
      />
      <p className={styles.hint}>
        Type your area and save — coordinates are looked up automatically. Or use
        &ldquo;Use my current location&rdquo; for GPS.
      </p>
    </div>
  );
}
