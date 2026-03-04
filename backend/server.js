const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8081; // Default to 8081 as expected by Dashboard/Frontend

// Middleware
app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.url}`);
  next();
});
app.use(cors({
  origin: true, // Allow all origins for MVP/Dev
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from 'public' if needed (optional)
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const routes = require('./src/routes/index');
const knowledgeRoutes = require('./src/routes/knowledgeRoutes'); // [NEW]
const chatRoutes = require('./src/routes/chatRoutes'); // [NEW]
app.use('/api', routes);
// Also allow /ocr for direct access if needed, though index.js handles /api/ocr
app.use('/ocr', require('./src/routes/ocrRoutes'));
app.use('/api/knowledge', knowledgeRoutes); // [NEW]
app.use('/api/chat', chatRoutes); // [NEW]

// Health Check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Yorisoi Backend API is running',
    version: '2.0.0 (Modular)'
  });
});

// Mock/Verification Endpoint (legacy support check)
app.get('/facilities', (req, res) => {
  res.status(410).json({ error: 'Deprecated. Use /api/facilities' });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[ServerError]', err);
  res.status(500).json({
    ok: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Routes mounted at /api`);
});
