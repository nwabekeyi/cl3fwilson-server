import express from 'express';
import dotenv from 'dotenv';
import contestRoutes from './routes/contestRoutes.js';
import corsMiddleware from './middlewares/corsMiddleware.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(corsMiddleware); // 👈 Apply CORS middleware
app.use(express.json());

app.use('/', contestRoutes);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
