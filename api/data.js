import { list, put } from '@vercel/blob';

const seed = { contents: [] };
const allowedPlatforms = ['Instagram', 'Facebook', 'TikTok', 'YouTube', 'Other'];
const allowedScriptStatuses = ['Not Started', 'Draft', 'In Review', 'Approved'];
const allowedShootStatuses = ['Not Scheduled', 'Planned', 'Completed'];
const allowedPostStatuses = ['Not Scheduled', 'Planned', 'Scheduled', 'Published'];

function legacyPlatforms(channel = '') {
  const value = channel.toLowerCase();
  const matches = [];
  if (value.includes('ig') || value.includes('instagram')) matches.push('Instagram');
  if (value.includes('fb') || value.includes('facebook')) matches.push('Facebook');
  if (value.includes('tiktok')) matches.push('TikTok');
  if (value.includes('youtube') || value.includes('yt')) matches.push('YouTube');
  if (channel.trim() && !matches.length) matches.push('Other');
  return matches;
}

function normalizeContent(item) {
  return {
    id: item.id,
    title: item.title || 'Untitled content',
    script: item.script || item.content || '',
    owner: item.owner || 'Unassigned',
    platforms: Array.isArray(item.platforms) ? item.platforms.filter(platform => allowedPlatforms.includes(platform)) : legacyPlatforms(item.channel),
    shootDate: item.shootDate || '',
    shootTime: item.shootTime || '10:00',
    postDate: item.postDate || '',
    postTime: item.postTime || '10:00',
    scriptStatus: allowedScriptStatuses.includes(item.scriptStatus) ? item.scriptStatus : (item.script ? 'Draft' : 'Not Started'),
    shootStatus: allowedShootStatuses.includes(item.shootStatus) ? item.shootStatus : (item.shootDate ? 'Planned' : 'Not Scheduled'),
    postStatus: allowedPostStatuses.includes(item.postStatus) ? item.postStatus : (item.postDate ? 'Scheduled' : 'Not Scheduled')
  };
}

function migrateData(raw = {}) {
  if (Array.isArray(raw.contents)) return { contents: raw.contents.map(normalizeContent) };

  const contents = [];
  const findByTitle = title => contents.find(item => item.title.trim().toLowerCase() === String(title || '').trim().toLowerCase());

  for (const script of raw.scripts || []) {
    contents.push(normalizeContent({
      id: script.id,
      title: script.title,
      script: script.content,
      owner: script.owner,
      shootDate: script.date,
      scriptStatus: script.status === 'Approved' ? 'Approved' : script.status === 'In Review' ? 'In Review' : 'Draft',
      shootStatus: script.status === 'Completed' ? 'Completed' : script.date ? 'Planned' : 'Not Scheduled'
    }));
  }

  for (const entry of raw.entries || []) {
    let content = findByTitle(entry.title);
    if (!content) {
      content = normalizeContent({ id: entry.id, title: entry.title, platforms: legacyPlatforms(entry.channel) });
      contents.push(content);
    }
    content.platforms = [...new Set([...content.platforms, ...legacyPlatforms(entry.channel)])];
    if (entry.type === 'post') {
      content.postDate = entry.date;
      content.postTime = entry.time || '10:00';
      content.postStatus = 'Scheduled';
    } else {
      content.shootDate = entry.date;
      content.shootTime = entry.time || '10:00';
      content.shootStatus = 'Planned';
    }
  }

  return { contents };
}

async function readData() {
  const found = await list({ prefix: 'content-calendar/data.json', limit: 1 });
  if (!found.blobs.length) {
    await writeData(seed);
    return structuredClone(seed);
  }
  const response = await fetch(`${found.blobs[0].url}?v=${Date.now()}`, { cache: 'no-store' });
  return migrateData(await response.json());
}

async function writeData(data) {
  return put('content-calendar/data.json', JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json'
  });
}

function contentFromBody(body, existing = {}) {
  const platforms = Array.isArray(body.platforms) ? body.platforms : body.platforms ? [body.platforms] : [];
  return normalizeContent({
    ...existing,
    id: existing.id || Date.now(),
    title: body.title?.trim(),
    script: body.script?.trim() || '',
    owner: body.owner?.trim() || 'Unassigned',
    platforms,
    shootDate: body.shootDate || '',
    shootTime: body.shootTime || '10:00',
    postDate: body.postDate || '',
    postTime: body.postTime || '10:00',
    scriptStatus: body.scriptStatus,
    shootStatus: body.shootDate ? body.shootStatus : 'Not Scheduled',
    postStatus: body.postDate ? body.postStatus : 'Not Scheduled'
  });
}

function validate(body) {
  if (!body.title?.trim()) return 'Add a content title.';
  if (!body.script?.trim() && !body.shootDate && !body.postDate) return 'Add a script, shoot date or post date.';
  if (body.shootDate && !body.shootTime) return 'Add a shoot time.';
  if (body.postDate && !body.postTime) return 'Add a post time.';
  if (!allowedScriptStatuses.includes(body.scriptStatus) || !allowedShootStatuses.includes(body.shootStatus) || !allowedPostStatuses.includes(body.postStatus)) return 'Choose valid workflow statuses.';
  return '';
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') return res.status(200).json(await readData());
    if (!['POST', 'PUT', 'DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

    const data = await readData();
    const body = req.body || {};

    if (req.method === 'DELETE') {
      const index = data.contents.findIndex(item => String(item.id) === String(body.id));
      if (index < 0) return res.status(404).json({ error: 'Content not found.' });
      const [removed] = data.contents.splice(index, 1);
      await writeData(data);
      return res.status(200).json({ id: removed.id });
    }

    const validationError = validate(body);
    if (validationError) return res.status(400).json({ error: validationError });

    let content;
    if (req.method === 'PUT') {
      const index = data.contents.findIndex(item => String(item.id) === String(body.id));
      if (index < 0) return res.status(404).json({ error: 'Content not found.' });
      content = contentFromBody(body, data.contents[index]);
      data.contents[index] = content;
    } else {
      content = contentFromBody(body);
      data.contents.push(content);
    }

    await writeData(data);
    return res.status(req.method === 'PUT' ? 200 : 201).json(content);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
