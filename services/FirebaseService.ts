import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, push, set } from 'firebase/database';
import { FIREBASE_API_KEY, FIREBASE_PROJECT } from '../constants/config';
import type { AccidentReport } from '../types';

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  databaseURL: `https://${FIREBASE_PROJECT}-default-rtdb.firebaseio.com`,
  projectId: FIREBASE_PROJECT,
};

function getDB() {
  if (!getApps().length) initializeApp(firebaseConfig);
  return getDatabase();
}

export async function pushReport(report: AccidentReport): Promise<string> {
  const db = getDB();
  const reportRef = push(ref(db, 'accidents'));
  await set(reportRef, {
    ...report,
    // Firebase can't store full 300-snapshot buffer — store summary only
    last30Seconds: report.last30Seconds.length,
    peakGForce: Math.max(...report.last30Seconds.map((s) => s.gForce)),
    sent: true,
  });
  return reportRef.key ?? report.id;
}

// Ambulance dashboard listens to this node in real-time
export function getActiveAccidentsRef() {
  const db = getDB();
  return ref(db, 'accidents');
}
