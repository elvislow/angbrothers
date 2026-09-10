import { put } from '@vercel/blob';

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: 'Connect a Vercel Blob store to enable uploads.' });
  try {
    const { name, type, data } = req.body || {};
    if (!name || !data) return res.status(400).json({ error: 'No file provided.' });
    const buffer = Buffer.from(data, 'base64');
    if (buffer.length > 10 * 1024 * 1024) return res.status(400).json({ error: 'File must be under 10MB.' });
    const safeName = String(name).replace(/[^a-zA-Z0-9._-]/g, '-');
    const blob = await put(`scripts/${Date.now()}-${safeName}`, buffer, { access: 'public', contentType: type || 'application/octet-stream' });
    return res.status(201).json({ name, url: blob.url });
  } catch (error) { return res.status(500).json({ error: error.message || 'Upload failed' }); }
}
