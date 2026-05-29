import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CRASH_THRESHOLD_G, SPEED_DROP_THRESHOLD_KMH } from '../constants/config';

export const BACKGROUND_CRASH_TASK = 'crash-sensor-monitor';

let _prevSpeed = 0;
let _lastTrigger = 0;

// Register the background task definition once at module load.
// TaskManager.defineTask must be called in the global scope (not inside a component).
TaskManager.defineTask(BACKGROUND_CRASH_TASK, async () => {
  try {
    const loc = await Location.getLastKnownPositionAsync();
    const speed = (loc?.coords.speed ?? 0) * 3.6; // m/s → kmph

    // Read latest accelerometer value via a short one-shot subscription
    const sample = await new Promise<{ x: number; y: number; z: number }>((resolve) => {
      Accelerometer.setUpdateInterval(100);
      const sub = Accelerometer.addListener((data) => {
        sub.remove();
        resolve(data);
      });
      // Safety timeout
      setTimeout(() => { sub.remove(); resolve({ x: 0, y: 0, z: 0 }); }, 500);
    });

    const g = Math.sqrt(sample.x ** 2 + sample.y ** 2 + sample.z ** 2);
    const speedDrop = _prevSpeed - speed;
    const now = Date.now();

    if (g > CRASH_THRESHOLD_G && speedDrop > SPEED_DROP_THRESHOLD_KMH && now - _lastTrigger > 5000) {
      _lastTrigger = now;
      // Write a flag to AsyncStorage — the foreground app reads this on next resume
      await AsyncStorage.setItem('background_crash', JSON.stringify({
        timestamp: now,
        gForce: g,
        speed: _prevSpeed,
        lat: loc?.coords.latitude ?? 0,
        lng: loc?.coords.longitude ?? 0,
      }));
    }

    _prevSpeed = speed;
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundCrashDetection(): Promise<boolean> {
  try {
    const { status } = await Location.requestBackgroundPermissionsAsync();
    if (status !== 'granted') return false;

    await BackgroundFetch.registerTaskAsync(BACKGROUND_CRASH_TASK, {
      minimumInterval: 15,          // iOS minimum is 15 minutes; Android can fire more often
      stopOnTerminate: false,
      startOnBoot: true,
    });
    return true;
  } catch {
    return false;
  }
}

export async function unregisterBackgroundCrashDetection(): Promise<void> {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_CRASH_TASK);
  } catch { /* already unregistered */ }
}

export async function isBackgroundRegistered(): Promise<boolean> {
  try {
    const status = await BackgroundFetch.getStatusAsync();
    const tasks  = await TaskManager.getRegisteredTasksAsync();
    return (
      status === BackgroundFetch.BackgroundFetchStatus.Available &&
      tasks.some((t) => t.taskName === BACKGROUND_CRASH_TASK)
    );
  } catch { return false; }
}

// Call this on app foreground resume to check for background-triggered crashes
export async function checkBackgroundCrash(): Promise<{
  triggered: boolean; gForce?: number; speed?: number; lat?: number; lng?: number; timestamp?: number;
}> {
  try {
    const raw = await AsyncStorage.getItem('background_crash');
    if (!raw) return { triggered: false };
    await AsyncStorage.removeItem('background_crash');
    return { triggered: true, ...JSON.parse(raw) };
  } catch { return { triggered: false }; }
}
