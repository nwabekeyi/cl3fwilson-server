import express from 'express';
import dotenv from 'dotenv';
import contestRoutes from './routes/contestRoutes.js';
import corsMiddleware from './middlewares/corsMiddleware.js';
import requestLogger from './middlewares/requestLogger.js'; // Import the new middleware
import cron from 'node-cron';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/database.js';

dotenv.config();
connectDB();
const app = express();
const port = process.env.PORT || 3000;

// Get the directory path of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the uploads directory path
const uploadsDir = path.resolve(__dirname, '../Uploads');

// Function to delete contents of uploads directory
const deleteUploads = async () => {
  try {
    const files = await fs.readdir(uploadsDir);
    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      const stats = await fs.stat(filePath);
      if (stats.isFile()) {
        await fs.unlink(filePath);
        console.log(`Deleted file: ${filePath}`);
      } else if (stats.isDirectory()) {
        await fs.rm(filePath, { recursive: true, force: true });
        console.log(`Deleted directory: ${filePath}`);
      }
    }
    console.log('Uploads directory cleared successfully.');
  } catch (err) {
    console.error('Error clearing uploads directory:', err);
  }
};

// Schedule deletion every 24 hours at midnight
cron.schedule('0 0 * * *', () => {
  console.log('Running scheduled task to clear uploads directory...');
  deleteUploads();
});

app.use(requestLogger); // Add the request logging middleware
app.use(corsMiddleware); // Apply CORS middleware
app.use(express.json());

app.use('/', contestRoutes);

// Catch-all route for undefined endpoints
app.all('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});