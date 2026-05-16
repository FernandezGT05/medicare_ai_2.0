import { branding } from "./branding";

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
}

export const assistantServices: ServiceItem[] = [
  {
    id: "symptoms",
    title: "Symptom & wellness guidance",
    description:
      `Describe how you feel and get clear, general wellness information. ${branding.agentName} helps you understand common symptoms and when to follow up with a clinician — without replacing professional diagnosis.`,
    image: "/images/services/symptom-guidance.svg",
    imageAlt: "Doctor discussing wellness with a patient",
  },
  {
    id: "appointments",
    title: "Appointment scheduling",
    description:
      "Book, reschedule, or prepare for clinic visits through a natural conversation. Get reminders about what to bring and questions to ask your care team.",
    image: "/images/services/appointments.svg",
    imageAlt: "Calendar and medical appointment planning",
  },
  {
    id: "medications",
    title: "Medication support",
    description:
      "Ask about prescriptions, refills, and how to take medications safely. Receive plain-language explanations of common drug interactions and dosing reminders.",
    image: "/images/services/medications.svg",
    imageAlt: "Medication bottles and pharmacy care",
  },
  {
    id: "records",
    title: "Health records access",
    description:
      `Learn how to view lab results, visit summaries, and your patient portal. ${branding.agentName} walks you through finding and understanding your health documents step by step.`,
    image: "/images/services/health-records.svg",
    imageAlt: "Digital health records on a tablet",
  },
  {
    id: "urgent",
    title: "Urgent care guidance",
    description:
      "Understand when symptoms need same-day care, an urgent visit, or emergency services. Get calm, structured advice for after-hours health concerns.",
    image: "/images/services/urgent-care.svg",
    imageAlt: "Urgent medical care and emergency guidance",
  },
];
