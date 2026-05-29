import { Accelerometer, Gyroscope } from 'expo-sensors';
import * as Location from 'expo-location';
import { SENSOR_POLL_MS, BUFFER_DURATION_SEC } from '../constants/config';
import type { SensorSnapshot } from '../types';

const BUFFER_SIZE = (BUFFER_DURATION_SEC * 1000) / SENSOR_POLL_MS; // 300 slots

class SensorEngine {
  private buffer: SensorSnapshot[] = [];
  private accelSub: any = null;
  private locationSub: any = null;
  private latestAccel = { x: 0, y: 0, z: 0 };
  private latestGPS = { lat: 0, lng: 0, speed: 0, heading: 0 };
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private onCrashCandidate: ((snap: SensorSnapshot) => void) | null = null;

  async start(onCrashCandidate: (snap: SensorSnapshot) => void) {
    this.onCrashCandidate = onCrashCandidate;

    await Location.requestForegroundPermissionsAsync();
    await Location.requestBackgroundPermissionsAsync();

    Accelerometer.setUpdateInterval(SENSOR_POLL_MS);
    this.accelSub = Accelerometer.addListener(({ x, y, z }) => {
      this.latestAccel = { x, y, z };
    });

    this.locationSub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 500,
        distanceInterval: 0,
      },
      (loc) => {
        this.latestGPS = {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          speed: (loc.coords.speed ?? 0) * 3.6, // m/s → kmph
          heading: loc.coords.heading ?? 0,
        };
      }
    );

    this.tickInterval = setInterval(() => this.tick(), SENSOR_POLL_MS);
  }

  stop() {
    this.accelSub?.remove();
    this.locationSub?.remove();
    if (this.tickInterval) clearInterval(this.tickInterval);
  }

  private tick() {
    const { x, y, z } = this.latestAccel;
    // Net G-force (subtract gravity component of 1G on z at rest)
    const gForce = Math.sqrt(x * x + y * y + z * z);

    const snap: SensorSnapshot = {
      timestamp: Date.now(),
      ax: x, ay: y, az: z,
      gForce,
      lat: this.latestGPS.lat,
      lng: this.latestGPS.lng,
      speed: this.latestGPS.speed,
      heading: this.latestGPS.heading,
    };

    // Ring buffer — evict oldest when full
    if (this.buffer.length >= BUFFER_SIZE) this.buffer.shift();
    this.buffer.push(snap);

    this.onCrashCandidate?.(snap);
  }

  getLast30Seconds(): SensorSnapshot[] {
    return [...this.buffer];
  }

  getLatestGPS() {
    return this.latestGPS;
  }
}

export default new SensorEngine();
