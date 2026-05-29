import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Vibration, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CANCEL_COUNTDOWN_SEC, SEVERITY_COLORS } from '../constants/config';
import { getNearby, type NearbyPlace } from '../services/NearbyServices';
import { getCountryCode, getAmbulanceNumber } from '../services/NearbyServices';
import { getEmergencyNumbers } from '../constants/emergencyNumbers';
import type { AccidentReport } from '../types';

interface Props {
  report: AccidentReport;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function CrashDetectedScreen({ report, onCancel, onConfirm }: Props) {
  const [countdown, setCountdown] = useState(CANCEL_COUNTDOWN_SEC);
  const [phase, setPhase] = useState<'countdown' | 'sent'>('countdown');
  const [ambulanceOk, setAmbulanceOk] = useState(false);
  const [familyOk, setFamilyOk] = useState(false);
  const [nearestHospital, setNearestHospital] = useState<NearbyPlace | null>(null);
  const [emergencyNumber, setEmergencyNumber] = useState('112');
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulsing red animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();

    // Fetch nearest hospital + country emergency number in background
    if (report.location?.lat && report.location?.lng) {
      const { lat, lng } = report.location;
      getNearby(lat, lng, 'hospital').then(({ places }) => {
        if (places[0]) setNearestHospital(places[0]);
      }).catch(() => {});
      getCountryCode(lat, lng).then((cc) => {
        setEmergencyNumber(getAmbulanceNumber(cc));
      }).catch(() => {});
    }

    // Haptic SOS pattern
    Vibration.vibrate([0, 300, 100, 300, 100, 300, 500, 100, 500, 100, 500, 500, 300, 100, 300, 100, 300]);

    // Countdown → auto-confirm
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleConfirm();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  function handleConfirm() {
    setPhase('sent');
    // Simulate async confirmation for demo
    setTimeout(() => setAmbulanceOk(true), 800);
    setTimeout(() => setFamilyOk(true), 1600);
    onConfirm();
  }

  const sevColor = SEVERITY_COLORS[report.severity] ?? '#FF2D2D';
  const time = new Date(report.timestamp).toLocaleTimeString();

  if (phase === 'sent') {
    return (
      <View style={s.container}>
        <Text style={s.sentTitle}>Report Sent</Text>

        <View style={s.card}>
          <Row icon="location" label="Location"
            value={`${report.location.lat.toFixed(4)}, ${report.location.lng.toFixed(4)}`} />
          <Row icon="speedometer" label="Speed at impact" value={`${report.speedAtImpact} kmph → 0`} />
          <Row icon="flash" label="Impact force"
            value={`${report.impactForce.toFixed(1)}G`} color={sevColor} />
          <Row icon="navigate" label="Direction" value={report.impactDirection} />
          <Row icon="warning" label="Severity" value={report.severity} color={sevColor} />
          <Row icon="time" label="Time" value={time} />
        </View>

        <View style={s.alertsCard}>
          <AlertLine label="Ambulance alerted" done={ambulanceOk} />
          <AlertLine label="Family notified" done={familyOk} />
        </View>

        {/* Nearest hospital */}
        {nearestHospital && (
          <TouchableOpacity
            style={s.hospitalCard}
            onPress={() => Linking.openURL(`https://maps.google.com/?q=${nearestHospital.lat},${nearestHospital.lng}`)}
          >
            <Text style={s.hospitalLabel}>Nearest Hospital</Text>
            <Text style={s.hospitalName}>{nearestHospital.name}</Text>
            <Text style={s.hospitalDist}>
              {nearestHospital.distanceKm < 1
                ? `${Math.round(nearestHospital.distanceKm * 1000)}m away`
                : `${nearestHospital.distanceKm.toFixed(1)}km away`} · Tap to navigate
            </Text>
          </TouchableOpacity>
        )}

        {/* Direct call button */}
        <TouchableOpacity style={s.callBtn} onPress={() => Linking.openURL(`tel:${emergencyNumber}`)}>
          <Ionicons name="call" size={18} color="#fff" />
          <Text style={s.callBtnText}>Call {emergencyNumber} (Ambulance)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.bystanderBtn} onPress={onCancel}>
          <Text style={s.bystanderBtnText}>Show Bystander Guide</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.cancelLink} onPress={onCancel}>
          <Text style={s.cancelLinkText}>I'm OK — dismiss</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Animated.View style={[s.warningCircle, { transform: [{ scale: pulse }] }]}>
        <Ionicons name="warning" size={80} color="#FF2D2D" />
      </Animated.View>

      <Text style={s.warningTitle}>CRASH DETECTED</Text>
      <Text style={s.warningSubtitle}>
        Emergency services will be alerted in{'\n'}
        <Text style={s.countdown}>{countdown}s</Text>
      </Text>

      <Text style={s.details}>
        {report.impactForce.toFixed(1)}G impact · {report.speedAtImpact} kmph · {report.impactDirection}
      </Text>

      <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
        <Ionicons name="checkmark-circle" size={24} color="#00FF88" />
        <Text style={s.cancelBtnText}>  I'm OK — Cancel</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.helpBtn} onPress={handleConfirm}>
        <Text style={s.helpBtnText}>Get Help Now</Text>
      </TouchableOpacity>
    </View>
  );
}

