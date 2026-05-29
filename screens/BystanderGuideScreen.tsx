import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const STEPS = [
  { icon: 'hand-left',           text: "Don't move the victim — spinal injury risk" },
  { icon: 'fitness',             text: 'Check breathing and pulse' },
  { icon: 'bandage',             text: 'Apply firm pressure to any bleeding' },
  { icon: 'flame',               text: 'Turn off engine — reduce fire risk' },
  { icon: 'alert-circle',        text: 'Keep others back — 10m clear zone' },
  { icon: 'call',                text: 'Stay on line with emergency services' },
];

interface Props {
  etaMinutes?: number;
}

export default function BystanderGuideScreen({ etaMinutes = 6 }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const total = etaMinutes * 60;
    Animated.timing(progress, {
      toValue: 1,
      duration: total * 1000,
      useNativeDriver: false,
    }).start();

    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const remaining = Math.max(0, etaMinutes * 60 - elapsed);
  const remMin = Math.floor(remaining / 60);
  const remSec = remaining % 60;

  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* ETA header */}
      <View style={s.etaBox}>
        <Ionicons name="medical" size={32} color="#FF2D2D" />
        <Text style={s.etaLabel}>Help is on the way</Text>
        <Text style={s.etaTimer}>
          {remMin > 0 ? `${remMin}m ` : ''}{remSec}s away
        </Text>
        <View style={s.progressTrack}>
          <Animated.View style={[s.progressBar, { width: barWidth }]} />
        </View>
      </View>

      {/* Good Samaritan */}
      <View style={s.lawBox}>
        <Ionicons name="shield-half" size={18} color="#FFD700" />
        <Text style={s.lawText}>
          You are legally protected under the{' '}
          <Text style={s.lawBold}>Good Samaritan Law</Text>
          {' '}— help without fear.
        </Text>
      </View>

      {/* Steps */}
      <Text style={s.sectionTitle}>While you wait:</Text>
      {STEPS.map((step, i) => (
        <View key={i} style={s.stepRow}>
          <View style={s.stepNum}>
            <Text style={s.stepNumText}>{i + 1}</Text>
          </View>
          <Ionicons name={step.icon as any} size={22} color="#FF8C00" style={{ width: 28 }} />
          <Text style={s.stepText}>{step.text}</Text>
        </View>
      ))}

      {/* Do NOT section */}
      <View style={s.doNotBox}>
        <Text style={s.doNotTitle}>Do NOT:</Text>
        {['Give water to unconscious victim', 'Remove helmet if neck injury suspected', 'Leave the scene'].map((t, i) => (
          <View key={i} style={s.doNotRow}>
            <Ionicons name="close-circle" size={16} color="#FF2D2D" />
            <Text style={s.doNotText}>{t}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0a0a0a' },
  content:      { padding: 24, paddingBottom: 48 },
  etaBox:       { backgroundColor: '#1a0a0a', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#FF2D2D33' },
  etaLabel:     { color: '#ccc', fontSize: 14, marginTop: 8 },
  etaTimer:     { color: '#FF2D2D', fontSize: 36, fontWeight: '900', marginTop: 4 },
  progressTrack: { width: '100%', height: 6, backgroundColor: '#2a2a2a', borderRadius: 3, marginTop: 12, overflow: 'hidden' },
  progressBar:  { height: 6, backgroundColor: '#FF2D2D', borderRadius: 3 },
  lawBox:       { flexDirection: 'row', gap: 10, backgroundColor: '#1a1500', borderRadius: 12, padding: 14, marginBottom: 24, alignItems: 'flex-start', borderWidth: 1, borderColor: '#FFD70033' },
  lawText:      { flex: 1, color: '#ccc', fontSize: 13, lineHeight: 20 },
  lawBold:      { color: '#FFD700', fontWeight: '700' },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 16 },
  stepRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14, marginBottom: 10 },
  stepNum:      { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FF8C0033', alignItems: 'center', justifyContent: 'center' },
  stepNumText:  { color: '#FF8C00', fontWeight: '700', fontSize: 12 },
  stepText:     { flex: 1, color: '#ddd', fontSize: 14, lineHeight: 20 },
  doNotBox:     { backgroundColor: '#1a0a0a', borderRadius: 12, padding: 16, marginTop: 8, borderWidth: 1, borderColor: '#FF2D2D33' },
  doNotTitle:   { color: '#FF2D2D', fontWeight: '700', fontSize: 15, marginBottom: 12 },
  doNotRow:     { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
  doNotText:    { color: '#bbb', fontSize: 13 },
});
