import { assistantServices } from "../config/services";
import styles from "./ServiceShowcase.module.css";

export function ServiceShowcase() {
  return (
    <div className={styles.showcase} aria-label="Services offered by the virtual assistant">
      {assistantServices.map((service, index) => (
        <section
          key={service.id}
          id={service.id}
          className={styles.panel}
          aria-labelledby={`${service.id}-title`}
        >
          <div
            className={`${styles.inner} ${index % 2 === 1 ? styles.innerReverse : ""}`}
          >
            <div className={styles.media}>
              <img
                src={service.image}
                alt={service.imageAlt}
                className={styles.image}
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className={styles.copy}>
              <p className={styles.index}>
                {String(index + 1).padStart(2, "0")}
              </p>
              <h2 id={`${service.id}-title`} className={styles.title}>
                {service.title}
              </h2>
              <p className={styles.description}>{service.description}</p>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
