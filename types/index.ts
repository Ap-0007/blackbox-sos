export interface SensorSnapshot {
  timestamp: number;
  ax: number; // accelerometer x
  ay: number;
  az: number;
  gForce: number;
  lat: number;
  lng: number;
  speed: number; // kmph
  heading: number;
}

export type Severity = 'CRITICAL' | 'SERIOUS' | 'MINOR';

export interface AIClassification {
  severity: Severity;
  likely_injuries: string[];
  dispatch: string;
  hospital_dept: string[];
  estimated_casualties: number;
  priority_score: number;
}

export interface AccidentReport {
  id: string;
  timestamp: number;
  location: { lat: number; lng: number; address?: string };
  impactForce: number;     // G
  speedAtImpact: number;   // kmph
  speedAfter: number;
  impactDirection: string;
  severity: Severity;
  aiClassification?: AIClassification;
  last30Seconds: SensorSnapshot[];
  deviceInfo: { os: string; model: string };
  emergencyContacts: string[];
  sent: boolean;
}

export interface EmergencyContact {
  name: string;
  phone: string;
}

export interface AppConfig {
  emergencyContacts: EmergencyContact[];
  volunteerMode: boolean;
  crashThresholdG: number;       // default 2.5
  speedDropThreshold: number;    // kmph, default 40
  countdownSeconds: number;      // false alarm cancel window
}
