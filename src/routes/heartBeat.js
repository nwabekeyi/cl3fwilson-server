import express from 'express';
const router = express.Router();

router.get('/heartbeat-endpoint', (req, res) => {
  console.log(`[${new Date().toISOString()}] Heartbeat endpoint hit`);
  res.json({ success: true, message: "Service is alive" });
});

export default router;
