require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

const authRouter = require('./routes/auth');
const runsRouter = require('./routes/runs');
const analyticsRouter = require('./routes/analytics');
const testcasesRouter = require('./routes/testcases');
const authenticate = require('./middleware/authenticate');

const app = express();
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '5mb' })); // test run payloads can carry many test cases

app.use('/api/auth', authRouter);
app.use('/api/runs', authenticate, runsRouter);
app.use('/api/analytics', authenticate, analyticsRouter);
app.use('/api/testcases', authenticate, testcasesRouter);

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
