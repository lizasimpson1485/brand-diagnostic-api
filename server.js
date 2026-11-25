'use strict';
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const config = require('./config');
const google = require('./google');

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const QUEUE_DIR = path.join(DATA_DIR, 'queue');   // applications waiting to go to Google
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads'); // videos waiting to go to Drive
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 300);
const NOTIFY_WEBHOOK_URL = process.env.NOTIFY_WEBHOOK_URL || '';
const TZ = process.env.TIMEZONE || 'Australia/Melbourne';
const SETUP_PASSWORD = process.env.SETUP_PASSWORD || '';
const GOOGLE_STORE = path.join(DATA_DIR, 'google.json'); // written by the /setup page

fs.mkdirSync(QUEUE_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
try { google.setStored(JSON.parse(fs.readFileSync(GOOGLE_STORE, 'utf8'))); } catch {}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const roleBySlug = (slug) => config.roles.find((r) => r.slug === slug);
const tabFor = (role) => role.sheetTab || role.title;

const newId = () => crypto.randomBytes(12).toString('hex');
const clean = (v, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// ---------- local queue (so nothing is lost if Google is briefly unavailable) ----------
const qPath = (id) => path.join(QUEUE_DIR, id + '.json');
async function saveQueued(sub) {
  const tmp = qPath(sub.id) + '.tmp';
  await fsp.writeFile(tmp, JSON.stringify(sub, null, 2));
  await fsp.rename(tmp, qPath(sub.id));
}

const CONTRACT = { yes: 'Yes', different: 'Yes, prefers different hours', no: 'No' };
const YESNO = { yes: 'Yes', no: 'No' };
const ABN = { yes: 'Yes', 'will-get': 'Not yet, happy to get one', no: 'No' };

function stamp(iso) {
  // "2026-11-21 14:05" in local time: sorts correctly as text
  return new Date(iso).toLocaleString('sv-SE', { timeZone: TZ }).slice(0, 16);
}

function videoName(sub) {
  const safe = sub.name.replace(/[^\p{L}\p{N} .'-]/gu, '').trim() || 'Applicant';
  return `${stamp(sub.createdAt).slice(0, 10)} ${safe} (${sub.roleTitle || 'Applicant'})${path.extname(sub.video)}`;
}

async function processOne(sub) {
  if (sub.video && !sub.videoLink) {
    const file = await google.uploadVideo(path.join(UPLOAD_DIR, sub.video), videoName(sub), sub.videoMime, google.cfg().folderId);
    sub.videoLink = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;
    await saveQueued(sub); // remember the upload so a retry doesn't upload twice
  }
  if (!sub.appended) {
    await google.appendRow(google.cfg().sheetId, sub.sheetTab || 'Applicants', [
      stamp(sub.createdAt), sub.name, sub.email, sub.phone, sub.linkedin,
      CONTRACT[sub.contract] || sub.contract, YESNO[sub.inAustralia] || sub.inAustralia, ABN[sub.abn] || sub.abn,
      sub.rate == null ? '' : sub.rate, sub.startDate, sub.availability, sub.tools,
      sub.knockedOut ? 'No' : 'Yes', sub.videoLink || ''
    ]);
    sub.appended = true;
    await saveQueued(sub);
  }
  if (sub.video) await fsp.unlink(path.join(UPLOAD_DIR, sub.video)).catch(() => {});
  await fsp.unlink(qPath(sub.id)).catch(() => {});
}

let running = false;
let again = false;
let warned = false;
async function processQueue() {
  if (running) { again = true; return; }
  running = true;
  again = false;
  try {
    const files = (await fsp.readdir(QUEUE_DIR)).filter((f) => f.endsWith('.json')).sort();
    if (!files.length) return;
    if (!google.isConfigured()) {
      if (!warned) console.warn(`Google isn’t connected yet: ${files.length} application(s) are waiting in ${QUEUE_DIR}.`);
      warned = true;
      return;
    }
    for (const f of files) {
      let sub;
      try { sub = JSON.parse(await fsp.readFile(path.join(QUEUE_DIR, f), 'utf8')); } catch { continue; }
      try {
        await processOne(sub);
        console.log(`Sent to Google: ${sub.name}`);
      } catch (e) {
        sub.attempts = (sub.attempts || 0) + 1;
        sub.lastError = e.message;
        await saveQueued(sub).catch(() => {});
        console.error(`Couldn’t send ${sub.name} to Google (attempt ${sub.attempts}), will retry: ${e.message}`);
      }
    }
  } finally {
    running = false;
    if (again) setImmediate(processQueue);
  }
}

// ---------- uploads ----------
const EXT = { 'video/webm': '.webm', 'video/mp4': '.mp4', 'video/quicktime': '.mov', 'video/x-m4v': '.m4v', 'video/3gpp': '.3gp' };

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      req.subId = req.subId || newId();
      const base = (file.mimetype || '').split(';')[0].toLowerCase();
      cb(null, req.subId + (EXT[base] || '.webm'));
    }
  }),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 1, fields: 40 },
  fileFilter: (req, file, cb) => cb(null, (file.mimetype || '').startsWith('video/'))
});

