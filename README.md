# Genova Health 🩺✨

**Genova Health** is an intelligent, full-stack personal wellness and diagnostic application. Powered by Gemini AI, Firebase, and real-time biometric integrations, Genova Health brings personal health tracking, nutrition analysis, AI medical assistant sessions, and smartwatch wellbeing sync into a seamless user experience.

---

## 🌟 Key Features

- **Vitals & Wellbeing Sync™**: Directly pair and sync smartwatch biometrics (Heart Rate, Blood Pressure, Stress Levels, SpO2) into your health profile.
- **SmartScan™ AI Nutrition**: Analyze meals using vision-capable Gemini models to instantly estimate calories, macros, and dietary insights.
- **AI Health Assistant**: Interactive assistant supporting voice/speech synthesis, symptom checking, personalized health recommendations, and expandable/collapsible chat session history.
- **Emergency SOS & Care Locator**: Instant access to emergency triage guides, local hospital search, and automated SOS contacts.
- **Wearable Device Hub**: Pair Bluetooth smartbands and watches, simulate live biometric telemetry, and log continuous health metrics.
- **Personalized Health Profile**: Complete onboarding questionnaire, health goal tracking, and Firebase Cloud sync for multi-device data persistence.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, React Router v6, Tailwind CSS, Motion (framer-motion replacement), Lucide Icons, Recharts
- **Backend & AI**: Express.js server, Google GenAI SDK (`@google/genai` Gemini 2.5/1.5 models)
- **Database & Auth**: Firebase Firestore & Firebase Authentication
- **Build System**: Vite, TypeScript, `tsx`, `esbuild`

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn

### Environment Setup

Create a `.env` file in the root directory (refer to `.env.example`):

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```
   The application will be running on `http://localhost:3000`.

---

## 📜 Available Scripts

- `npm run dev`: Starts the full-stack Express + Vite development server on port 3000 using `tsx`.
- `npm run build`: Bundles client assets with Vite and compiles `server.ts` into a CommonJS production bundle (`dist/server.cjs`) using `esbuild`.
- `npm run start`: Runs the compiled CommonJS server with Node.js in production mode.
- `npm run lint`: Performs TypeScript type checking across the project (`tsc --noEmit`).

---

## 📄 License

This project is licensed under the MIT License.
