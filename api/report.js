// POST /api/report — receives a crash report from the mobile app
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const report = req.body;
  console.log('[REPORT]', JSON.stringify({
    id:         report.id,
    severity:   report.severity,
    gForce:     report.impactForce,
    speed:      report.speedAtImpact,
    location:   report.location,
    timestamp:  report.timestamp,
  }));

  // Firebase write happens on the mobile app — this endpoint is the
  // server-side log + hook point for future DB / WebSocket integration.
  return res.status(200).json({ ok: true, id: report.id });
}
