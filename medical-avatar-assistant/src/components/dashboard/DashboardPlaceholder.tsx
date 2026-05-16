import styles from "./DashboardPanel.module.css";

interface DashboardPlaceholderProps {
  title: string;
  description: string;
  icon?: string;
  bullets?: string[];
}

export function DashboardPlaceholder({
  title,
  description,
  icon = "◇",
  bullets,
}: DashboardPlaceholderProps) {
  return (
    <div className={styles.placeholder}>
      <p className={styles.placeholderIcon} aria-hidden>
        {icon}
      </p>
      <h2 className={styles.placeholderTitle}>{title}</h2>
      <p className={styles.placeholderText}>{description}</p>
      {bullets && bullets.length > 0 && (
        <ul className={styles.placeholderList}>
          {bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
