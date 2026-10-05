require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const runsRouter = require('./routes/runs');
const analyticsRouter = require('./routes/analytics');
const testcasesRouter = require('./routes/testcases');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' })); // test run payloads can carry many test cases

app.use('/api/runs', runsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/testcases', testcasesRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test_automation_dashboard';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
