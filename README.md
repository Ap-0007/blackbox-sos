<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:0d1117,50:161b22,100:1a1b27&height=220&section=header&text=BLACKBOX%20SOS&fontSize=60&fontColor=e6edf3&fontAlignY=35&desc=Passive%20Crash%20Detection%20%E2%80%A2%20AI%20Injury%20Reports%20%E2%80%A2%20Emergency%20Dispatch&descSize=16&descAlignY=55&descColor=8b949e&animation=fadeIn" width="100%" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-61DAFB?style=for-the-badge&logo=react&logoColor=white&labelColor=0d1117&color=0d1117" />
  <img src="https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white&labelColor=0d1117&color=0d1117" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white&labelColor=0d1117&color=0d1117" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white&labelColor=0d1117&color=0d1117" />
</p>

<p align="center">
  <a href="https://blackbox-sos.vercel.app">
    <img src="https://img.shields.io/badge/🔴_LIVE_DEMO-blackbox--sos.vercel.app-e34c26?style=flat-square&labelColor=0d1117" />
  </a>
</p>

---

## 🩸 What is this?

**BlackBox SOS** is a passive crash detection system that runs silently on your phone, monitoring accelerometer and gyroscope data in real-time. When it detects a sudden, violent impact pattern — it assumes you can't help yourself.

Within seconds, it:
- 📍 Locks your GPS coordinates
- 🧠 Generates an AI-powered injury severity report based on impact data
- 🚨 Dispatches your location + report to emergency contacts and services
- 📊 Streams everything to a real-time web dashboard

No buttons. No unlock screens. No fumbling. Just physics and inference saving your life.

> *You shouldn't need to be conscious to call for help.*

---

## ⚙️ How It Works

```
┌─────────────────────────────────────────────────────────┐
│                    📱 MOBILE APP                        │
│                                                         │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ Accel +  │───▶│ Sensor Fusion│───▶│  Impact      │  │
│  │ Gyro     │    │ Engine       │    │  Classifier  │  │
│  └──────────┘    └──────────────┘    └──────┬───────┘  │
│                                             │          │
│                                    🔴 CRASH DETECTED   │
│                                             │          │
│  ┌──────────┐    ┌──────────────┐    ┌──────▼───────┐  │
│  │ GPS Lock │◀───│ Emergency    │◀───│ AI Injury    │  │
│  │ & Send   │    │ Dispatch     │    │ Assessment   │  │
│  └──────────┘    └──────────────┘    └──────────────┘  │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 🖥️  WEB DASHBOARD                       │
│                                                         │
│   📊 Real-time telemetry  │  🗺️ Live map tracking      │
│   📋 Incident history     │  ⚡ Alert management        │
└─────────────────────────────────────────────────────────┘
```

---

## 🧱 Tech Stack

| Layer | Technology | Purpose |
|:------|:-----------|:--------|
| **Mobile** | React Native + Expo | Cross-platform crash detection app |
| **Language** | TypeScript | Type-safe sensor data handling |
| **Backend** | Node.js API | Incident processing & dispatch |
| **Dashboard** | HTML/CSS/JS | Real-time monitoring interface |
| **AI** | LLM Integration | Injury severity inference |
| **Hosting** | Vercel | Web dashboard deployment |

---

## 🚀 Getting Started

### Prerequisites

```bash
node >= 18.0.0
npm or yarn
expo-cli
```

### Installation

```bash
# Clone the repository
git clone https://github.com/Ap-0007/blackbox-sos.git
cd blackbox-sos

# Install dependencies
npm install

# Start the Expo development server
npx expo start

# For the web dashboard
cd web-dashboard
npm install && npm run dev
```

### Running the Backend

```bash
cd backend
npm install
npm run dev
```

---

## 📁 Project Structure

```
blackbox-sos/
├── api/                    # Backend API endpoints
├── backend/                # Server-side logic & dispatch
├── constants/              # App-wide constants
├── public/                 # Static assets
├── screens/                # React Native screens
├── services/               # Sensor fusion, AI, emergency services
├── types/                  # TypeScript type definitions
├── web-dashboard/          # Real-time monitoring dashboard
├── App.tsx                 # Application entry point
├── app.json                # Expo configuration
├── babel.config.js         # Babel configuration
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript configuration
└── vercel.json             # Vercel deployment config
```

---

## 🤝 Contributing

Contributions are welcome — especially from those interested in sensor algorithms, emergency systems, or mobile health tech.

```bash
# Fork the repo
# Create your feature branch
git checkout -b feat/your-feature

# Commit your changes
git commit -m "feat: add your feature"

# Push and open a PR
git push origin feat/your-feature
```

---

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-e6edf3?style=flat-square&labelColor=0d1117&color=161b22" />
</p>

<p align="center">
  <sub>Built by <a href="https://github.com/Ap-0007">vanta.nox</a> · emergencies don't wait for you to be ready</sub>
</p>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0d1117,50:161b22,100:1a1b27&height=100&section=footer" width="100%" />
