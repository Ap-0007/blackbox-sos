// POST /api/alert — sends SMS to family contacts via Twilio REST API
// Uses native fetch (Node 18+) — no npm package needed
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { contacts, lat, lng, severity, impactForce, speedAtImpact, timestamp } = req.body;

  const SID   = process.env.TWILIO_ACCOUNT_SID;
  const TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const FROM  = process.env.TWILIO_FROM_NUMBER;

  if (!SID || !TOKEN || !FROM) {
    console.warn('[ALERT] Twilio env vars not set — SMS skipped');
    return res.status(200).json({ ok: true, sent: 0, reason: 'twilio_not_configured' });
  }

  const time     = new Date(timestamp).toLocaleTimeString();
  const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
  const body =
    `🚨 BlackBox SOS ALERT\n` +
    `Crash detected at ${time}\n` +
    `Severity: ${severity} (${Number(impactForce).toFixed(1)}G)\n` +
    `Speed: ${speedAtImpact} kmph\n` +
    `Location: ${mapsLink}\n` +
    `Emergency services have been alerted.`;

  const creds = Buffer.from(`${SID}:${TOKEN}`).toString('base64');

  const results = await Promise.allSettled(
    (contacts ?? []).map((to) =>
      fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${creds}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: FROM, Body: body }).toString(),
      })
    )
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  console.log(`[ALERT] Sent ${sent}/${(contacts ?? []).length}`);
  return res.status(200).json({ ok: true, sent });
}
