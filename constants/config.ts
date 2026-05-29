export const CRASH_THRESHOLD_G = 2.5;
export const SPEED_DROP_THRESHOLD_KMH = 40;
export const BUFFER_DURATION_SEC = 30;
export const SENSOR_POLL_MS = 100; // 10Hz
export const CANCEL_COUNTDOWN_SEC = 15;

export const SEVERITY_COLORS = {
  CRITICAL: '#FF2D2D',
  SERIOUS:  '#FF8C00',
  MINOR:    '#FFD700',
} as const;

// Replace with your actual keys in .env
export const CLAUDE_API_KEY    = process.env.EXPO_PUBLIC_CLAUDE_API_KEY    ?? '';
export const FIREBASE_API_KEY  = process.env.EXPO_PUBLIC_FIREBASE_API_KEY  ?? '';
export const FIREBASE_PROJECT  = process.env.EXPO_PUBLIC_FIREBASE_PROJECT  ?? '';
export const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID           ?? '';
export const TWILIO_AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN             ?? '';
export const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER            ?? '';
export const BACKEND_URL        = process.env.EXPO_PUBLIC_BACKEND_URL       ?? 'http://localhost:3001';

export const EMERGENCY_NUMBER = '112'; // India unified emergency
