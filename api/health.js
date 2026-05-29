export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    service: 'BlackBox SOS API',
    timestamp: new Date().toISOString(),
    endpoints: ['/api/report', '/api/alert', '/api/health'],
  });
}