function notify(sub) {
  if (!NOTIFY_WEBHOOK_URL) return;
  const text = sub.knockedOut
    ? `New application for ${sub.roleTitle} (didn’t meet the basics): ${sub.name}`
    : `New application for ${sub.roleTitle}: ${sub.name}${sub.rate != null ? ` – $${sub.rate}/hr` : ''}`;
  fetch(NOTIFY_WEBHOOK_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) })
    .catch((e) => console.error('Notify failed:', e.message));
}

// ---------- routes ----------
app.get('/healthz', (req, res) => res.send('ok'));

app.get('/api/config', (req, res) => {
  res.json({ ...config, roles: config.roles.filter((r) => r.open), maxUploadMb: MAX_UPLOAD_MB });
});

app.post('/api/apply', (req, res) => {
  upload.single('video')(req, res, async (err) => {
    const discard = () => (req.file ? fsp.unlink(req.file.path).catch(() => {}) : null);
    if (err) {
      await discard();
      const tooBig = err.code === 'LIMIT_FILE_SIZE';
      return res.status(tooBig ? 413 : 400).json({
        error: tooBig
          ? `That video is over ${MAX_UPLOAD_MB} MB. Record a shorter one, or upload a smaller file.`
          : 'The upload didn’t complete. Check your connection and try again.'
      });
    }
    try {
      const b = req.body || {};
      if (clean(b.website)) { await discard(); return res.json({ ok: true }); } // honeypot

      const role = roleBySlug(clean(b.role, 100));
      if (!role || !role.open) {
        await discard();
        return res.status(400).json({ error: 'This role is no longer open.' });
      }

      const rate = Number.parseFloat(b.rate);
      const sub = {
        id: req.subId || newId(),
        createdAt: new Date().toISOString(),
        role: role.slug,
        roleTitle: role.title,
        sheetTab: tabFor(role),
        name: clean(b.name, 200),
        email: clean(b.email, 200),
        phone: clean(b.phone, 60),
        linkedin: clean(b.linkedin, 500),
        contract: clean(b.contract, 40),
        availability: clean(b.availability),
        inAustralia: clean(b.inAustralia, 10),
        abn: clean(b.abn, 40),
        rate: Number.isFinite(rate) ? rate : null,
        startDate: clean(b.startDate, 200),
        tools: clean(b.tools, 500),
        video: req.file ? path.basename(req.file.path) : null,
        videoMime: req.file ? (req.file.mimetype || 'video/webm').split(';')[0] : null
      };
      sub.knockedOut = sub.contract === 'no' || sub.inAustralia === 'no';

      if (!sub.name || !sub.email) {
        await discard();
        return res.status(400).json({ error: 'Add your name and email, then send again.' });
      }
      if (!sub.knockedOut && !sub.video) {
        return res.status(400).json({ error: 'Record or upload your video, then send again.' });
      }

      // Use a sortable, unique queue name so applications reach the Sheet in order
      sub.id = Date.now().toString(36).padStart(10, '0') + '-' + sub.id;
      await saveQueued(sub);
      res.json({ ok: true, knockedOut: sub.knockedOut });
      notify(sub);
      processQueue();
    } catch (e) {
      console.error(e);
      await discard();
      res.status(500).json({ error: 'Your application didn’t save. Try sending it again.' });
    }
  });
});

// ---------- browser setup for Google (no terminal needed) ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function page(title, body) {
  return `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(title)}</title>
<link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap">
<link rel="stylesheet" href="/styles.css"></head><body>
<header class="band"><div class="wrap"><div class="band-top"><span class="logo"><span class="wm">MOOR<span class="wm-dot">.</span></span></span></div>
<div class="hero"><p class="step">Setup</p><h1>${esc(title)}<span class="full">.</span></h1></div></div></header>
<main class="wrap setup">${body}</main></body></html>`;
}

