import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SEVERITY_COLORS } from '../constants/config';
import type { AccidentReport } from '../types';

// This screen is embedded in the app for demo but in production
// it lives at your web URL so paramedics open it on their tablet.

interface Props {
  report: AccidentReport;
}

export default function AmbulanceDashboard({ report }: Props) {
  const sevColor = SEVERITY_COLORS[report.severity] ?? '#FF2D2D';
  const time = new Date(report.timestamp).toLocaleTimeString();
  const ai = report.aiClassification;

  function openMaps() {
    const { lat, lng } = report.location;
    Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={[s.banner, { backgroundColor: sevColor + '22', borderColor: sevColor }]}>
        <Ionicons name="warning" size={24} color={sevColor} />
        <Text style={[s.bannerText, { color: sevColor }]}>
          INCOMING ACCIDENT — {report.severity}
        </Text>
      </View>

      {/* Core data */}
      <View style={s.card}>
        <DataRow icon="location"    label="Location"
          value={`${report.location.lat.toFixed(4)}°N, ${report.location.lng.toFixed(4)}°E`} />
        <DataRow icon="flash"       label="Impact severity"
          value={`${report.severity} (${report.impactForce.toFixed(1)}G force)`} color={sevColor} />
        <DataRow icon="speedometer" label="Speed at impact"
          value={`${report.speedAtImpact} kmph → ${report.speedAfter} kmph`} />
        <DataRow icon="navigate"    label="Impact direction" value={report.impactDirection} />
        <DataRow icon="time"        label="Time of crash"    value={time} />
      </View>

      {/* AI prediction */}
      {ai && (
        <View style={s.card}>
          <Text style={s.cardTitle}>AI Medical Assessment</Text>
          <DataRow icon="medkit"  label="Likely injuries"
            value={ai.likely_injuries.join(', ')} color="#FF8C00" />
          <DataRow icon="car"     label="Dispatch"        value={ai.dispatch} />
          <DataRow icon="business" label="Hospital dept"  value={ai.hospital_dept.join(', ')} />
          <DataRow icon="people"  label="Est. casualties" value={String(ai.estimated_casualties)} />
          <View style={s.priorityRow}>
            <Text style={s.priorityLabel}>Priority Score</Text>
            <Text style={[s.priorityValue, { color: sevColor }]}>
              {ai.priority_score.toFixed(1)} / 10
            </Text>
          </View>
        </View>
      )}

      <TouchableOpacity style={s.navBtn} onPress={openMaps}>
        <Ionicons name="navigate-circle" size={24} color="#fff" />
        <Text style={s.navBtnText}>Navigate to Location</Text>
      </TouchableOpacity>

      <Text style={s.footer}>Report ID: {report.id}</Text>
    </ScrollView>
  );
}

function DataRow({ icon, label, value, color = '#fff' }: any) {
  return (
    <View style={s.dataRow}>
      <Ionicons name={icon} size={16} color="#888" style={{ width: 20 }} />
      <Text style={s.dataLabel}>{label}</Text>
      <Text style={[s.dataValue, { color }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#0a0a0a' },
  content:       { padding: 20, paddingBottom: 48 },
  banner:        { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1 },
  bannerText:    { fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  card:          { backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16, marginBottom: 16 },
  cardTitle:     { color: '#fff', fontWeight: '700', fontSize: 15, marginBottom: 12 },
  dataRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  dataLabel:     { color: '#888', fontSize: 13, width: 130 },
  dataValue:     { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600' },
  priorityRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 },
  priorityLabel: { color: '#888', fontSize: 14 },
  priorityValue: { fontSize: 24, fontWeight: '900' },
  navBtn:        { backgroundColor: '#1a4aff', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 24 },
  navBtnText:    { color: '#fff', fontWeight: '800', fontSize: 16 },
  footer:        { color: '#444', fontSize: 11, textAlign: 'center' },
});
