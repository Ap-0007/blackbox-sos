import { GROQ_API_KEY, GROQ_MODEL, GROQ_URL } from '../constants/config';
import type { AIClassification, AccidentReport } from '../types';

const PROMPT = (r: AccidentReport) => `You are an emergency medical AI analyzing a road accident.

Sensor data:
- Impact G-Force: ${r.impactForce.toFixed(2)}G
- Speed at impact: ${r.speedAtImpact} kmph → ${r.speedAfter} kmph
- Speed drop: ${(r.speedAtImpact - r.speedAfter).toFixed(1)} kmph
- Impact direction: ${r.impactDirection}

Respond with ONLY valid JSON, no markdown, no explanation:
{
  "severity": "CRITICAL" | "SERIOUS" | "MINOR",
  "likely_injuries": ["..."],
  "dispatch": "trauma ambulance | basic ambulance | first responder",
  "hospital_dept": ["..."],
  "estimated_casualties": 1,
  "priority_score": 0.0
}`;

export async function classifySeverity(report: AccidentReport): Promise<AIClassification> {
  const res = await fetch(GROQ_URL, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model:       GROQ_MODEL,
      messages:    [{ role: 'user', content: PROMPT(report) }],
      max_tokens:  256,
      temperature: 0.1,   // low temp = consistent JSON
    }),
  });

  if (!res.ok) throw new Error(`Groq ${res.status}`);

  const data = await res.json();
  const text = (data.choices?.[0]?.message?.content ?? '').trim();

  // Strip accidental markdown fences
  const clean = text.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(clean) as AIClassification;
}

// Fast synchronous fallback — used instantly while async AI call is in flight
export function classifySeveritySync(gForce: number): 'CRITICAL' | 'SERIOUS' | 'MINOR' {
  if (gForce >= 4.0) return 'CRITICAL';
  if (gForce >= 2.5) return 'SERIOUS';
  return 'MINOR';
}
