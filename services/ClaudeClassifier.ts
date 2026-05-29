import Anthropic from '@anthropic-ai/sdk';
import { CLAUDE_API_KEY } from '../constants/config';
import type { AIClassification, AccidentReport } from '../types';

const client = new Anthropic({ apiKey: CLAUDE_API_KEY });

export async function classifySeverity(report: AccidentReport): Promise<AIClassification> {
  const direction = report.impactDirection;
  const prompt = `You are an emergency medical AI analyzing a road accident.

Sensor data:
- Impact G-Force: ${report.impactForce.toFixed(2)}G
- Speed at impact: ${report.speedAtImpact} kmph
- Speed after impact: ${report.speedAfter} kmph
- Speed drop: ${(report.speedAtImpact - report.speedAfter).toFixed(1)} kmph
- Impact direction: ${direction}
- Vehicle type: car/motorcycle (unknown)

Based on this data respond with ONLY valid JSON, no markdown:
{
  "severity": "CRITICAL" | "SERIOUS" | "MINOR",
  "likely_injuries": ["..."],
  "dispatch": "trauma ambulance | basic ambulance | first responder",
  "hospital_dept": ["..."],
  "estimated_casualties": 1,
  "priority_score": 0.0
}`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  return JSON.parse(raw) as AIClassification;
}

export function classifySeveritySync(gForce: number): 'CRITICAL' | 'SERIOUS' | 'MINOR' {
  if (gForce >= 4.0) return 'CRITICAL';
  if (gForce >= 2.5) return 'SERIOUS';
  return 'MINOR';
}