function requireSetup(req, res, next) {
  if (!SETUP_PASSWORD) {
    return res.status(503).send(page('Setup is locked', '<p>Add a <code>SETUP_PASSWORD</code> variable in Railway, wait for it to redeploy, then reload this page.</p>'));
  }
  const [scheme, enc] = (req.headers.authorization || '').split(' ');
  if (scheme === 'Basic' && enc) {
    const decoded = Buffer.from(enc, 'base64').toString();
    const pass = decoded.slice(decoded.indexOf(':') + 1);
    const a = crypto.createHash('sha256').update(pass).digest();
    const b = crypto.createHash('sha256').update(SETUP_PASSWORD).digest();
    if (crypto.timingSafeEqual(a, b)) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="Setup", charset="UTF-8"');
  res.status(401).send('Enter your setup password (any username).');
}

const redirectUri = (req) => (process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '') + '/setup/callback';
const pendingStates = new Set();

app.get('/setup', requireSetup, (req, res) => {
  if (!google.hasClient()) {
    return res.send(page('Connect Google', `<p>First add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in Railway’s Variables, wait for the redeploy, then reload this page.</p>
      <p class="muted">In Google Cloud, the client’s authorised redirect URI must be exactly:<br><code>${esc(redirectUri(req))}</code></p>`));
  }
  const c = google.cfg();
  if (google.isConfigured() && req.query.reconnect === undefined) {
    const s = (() => { try { return JSON.parse(fs.readFileSync(GOOGLE_STORE, 'utf8')); } catch { return {}; } })();
    return res.send(page('Google is connected', `<p>Applications are going to your Google Sheet and Drive.</p>
      <p>${s.sheetUrl ? `<a class="btn primary" href="${esc(s.sheetUrl)}" target="_blank" rel="noopener">Open the Sheet</a> ` : `<a class="btn primary" href="https://docs.google.com/spreadsheets/d/${esc(c.sheetId)}" target="_blank" rel="noopener">Open the Sheet</a> `}
      ${s.parentUrl ? `<a class="btn ghost" href="${esc(s.parentUrl)}" target="_blank" rel="noopener">Open the folder</a>` : ''}</p>
      <p class="muted">Signed in with the wrong account, or Google stopped working? <a href="/setup?reconnect">Reconnect Google</a>.</p>`));
  }
  const state = crypto.randomBytes(16).toString('hex');
  pendingStates.add(state);
  setTimeout(() => pendingStates.delete(state), 15 * 60 * 1000);
  res.redirect(google.authUrl(redirectUri(req)) + '&state=' + state);
});

app.get('/setup/callback', requireSetup, async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.send(page('Google sign-in cancelled', '<p><a href="/setup">Try again</a>.</p>'));
  if (!code || !pendingStates.has(state)) return res.status(400).send(page('That link expired', '<p><a href="/setup">Start again</a>.</p>'));
  pendingStates.delete(state);
  try {
    const refreshToken = await google.exchangeCode(String(code), redirectUri(req));
    let saved = {};
    try { saved = JSON.parse(fs.readFileSync(GOOGLE_STORE, 'utf8')); } catch {}
    saved.refreshToken = refreshToken;
    google.setStored(saved);
    if (!google.cfg().sheetId || !google.cfg().folderId) {
      const firstRole = config.roles[0] || { title: 'Applicants' };
      const out = await google.createWorkspace(process.env.SHEET_TITLE || 'Job applicants', firstRole.sheetTab || firstRole.title);
      Object.assign(saved, { sheetId: out.sheetId, folderId: out.folderId, sheetUrl: out.sheetUrl, parentUrl: out.parentUrl });
    }
    await fsp.writeFile(GOOGLE_STORE, JSON.stringify(saved, null, 2));
    google.setStored(saved);
    processQueue();
    res.send(page('Google is connected', `<p>Your Sheet and folders are ready in Google Drive, and new applications will go straight there.</p>
      <p>${saved.sheetUrl ? `<a class="btn primary" href="${esc(saved.sheetUrl)}" target="_blank" rel="noopener">Open the Sheet</a> ` : ''}${saved.parentUrl ? `<a class="btn ghost" href="${esc(saved.parentUrl)}" target="_blank" rel="noopener">Open the folder</a>` : ''}</p>
      <p class="muted">Next: send a test application from your phone and check it appears in the Sheet.</p>`));
  } catch (e) {
    console.error('Setup failed:', e.message);
    res.status(500).send(page('Google didn’t connect', `<p>${esc(e.message)}</p><p><a href="/setup?reconnect">Try again</a>.</p>`));
  }
});

app.get('/apply/:slug', (req, res) => {
  const role = roleBySlug(req.params.slug);
  if (!role || !role.open) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'apply.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Screening app on :${PORT}`);
  console.log(google.isConfigured() ? 'Google Sheets and Drive connected.' : 'Google not connected yet: open /setup in your browser (see README).');
  processQueue();
  setInterval(processQueue, 60 * 1000);
});
