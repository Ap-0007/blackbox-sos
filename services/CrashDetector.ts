import { CRASH_THRESHOLD_G, SPEED_DROP_THRESHOLD_KMH } from '../constants/config';
import type { SensorSnapshot } from '../types';

type CrashCallback = (triggeredBy: SensorSnapshot, prevSpeed: number) => void;

class CrashDetector {
  private prevSpeed = 0;
  private lastTriggerTime = 0;
  private DEBOUNCE_MS = 5000; // ignore second trigger within 5s
  private onCrash: CrashCallback | null = null;

  init(onCrash: CrashCallback) {
    this.onCrash = onCrash;
  }

  evaluate(snap: SensorSnapshot) {
    const speedDrop = this.prevSpeed - snap.speed;
    const now = Date.now();

    if (
      snap.gForce > CRASH_THRESHOLD_G &&
      speedDrop > SPEED_DROP_THRESHOLD_KMH &&
      now - this.lastTriggerTime > this.DEBOUNCE_MS
    ) {
      this.lastTriggerTime = now;
      this.onCrash?.(snap, this.prevSpeed);
    }

    this.prevSpeed = snap.speed;
  }

  // For demo/testing — shake detection fallback
  evaluateShake(snap: SensorSnapshot) {
    const now = Date.now();
    if (snap.gForce > 3.0 && now - this.lastTriggerTime > this.DEBOUNCE_MS) {
      this.lastTriggerTime = now;
      this.onCrash?.(snap, this.prevSpeed);
    }
  }
}

export default new CrashDetector();
