import React, { useState, useEffect } from 'react';
import { StatusBar, SafeAreaView, StyleSheet, View, Text, TouchableOpacity, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from './screens/HomeScreen';
import CrashDetectedScreen from './screens/CrashDetectedScreen';
import BystanderGuideScreen from './screens/BystanderGuideScreen';
import AmbulanceDashboard from './screens/AmbulanceDashboard';
import NearbyServicesScreen from './screens/NearbyServicesScreen';
import CrashMonitorScreen from './screens/CrashMonitorScreen';
import { checkBackgroundCrash } from './services/BackgroundCrash';
import { buildReport } from './services/AccidentReport';
import { dispatchWithFallback } from './services/EmergencyDispatch';
import { pushReport } from './services/FirebaseService';
import type { AccidentReport, SensorSnapshot } from './types';

type Screen = 'home' | 'crash' | 'monitor' | 'nearby' | 'bystander' | 'ambulance';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [report, setReport] = useState<AccidentReport | null>(null);

  // Check for background-triggered crashes whenever app comes to foreground
  useEffect(() => {
    async function checkBg() {
      const result = await checkBackgroundCrash();
      if (result.triggered && result.gForce && result.lat) {
        const fakeSensor: SensorSnapshot = {
          timestamp: result.timestamp ?? Date.now(),
          ax: 0, ay: 0, az: result.gForce,
          gForce: result.gForce,
          lat: result.lat, lng: result.lng ?? 0,
          speed: 0, heading: 0,
        };
        handleCrash(await buildReport(fakeSensor, result.speed ?? 0, []));
      }
    }

    checkBg();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkBg();
    });
    return () => sub.remove();
  }, []);

  async function handleCrash(r: AccidentReport) {
    setReport(r);
    setScreen('crash');
    await Promise.allSettled([pushReport(r), dispatchWithFallback(r)]);
  }

  // Called from CrashMonitorScreen when live detection fires
  async function handleLiveCrash(gForce: number, speed: number) {
    const fakeSensor: SensorSnapshot = {
      timestamp: Date.now(),
      ax: 0, ay: 0, az: gForce,
      gForce, lat: 0, lng: 0, speed, heading: 0,
    };
    const r = await buildReport(fakeSensor, speed, []);
    handleCrash(r);
  }

  function handleCancel() {
    setScreen('home');
    setReport(null);
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {screen !== 'crash' && (
        <View style={s.tabBar}>
          <Tab icon="shield"        label="Home"     active={screen === 'home'}      onPress={() => setScreen('home')} />
          <Tab icon="pulse"         label="Detect"   active={screen === 'monitor'}   onPress={() => setScreen('monitor')} />
          <Tab icon="location"      label="Nearby"   active={screen === 'nearby'}    onPress={() => setScreen('nearby')} />
          <Tab icon="medical"       label="Bystander" active={screen === 'bystander'} onPress={() => setScreen('bystander')} />
          {report && (
            <Tab icon="car"         label="Report"   active={screen === 'ambulance'} onPress={() => setScreen('ambulance')} />
          )}
        </View>
      )}

      <View style={s.body}>
        {screen === 'home' && <HomeScreen onCrash={handleCrash} />}
        {screen === 'monitor' && (
          <CrashMonitorScreen onCrashDetected={handleLiveCrash} />
        )}
        {screen === 'crash' && report && (
          <CrashDetectedScreen report={report} onCancel={handleCancel} onConfirm={() => {}} />
        )}
        {screen === 'nearby' && <NearbyServicesScreen />}
        {screen === 'bystander' && <BystanderGuideScreen etaMinutes={6} />}
        {screen === 'ambulance' && report && <AmbulanceDashboard report={report} />}
      </View>
    </SafeAreaView>
  );
}

function Tab({ icon, label, active, onPress }: { icon: any; label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.tab} onPress={onPress}>
      <Ionicons name={icon} size={22} color={active ? '#00FF88' : '#555'} />
      <Text style={[s.tabLabel, active && s.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#0a0a0a' },
  body:           { flex: 1 },
  tabBar:         { flexDirection: 'row', backgroundColor: '#111', borderTopWidth: 1, borderTopColor: '#222', paddingBottom: 4 },
  tab:            { flex: 1, alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  tabLabel:       { color: '#555', fontSize: 11, marginTop: 3 },
  tabLabelActive: { color: '#00FF88' },
});
