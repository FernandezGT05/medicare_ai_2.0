import { useState, type FormEvent } from "react";
import { branding } from "../config/branding";
import styles from "./ContactSection.module.css";

interface ContactSectionProps {
  /** Enable scroll-snap on the home page only. */
  snapSection?: boolean;
}

export function ContactSection({ snapSection = false }: ContactSectionProps) {
  const [submitted, setSubmitted] = useState(false);
  const { contact } = branding;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div
      id="contact"
      className={`${styles.section} ${snapSection ? styles.sectionSnap : ""}`}
      role="region"
      aria-labelledby="contact-title"
    >
      <div className={styles.inner}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Get in touch</p>
          <h2 id="contact-title" className={styles.title}>
            Contact {branding.appName}
          </h2>
          <p className={styles.lead}>
            Questions about virtual care, partnerships, or technical support?
            Reach our team using the details below.
          </p>
        </div>

        <div className={styles.grid}>
          <address className={styles.details}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Phone</span>
              <a href={`tel:${contact.phoneHref}`} className={styles.detailLink}>
                {contact.phone}
              </a>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Email</span>
              <a href={`mailto:${contact.email}`} className={styles.detailLink}>
                {contact.email}
              </a>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Office</span>
              <span className={styles.detailText}>
                {contact.addressLine1}
                <br />
                {contact.addressLine2}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Hours</span>
              <span className={styles.detailText}>
                {contact.hours}
                <br />
                {contact.hoursWeekend}
              </span>
            </div>
          </address>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <h3 className={styles.formTitle}>Send a message</h3>
            {submitted ? (
              <p className={styles.success} role="status">
                Thank you! Your message has been received. Our team will respond
                within one business day.
              </p>
            ) : (
              <>
                <div className={styles.formFields}>
                  <label className={styles.field}>
                    <span className={styles.label}>Name</span>
                    <input
                      type="text"
                      name="name"
                      required
                      autoComplete="name"
                      placeholder="Jane Doe"
                      className={styles.input}
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Email</span>
                    <input
                      type="email"
                      name="email"
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      className={styles.input}
                    />
                  </label>
                  <label className={`${styles.field} ${styles.fieldGrow}`}>
                    <span className={styles.label}>Message</span>
                    <textarea
                      name="message"
                      required
                      rows={4}
                      placeholder="How can we help you?"
                      className={styles.textarea}
                    />
                  </label>
                </div>
                <button type="submit" className={styles.submit}>
                  Send message
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
