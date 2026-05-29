# BlackBox SOS — Hackathon Starter

## 30-minute setup

```bash
# 1. Install app dependencies
npm install

# 2. Copy env and fill in keys
cp .env.example .env

# 3. Start the app
npx expo start

# 4. In a second terminal — start backend
cd backend && npm install && npm run dev
```

## Team split

| Person | File(s) | Task |
|--------|---------|------|
| P1 | `services/SensorEngine.ts` `services/CrashDetector.ts` | Tune thresholds, test on real device |
| P2 | `screens/HomeScreen.tsx` `screens/BystanderGuideScreen.tsx` | Polish UI, add animations |
| P3 | `services/ClaudeClassifier.ts` | Wire Claude API key, test prompt |
| P4 | `backend/server.js` + Twilio | Add Firebase write, test SMS |
| P5 | `web-dashboard/index.html` | Fill Firebase config, live test |

## Demo trigger

On the Home screen tap **"Simulate Crash (Demo)"** — no need to actually crash.  
Or shake the phone hard (>3G via `evaluateShake`).

## Key constants to tune

`constants/config.ts`:
- `CRASH_THRESHOLD_G` — default 2.5G (lower = more sensitive)
- `SPEED_DROP_THRESHOLD_KMH` — default 40 kmph
- `CANCEL_COUNTDOWN_SEC` — false-alarm cancel window (default 15s)

## Screens

| Screen | File | Trigger |
|--------|------|---------|
| Home / monitoring | `screens/HomeScreen.tsx` | App open |
| Crash detected | `screens/CrashDetectedScreen.tsx` | Auto on crash |
| Bystander guide | `screens/BystanderGuideScreen.tsx` | Tab bar |
| Ambulance dashboard | `screens/AmbulanceDashboard.tsx` | In-app tab + `web-dashboard/index.html` |

## Firebase setup

1. Create project at console.firebase.google.com  
2. Enable Realtime Database  
3. Copy config into `web-dashboard/index.html` and `.env`

## Architecture

```
Phone sensors (10Hz polling)
  └─> 300-slot ring buffer (30 sec @ 100ms)
        └─> CrashDetector (G-force + speed-drop check)
              └─> buildReport() → AccidentReport JSON
                    ├─> Firebase Realtime DB  ← web dashboard listens here
                    ├─> Backend /report       → logs + future DB
                    ├─> Backend /alert        → Twilio SMS to family
                    └─> Claude API            → AI severity classification
```
