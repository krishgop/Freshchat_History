# Freshchat RestoreId API

A lightweight public REST API to store and retrieve Freshchat `restoreId` + `externalId` values for cross-platform conversation history (SiteA ↔ Brightspace).

---

## 🚀 Deploy for FREE in 5 Minutes

### Option A — Render (Recommended, always-free tier)

1. Push this folder to a GitHub repo (can be private)
2. Go to → https://render.com → **New → Web Service**
3. Connect your GitHub repo
4. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** Free
5. Click **Deploy** → you get a public URL like:  
   `https://freshchat-restore-api.onrender.com`

---

### Option B — Railway

1. Go to → https://railway.app → **New Project → Deploy from GitHub**
2. Select this repo
3. Railway auto-detects Node.js and deploys
4. Your public URL appears in the Railway dashboard

---

### Option C — Run Locally

```bash
npm install
npm start
# → http://localhost:3000
```

---

## API Endpoints

### `GET /`
Returns full API documentation in JSON.

---

### `GET /api/restore`
Retrieve stored `restoreId` for a student.

**Query params:**
| Param | Required | Description |
|-------|----------|-------------|
| `externalId` | ✅ Yes | Student ID (e.g. `STU123456`) |
| `platform` | No | `siteA` or `brightspace` |

**Example:**
```
GET /api/restore?externalId=STU123456&platform=siteA
```

**Response (200 OK):**
```json
{
  "success": true,
  "externalId": "STU123456",
  "restoreId": "a1b2c3d4-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "platform": "siteA",
  "createdAt": "2026-03-06T10:00:00.000Z",
  "updatedAt": "2026-03-06T10:00:00.000Z"
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "externalId": "STU123456",
  "restoreId": null,
  "message": "No restoreId found for this externalId."
}
```

---

### `POST /api/restore`
Store or update a `restoreId`.

**Body (JSON):**
```json
{
  "externalId": "STU123456",
  "restoreId": "a1b2c3d4-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "platform": "siteA"
}
```

**Response (201 Created / 200 Updated):**
```json
{
  "success": true,
  "action": "created",
  "externalId": "STU123456",
  "restoreId": "a1b2c3d4-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "platform": "siteA",
  "createdAt": "2026-03-06T10:00:00.000Z",
  "updatedAt": "2026-03-06T10:00:00.000Z"
}
```

---

### `GET /api/restore/all`
Get restoreIds for ALL platforms for a student.

**Example:**
```
GET /api/restore/all?externalId=STU123456
```

**Response:**
```json
{
  "success": true,
  "externalId": "STU123456",
  "restoreIds": {
    "siteA": {
      "restoreId": "abc-111",
      "createdAt": "...",
      "updatedAt": "..."
    },
    "brightspace": {
      "restoreId": "xyz-999",
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

---

### `DELETE /api/restore`
Delete a stored restoreId.

**Body:**
```json
{ "externalId": "STU123456", "platform": "siteA" }
```

---

### `GET /api/generate`
Generate a random `externalId` + `restoreId` pair and store it (useful for testing).

```
GET /api/generate?platform=siteA&prefix=STU
```

**Response:**
```json
{
  "success": true,
  "externalId": "STU948271",
  "restoreId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "platform": "siteA",
  "createdAt": "2026-03-06T10:00:00.000Z"
}
```

---

### `GET /health`
Health check endpoint.

```json
{
  "status": "ok",
  "uptime": "123.4s",
  "storedRecords": 5,
  "timestamp": "2026-03-06T10:00:00.000Z"
}
```

---

## Integration with Freshchat Widget

```javascript
// 1. On page load — preload all restoreIds for the student
async function preloadRestoreIds(studentId) {
  const resp = await fetch(
    `https://YOUR_API_URL/api/restore/all?externalId=${studentId}`
  );
  const data = await resp.json();
  if (data.success) {
    const ids = data.restoreIds;
    if (ids.siteA)       sessionStorage.setItem(`fc_restore_siteA_${studentId}`,       ids.siteA.restoreId);
    if (ids.brightspace) sessionStorage.setItem(`fc_restore_brightspace_${studentId}`, ids.brightspace.restoreId);
  }
}

// 2. On widget init — pass restoreId if available
window.fcWidget.init({
  token:      WIDGET_TOKEN,
  externalId: studentId,
  restoreId:  sessionStorage.getItem(`fc_restore_siteA_${studentId}`) || undefined,
  // ... other config
});

// 3. On user:created — store the new restoreId back to the API
window.fcWidget.on('user:created', async function(resp) {
  if (resp?.data?.restoreId) {
    await fetch('https://YOUR_API_URL/api/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        externalId: studentId,
        restoreId:  resp.data.restoreId,
        platform:   'siteA'   // or 'brightspace'
      })
    });
  }
});
```

---

## ⚠️ Note on Free Tier Persistence

The in-memory store resets on server restart (which happens on free tiers after inactivity).  
For persistent storage, replace the `Map` in `server.js` with a free database:

| Option | Free Tier | Setup |
|--------|-----------|-------|
| **Supabase** (Postgres) | 500MB free | https://supabase.com |
| **MongoDB Atlas** | 512MB free | https://mongodb.com/atlas |
| **PlanetScale** (MySQL) | 5GB free | https://planetscale.com |
| **Upstash** (Redis) | 10K req/day free | https://upstash.com |
