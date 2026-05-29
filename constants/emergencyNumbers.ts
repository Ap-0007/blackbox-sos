// Country → { ambulance, police, fire, unified }
// ISO 3166-1 alpha-2 country codes
export const EMERGENCY_NUMBERS: Record<string, {
  ambulance: string; police: string; fire: string; unified?: string; name: string;
}> = {
  IN: { ambulance: '108', police: '100', fire: '101', unified: '112', name: 'India' },
  US: { ambulance: '911', police: '911', fire: '911', unified: '911', name: 'United States' },
  GB: { ambulance: '999', police: '999', fire: '999', unified: '999', name: 'United Kingdom' },
  AU: { ambulance: '000', police: '000', fire: '000', unified: '000', name: 'Australia' },
  DE: { ambulance: '112', police: '110', fire: '112', unified: '112', name: 'Germany' },
  FR: { ambulance: '15',  police: '17',  fire: '18',  unified: '112', name: 'France' },
  JP: { ambulance: '119', police: '110', fire: '119', unified: '119', name: 'Japan' },
  CN: { ambulance: '120', police: '110', fire: '119', name: 'China' },
  BR: { ambulance: '192', police: '190', fire: '193', unified: '190', name: 'Brazil' },
  ZA: { ambulance: '10177', police: '10111', fire: '10177', unified: '112', name: 'South Africa' },
  NG: { ambulance: '767', police: '199', fire: '767', unified: '112', name: 'Nigeria' },
  PK: { ambulance: '1122', police: '15', fire: '16', unified: '1122', name: 'Pakistan' },
  BD: { ambulance: '999', police: '999', fire: '999', unified: '999', name: 'Bangladesh' },
  SG: { ambulance: '995', police: '999', fire: '995', unified: '995', name: 'Singapore' },
  MY: { ambulance: '999', police: '999', fire: '994', unified: '999', name: 'Malaysia' },
  AE: { ambulance: '998', police: '999', fire: '997', unified: '999', name: 'UAE' },
  SA: { ambulance: '911', police: '911', fire: '911', unified: '911', name: 'Saudi Arabia' },
  KE: { ambulance: '999', police: '999', fire: '999', unified: '112', name: 'Kenya' },
  // EU fallback
  DEFAULT: { ambulance: '112', police: '112', fire: '112', unified: '112', name: 'International' },
};

export function getEmergencyNumbers(countryCode: string) {
  return EMERGENCY_NUMBERS[countryCode.toUpperCase()] ?? EMERGENCY_NUMBERS['DEFAULT'];
}

export function getAmbulanceNumber(countryCode: string): string {
  return getEmergencyNumbers(countryCode).unified ?? getEmergencyNumbers(countryCode).ambulance;
}
