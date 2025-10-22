import crypto from 'crypto';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const secret = process.env.WEBHOOK_SECRET || '';
    const token  = process.env.GITHUB_TOKEN  || '';
    const owner  = process.env.REPO_OWNER    || '';
    const repo   = process.env.REPO_NAME     || '';
    const branch = process.env.REPO_BRANCH   || 'main';

    // Leggi RAW body
    const raw = await new Promise((resolve, reject) => {
      let data = ''; req.setEncoding('utf8');
      req.on('data', c => data += c);
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });

    // Verifica firma
    const sig = req.headers['x-webhook-signature'] || '';
    const digest = 'sha256=' + crypto.createHmac('sha256', secret).update(raw, 'utf8').digest('hex');
    if (!secret || sig !== digest) return res.status(401).json({ error: 'Invalid signature' });

    let payload; try { payload = JSON.parse(raw); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
    const files = Array.isArray(payload.files) ? payload.files : [];
    const message = payload.message || 'Update from MegaFile';
    if (!token || !owner || !repo) return res.status(500).json({ error: 'Missing env vars' });

    // SHA file se esiste
    async function getFileSha(path) {
      const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`, {
        headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github+json' }
      });
      if (r.status === 200) return (await r.json()).sha;
      return null;
    }

    const results = [];
    for (const f of files) {
      const path = f.path; const content = f.content ?? '';
      if (!path) continue;
      const sha = await getFileSha(path);
      const body = { message, content: Buffer.from(content, 'utf8').toString('base64'), branch, ...(sha ? { sha } : {}) };

      const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const j = await r.json();
      if (r.status >= 300) return res.status(502).json({ error: 'GitHub update failed', detail: { path, response: j } });
      results.push({ path, status: r.status, response: j });
    }
    return res.status(200).json({ ok: true, updated: results.length, results });
  } catch (e) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
