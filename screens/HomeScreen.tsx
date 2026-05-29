import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Switch, TouchableOpacity,
  TextInput, Alert, ScrollView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SensorEngine from '../services/SensorEngine';
import CrashDetector from '../services/CrashDetector';
import { buildReport } from '../services/AccidentReport';
import { dispatchWithFallback } from '../services/EmergencyDispatch';
import { pushReport } from '../services/FirebaseService';
import type { AccidentReport, SensorSnapshot } from '../types';

interface Props {
  onCrash: (report: AccidentReport) => void;
}

export default function HomeScreen({ onCrash }: Props) {
  const [monitoring, setMonitoring] = useState(false);
  const [volunteer, setVolunteer] = useState(false);
  const [lastSync, setLastSync] = useState<string>('—');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contacts, setContacts] = useState<{ name: string; phone: string }[]>([]);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [currentG, setCurrentG] = useState(0);
  const engineRef = useRef(false);

  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    const raw = await AsyncStorage.getItem('emergencyContacts');
    if (raw) setContacts(JSON.parse(raw));
  }

  async function saveContacts(list: { name: string; phone: string }[]) {
    await AsyncStorage.setItem('emergencyContacts', JSON.stringify(list));
  }

  function addContact() {
    if (!contactPhone.trim()) return;
    const updated = [...contacts, { name: contactName.trim() || 'Contact', phone: contactPhone.trim() }];
    setContacts(updated);
    saveContacts(updated);
    setContactName('');
    setContactPhone('');
  }

  function removeContact(index: number) {
    const updated = contacts.filter((_, i) => i !== index);
    setContacts(updated);
    saveContacts(updated);
  }

  async function handleCrashDetected(snap: SensorSnapshot, prevSpeed: number) {
    const phones = contacts.map((c) => c.phone);
    const report = await buildReport(snap, prevSpeed, phones);
    await Promise.allSettled([
      pushReport(report),
      dispatchWithFallback(report),
    ]);
    onCrash(report);
  }

  async function toggleMonitoring() {
    if (monitoring) {
      SensorEngine.stop();
      setMonitoring(false);
      engineRef.current = false;
      return;
    }

    CrashDetector.init((snap, prevSpeed) => handleCrashDetected(snap, prevSpeed));

    await SensorEngine.start((snap: SensorSnapshot) => {
      CrashDetector.evaluate(snap);
      CrashDetector.evaluateShake(snap); // demo shake trigger
      setCurrentSpeed(Math.round(snap.speed));
      setCurrentG(parseFloat(snap.gForce.toFixed(2)));
      setLastSync(new Date().toLocaleTimeString());
    });

    setMonitoring(true);
    engineRef.current = true;
  }

  // Demo: manual crash trigger for judges
  async function demoTrigger() {
    const fakeSensor: SensorSnapshot = {
      timestamp: Date.now(),
      ax: 3.1, ay: -1.2, az: 0.5,
      gForce: 4.2,
      lat: 21.1458, lng: 79.0882,
      speed: 0, heading: 45,
    };
    await handleCrashDetected(fakeSensor, 87);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Header */}
      <View style={s.shield}>
        <Ionicons name="shield-checkmark" size={64} color={monitoring ? '#00FF88' : '#555'} />
        <Text style={s.appName}>BlackBox SOS</Text>
        <View style={s.statusRow}>
          <View style={[s.dot, { backgroundColor: monitoring ? '#00FF88' : '#555' }]} />
          <Text style={[s.statusText, { color: monitoring ? '#00FF88' : '#888' }]}>
            {monitoring ? 'Monitoring Active' : 'Monitoring Off'}
          </Text>
        </View>
      </View>

      {/* Live stats */}
      {monitoring && (
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statValue}>{currentSpeed}</Text>
            <Text style={s.statLabel}>kmph</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>{currentG}</Text>
            <Text style={s.statLabel}>G-force</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>{lastSync}</Text>
            <Text style={s.statLabel}>last sync</Text>
          </View>
        </View>
      )}

      {/* Main toggle */}
      <TouchableOpacity style={[s.toggleBtn, monitoring && s.toggleActive]} onPress={toggleMonitoring}>
        <Text style={s.toggleBtnText}>{monitoring ? 'Stop Monitoring' : 'Start Monitoring'}</Text>
      </TouchableOpacity>

      {/* Volunteer toggle */}
      <View style={s.row}>
        <Text style={s.label}>Volunteer Bystander Network</Text>
        <Switch value={volunteer} onValueChange={setVolunteer} trackColor={{ true: '#00FF88' }} />
      </View>

      {/* Emergency contacts */}
      <Text style={s.sectionTitle}>Emergency Contacts</Text>
      {contacts.map((c, i) => (
        <View key={i} style={s.contactRow}>
          <Ionicons name="person-circle-outline" size={20} color="#00FF88" />
          <Text style={s.contactText}>{c.name} · {c.phone}</Text>
          <TouchableOpacity onPress={() => removeContact(i)}>
            <Ionicons name="close-circle" size={20} color="#FF2D2D" />
          </TouchableOpacity>
        </View>
      ))}

      <TextInput
        style={s.input}
        placeholder="Name (optional)"
        placeholderTextColor="#555"
        value={contactName}
        onChangeText={setContactName}
      />
      <TextInput
        style={s.input}
        placeholder="Phone number"
        placeholderTextColor="#555"
        keyboardType="phone-pad"
        value={contactPhone}
        onChangeText={setContactPhone}
      />
      <TouchableOpacity style={s.addBtn} onPress={addContact}>
        <Text style={s.addBtnText}>+ Add Contact</Text>
      </TouchableOpacity>

      {/* Demo trigger */}
      <TouchableOpacity style={s.demoBtn} onPress={demoTrigger}>
        <Ionicons name="warning" size={16} color="#000" />
        <Text style={s.demoBtnText}>  Simulate Crash (Demo)</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#0a0a0a' },
  content:    { padding: 24, paddingBottom: 48 },
  shield:     { alignItems: 'center', marginBottom: 24, marginTop: 32 },
  appName:    { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 8, letterSpacing: 1 },
  statusRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  dot:        { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 14, fontWeight: '600' },
  statsRow:   { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  statBox:    { alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 12, padding: 12, flex: 1, marginHorizontal: 4 },
  statValue:  { color: '#00FF88', fontSize: 18, fontWeight: '700' },
  statLabel:  { color: '#777', fontSize: 11, marginTop: 2 },
  toggleBtn:  { backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#333' },
  toggleActive:{ borderColor: '#00FF88', backgroundColor: '#0d2419' },
  toggleBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  row:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  label:      { color: '#ccc', fontSize: 14 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1a1a1a', borderRadius: 10, padding: 10, marginBottom: 8 },
  contactText: { flex: 1, color: '#ccc', fontSize: 13 },
  input:      { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 12, color: '#fff', marginBottom: 8, borderWidth: 1, borderColor: '#2a2a2a' },
  addBtn:     { backgroundColor: '#1a3a2a', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 32 },
  addBtnText: { color: '#00FF88', fontWeight: '600' },
  demoBtn:    { backgroundColor: '#FFD700', borderRadius: 10, padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  demoBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
});
