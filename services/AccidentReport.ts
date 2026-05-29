import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { classifySeveritySync, classifySeverity } from './ClaudeClassifier';
import SensorEngine from './SensorEngine';
import type { AccidentReport, SensorSnapshot } from '../types';

function getImpactDirection(ax: number, ay: number): string {
  const angle = Math.atan2(ay, ax) * (180 / Math.PI);
  if (angle > -45 && angle <= 45)   return 'Right-side';
  if (angle > 45 && angle <= 135)   return 'Rear';
  if (angle > 135 || angle <= -135) return 'Left-side';
  return 'Front';
}

export async function buildReport(
  triggerSnap: SensorSnapshot,
  prevSpeed: number,
  emergencyContacts: string[]
): Promise<AccidentReport> {
  const contacts = await AsyncStorage.getItem('emergencyContacts');
  const parsedContacts: string[] = contacts ? JSON.parse(contacts) : emergencyContacts;

  const report: AccidentReport = {
    id: `crash_${Date.now()}`,
    timestamp: triggerSnap.timestamp,
    location: { lat: triggerSnap.lat, lng: triggerSnap.lng },
    impactForce: triggerSnap.gForce,
    speedAtImpact: prevSpeed,
    speedAfter: triggerSnap.speed,
    impactDirection: getImpactDirection(triggerSnap.ax, triggerSnap.ay),
    severity: classifySeveritySync(triggerSnap.gForce),
    last30Seconds: SensorEngine.getLast30Seconds(),
    deviceInfo: { os: Platform.OS, model: 'unknown' },
    emergencyContacts: parsedContacts,
    sent: false,
  };

  // Async AI classification — doesn't block the initial send
  classifySeverity(report)
    .then((ai) => {
      report.aiClassification = ai;
      report.severity = ai.severity;
    })
    .catch(console.warn);

  // Persist locally for offline queuing
  await AsyncStorage.setItem(`report_${report.id}`, JSON.stringify(report));

  return report;
}
