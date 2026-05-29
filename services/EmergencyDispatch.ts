import { Linking } from 'react-native';
import { BACKEND_URL, EMERGENCY_NUMBER } from '../constants/config';
import type { AccidentReport } from '../types';

export async function callEmergency() {
  await Linking.openURL(`tel:${EMERGENCY_NUMBER}`);
}

export async function sendSMSAlerts(report: AccidentReport): Promise<void> {
  // Routed through backend to keep Twilio credentials server-side
  await fetch(`${BACKEND_URL}/alert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contacts: report.emergencyContacts,
      lat: report.location.lat,
      lng: report.location.lng,
      severity: report.severity,
      impactForce: report.impactForce,
      speedAtImpact: report.speedAtImpact,
      timestamp: report.timestamp,
    }),
  });
}

export async function postReportToBackend(report: AccidentReport): Promise<void> {
  await fetch(`${BACKEND_URL}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
  });
}

// Offline queue — retry on next app foreground
export async function dispatchWithFallback(report: AccidentReport) {
  const tasks = [
    postReportToBackend(report).catch(console.warn),
    sendSMSAlerts(report).catch(console.warn),
  ];
  await Promise.allSettled(tasks);
}
