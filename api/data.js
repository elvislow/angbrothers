import { list, put } from '@vercel/blob';

const seed = {
  entries: [],
  scripts: []
};

async function readData() {
  // OIDC authentication is injected by Vercel.
  const found = await list({ prefix: 'content-calendar/data.json', limit: 1 });
  if (!found.blobs.length) {
    await writeData(seed);
    return structuredClone(seed);
  }
  const response = await fetch(`${found.blobs[0].url}?v=${Date.now()}`, { cache: 'no-store' });
  return response.json();
}

async function writeData(data) {
  return put('content-calendar/data.json', JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json'
  });
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') return res.status(200).json(await readData());
    if (!['POST', 'PUT'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
    // OIDC authentication is injected by Vercel.

    const data = await readData();
    const body = req.body || {};

    if (body.resource === 'script') {
      if (!body.title?.trim() || !body.date || !['Draft', 'In Review', 'Approved', 'Scheduled', 'Completed'].includes(body.status)) {
        return res.status(400).json({ error: 'Complete all required script fields.' });
      }
      let script;
      if (req.method === 'PUT') {
        const index = data.scripts.findIndex(item => String(item.id) === String(body.id));
        if (index < 0) return res.status(404).json({ error: 'Script not found.' });
        script = { ...data.scripts[index], title: body.title.trim(), owner: body.owner?.trim() || 'Unassigned', date: body.date, status: body.status };
        data.scripts[index] = script;
      } else {
        script = { id: Date.now(), title: body.title.trim(), owner: body.owner?.trim() || 'Unassigned', date: body.date, status: body.status, fileName: body.fileName || '', fileUrl: body.fileUrl || '' };
        data.scripts.push(script);
      }
      await writeData(data);
      return res.status(req.method === 'PUT' ? 200 : 201).json(script);
    }

    const { id, title, type, date, time, channel } = body;
    if (!title?.trim() || !['shoot', 'post'].includes(type) || !date || !time) return res.status(400).json({ error: 'Complete all required schedule fields.' });
    let entry;
    if (req.method === 'PUT') {
      const index = data.entries.findIndex(item => String(item.id) === String(id));
      if (index < 0) return res.status(404).json({ error: 'Schedule not found.' });
      entry = { ...data.entries[index], title: title.trim(), type, date, time, channel: channel?.trim() || '' };
      data.entries[index] = entry;
    } else {
      entry = { id: Date.now(), title: title.trim(), type, date, time, channel: channel?.trim() || '' };
      data.entries.push(entry);
    }
    await writeData(data);
    return res.status(req.method === 'PUT' ? 200 : 201).json(entry);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
