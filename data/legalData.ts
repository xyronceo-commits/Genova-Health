export interface LegalDoc {
  id: string;
  title: string;
  shortDesc: string;
  lastUpdated: string;
  category: string;
  sections: {
    heading: string;
    content: string | string[];
  }[];
}

export const LEGAL_DOCS: Record<string, LegalDoc> = {
  hub: {
    id: "hub",
    title: "Legal & Regulatory Hub",
    shortDesc: "Overview of Genova Health policies, governance standards, and terms.",
    lastUpdated: "August 2026",
    category: "Overview",
    sections: [
      {
        heading: "Welcome to Genova Health Legal Portal",
        content: "Genova Health is committed to compliance, user privacy, transparent medical disclaimers, and data protection. Below you will find our complete set of legally binding terms and policies governing your usage of our web platform, mobile applications, AI health assistants, and biometric scanning telemetry."
      },
      {
        heading: "Quick Navigation & Compliance Directory",
        content: [
          "• Terms & Conditions: Core user agreement, account responsibilities, and service tier rights.",
          "• Privacy Policy: Local-first data architecture, client-side storage, and ephemeral processing standards.",
          "• Cookie Policy: Essential browser storage, cache usage, and analytics policy.",
          "• Acceptable Use Policy: Rules against abuse, false emergency dispatches, or automated scrapers.",
          "• Disclaimer: Medical and clinical guidance disclaimers regarding AI responses.",
          "• Intellectual Property Policy: Ownership of trademarks, proprietary PPG algorithms, and software code.",
          "• Copyright Policy: DMCA take-down process and intellectual property infringement reporting.",
          "• Community Guidelines: Standards for community interactions, reviews, and emergency alerts.",
          "• Trust & Safety: Verification, SOS dispatch protocol, and emergency safety guarantees."
        ]
      }
    ]
  },

  terms: {
    id: "terms",
    title: "Terms & Conditions",
    shortDesc: "Binding agreement governing access and use of Genova Health services.",
    lastUpdated: "August 7, 2026",
    category: "Terms",
    sections: [
      {
        heading: "1. Acceptance of Terms",
        content: "By accessing, creating an account on, or interacting with Genova Health ('Platform', 'Services', 'we', 'us'), you agree to be bound by these Terms & Conditions and our Privacy Policy. If you do not agree to all terms, you must immediately cease using the platform."
      },
      {
        heading: "2. Scope of Services",
        content: "Genova Health provides digital wellness tools, including local client-side biometric scanning (PPG), step tracking, AI health assistant dialogues, food scanning (NutriScan), and emergency SOS dispatch notifications. These services are provided for informational and preliminary triage purposes only."
      },
      {
        heading: "3. Account Eligibility & User Obligations",
        content: [
          "• Age Requirement: You must be at least 18 years old or possess legal parental consent.",
          "• Accuracy: You warrant that any health demographics (genotype, blood group, allergies) entered into your profile are accurate.",
          "• Account Security: You are solely responsible for maintaining physical security over your device, as biometric logs reside locally."
        ]
      },
      {
        heading: "4. Subscription & Paid Features",
        content: "Certain features (e.g., Genova Health Premium, unlimited AI Nurse consultation, advanced PPG heart rate variability analytics) may require a paid subscription. Payments are non-refundable except as required by applicable law or explicit statutory guarantee."
      },
      {
        heading: "5. Limitation of Liability",
        content: "To the maximum extent permitted by applicable law, Genova Health and its developers shall not be liable for any direct, indirect, incidental, or consequential damages resulting from reliance on AI health responses, device motion sensors, or emergency alert delivery failures."
      },
      {
        heading: "6. Termination & Service Modifications",
        content: "We reserve the right to modify, suspend, or terminate access to any portion of the platform at any time for violations of these Terms or emergency maintenance without prior notice."
      }
    ]
  },

  privacy: {
    id: "privacy",
    title: "Privacy Policy",
    shortDesc: "Details on client-side sandboxing, data sovereignty, and zero cloud logging.",
    lastUpdated: "August 7, 2026",
    category: "Privacy",
    sections: [
      {
        heading: "1. Client-Side Local Data Architecture",
        content: "Genova Health operates on a Local-First privacy architecture. All medical demographics (full name, genotype, blood group, allergies), PPG vital scan histories, daily step counters, and AI assistant chat histories are saved strictly inside your web browser's sandboxed localStorage."
      },
      {
        heading: "2. Information We Collect & How We Use It",
        content: [
          "• Profile Information: Name, age, weight, height, genotype, blood group, and emergency contacts are stored locally on your device.",
          "• Biometric Telemetry: Video frames from optical PPG camera scans are processed ephemerally in volatile memory (RAM) and never saved or stored on central servers.",
          "• Sensor Inputs: Device acceleration and motion data are processed locally to count physical steps and detect emergency fall impacts."
        ]
      },
      {
        heading: "3. AI Processing & Transient Data Flow",
        content: "When you interact with our AI health coaches (Nurse Genova, Nutrition Assistant, Symptom Checker), queries are sent to secure serverless endpoints solely to compute answers. Queries are never stored for model training or linked to third-party advertising IDs."
      },
      {
        heading: "4. Emergency SOS Data Sharing",
        content: "When you explicitly trigger an SOS Emergency Alert, your specified emergency contacts and location coordinates are transmitted via SMS or webhook dispatches to alert your chosen recipients. You hold full control over your contact list."
      },
      {
        heading: "5. Data Control & Deletion",
        content: "Because your health data resides in your device's local storage, clearing your browser cache or clicking 'Clear Local Data' in Profile Settings instantly and irreversibly purges 100% of your records from the device."
      }
    ]
  },

  cookies: {
    id: "cookies",
    title: "Cookie Policy",
    shortDesc: "How local storage, cache, and browser cookies are used.",
    lastUpdated: "August 7, 2026",
    category: "Privacy",
    sections: [
      {
        heading: "1. What Are Cookies & Local Storage?",
        content: "Cookies and local Web Storage (localStorage/sessionStorage) are small data keys stored on your device browser that enable websites to remember user preferences, login states, and active sessions."
      },
      {
        heading: "2. How Genova Health Uses Local Storage",
        content: [
          "• Essential Functional Keys: Used to save your user profile (genova_user_profile), dark/light theme preference (genova_theme_mode), and smartwatch pair states.",
          "• Biometric Caching: Saves step counts (genova_daily_steps) and local PPG vital history logs.",
          "• Zero Advertising Cookies: Genova Health does NOT place third-party tracking pixels, marketing cookies, or retargeting scripts on your device."
        ]
      },
      {
        heading: "3. Managing Your Browser Storage",
        content: "You can manage, restrict, or wipe browser storage keys at any time through your web browser's developer tools or clearing site data settings."
      }
    ]
  },

  "acceptable-use": {
    id: "acceptable-use",
    title: "Acceptable Use Policy",
    shortDesc: "Rules governing fair usage, system security, and prohibited conduct.",
    lastUpdated: "August 7, 2026",
    category: "Safety",
    sections: [
      {
        heading: "1. Prohibited Activities",
        content: [
          "• False Emergency Triggers: You must not deliberately send false SOS emergency broadcasts or spam dispatch webhooks.",
          "• Automated Abuse & Scraping: You may not reverse-engineer, crawl, or scrape our PPG camera scanning algorithms or AI API endpoints.",
          "• Unauthorized Medical Advice: You may not use Genova Health output to impersonate a licensed physician or prescribe controlled substances.",
          "• Malware & Reverse Engineering: Attempting to bypass browser sandboxing or compromise platform security is strictly forbidden."
        ]
      },
      {
        heading: "2. Enforcement & Suspension",
        content: "Violations of this Acceptable Use Policy may result in immediate suspension of account privileges, termination of premium subscriptions, or reporting to relevant authorities if fraudulent emergency dispatches occur."
      }
    ]
  },

  disclaimer: {
    id: "disclaimer",
    title: "Medical & Clinical Disclaimer",
    shortDesc: "Crucial medical notice regarding AI triage and biometric scan limitations.",
    lastUpdated: "August 7, 2026",
    category: "Medical",
    sections: [
      {
        heading: "1. Not Medical Advice",
        content: "GENOVA HEALTH IS AN AI-POWERED WELLNESS COMPANION AND PRELIMINARY TRIAGE TOOL. THE CONTENT, BIOMETRIC ESTIMATES, PPG HEART RATE READINGS, AND AI ASSISTANT RESPONSES ARE FOR INFORMATIONAL PURPOSES ONLY AND DO NOT CONSTITUTE PROFESSIONAL MEDICAL DIAGNOSIS, TREATMENT, OR CLINICAL DIRECTION."
      },
      {
        heading: "2. Emergency Medical Situations",
        content: "IF YOU ARE EXPERIENCING A MEDICAL EMERGENCY, SEVERE CHEST PAIN, DIFFICULTY BREATHING, SUDDEN NUMBNESS, OR ACUTE TRAUMA, IMMEDIATELY CALL YOUR LOCAL EMERGENCY SERVICES (OR 112/911/112 IN NIGERIA) OR VISIT THE NEAREST HOSPITAL EMERGENCY ROOM."
      },
      {
        heading: "3. Biometric Scan & Sensor Limitations",
        content: "Camera-based PPG vital scans and motion accelerometers are subject to optical noise, ambient lighting variations, skin tone interference, and movement artifacts. Vitals shown (SpO2, Blood Pressure, Heart Rate) are estimates and must never replace clinical-grade medical monitors."
      }
    ]
  },

  "intellectual-property": {
    id: "intellectual-property",
    title: "Intellectual Property Policy",
    shortDesc: "Ownership of trademarks, PPG algorithms, branding, and code.",
    lastUpdated: "August 7, 2026",
    category: "IP & Copyright",
    sections: [
      {
        heading: "1. Ownership of Platform Assets",
        content: "All source code, user interface designs, custom icons, Genova Health branding, logos, PPG signal processing code, and proprietary prompt engines are the exclusive property of Genova Health and its licensors."
      },
      {
        heading: "2. User Data Ownership",
        content: "You retain full ownership over any personal health records, notes, and profile details created within your local app environment."
      },
      {
        heading: "3. Limited Software License",
        content: "We grant you a personal, non-exclusive, non-transferable, revocable license to access and use Genova Health for personal, non-commercial health tracking."
      }
    ]
  },

  copyright: {
    id: "copyright",
    title: "Copyright Policy & DMCA",
    shortDesc: "Digital Millennium Copyright Act compliance and takedown procedures.",
    lastUpdated: "August 7, 2026",
    category: "IP & Copyright",
    sections: [
      {
        heading: "1. DMCA Notice & Takedown Procedure",
        content: "Genova Health respects intellectual property rights. If you believe any material on our platform infringes your copyrighted work, you may submit a written DMCA notice to legal@genovahealth.com with:"
      },
      {
        heading: "2. Required Information for DMCA Claims",
        content: [
          "1. A physical or electronic signature of the copyright owner or authorized representative.",
          "2. Identification of the copyrighted work claimed to have been infringed.",
          "3. Specific URL or description of the location of the allegedly infringing material.",
          "4. Your contact details (address, telephone number, email).",
          "5. A statement of good faith belief that the material is unauthorized.",
          "6. A statement under penalty of perjury that the information provided is accurate."
        ]
      }
    ]
  },

  "community-guidelines": {
    id: "community-guidelines",
    title: "Community Guidelines",
    shortDesc: "Behavioral standards for community participation and feedback.",
    lastUpdated: "August 7, 2026",
    category: "Safety",
    sections: [
      {
        heading: "1. Respectful & Empathetic Interaction",
        content: "Genova Health is dedicated to supporting users on their wellness journeys. All community forums, feedback channels, and public interactions must maintain mutual respect, empathy, and constructive tone."
      },
      {
        heading: "2. Prohibited Content & Harassment",
        content: [
          "• No Hate Speech or Bullying: Hate speech, harassment, discrimination based on gender, race, genotype, or medical condition is strictly prohibited.",
          "• No Harmful Medical Misinformation: Unsubstantiated dangerous remedies or anti-medical conspiracies are banned.",
          "• Respect Privacy: Never share another person's private health records or emergency contact details."
        ]
      }
    ]
  },

  "trust-and-safety": {
    id: "trust-and-safety",
    title: "Trust & Safety Policy",
    shortDesc: "Emergency SOS safety protocols, verification, and user protections.",
    lastUpdated: "August 7, 2026",
    category: "Safety",
    sections: [
      {
        heading: "1. SOS Dispatch Infrastructure Safety",
        content: "Our Emergency SOS subsystem is engineered with high-priority dispatch pathways, geolocation verification, and instant fallback channels. When an alert is triggered, emergency contact numbers are immediately formatted for carrier dispatch."
      },
      {
        heading: "2. AI Guardrails & Medical Safety Filters",
        content: "All AI assistant responses pass through clinical safety guardrails. If self-harm, severe psychiatric distress, or critical medical red-flags are detected, the system automatically surfaces emergency telephone numbers and local crisis centers."
      },
      {
        heading: "3. Continuous Monitoring & Safety Audits",
        content: "We perform regular security audits of our local web sandboxes, encryption layers, and third-party APIs to safeguard user trust and ensure application integrity."
      }
    ]
  }
};
