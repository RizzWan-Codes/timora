// api/health.js
// Simple health check endpoint

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    endpoints: {
      aiTeacher: '/api/ai-teacher',
      generatePlan: '/api/generate-plan'
    }
  });
}
