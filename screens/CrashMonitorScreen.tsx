import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Switch, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Accelerometer } from 'expo-sensors';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { CRASH_THRESHOLD_G, SPEED_DROP_THRESHOLD_KMH, SENSOR_POLL_MS } from '../constants/config';

const GRAPH_SLOTS = 60;   // 6 seconds at 100ms
const MAX_G_DISPLAY = 5;  // gauge tops out at 5G

interface CrashEvent {
  id: string;
  time: string;
  gForce: number;
  speed: number;
  direction: string;
}

interface Props {
  onCrashDetected?: (gForce: number, speed: number) => void;
}

export default function CrashMonitorScreen({ onCrashDetected }: Props) {
  // Live readings
  const [gForce, setGForce]     = useState(0);
  const [speed, setSpeed]       = useState(0);
  const [ax, setAx]             = useState(0);
  const [ay, setAy]             = useState(0);
  const [az, setAz]             = useState(0);
  const [monitoring, setMonitoring] = useState(false);
  const [sensitivityG, setSensitivityG] = useState(CRASH_THRESHOLD_G);
  const [events, setEvents]     = useState<CrashEvent[]>([]);
  const [status, setStatus]     = useState<'safe' | 'warning' | 'critical'>('safe');
  const [graphData, setGraphData] = useState<number[]>(Array(GRAPH_SLOTS).fill(0));

  // Refs (avoid stale closures in sensor callbacks)
  const prevSpeedRef  = useRef(0);
  const lastTrigger   = useRef(0);
  const accelSub      = useRef<any>(null);
  const locationSub   = useRef<any>(null);
  const tickRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestAccel   = useRef({ x: 0, y: 0, z: 0 });
  const latestGPS     = useRef({ speed: 0, heading: 0 });
  const graphRef      = useRef<number[]>(Array(GRAPH_SLOTS).fill(0));

  // Animations
  const gaugeAnim   = useRef(new Animated.Value(0)).current;
  const flashAnim   = useRef(new Animated.Value(0)).current;
  const pulseAnim   = useRef(new Animated.Value(1)).current;

  // Animate gauge fill
  useEffect(() => {
    Animated.spring(gaugeAnim, {
      toValue: Math.min(gForce / MAX_G_DISPLAY, 1),
      useNativeDriver: false,
      friction: 8,
    }).start();
  }, [gForce]);

  // Pulse animation when monitoring
  useEffect(() => {
    if (!monitoring) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [monitoring]);

  const getImpactDir = (x: number, y: number) => {
    const angle = Math.atan2(y, x) * (180 / Math.PI);
    if (angle > -45 && angle <= 45)   return 'Right';
    if (angle > 45 && angle <= 135)   return 'Rear';
    if (angle > 135 || angle <= -135) return 'Left';
    return 'Front';
  };

  const triggerCrash = useCallback((g: number, spd: number, x: number, y: number) => {
    const now = Date.now();
    if (now - lastTrigger.current < 5000) return;
    lastTrigger.current = now;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 80,  useNativeDriver: false }),
      Animated.timing(flashAnim, { toValue: 0, duration: 150, useNativeDriver: false }),
      Animated.timing(flashAnim, { toValue: 1, duration: 80,  useNativeDriver: false }),
      Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
    ]).start();

    const event: CrashEvent = {
      id: String(now),
      time: new Date().toLocaleTimeString(),
      gForce: parseFloat(g.toFixed(2)),
      speed: Math.round(spd),
      direction: getImpactDir(x, y),
    };
    setEvents((prev) => [event, ...prev].slice(0, 10));
    onCrashDetected?.(g, spd);
  }, [onCrashDetected]);

  async function startMonitoring() {
    await Location.requestForegroundPermissionsAsync();

    Accelerometer.setUpdateInterval(SENSOR_POLL_MS);
    accelSub.current = Accelerometer.addListener(({ x, y, z }) => {
      latestAccel.current = { x, y, z };
    });

    locationSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 500, distanceInterval: 0 },
      (loc) => {
        latestGPS.current = {
          speed: (loc.coords.speed ?? 0) * 3.6,
          heading: loc.coords.heading ?? 0,
        };
      }
    );

    tickRef.current = setInterval(() => {
      const { x, y, z } = latestAccel.current;
      const g = Math.sqrt(x * x + y * y + z * z);
      const spd = latestGPS.current.speed;

      setGForce(parseFloat(g.toFixed(2)));
      setSpeed(Math.round(spd));
      setAx(parseFloat(x.toFixed(2)));
      setAy(parseFloat(y.toFixed(2)));
      setAz(parseFloat(z.toFixed(2)));

      // Rolling graph
      graphRef.current = [...graphRef.current.slice(1), g];
      setGraphData([...graphRef.current]);

      // Status colour
      if      (g > sensitivityG)       setStatus('critical');
      else if (g > sensitivityG * 0.7) setStatus('warning');
      else                              setStatus('safe');

      // Crash detection
      const speedDrop = prevSpeedRef.current - spd;
      if (g > sensitivityG && speedDrop > SPEED_DROP_THRESHOLD_KMH) {
        triggerCrash(g, prevSpeedRef.current, x, y);
      }
      prevSpeedRef.current = spd;
    }, SENSOR_POLL_MS);

    setMonitoring(true);
  }

  function stopMonitoring() {
    accelSub.current?.remove();
    locationSub.current?.remove();
    if (tickRef.current) clearInterval(tickRef.current);
    setMonitoring(false);
    setStatus('safe');
    setGForce(0);
    setSpeed(0);
  }

  useEffect(() => () => stopMonitoring(), []);

  // Derived colours
  const statusColor = status === 'critical' ? '#FF2D2D' : status === 'warning' ? '#FF8C00' : '#00FF88';
  const gaugeWidth  = gaugeAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const flashColor  = flashAnim.interpolate({ inputRange: [0, 1], outputRange: ['#0a0a0a', '#FF2D2D33'] });
  const graphMax    = Math.max(...graphData, 1);

  return (
    <Animated.View style={[s.container, { backgroundColor: flashColor as any }]}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── STATUS HEADER ── */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.screenTitle}>Crash Detection</Text>
            <Text style={[s.statusLabel, { color: statusColor }]}>
              {monitoring
                ? status === 'critical' ? '⚠ IMPACT DETECTED'
                  : status === 'warning'  ? '⚡ HIGH G-FORCE'
                  : '● Monitoring Active'
                : '○ Inactive'}
            </Text>
          </View>
          <TouchableOpacity
            style={[s.toggleBtn, monitoring && { borderColor: statusColor }]}
            onPress={monitoring ? stopMonitoring : startMonitoring}
          >
            <Ionicons name={monitoring ? 'stop-circle' : 'play-circle'} size={32} color={monitoring ? statusColor : '#555'} />
          </TouchableOpacity>
        </View>

        {/* ── G-FORCE GAUGE ── */}
        <Animated.View style={[s.gaugeCard, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={s.gaugeTitle}>G-FORCE</Text>
          <Text style={[s.gaugeValue, { color: statusColor }]}>
            {gForce.toFixed(2)}<Text style={s.gaugeUnit}>G</Text>
          </Text>

          {/* Bar gauge */}
          <View style={s.gaugeTrack}>
            <Animated.View style={[s.gaugeFill, { width: gaugeWidth, backgroundColor: statusColor }]} />
            {/* Threshold marker */}
            <View style={[s.thresholdMark, { left: `${(sensitivityG / MAX_G_DISPLAY) * 100}%` as any }]}>
              <View style={s.thresholdLine} />
              <Text style={s.thresholdLabel}>{sensitivityG}G</Text>
            </View>
          </View>

          {/* Axis labels */}
          <View style={s.gaugeAxis}>
            {[0, 1, 2, 3, 4, 5].map((v) => (
              <Text key={v} style={s.axisLabel}>{v}G</Text>
            ))}
          </View>
        </Animated.View>

        {/* ── SPEED + DIRECTION + RAW ACCEL ── */}
        <View style={s.metricsRow}>
          <MetricBox label="Speed" value={`${speed}`} unit="kmph" color="#fff" />
          <MetricBox label="Direction" value={getImpactDir(ax, ay)} unit="" color="#aaa" />
          <MetricBox label="Heading" value={`${Math.round(latestGPS.current.heading)}°`} unit="" color="#aaa" />
        </View>

        <View style={s.metricsRow}>
          <MetricBox label="X-axis" value={ax.toFixed(2)} unit="G" color="#4a9eff" />
          <MetricBox label="Y-axis" value={ay.toFixed(2)} unit="G" color="#a855f7" />
          <MetricBox label="Z-axis" value={az.toFixed(2)} unit="G" color="#f59e0b" />
        </View>

        {/* ── IMPACT COMPASS ── */}
        <View style={s.compassCard}>
          <Text style={s.sectionTitle}>Impact Vector</Text>
          <Compass ax={ax} ay={ay} monitoring={monitoring} />
        </View>

        {/* ── ROLLING GRAPH ── */}
        <View style={s.graphCard}>
          <View style={s.graphHeader}>
            <Text style={s.sectionTitle}>G-Force History (6s)</Text>
            <Text style={s.graphPeak}>peak {Math.max(...graphData).toFixed(2)}G</Text>
          </View>
          <View style={s.graph}>
            {graphData.map((v, i) => {
              const h = Math.max(2, (v / MAX_G_DISPLAY) * 100);
              const col = v > sensitivityG ? '#FF2D2D' : v > sensitivityG * 0.7 ? '#FF8C00' : '#00FF88';
              return (
                <View key={i} style={s.graphBarWrap}>
                  <View style={[s.graphBar, { height: `${h}%` as any, backgroundColor: col }]} />
                </View>
              );
            })}
            {/* Threshold line */}
            <View style={[s.graphThreshLine, { bottom: `${(sensitivityG / MAX_G_DISPLAY) * 100}%` as any }]} />
          </View>
        </View>

        {/* ── SENSITIVITY SLIDER ── */}
        <View style={s.sensitCard}>
          <Text style={s.sectionTitle}>Detection Sensitivity</Text>
          <View style={s.sensitRow}>
            {[1.5, 2.0, 2.5, 3.0, 3.5].map((v) => (
              <TouchableOpacity
                key={v}
                style={[s.sensitBtn, sensitivityG === v && { backgroundColor: '#FF2D2D22', borderColor: '#FF2D2D' }]}
                onPress={() => setSensitivityG(v)}
              >
                <Text style={[s.sensitBtnText, sensitivityG === v && { color: '#FF2D2D' }]}>{v}G</Text>
                <Text style={s.sensitBtnSub}>
                  {v <= 2.0 ? 'High' : v <= 2.5 ? 'Default' : 'Low'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.sensitHint}>
            Lower = more sensitive. Default 2.5G catches most crashes without false alarms.
          </Text>
        </View>

        {/* ── CRASH LOG ── */}
        {events.length > 0 && (
          <View style={s.logCard}>
            <Text style={s.sectionTitle}>Recent Detections</Text>
            {events.map((e) => (
              <View key={e.id} style={s.logRow}>
                <View style={s.logDot} />
                <View style={s.logInfo}>
                  <Text style={s.logMain}>{e.gForce}G — {e.direction} impact · {e.speed} kmph</Text>
                  <Text style={s.logTime}>{e.time}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </Animated.View>
  );
}

// ── Sub-components ──────────────────────────────────────────

function MetricBox({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={s.metricBox}>
      <Text style={[s.metricValue, { color }]}>{value}<Text style={s.metricUnit}>{unit && ` ${unit}`}</Text></Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

function Compass({ ax, ay, monitoring }: { ax: number; ay: number; monitoring: boolean }) {
  const angle = Math.atan2(ay, ax) * (180 / Math.PI);
  const mag   = Math.min(Math.sqrt(ax * ax + ay * ay) / 3, 1); // 0–1

  return (
    <View style={s.compassWrap}>
      <View style={s.compassCircle}>
        {/* Cardinal labels */}
        {[['N', 0], ['E', 90], ['S', 180], ['W', 270]].map(([label, deg]) => {
          const rad = (Number(deg) - 90) * (Math.PI / 180);
          const r = 48;
          return (
            <Text key={label} style={[s.cardinal, {
              left: 56 + r * Math.cos(rad) - 6,
              top:  56 + r * Math.sin(rad) - 8,
            }]}>{label}</Text>
          );
        })}

        {/* Impact arrow */}
        <View style={[s.arrowWrap, { transform: [{ rotate: `${angle}deg` }] }]}>
          <View style={[s.arrow, {
            backgroundColor: monitoring && mag > 0.1 ? `rgba(255,${Math.round(255 * (1 - mag))},45,${0.5 + mag * 0.5})` : '#333',
            height: 4 + mag * 8,
          }]} />
        </View>
        <View style={s.compassDot} />
      </View>
      <Text style={s.compassHint}>
        {monitoring ? `${Math.round(mag * 100)}% force · ${Math.round(angle)}°` : 'Start monitoring to see live vector'}
      </Text>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────

const s = StyleSheet.create({
  container:    { flex: 1 },
  content:      { padding: 16, paddingBottom: 48 },

  headerRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 8 },
  screenTitle:  { color: '#fff', fontSize: 22, fontWeight: '900' },
  statusLabel:  { fontSize: 13, fontWeight: '700', marginTop: 4, letterSpacing: .5 },
  toggleBtn:    { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center' },

  gaugeCard:    { backgroundColor: '#141414', borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: '#1e1e1e' },
  gaugeTitle:   { color: '#555', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
  gaugeValue:   { fontSize: 56, fontWeight: '900', lineHeight: 64, marginBottom: 12 },
  gaugeUnit:    { fontSize: 22, fontWeight: '400' },
  gaugeTrack:   { height: 10, backgroundColor: '#222', borderRadius: 5, overflow: 'visible', marginBottom: 6, position: 'relative' },
  gaugeFill:    { height: '100%', borderRadius: 5 },
  thresholdMark:{ position: 'absolute', top: -4, alignItems: 'center' },
  thresholdLine:{ width: 2, height: 18, backgroundColor: '#fff4' },
  thresholdLabel:{ color: '#888', fontSize: 9, marginTop: 2 },
  gaugeAxis:    { flexDirection: 'row', justifyContent: 'space-between' },
  axisLabel:    { color: '#444', fontSize: 10 },

  metricsRow:   { flexDirection: 'row', gap: 10, marginBottom: 10 },
  metricBox:    { flex: 1, backgroundColor: '#141414', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#1e1e1e' },
  metricValue:  { fontSize: 20, fontWeight: '800' },
  metricUnit:   { fontSize: 12, fontWeight: '400', color: '#666' },
  metricLabel:  { color: '#555', fontSize: 11, marginTop: 4 },

  compassCard:  { backgroundColor: '#141414', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1e1e1e' },
  compassWrap:  { alignItems: 'center', paddingVertical: 8 },
  compassCircle:{ width: 120, height: 120, borderRadius: 60, borderWidth: 1, borderColor: '#2a2a2a', position: 'relative', alignItems: 'center', justifyContent: 'center' },
  cardinal:     { position: 'absolute', color: '#444', fontSize: 11, fontWeight: '700' },
  arrowWrap:    { position: 'absolute', width: 60, alignItems: 'flex-end' },
  arrow:        { width: 28, borderRadius: 2 },
  compassDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff', zIndex: 2 },
  compassHint:  { color: '#555', fontSize: 12, marginTop: 10 },

  graphCard:    { backgroundColor: '#141414', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1e1e1e' },
  graphHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  graphPeak:    { color: '#555', fontSize: 12 },
  graph:        { height: 80, flexDirection: 'row', alignItems: 'flex-end', gap: 1, position: 'relative' },
  graphBarWrap: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  graphBar:     { borderRadius: 1, width: '100%' },
  graphThreshLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#FF2D2D55' },

  sensitCard:   { backgroundColor: '#141414', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1e1e1e' },
  sensitRow:    { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 8 },
  sensitBtn:    { flex: 1, backgroundColor: '#1e1e1e', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a2a' },
  sensitBtnText:{ color: '#aaa', fontSize: 14, fontWeight: '800' },
  sensitBtnSub: { color: '#555', fontSize: 9, marginTop: 2 },
  sensitHint:   { color: '#444', fontSize: 11, lineHeight: 16 },

  logCard:      { backgroundColor: '#141414', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1e1e1e' },
  logRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  logDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF2D2D', flexShrink: 0 },
  logInfo:      { flex: 1 },
  logMain:      { color: '#ccc', fontSize: 13, fontWeight: '600' },
  logTime:      { color: '#555', fontSize: 11, marginTop: 2 },

  sectionTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
