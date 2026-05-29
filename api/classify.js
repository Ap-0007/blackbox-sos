// POST /api/classify — server-side Groq call so the API key stays secret
// Body: { impactForce, speedAtImpact, speedAfter, impactDirection }
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { impactForce, speedAtImpact, speedAfter, impactDirection } = req.body;
  const key = process.env.GROQ_API_KEY;

  if (!key) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });

  const prompt = `You are an emergency medical AI analyzing a road accident.

Sensor data:
- Impact G-Force: ${Number(impactForce).toFixed(2)}G
- Speed at impact: ${speedAtImpact} kmph → ${speedAfter} kmph
- Speed drop: ${(speedAtImpact - speedAfter).toFixed(1)} kmph
- Impact direction: ${impactDirection}

Respond with ONLY valid JSON, no markdown:
{
  "severity": "CRITICAL" | "SERIOUS" | "MINOR",
  "likely_injuries": ["..."],
  "dispatch": "trauma ambulance | basic ambulance | first responder",
  "hospital_dept": ["..."],
  "estimated_casualties": 1,
  "priority_score": 0.0
}`;

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:       'llama3-8b-8192',
      messages:    [{ role: 'user', content: prompt }],
      max_tokens:  256,
      temperature: 0.1,
    }),
  });

  if (!groqRes.ok) {
    const err = await groqRes.text();
    console.error('[CLASSIFY] Groq error:', err);
    return res.status(502).json({ error: 'Groq API error', detail: err });
  }

  const data  = await groqRes.json();
  const text  = (data.choices?.[0]?.message?.content ?? '').trim();
  const clean = text.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();

  try {
    return res.status(200).json(JSON.parse(clean));
  } catch {
    return res.status(502).json({ error: 'Invalid JSON from Groq', raw: clean });
  }
}
