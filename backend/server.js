const express = require('express');
const twilio  = require('twilio');
const cors    = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const FROM = process.env.TWILIO_FROM_NUMBER;

// POST /report — store or forward crash report
app.post('/report', (req, res) => {
  const report = req.body;
  console.log('[REPORT]', JSON.stringify({
    id: report.id,
    severity: report.severity,
    gForce: report.impactForce,
    location: report.location,
  }, null, 2));
  // In production: write to DB, push to ambulance dashboard WebSocket
  res.json({ ok: true, id: report.id });
});

// POST /alert — send SMS to family contacts
app.post('/alert', async (req, res) => {
  const { contacts, lat, lng, severity, impactForce, speedAtImpact, timestamp } = req.body;
  const time = new Date(timestamp).toLocaleTimeString();
  const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;

  const body =
    `🚨 BlackBox SOS ALERT\n` +
    `Crash detected at ${time}\n` +
    `Severity: ${severity} (${Number(impactForce).toFixed(1)}G)\n` +
    `Speed: ${speedAtImpact} kmph\n` +
    `Location: ${mapsLink}\n` +
    `Emergency services have been alerted.`;

  const results = await Promise.allSettled(
    contacts.map((to) =>
      twilioClient.messages.create({ body, from: FROM, to })
    )
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  console.log(`[SMS] Sent ${sent}/${contacts.length}`);
  res.json({ ok: true, sent });
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => console.log(`BlackBox backend running on :${PORT}`));
