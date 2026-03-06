const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── In-memory store (pre-seeded demo data) ───────────────────────────────────
const store = new Map([
  ['STU100001', { externalId: 'STU100001', restoreId: 'restore-aabbcc-1001' }],
  ['STU100002', { externalId: 'devuser02_default@mailinator.com', restoreId: '3F05E39E-178B-4B8E-947A-186195801111' }],
]);

// =============================================================================
// GET /api/restore/:externalId
// Example: /api/restore/STU100001
// Returns: { externalId, restoreId }
// =============================================================================
app.get('/api/restore/:externalId', (req, res) => {
  const { externalId } = req.params;
  const record = store.get(externalId);

  return res.json({
    externalId: externalId,
    restoreId: record ? record.restoreId : ''
  });
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => console.log(`✅ API running on port ${PORT}`));
