import { list, put } from '@vercel/blob';

const seed = {
  entries: [],
  scripts: [
    { title: '3 Questions Families Ask Most', owner: 'Elvis', date: '15 Sep', status: 'In Review' },
    { title: 'Floral and Wake Hall Arrangements', owner: 'Ryan', date: '23 Sep', status: 'Draft' },
    { title: 'Preparing Essential Documents', owner: 'Elvis', date: '25 Sep', status: 'Scheduled' }
  ]
};

async function readData() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return seed;
  const found = await list({ prefix: 'content-calendar/data.json', limit: 1 });
  if (!found.blobs.length) {
    await put('content-calendar/data.json', JSON.stringify(seed), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
    return seed;
  }
  const response = await fetch(found.blobs[0].url, { cache: 'no-store' });
  return response.json();
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') return res.status(200).json(await readData());
    if (!['POST', 'PUT'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
    if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: 'Connect a Vercel Blob store to enable shared editing.' });
    const data = await readData();
    const { id, title, type, date, time, channel } = req.body || {};
    if (!title || !['shoot', 'post'].includes(type) || !date || !time) return res.status(400).json({ error: 'Missing required fields.' });
    let entry;
    if (req.method === 'PUT') {
      const index = data.entries.findIndex(item => String(item.id) === String(id));
      if (index < 0) return res.status(404).json({ error: 'Schedule not found.' });
      entry = { ...data.entries[index], day: Number(date.slice(8, 10)), title: String(title).trim(), type, time, channel: channel || '' };
      data.entries[index] = entry;
    } else {
      entry = { id: Date.now(), day: Number(date.slice(8, 10)), title: String(title).trim(), type, time, channel: channel || '' };
      data.entries.push(entry);
    }
    await put('content-calendar/data.json', JSON.stringify(data), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
    return res.status(req.method === 'PUT' ? 200 : 201).json(entry);
  } catch (error) { return res.status(500).json({ error: error.message || 'Server error' }); }
}
