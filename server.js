const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── In-memory store (persists until server restarts) ─────────────────────────
// For production: replace with a free DB like Supabase / PlanetScale / MongoDB Atlas
const store = new Map();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));          // Allow all origins (SiteA + Brightspace)
app.use(express.json());

// ─── Helper ───────────────────────────────────────────────────────────────────
function timestamp() {
  return new Date().toISOString();
}

// =============================================================================
// GET /api/restore
// Query params: externalId (required), platform (optional)
// Returns: { externalId, restoreId, platform, createdAt }
//
// Usage:
//   GET /api/restore?externalId=STU123456
//   GET /api/restore?externalId=STU123456&platform=siteA
// =============================================================================
app.get('/api/restore', (req, res) => {
  const { externalId, platform } = req.query;

  if (!externalId) {
    return res.status(400).json({
      success: false,
      error: 'externalId is required as a query parameter.',
      example: '/api/restore?externalId=STU123456'
    });
  }

  const key = platform ? `${externalId}::${platform}` : externalId;
  const record = store.get(key);

  if (!record) {
    return res.status(404).json({
      success: false,
      externalId,
      platform: platform || null,
      restoreId: null,
      message: 'No restoreId found for this externalId. POST to /api/restore to create one.'
    });
  }

  return res.json({
    success: true,
    externalId: record.externalId,
    restoreId: record.restoreId,
    platform: record.platform || null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  });
});

// =============================================================================
// POST /api/restore
// Body: { externalId, restoreId, platform }
// Creates or updates the restoreId for this externalId + platform combination
// Returns: { externalId, restoreId, platform, createdAt }
//
// Usage:
//   POST /api/restore
//   Body: { "externalId": "STU123456", "restoreId": "abc-xyz-789", "platform": "siteA" }
// =============================================================================
app.post('/api/restore', (req, res) => {
  const { externalId, restoreId, platform } = req.body;

  if (!externalId || !restoreId) {
    return res.status(400).json({
      success: false,
      error: 'Both externalId and restoreId are required in the request body.',
      example: { externalId: 'devuser02_default@mailinator.com', restoreId: '3F05E39E-178B-4B8E-947A-186195801111' }
    });
  }

  const key = platform ? `${externalId}::${platform}` : externalId;
  const existing = store.get(key);

  const record = {
    externalId,
    restoreId,
    platform: platform || null,
    createdAt: existing ? existing.createdAt : timestamp(),
    updatedAt: timestamp()
  };

  store.set(key, record);

  return res.status(existing ? 200 : 201).json({
    success: true,
    action: existing ? 'updated' : 'created',
    externalId: record.externalId,
    restoreId: record.restoreId,
    platform: record.platform,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  });
});

// =============================================================================
// GET /api/restore/all
// Query params: externalId (required)
// Returns restoreIds for ALL platforms for a given student
//
// Usage:
//   GET /api/restore/all?externalId=STU123456
// =============================================================================
app.get('/api/restore/all', (req, res) => {
  const { externalId } = req.query;

  if (!externalId) {
    return res.status(400).json({
      success: false,
      error: 'externalId is required.',
      example: '/api/restore/all?externalId=STU123456'
    });
  }

  const results = {};
  for (const [key, record] of store.entries()) {
    if (record.externalId === externalId) {
      const platformKey = record.platform || 'default';
      results[platformKey] = {
        restoreId: record.restoreId,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      };
    }
  }

  if (Object.keys(results).length === 0) {
    return res.status(404).json({
      success: false,
      externalId,
      restoreIds: {},
      message: 'No records found for this externalId.'
    });
  }

  return res.json({
    success: true,
    externalId,
    restoreIds: results
  });
});

// =============================================================================
// DELETE /api/restore
// Body: { externalId, platform }
// Deletes a stored restoreId
// =============================================================================
app.delete('/api/restore', (req, res) => {
  const { externalId, platform } = req.body;

  if (!externalId) {
    return res.status(400).json({ success: false, error: 'externalId is required.' });
  }

  const key = platform ? `${externalId}::${platform}` : externalId;
  const existed = store.has(key);
  store.delete(key);

  return res.json({
    success: true,
    deleted: existed,
    externalId,
    platform: platform || null
  });
});

// =============================================================================
// GET /api/generate
// Generates a fresh externalId + restoreId pair (useful for testing)
// Query params: platform (optional), prefix (optional, default "STU")
// =============================================================================
app.get('/api/generate', (req, res) => {
  const { platform, prefix = 'STU' } = req.query;

  const externalId = `${prefix}${Date.now().toString().slice(-6)}`;
  const restoreId  = uuidv4();
  const key        = platform ? `${externalId}::${platform}` : externalId;

  const record = {
    externalId,
    restoreId,
    platform: platform || null,
    createdAt: timestamp(),
    updatedAt: timestamp()
  };

  store.set(key, record);

  return res.status(201).json({
    success: true,
    message: 'New externalId and restoreId generated and stored.',
    externalId,
    restoreId,
    platform: platform || null,
    createdAt: record.createdAt
  });
});

// =============================================================================
// GET /health  — Health check / uptime ping
// =============================================================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime().toFixed(1) + 's',
    storedRecords: store.size,
    timestamp: timestamp()
  });
});

// =============================================================================
// GET /  — API Documentation (human-readable)
// =============================================================================
app.get('/', (req, res) => {
  res.json({
    name: 'Freshchat RestoreId API',
    version: '1.0.0',
    description: 'Stores and retrieves Freshchat restoreId values keyed by externalId (Student ID) and platform.',
    baseUrl: `${req.protocol}://${req.get('host')}`,
    endpoints: {
      'GET /api/restore?externalId=STU123&platform=siteA': 'Get restoreId for a student + platform',
      'POST /api/restore': 'Store/update a restoreId  |  body: { externalId, restoreId, platform }',
      'GET /api/restore/all?externalId=STU123': 'Get ALL restoreIds for a student (all platforms)',
      'DELETE /api/restore': 'Delete a restoreId  |  body: { externalId, platform }',
      'GET /api/generate?platform=siteA': 'Generate a new externalId + restoreId pair (for testing)',
      'GET /health': 'Health check + record count',
    },
    quickTest: {
      step1_generate: `GET ${req.protocol}://${req.get('host')}/api/generate?platform=siteA`,
      step2_fetch:    `GET ${req.protocol}://${req.get('host')}/api/restore?externalId=<id>&platform=siteA`,
      step3_store:    `POST ${req.protocol}://${req.get('host')}/api/restore  body: { "externalId":"STU001","restoreId":"abc-123","platform":"brightspace" }`,
    }
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  Freshchat RestoreId API running on port ${PORT}`);
  console.log(`📖  Docs: http://localhost:${PORT}/`);
});