function Row({ icon, label, value, color = '#fff' }: any) {
  return (
    <View style={s.row}>
      <Ionicons name={icon} size={16} color="#888" style={{ width: 20 }} />
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, { color }]}>{value}</Text>
    </View>
  );
}

function AlertLine({ label, done }: { label: string; done: boolean }) {
  return (
    <View style={s.alertLine}>
      <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={20}
        color={done ? '#00FF88' : '#555'} />
      <Text style={[s.alertLabel, done && s.alertDone]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center', padding: 24 },
  warningCircle: { marginBottom: 24 },
  warningTitle:  { color: '#FF2D2D', fontSize: 36, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  warningSubtitle: { color: '#ccc', fontSize: 18, textAlign: 'center', marginTop: 12, lineHeight: 28 },
  countdown:    { color: '#FF2D2D', fontWeight: '900', fontSize: 32 },
  details:      { color: '#888', fontSize: 13, marginTop: 12, marginBottom: 40, textAlign: 'center' },
  cancelBtn:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d2419', borderRadius: 14, padding: 16, width: '100%', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#00FF88' },
  cancelBtnText: { color: '#00FF88', fontSize: 16, fontWeight: '700' },
  helpBtn:      { backgroundColor: '#FF2D2D', borderRadius: 14, padding: 16, width: '100%', alignItems: 'center' },
  helpBtnText:  { color: '#fff', fontSize: 16, fontWeight: '900' },
  sentTitle:    { color: '#fff', fontSize: 28, fontWeight: '900', marginBottom: 24 },
  card:         { backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16, width: '100%', marginBottom: 16 },
  row:          { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  rowLabel:     { flex: 1, color: '#888', fontSize: 13 },
  rowValue:     { color: '#fff', fontSize: 13, fontWeight: '600' },
  alertsCard:   { backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16, width: '100%', gap: 12, marginBottom: 24 },
  alertLine:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  alertLabel:   { color: '#888', fontSize: 15 },
  alertDone:    { color: '#fff' },
  bystanderBtn: { backgroundColor: '#FF8C00', borderRadius: 14, padding: 14, width: '100%', alignItems: 'center', marginBottom: 12 },
  bystanderBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },
  cancelLink:   { padding: 12 },
  cancelLinkText: { color: '#555', fontSize: 13 },
  hospitalCard: { backgroundColor: '#0d1f2d', borderRadius: 12, padding: 14, width: '100%', marginBottom: 10, borderWidth: 1, borderColor: '#1a4aff44' },
  hospitalLabel:{ color: '#1a4aff', fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  hospitalName: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  hospitalDist: { color: '#888', fontSize: 12 },
  callBtn:      { backgroundColor: '#1a3a1a', borderRadius: 12, padding: 14, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12, borderWidth: 1, borderColor: '#00FF8833' },
  callBtnText:  { color: '#00FF88', fontWeight: '700', fontSize: 14 },
});
