import cron from 'node-cron';
import axios from 'axios';

/**
 * Heartbeat task
 * Runs every 24 hours at midnight (server time)
 */
export const startHeartbeat = () => {
    console.log('heartBeat initialized...')
  // Schedule: "0 0 * * *" => every day at 00:00
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log(`[${new Date().toISOString()}] Heartbeat started`);

      // Example: call your own API endpoint
      const response = await axios.get('https://cl3fwilson-server.onrender.com/heartbeat-endpoint');
      console.log(`[${new Date().toISOString()}] Heartbeat response:`, response.data);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Heartbeat failed:`, error.message);
    }
  });
};
