const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json({ limit: '10mb' })); // increased for logo uploads
app.use(cors());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const AHREFS_API_KEY = process.env.AHREFS_API_KEY;
const PORT = process.env.PORT || 3000;

// ─── Logo storage (in-memory, resets on redeploy — good enough for now) ─────
const logoStore = {};

// ─── Logo upload endpoint ────────────────────────────────────────────────────
app.post('/upload-logo', (req, res) => {
  const { logoData, sessionId } = req.body;
  if (!logoData || !sessionId) return res.status(400).json({ error: 'Missing logoData or sessionId' });
  if (logoData.length > 5 * 1024 * 1024) return res.status(400).json({ error: 'Logo too large (max 5MB)' });
  logoStore[sessionId] = logoData;
  res.json({ ok: true, url: `/logo/${sessionId}` });
});

app.get('/logo/:sessionId', (req, res) => {
  const data = logoStore[req.params.sessionId];
  if (!data) return res.status(404).send('Not found');
  // data is a base64 data URL like "data:image/png;base64,..."
  const match = data.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return res.status(400).send('Invalid data');
  res.setHeader('Content-Type', match[1]);
  res.send(Buffer.from(match[2], 'base64'));
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ ok: true, version: '2.0.0' }));

// ─── Serve the Brand Diagnostic tool ─────────────────────────────────────────
const TOOL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Brand Diagnostic Tool</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#071a0e;color:#fff;min-height:100vh}
:root{--green:#3cc168;--green-light:#a8ffd0;--green-dim:#1a5c35;--card:#0e2618;--field:#162b1f;--border:#1e4a2a;--muted:#6b8f74}

.topbar{background:#050f09;border-bottom:1px solid var(--border);padding:0 32px;display:flex;align-items:center;justify-content:space-between;height:60px;position:sticky;top:0;z-index:100}
.topbar-brand{display:flex;align-items:center;gap:12px;cursor:pointer}
.topbar-logo{width:36px;height:36px;border-radius:8px;background:var(--green);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#071a0e;overflow:hidden;flex-shrink:0}
.topbar-logo img{width:100%;height:100%;object-fit:cover;border-radius:8px}
.topbar-name{font-weight:600;font-size:15px}
.topbar-right{display:flex;align-items:center;gap:16px}
.mode-badge{padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase}
.mode-quick{background:#0d3320;color:var(--green-light);border:1px solid var(--green-dim)}
.mode-deep{background:#1a1a0d;color:#ffd580;border:1px solid #4a4a0d}

.tabs-wrap{background:#050f09;border-bottom:1px solid var(--border);padding:0 32px;overflow-x:auto;white-space:nowrap}
.tabs{display:inline-flex;gap:0}
.tab{padding:14px 18px;font-size:12px;font-weight:500;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;transition:all .15s;letter-spacing:.03em;white-space:nowrap}
.tab:hover{color:#fff}
.tab.active{color:var(--green-light);border-bottom-color:var(--green-light)}
.tab.done{color:var(--green)}

.main{max-width:760px;margin:0 auto;padding:40px 24px 80px}
.section-header{margin-bottom:32px}
.section-num{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:var(--green);color:#071a0e;font-weight:700;font-size:13px;margin-bottom:12px}
.section-title{font-size:24px;font-weight:700;color:#fff;margin-bottom:6px}
.section-sub{font-size:14px;color:var(--muted)}

.field{margin-bottom:24px}
.field label{display:block;font-size:13px;font-weight:500;color:#fff;margin-bottom:8px;letter-spacing:.02em}
.field input,.field textarea,.field select{width:100%;background:var(--field);border:1px solid var(--border);border-radius:8px;padding:12px 14px;font-size:14px;color:#fff;font-family:'Inter',sans-serif;outline:none;transition:border-color .15s}
.field input::placeholder,.field textarea::placeholder{color:var(--muted)}
.field input:focus,.field textarea:focus,.field select:focus{border-color:var(--green)}
.field select option{background:#0e2618}
.field textarea{min-height:80px;resize:vertical}

.color-row{display:flex;align-items:center;gap:12px}
.color-row input[type=color]{width:44px;height:44px;border-radius:8px;border:1px solid var(--border);background:none;cursor:pointer;padding:2px}
.color-row input[type=text]{flex:1}

.logo-upload-area{background:var(--field);border:2px dashed var(--border);border-radius:8px;padding:24px;text-align:center;cursor:pointer;transition:all .2s}
.logo-upload-area:hover{border-color:var(--green-dim)}
.logo-upload-area.has-logo{border-color:var(--green);border-style:solid}
.logo-preview{width:64px;height:64px;border-radius:10px;object-fit:cover;margin:0 auto 8px;display:block}
.logo-upload-text{font-size:13px;color:var(--muted)}
.logo-upload-hint{font-size:11px;color:var(--muted);margin-top:4px;opacity:.7}

.options-grid{display:grid;gap:10px}
.options-grid.cols2{grid-template-columns:1fr 1fr}
.options-grid.cols3{grid-template-columns:1fr 1fr 1fr}
.opt-card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px 16px;cursor:pointer;transition:all .15s;text-align:left}
.opt-card:hover{border-color:var(--green-dim)}
.opt-card.selected{background:#0d3320;border-color:var(--green);color:#fff}
.opt-card .opt-title{font-size:14px;font-weight:500;color:#fff}
.opt-card .opt-desc{font-size:12px;color:var(--muted);margin-top:4px}
.opt-card.selected .opt-desc{color:var(--green-light)}

.nav-row{display:flex;justify-content:space-between;align-items:center;margin-top:40px;padding-top:24px;border-top:1px solid var(--border)}
.btn{padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:all .15s;border:none;font-family:'Inter',sans-serif}
.btn-primary{background:var(--green);color:#071a0e}
.btn-primary:hover{background:var(--green-light)}
.btn-ghost{background:transparent;color:var(--muted);border:1px solid var(--border)}
.btn-ghost:hover{color:#fff;border-color:#fff}
.btn-generate{background:linear-gradient(135deg,var(--green),#1d9e75);color:#071a0e;padding:14px 32px;font-size:15px}
.progress-text{font-size:13px;color:var(--muted)}

.mode-screen{max-width:680px;margin:60px auto;padding:0 24px}
.mode-screen h1{font-size:32px;font-weight:700;margin-bottom:8px}
.mode-screen p{color:var(--muted);margin-bottom:40px;font-size:15px}
.mode-cards{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.mode-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:28px;cursor:pointer;transition:all .2s}
.mode-card:hover{border-color:var(--green-dim);transform:translateY(-2px)}
.mode-card.selected{border-color:var(--green);background:#0d3320}
.mode-card .mc-tag{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--green);margin-bottom:12px}
.mode-card.deep .mc-tag{color:#ffd580}
.mode-card h3{font-size:20px;font-weight:700;margin-bottom:8px}
.mode-card p{font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:16px}
.mode-card .mc-price{font-size:22px;font-weight:700;color:var(--green)}
.mode-card.deep .mc-price{color:#ffd580}
.mode-card .mc-time{font-size:12px;color:var(--muted);margin-top:4px}
.mode-card ul{list-style:none;margin-top:16px}
.mode-card ul li{font-size:13px;color:var(--muted);padding:4px 0;display:flex;gap:8px}
.mode-card ul li:before{content:"✓";color:var(--green);font-weight:700}
.mode-card.deep ul li:before{color:#ffd580}

.type-screen{max-width:680px;margin:60px auto;padding:0 24px}
.type-cards{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
.type-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;cursor:pointer;transition:all .15s;text-align:center}
.type-card:hover{border-color:var(--green-dim)}
.type-card.selected{border-color:var(--green);background:#0d3320}
.type-card .tc-icon{font-size:28px;margin-bottom:10px}
.type-card h4{font-size:15px;font-weight:600;margin-bottom:6px}
.type-card p{font-size:12px;color:var(--muted)}

.report-wrap{display:none}
.report-wrap.active{display:block}

.slide{display:none;min-height:420px;padding:40px 32px}
.slide.active{display:block}

.slide-cover{background:linear-gradient(135deg,#0a2e15 0%,#071a0e 60%,#0d1a0a 100%);min-height:480px;position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;border-radius:12px;margin-bottom:16px}
.cover-circle1{position:absolute;width:300px;height:300px;border-radius:50%;border:2px solid rgba(60,193,104,.15);top:-80px;right:-80px}
.cover-circle2{position:absolute;width:180px;height:180px;border-radius:50%;border:2px solid rgba(60,193,104,.1);top:40px;right:60px}
.cover-content{padding:40px;position:relative;z-index:2}
.cover-agency-row{display:flex;align-items:center;gap:10px;margin-bottom:20px}
.cover-agency-logo{width:40px;height:40px;border-radius:8px;background:var(--green);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#071a0e;overflow:hidden;flex-shrink:0}
.cover-agency-logo img{width:100%;height:100%;object-fit:cover}
.cover-agency-name{font-size:14px;font-weight:600;color:rgba(255,255,255,.7);letter-spacing:.04em}
.cover-title{font-size:44px;font-weight:900;line-height:1.05;margin-bottom:8px}
.cover-client{font-size:16px;color:rgba(255,255,255,.6)}
.cover-date{font-size:12px;color:rgba(255,255,255,.35);margin-top:12px}

.slide-section{background:var(--card);border-radius:12px;padding:32px;margin-bottom:16px}
.slide-section-header{border-left:3px solid var(--green);padding-left:16px;margin-bottom:24px}
.slide-section-header h2{font-size:20px;font-weight:700}
.slide-section-header p{font-size:13px;color:var(--muted);margin-top:4px}

.metric-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
.metric-card{background:#071a0e;border-radius:10px;padding:16px;text-align:center}
.metric-val{font-size:26px;font-weight:700;color:var(--green)}
.metric-label{font-size:11px;color:var(--muted);margin-top:4px;text-transform:uppercase;letter-spacing:.05em}
.signal-good{background:#0d3320;color:var(--green-light);font-size:11px;padding:2px 8px;border-radius:10px;display:inline-block}
.signal-warn{background:#2a2000;color:#ffd580;font-size:11px;padding:2px 8px;border-radius:10px;display:inline-block}
.signal-bad{background:#2a0d0d;color:#ff8080;font-size:11px;padding:2px 8px;border-radius:10px;display:inline-block}

.gap-item{background:#071a0e;border-radius:8px;padding:16px;margin-bottom:10px;display:flex;gap:12px;align-items:flex-start}
.gap-num{width:28px;height:28px;border-radius:50%;background:var(--green);color:#071a0e;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.gap-content h4{font-size:14px;font-weight:600;margin-bottom:4px}
.gap-content p{font-size:13px;color:var(--muted);line-height:1.5}

.roadmap-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.roadmap-month{background:#071a0e;border-radius:8px;padding:14px}
.roadmap-month .rm-label{font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--green);margin-bottom:6px}
.roadmap-month .rm-month{font-size:13px;font-weight:600;margin-bottom:10px}
.roadmap-month ul{list-style:none}
.roadmap-month ul li{font-size:12px;color:var(--muted);padding:3px 0;display:flex;gap:6px}
.roadmap-month ul li:before{content:"→";color:var(--green);font-size:10px;margin-top:1px}

.checklist-item{display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)}
.checklist-item:last-child{border-bottom:none}
.chk{width:18px;height:18px;border-radius:4px;border:2px solid var(--border);cursor:pointer;flex-shrink:0;margin-top:1px;display:flex;align-items:center;justify-content:center;transition:all .15s}
.chk.checked{background:var(--green);border-color:var(--green)}
.chk.checked:after{content:"✓";color:#071a0e;font-size:11px;font-weight:700}
.chk-text{font-size:13px;color:#fff;line-height:1.5}
.chk-text.done{text-decoration:line-through;color:var(--muted)}
.priority-high{background:#2a0d0d;color:#ff8080;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:2px 8px;border-radius:10px;display:inline-block}
.priority-med{background:#2a2000;color:#ffd580;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:2px 8px;border-radius:10px;display:inline-block}
.priority-low{background:#0d2a1a;color:var(--green-light);font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:2px 8px;border-radius:10px;display:inline-block}

.persona-card{background:#071a0e;border-radius:10px;padding:20px;margin-bottom:12px}
.persona-name{font-size:16px;font-weight:700;margin-bottom:4px}
.persona-who{font-size:13px;color:var(--muted);margin-bottom:12px}
.persona-section label{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--green);display:block;margin-bottom:6px}
.persona-section ul{list-style:none}
.persona-section ul li{font-size:13px;color:#ccc;padding:2px 0;display:flex;gap:8px}
.persona-section ul li:before{content:"•";color:var(--green)}

.loading-state{text-align:center;padding:60px 20px}
.loading-state .spinner{width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px}
@keyframes spin{to{transform:rotate(360deg)}}
.loading-state h3{font-size:18px;font-weight:600;margin-bottom:8px}
.loading-state p{font-size:14px;color:var(--muted)}
.loading-steps{text-align:left;max-width:300px;margin:24px auto 0;list-style:none}
.loading-steps li{font-size:13px;color:var(--muted);padding:6px 0;display:flex;gap:8px}
.loading-steps li.done{color:var(--green)}
.loading-steps li .step-dot{width:8px;height:8px;border-radius:50%;background:var(--border);margin-top:5px;flex-shrink:0}
.loading-steps li.done .step-dot{background:var(--green)}
.loading-steps li.current .step-dot{background:#ffd580;animation:pulse .8s ease-in-out infinite}
.loading-steps li.current{color:#ffd580}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}

.export-bar{display:flex;gap:12px;padding:16px 32px;background:#050f09;border-bottom:1px solid var(--border)}
.btn-sm{padding:8px 16px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all .15s}
.btn-print{background:var(--green);color:#071a0e}
.btn-print:hover{background:var(--green-light)}

.forecast-card{background:#071a0e;border-radius:10px;padding:20px}
.forecast-card .fc-label{font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
.forecast-card .fc-val{font-size:28px;font-weight:800;color:var(--green)}
.forecast-card .fc-desc{font-size:12px;color:var(--muted);margin-top:6px;line-height:1.5}

.modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:200;align-items:center;justify-content:center}
.modal-overlay.open{display:flex}
.modal{background:#0e2618;border:1px solid var(--border);border-radius:14px;padding:32px;width:520px;max-width:92vw;max-height:90vh;overflow-y:auto}
.modal h3{font-size:20px;font-weight:700;margin-bottom:24px}

@media print{
  .topbar,.tabs-wrap,.export-bar,.nav-row{display:none!important}
  .slide{display:block!important;page-break-after:always}
  .report-wrap{display:block!important}
  body{background:#fff!important}
  .slide-cover{min-height:auto!important}
}
</style>
</head>
<body>

<!-- TOP BAR -->
<div class="topbar">
  <div class="topbar-brand" onclick="openBrandingModal()">
    <div class="topbar-logo" id="topLogo">BD</div>
    <div class="topbar-name" id="topName">Brand Diagnostic</div>
  </div>
  <div class="topbar-right">
    <span class="mode-badge mode-quick" id="modeBadge" style="display:none"></span>
    <div id="progressDisplay"></div>
    <button class="btn btn-ghost" onclick="openBrandingModal()" style="padding:7px 14px;font-size:12px">⚙ Branding</button>
  </div>
</div>

<!-- BRANDING MODAL -->
<div class="modal-overlay" id="brandModal">
  <div class="modal">
    <h3>Agency Branding</h3>
    <div class="field">
      <label>Agency Logo</label>
      <div class="logo-upload-area" id="logoUploadArea" onclick="document.getElementById('logoFileInput').click()">
        <input type="file" id="logoFileInput" accept="image/*" style="display:none" onchange="handleLogoUpload(event)">
        <div id="logoUploadContent">
          <div style="font-size:28px;margin-bottom:8px">🖼</div>
          <div class="logo-upload-text">Click to upload your logo</div>
          <div class="logo-upload-hint">PNG, SVG or JPG — appears on every report slide</div>
        </div>
      </div>
    </div>
    <div class="field"><label>Agency Name</label><input type="text" id="bm_name" placeholder="Your agency name" oninput="updateBranding()"></div>
    <div class="field"><label>Your Name</label><input type="text" id="bm_contact" placeholder="Your full name"></div>
    <div class="field"><label>Your Email</label><input type="email" id="bm_email" placeholder="you@agency.com"></div>
    <div class="field">
      <label>Brand Colour</label>
      <div class="color-row">
        <input type="color" id="bm_color" value="#3cc168" oninput="updateAccent(this.value)">
        <input type="text" id="bm_color_hex" value="#3cc168" placeholder="#3cc168" oninput="updateAccentFromHex(this.value)">
      </div>
    </div>
    <div class="field"><label>Tagline (optional)</label><input type="text" id="bm_tagline" placeholder="Your agency tagline"></div>
    <div style="display:flex;gap:12px;margin-top:8px">
      <button class="btn btn-primary" onclick="saveBranding()">Save Branding</button>
      <button class="btn btn-ghost" onclick="closeBrandingModal()">Cancel</button>
    </div>
  </div>
</div>

<!-- SECTION TABS -->
<div class="tabs-wrap" id="tabsWrap" style="display:none">
  <div class="tabs" id="tabsEl"></div>
</div>

<!-- EXPORT BAR -->
<div class="export-bar" id="exportBar" style="display:none">
  <button class="btn-sm btn-ghost" style="background:transparent;color:var(--muted);border:1px solid var(--border)" onclick="backToQuestionnaire()">← Back</button>
  <button class="btn-sm btn-print" onclick="window.print()">Save PDF</button>
  <button class="btn-sm" style="background:#1a3a1a;color:var(--green-light);border:1px solid var(--green-dim)" onclick="exportHTML()">Download Report (HTML)</button>
</div>

<!-- SLIDE NAV -->
<div id="slideNavWrap" style="display:none;position:sticky;top:60px;z-index:50;background:#050f09;border-bottom:1px solid var(--border);padding:10px 32px;overflow-x:auto;white-space:nowrap"></div>

<!-- MAIN APP -->
<div id="app">

  <!-- MODE SELECT -->
  <div id="modeScreen" class="mode-screen">
    <h1>Brand Diagnostic</h1>
    <p>Select your diagnostic type. Each is designed to uncover specific gaps and opportunities for your client.</p>
    <div class="mode-cards">
      <div class="mode-card" id="mc_quick" onclick="selectMode('quick')">
        <div class="mc-tag">Quick diagnostic</div>
        <h3>Discovery</h3>
        <p>A focused 30-minute diagnostic covering the core pillars of business performance.</p>
        <div class="mc-price">$500</div>
        <div class="mc-time">30 min call</div>
        <ul>
          <li>6 sections</li><li>Live SEO signals</li><li>Gap analysis</li>
          <li>12-month forecast</li><li>Onboarding checklist</li>
        </ul>
      </div>
      <div class="mode-card deep" id="mc_deep" onclick="selectMode('deep')">
        <div class="mc-tag">Deep diagnostic</div>
        <h3>Workshop</h3>
        <p>An in-depth 1–2 hour workshop that maps every dimension of the business.</p>
        <div class="mc-price">$1,000–$1,500</div>
        <div class="mc-time">1–2 hour workshop</div>
        <ul>
          <li>13 sections</li><li>Live SEO + competitor data</li><li>Full gap analysis</li>
          <li>Revenue forecast</li><li>Business canvas</li><li>Persona mapping</li>
        </ul>
      </div>
    </div>
  </div>

  <!-- TYPE SELECT -->
  <div id="typeScreen" class="type-screen" style="display:none">
    <div style="margin-bottom:8px;font-size:13px;color:var(--muted);cursor:pointer" onclick="showModeScreen()">← Back</div>
    <h2 style="font-size:28px;font-weight:700;margin-bottom:8px">Client Type</h2>
    <p style="color:var(--muted);margin-bottom:32px;font-size:14px">What type of business is your client?</p>
    <div class="type-cards">
      <div class="type-card" id="tc_ecomm" onclick="selectType('ecomm')">
        <div class="tc-icon">🛒</div><h4>E-commerce</h4><p>Product-based online store</p>
      </div>
      <div class="type-card" id="tc_leadgen" onclick="selectType('leadgen')">
        <div class="tc-icon">🎯</div><h4>Lead Generation</h4><p>Service-based business</p>
      </div>
      <div class="type-card" id="tc_coaching" onclick="selectType('coaching')">
        <div class="tc-icon">🎓</div><h4>Coaching & Consulting</h4><p>Knowledge / program based</p>
      </div>
    </div>
    <div style="text-align:center;margin-top:32px">
      <button class="btn btn-primary" onclick="startQuestionnaire()">Start Diagnostic →</button>
    </div>
  </div>

  <!-- QUESTIONNAIRE -->
  <div id="questionnaireWrap" style="display:none">
    <div class="main" id="questionnaireMain"></div>
  </div>

  <!-- REPORT -->
  <div id="reportWrap" class="report-wrap"></div>

</div>

<script>
// ─── STATE ────────────────────────────────────────────────────────────────────
var state = {
  mode: null, bizType: null,
  agency: { name:'', contact:'', email:'', color:'#3cc168', tagline:'', logoDataUrl:'', logoSessionId:'' },
  answers: {}, currentSection: 0
};
var sessionId = 'sess_' + Math.random().toString(36).slice(2);

// ─── LOGO UPLOAD ──────────────────────────────────────────────────────────────
function handleLogoUpload(e) {
  var file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { alert('Logo must be under 5MB'); return; }
  var reader = new FileReader();
  reader.onload = function(ev) {
    var dataUrl = ev.target.result;
    state.agency.logoDataUrl = dataUrl;
    // Upload to server
    fetch('/upload-logo', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ logoData: dataUrl, sessionId: sessionId })
    }).then(function(r){ return r.json(); }).then(function(d){
      if (d.ok) {
        state.agency.logoSessionId = sessionId;
        state.agency.logoUrl = d.url;
      }
    }).catch(function(){});
    // Update UI immediately
    updateLogoPreview(dataUrl, file.name);
    updateTopBarLogo();
  };
  reader.readAsDataURL(file);
}

function updateLogoPreview(dataUrl, filename) {
  var area = document.getElementById('logoUploadArea');
  var content = document.getElementById('logoUploadContent');
  area.classList.add('has-logo');
  content.innerHTML = '<img src="' + dataUrl + '" class="logo-preview"><div class="logo-upload-text">' + escHtml(filename) + '</div><div class="logo-upload-hint">Click to change</div>';
}

function updateTopBarLogo() {
  var el = document.getElementById('topLogo');
  if (state.agency.logoDataUrl) {
    el.innerHTML = '<img src="' + state.agency.logoDataUrl + '">';
  } else {
    var n = state.agency.name || 'BD';
    el.innerHTML = n.split(' ').slice(0,2).map(function(w){return w[0];}).join('').toUpperCase() || 'BD';
    el.style.background = state.agency.color || '#3cc168';
    el.style.color = '#071a0e';
  }
}

// ─── BRANDING ─────────────────────────────────────────────────────────────────
function updateAccent(hex) {
  document.documentElement.style.setProperty('--green', hex);
  state.agency.color = hex;
  document.getElementById('bm_color_hex').value = hex;
  updateTopBarLogo();
}
function updateAccentFromHex(hex) {
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    document.getElementById('bm_color').value = hex;
    updateAccent(hex);
  }
}
function updateBranding() {
  var n = document.getElementById('bm_name').value;
  if (n) { state.agency.name = n; document.getElementById('topName').textContent = n; }
  updateTopBarLogo();
}
function openBrandingModal() {
  document.getElementById('bm_name').value = state.agency.name;
  document.getElementById('bm_contact').value = state.agency.contact;
  document.getElementById('bm_email').value = state.agency.email;
  document.getElementById('bm_color').value = state.agency.color;
  document.getElementById('bm_color_hex').value = state.agency.color;
  document.getElementById('bm_tagline').value = state.agency.tagline;
  if (state.agency.logoDataUrl) {
    updateLogoPreview(state.agency.logoDataUrl, 'Current logo');
  }
  document.getElementById('brandModal').classList.add('open');
}
function closeBrandingModal() { document.getElementById('brandModal').classList.remove('open'); }
function saveBranding() {
  state.agency.name = document.getElementById('bm_name').value;
  state.agency.contact = document.getElementById('bm_contact').value;
  state.agency.email = document.getElementById('bm_email').value;
  state.agency.color = document.getElementById('bm_color').value;
  state.agency.tagline = document.getElementById('bm_tagline').value;
  document.getElementById('topName').textContent = state.agency.name || 'Brand Diagnostic';
  updateTopBarLogo();
  closeBrandingModal();
}

// ─── MODE & TYPE ──────────────────────────────────────────────────────────────
function selectMode(m) {
  state.mode = m;
  document.querySelectorAll('.mode-card').forEach(function(c){c.classList.remove('selected');});
  document.getElementById('mc_'+m).classList.add('selected');
  setTimeout(function(){
    document.getElementById('modeScreen').style.display = 'none';
    document.getElementById('typeScreen').style.display = 'block';
  }, 200);
}
function showModeScreen() {
  document.getElementById('typeScreen').style.display = 'none';
  document.getElementById('modeScreen').style.display = 'block';
}
function selectType(t) {
  state.bizType = t;
  document.querySelectorAll('.type-card').forEach(function(c){c.classList.remove('selected');});
  document.getElementById('tc_'+t).classList.add('selected');
}
function startQuestionnaire() {
  if (!state.bizType) { alert('Please select a client type first'); return; }
  document.getElementById('typeScreen').style.display = 'none';
  document.getElementById('questionnaireWrap').style.display = 'block';
  document.getElementById('tabsWrap').style.display = 'block';
  var badge = document.getElementById('modeBadge');
  badge.style.display = 'inline-block';
  badge.className = 'mode-badge ' + (state.mode === 'quick' ? 'mode-quick' : 'mode-deep');
  badge.textContent = state.mode === 'quick' ? 'Quick • $500' : 'Deep Workshop • $1,000–$1,500';
  state.currentSection = 0;
  renderTabs(); renderSection();
}

// ─── SECTIONS ─────────────────────────────────────────────────────────────────
function getSections() {
  var quick = [
    {id:'branding', title:'Agency Branding', sub:'Who is producing this report', fields:[
      {id:'agency_name', label:'Agency name', type:'text', placeholder:'Your agency name'},
      {id:'agency_contact', label:'Your name', type:'text', placeholder:'Your full name'},
      {id:'agency_email', label:'Your email', type:'email', placeholder:'you@agency.com'},
      {id:'agency_color', label:'Brand colour', type:'colorpicker'},
      {id:'agency_tagline', label:'Tagline (optional)', type:'text', placeholder:'Your tagline'}
    ]},
    {id:'client', title:'Client Details', sub:'Business being diagnosed', fields:[
      {id:'biz_name', label:'Business name', type:'text', placeholder:'Client business name'},
      {id:'biz_url', label:'Website URL', type:'url', placeholder:'https://'},
      {id:'biz_industry', label:'Industry / niche', type:'text', placeholder:'e.g. Health & wellness'}
    ]},
    {id:'financials', title:'Financial Position', sub:'Current business performance', fields:[
      {id:'fin_revenue', label:'Current annual revenue', type:'select', options:['Under $250k','$250k–$500k','$500k–$1M','$1M–$3M','$3M–$10M','$10M+']},
      {id:'fin_target', label:'Revenue target (12 months)', type:'text', placeholder:'e.g. $2M'},
      {id:'fin_adspend', label:'Current monthly ad spend', type:'text', placeholder:'e.g. $5,000/month'},
      {id:'fin_goals', label:'Primary business goal', type:'textarea', placeholder:'What does success look like in 12 months?'}
    ]},
    {id:'brand', title:'Brand & Market', sub:'How the business is positioned', fields:[
      {id:'b_describe', label:'Describe the business in 2–3 sentences', type:'textarea', placeholder:'What do they do, who do they serve, what makes them different?'},
      {id:'b_usp', label:'Core differentiator / USP', type:'textarea', placeholder:'Why do customers choose them over competitors?'},
      {id:'b_challenge', label:'Biggest marketing challenge right now', type:'textarea', placeholder:'What is the #1 thing holding growth back?'}
    ]},
    {id:'obstacles', title:'Obstacles & Gaps', sub:'Where the business is struggling', fields:[
      {id:'o_main', label:'Main obstacle to hitting revenue target', type:'textarea', placeholder:'What is getting in the way?'},
      {id:'o_tried', label:'What have they already tried?', type:'textarea', placeholder:'Previous marketing efforts, campaigns, strategies...'},
      {id:'o_competitors', label:'Key competitors (name 2–3)', type:'textarea', placeholder:'Who are they competing with?'}
    ]},
    {id:'acquisition', title:'Acquisition Channels', sub:'How they currently get clients', fields:[
      {id:'a_channels', label:'Active marketing channels', type:'multicheck', options:['Google Ads','Meta Ads','SEO / Content','Email marketing','Social organic','Referrals','Events','TikTok Ads','YouTube Ads']},
      {id:'a_best', label:'Best performing channel', type:'text', placeholder:'Which channel brings the most revenue?'},
      {id:'a_cac', label:'Estimated cost to acquire a customer', type:'text', placeholder:'e.g. $120 per lead, $800 per sale'}
    ]}
  ];
  var deep = [
    {id:'branding', title:'Agency Branding', sub:'Who is producing this report', fields:[
      {id:'agency_name', label:'Agency name', type:'text', placeholder:'Your agency name'},
      {id:'agency_contact', label:'Your name', type:'text', placeholder:'Your full name'},
      {id:'agency_email', label:'Your email', type:'email', placeholder:'you@agency.com'},
      {id:'agency_color', label:'Brand colour', type:'colorpicker'},
      {id:'agency_tagline', label:'Tagline (optional)', type:'text', placeholder:'Your tagline'}
    ]},
    {id:'client', title:'Client Details', sub:'Business being diagnosed', fields:[
      {id:'biz_name', label:'Business name', type:'text', placeholder:'Client business name'},
      {id:'biz_url', label:'Website URL', type:'url', placeholder:'https://'},
      {id:'biz_industry', label:'Industry / niche', type:'text', placeholder:'e.g. Health & wellness'}
    ]},
    {id:'financials', title:'Financial Position', sub:'Current business performance', fields:[
      {id:'fin_revenue', label:'Current annual revenue', type:'select', options:['Under $250k','$250k–$500k','$500k–$1M','$1M–$3M','$3M–$10M','$10M+']},
      {id:'fin_target', label:'Revenue target (12 months)', type:'text', placeholder:'e.g. $2M'},
      {id:'fin_adspend', label:'Monthly ad spend', type:'text', placeholder:'e.g. $5,000/month'},
      {id:'fin_margin', label:'Approximate gross margin', type:'select', options:['Under 20%','20–40%','40–60%','60–80%','80%+','Unknown']},
      {id:'fin_goals', label:'Primary business goals', type:'textarea', placeholder:'Top 3 goals in the next 12 months'}
    ]},
    {id:'brand', title:'Brand Foundations', sub:'Identity, positioning and market fit', fields:[
      {id:'b_describe', label:'Describe the business', type:'textarea', placeholder:'What do they do, who do they serve, what makes them different?'},
      {id:'b_values', label:'Core brand values', type:'textarea', placeholder:'What principles guide the business?'},
      {id:'b_usp', label:'Core differentiator / USP', type:'textarea', placeholder:'Why do customers choose them over competitors?'},
      {id:'b_voice', label:'Brand voice and tone', type:'text', placeholder:'e.g. Professional but approachable, bold, empathetic'}
    ]},
    {id:'goals', title:'Goals & Vision', sub:'Where they want to go', fields:[
      {id:'g_vision', label:'12-month vision', type:'textarea', placeholder:'What does success look like in 12 months?'},
      {id:'g_priority', label:'Top 3 priorities right now', type:'textarea', placeholder:'What are they most focused on achieving?'},
      {id:'g_longterm', label:'3–5 year ambition', type:'textarea', placeholder:'Where does the founder want to take this business?'}
    ]},
    {id:'obstacles', title:'Obstacles & Challenges', sub:'What is holding them back', fields:[
      {id:'o_main', label:'Main obstacle to growth', type:'textarea', placeholder:'What is getting in the way of hitting targets?'},
      {id:'o_tried', label:'What have they already tried?', type:'textarea', placeholder:'Previous marketing efforts, campaigns, strategies...'},
      {id:'o_fear', label:'Biggest fear about marketing', type:'textarea', placeholder:'What worries them most about investing in marketing?'}
    ]},
    {id:'customer', title:'Customer & Persona', sub:'Who they serve', fields:[
      {id:'c_describe', label:'Describe the ideal customer', type:'textarea', placeholder:'Demographics, psychographics, where they live, what they do...'},
      {id:'c_motivation', label:'Primary motivation to buy', type:'textarea', placeholder:'What drives them to take action?'},
      {id:'c_journey', label:'Buying journey', type:'textarea', placeholder:'How does a customer typically find them and decide to buy?'}
    ]},
    {id:'painpoints', title:'Pain Points & Dream Outcome', sub:'Emotional drivers', fields:[
      {id:'pp_pains', label:'Top 3 customer pain points', type:'textarea', placeholder:'What problems keep the customer up at night?'},
      {id:'pp_dream', label:'Dream outcome', type:'textarea', placeholder:'What transformation does the customer desire?'},
      {id:'pp_trigger', label:'Buying trigger', type:'textarea', placeholder:'What event makes them decide to buy?'}
    ]},
    {id:'objections', title:'Objections', sub:'Why prospects do not buy', fields:[
      {id:'obj_main', label:'Top 3 objections', type:'textarea', placeholder:'What reasons do prospects give for not buying?'},
      {id:'obj_handle', label:'How are objections handled?', type:'textarea', placeholder:'What does the sales process do to overcome these?'}
    ]},
    {id:'products', title:'Products & Offers', sub:'What they sell', fields:[
      {id:'prod_main', label:'Main product or service', type:'textarea', placeholder:'Describe the core offer — what is it, what does it deliver, what does it cost?'},
      {id:'prod_funnel', label:'Offer funnel or product ladder', type:'textarea', placeholder:'Lead magnet, entry offer, core offer, premium tier?'},
      {id:'prod_aov', label:'Average order / transaction value', type:'text', placeholder:'e.g. $297, $1,200, $5,000+'}
    ]},
    {id:'competitors', title:'Competitor Landscape', sub:'Who they compete with', fields:[
      {id:'co_names', label:'Top 3 competitors', type:'textarea', placeholder:'Name them and their websites if known'},
      {id:'co_diff', label:'How are competitors different?', type:'textarea', placeholder:'What do competitors do that this business does not?'},
      {id:'co_advantage', label:'Where does the client have an advantage?', type:'textarea', placeholder:'What can they do or say that competitors cannot?'}
    ]},
    {id:'acquisition', title:'Acquisition Channels', sub:'How they currently get clients', fields:[
      {id:'a_channels', label:'Active marketing channels', type:'multicheck', options:['Google Ads','Meta Ads','SEO / Content','Email marketing','Social organic','Referrals','Events','TikTok Ads','YouTube Ads']},
      {id:'a_best', label:'Best performing channel', type:'text', placeholder:'Which channel drives the most revenue?'},
      {id:'a_cac', label:'Cost to acquire a customer', type:'text', placeholder:'e.g. $120 per lead, $800 per sale'},
      {id:'a_missing', label:'Channels they are NOT using that they should be', type:'textarea', placeholder:'What acquisition gaps exist?'}
    ]},
    {id:'retention', title:'Retention & LTV', sub:'How they keep customers', fields:[
      {id:'r_ltv', label:'Customer lifetime value', type:'text', placeholder:'e.g. $1,200 over 12 months'},
      {id:'r_retention', label:'Retention strategy', type:'textarea', placeholder:'How do they keep existing customers buying again?'},
      {id:'r_referral', label:'Referral and word of mouth', type:'textarea', placeholder:'Do they have a referral programme?'}
    ]}
  ];
  var typeSection = getTypeSection();
  if (typeSection) { quick.push(typeSection); deep.push(typeSection); }
  return state.mode === 'quick' ? quick : deep;
}

function getTypeSection() {
  if (state.bizType === 'ecomm') return {id:'type_specific', title:'E-commerce Specifics', sub:'Online store performance', fields:[
    {id:'ec_platform', label:'E-commerce platform', type:'text', placeholder:'e.g. Shopify, WooCommerce'},
    {id:'ec_aov', label:'Average order value', type:'text', placeholder:'e.g. $85'},
    {id:'ec_roas', label:'Current ROAS (if running ads)', type:'text', placeholder:'e.g. 2.4x'},
    {id:'ec_cro', label:'Website conversion rate', type:'text', placeholder:'e.g. 1.8%'},
    {id:'ec_repeat', label:'Repeat purchase rate', type:'text', placeholder:'e.g. 30% of customers buy again'}
  ]};
  if (state.bizType === 'leadgen') return {id:'type_specific', title:'Lead Gen Specifics', sub:'Sales pipeline performance', fields:[
    {id:'lg_leads', label:'Leads per month', type:'text', placeholder:'e.g. 40 leads/month'},
    {id:'lg_close', label:'Close rate', type:'text', placeholder:'e.g. 25%'},
    {id:'lg_cycle', label:'Average sales cycle', type:'text', placeholder:'e.g. 2 weeks from lead to close'},
    {id:'lg_nurture', label:'Lead nurturing sequence', type:'textarea', placeholder:'What happens after someone opts in?'}
  ]};
  if (state.bizType === 'coaching') return {id:'type_specific', title:'Coaching Specifics', sub:'Program and audience', fields:[
    {id:'coa_program', label:'Core program or offer', type:'textarea', placeholder:'Describe the main coaching program'},
    {id:'coa_students', label:'Current number of clients', type:'text', placeholder:'e.g. 45 active clients'},
    {id:'coa_authority', label:'Authority and credibility', type:'textarea', placeholder:'Credentials, results, case studies, audience size'},
    {id:'coa_enrol', label:'Enrolment process', type:'textarea', placeholder:'How do prospects become clients?'}
  ]};
  return null;
}

// ─── RENDER ───────────────────────────────────────────────────────────────────
function renderTabs() {
  var sections = getSections();
  var html = '';
  sections.forEach(function(s, i) {
    var cls = 'tab';
    if (i === state.currentSection) cls += ' active';
    else if (state.answers[s.id] && Object.keys(state.answers[s.id]).length) cls += ' done';
    html += '<div class="' + cls + '" onclick="goToSection(' + i + ')">' + s.title + '</div>';
  });
  html += '<div class="tab" onclick="goToSection(' + sections.length + ')" style="color:var(--green-light);font-weight:600">Generate Report →</div>';
  document.getElementById('tabsEl').innerHTML = html;
}

function goToSection(i) {
  saveCurrentSection();
  var sections = getSections();
  if (i >= sections.length) { generateReport(); return; }
  state.currentSection = i;
  renderTabs(); renderSection();
}

function renderSection() {
  var sections = getSections();
  var s = sections[state.currentSection];
  var answers = state.answers[s.id] || {};
  var html = '<div class="section-header"><div class="section-num">' + (state.currentSection + 1) + '</div>'
    + '<div class="section-title">' + s.title + '</div>'
    + '<div class="section-sub">' + s.sub + '</div></div>';

  s.fields.forEach(function(f) {
    var val = answers[f.id] || '';
    html += '<div class="field"><label>' + f.label + '</label>';
    if (f.type === 'text' || f.type === 'email' || f.type === 'url') {
      html += '<input type="' + f.type + '" id="fld_' + f.id + '" value="' + escHtml(val) + '" placeholder="' + escHtml(f.placeholder || '') + '">';
    } else if (f.type === 'textarea') {
      html += '<textarea id="fld_' + f.id + '" placeholder="' + escHtml(f.placeholder || '') + '">' + escHtml(val) + '</textarea>';
    } else if (f.type === 'select') {
      html += '<select id="fld_' + f.id + '"><option value="">Select...</option>';
      f.options.forEach(function(o){ html += '<option value="' + o + '"' + (val === o ? ' selected' : '') + '>' + o + '</option>'; });
      html += '</select>';
    } else if (f.type === 'colorpicker') {
      var cv = val || state.agency.color || '#3cc168';
      html += '<div class="color-row">'
        + '<input type="color" id="fld_' + f.id + '_picker" value="' + cv + '" oninput="syncColor(\\'' + f.id + '\\')">'
        + '<input type="text" id="fld_' + f.id + '" value="' + cv + '" placeholder="#3cc168" oninput="syncColorFromText(\\'' + f.id + '\\')">'
        + '</div>';
    } else if (f.type === 'multicheck') {
      var selected = val ? val.split(',') : [];
      html += '<div class="options-grid cols3">';
      f.options.forEach(function(o) {
        var isSel = selected.indexOf(o) >= 0;
        html += '<div class="opt-card' + (isSel ? ' selected' : '') + '" onclick="toggleMultiCheck(this,\\'fld_' + f.id + '\\',\\'' + o + '\\')">'
          + '<div class="opt-title">' + o + '</div></div>';
      });
      html += '</div><input type="hidden" id="fld_' + f.id + '" value="' + escHtml(val) + '">';
    }
    html += '</div>';
  });

  html += '<div class="nav-row"><div>';
  if (state.currentSection > 0) html += '<button class="btn btn-ghost" onclick="prevSection()">← Back</button>';
  html += '</div><div style="display:flex;align-items:center;gap:16px">'
    + '<span class="progress-text">Section ' + (state.currentSection + 1) + ' of ' + sections.length + '</span>';
  if (state.currentSection < sections.length - 1) {
    html += '<button class="btn btn-primary" onclick="nextSection()">Continue →</button>';
  } else {
    html += '<button class="btn btn-generate" onclick="generateReport()">Generate Report ✦</button>';
  }
  html += '</div></div>';
  document.getElementById('questionnaireMain').innerHTML = html;
  document.getElementById('progressDisplay').innerHTML = '<span style="font-size:13px;color:var(--muted)">' + (state.currentSection + 1) + ' / ' + sections.length + '</span>';
}

function syncColor(id) {
  var picker = document.getElementById('fld_' + id + '_picker');
  var text = document.getElementById('fld_' + id);
  if (picker && text) { text.value = picker.value; updateAccent(picker.value); }
}
function syncColorFromText(id) {
  var text = document.getElementById('fld_' + id);
  var picker = document.getElementById('fld_' + id + '_picker');
  if (text && picker && /^#[0-9a-f]{6}$/i.test(text.value)) { picker.value = text.value; updateAccent(text.value); }
}
function toggleMultiCheck(el, hiddenId, val) {
  el.classList.toggle('selected');
  var hidden = document.getElementById(hiddenId);
  var vals = hidden.value ? hidden.value.split(',') : [];
  var idx = vals.indexOf(val);
  if (idx >= 0) vals.splice(idx, 1); else vals.push(val);
  hidden.value = vals.filter(Boolean).join(',');
}

function saveCurrentSection() {
  var sections = getSections();
  if (state.currentSection >= sections.length) return;
  var s = sections[state.currentSection];
  var answers = {};
  s.fields.forEach(function(f) {
    var el = document.getElementById('fld_' + f.id);
    if (el) answers[f.id] = el.value;
  });
  state.answers[s.id] = answers;
  if (s.id === 'branding') {
    state.agency.name = answers.agency_name || state.agency.name;
    state.agency.contact = answers.agency_contact || state.agency.contact;
    state.agency.email = answers.agency_email || state.agency.email;
    state.agency.color = answers.agency_color || state.agency.color;
    state.agency.tagline = answers.agency_tagline || state.agency.tagline;
    document.getElementById('topName').textContent = state.agency.name || 'Brand Diagnostic';
    updateTopBarLogo();
  }
}
function nextSection() { saveCurrentSection(); state.currentSection++; renderTabs(); renderSection(); window.scrollTo(0,0); }
function prevSection() { saveCurrentSection(); state.currentSection--; renderTabs(); renderSection(); window.scrollTo(0,0); }

// ─── GENERATE REPORT ─────────────────────────────────────────────────────────
function generateReport() {
  saveCurrentSection();
  var domain = '';
  if (state.answers.client && state.answers.client.biz_url) {
    domain = state.answers.client.biz_url.replace(/https?:\\/\\//,'').replace(/\\/.*$/,'').replace(/^www\\./,'').trim();
  }
  var clientName = (state.answers.client && state.answers.client.biz_name) || 'Client';

  document.getElementById('tabsWrap').style.display = 'none';
  document.getElementById('questionnaireWrap').style.display = 'none';
  document.getElementById('modeScreen').style.display = 'none';
  document.getElementById('typeScreen').style.display = 'none';
  document.getElementById('exportBar').style.display = 'none';
  document.getElementById('slideNavWrap').style.display = 'none';
  document.getElementById('progressDisplay').innerHTML = '';

  var rw = document.getElementById('reportWrap');
  rw.classList.add('active');
  rw.innerHTML = '<div class="loading-state"><div class="spinner"></div><h3>Generating your report</h3>'
    + '<p>Pulling live data for <strong>' + escHtml(domain || clientName) + '</strong>&hellip;</p>'
    + '<ul class="loading-steps">'
    + '<li id="ls0" class="current"><div class="step-dot"></div>Domain rating &amp; metrics</li>'
    + '<li id="ls1"><div class="step-dot"></div>Keyword rankings</li>'
    + '<li id="ls2"><div class="step-dot"></div>Competitor analysis</li>'
    + '<li id="ls3"><div class="step-dot"></div>Backlinks &amp; top pages</li>'
    + '<li id="ls4"><div class="step-dot"></div>Web research &amp; reviews</li>'
    + '<li id="ls5"><div class="step-dot"></div>AI analysis &amp; report</li>'
    + '</ul></div>';

  function setProgress(pct) {
    var ids = ['ls0','ls1','ls2','ls3','ls4','ls5'];
    var active = Math.min(Math.floor(pct / 17), 5);
    ids.forEach(function(id, i) {
      var el = document.getElementById(id); if (!el) return;
      var dot = el.querySelector('.step-dot');
      if (i < active) { el.className = 'done'; if (dot) dot.style.background = 'var(--green)'; }
      else if (i === active) { el.className = 'current'; if (dot) dot.style.background = '#ffd580'; }
      else { el.className = ''; if (dot) dot.style.background = ''; }
    });
  }

  var payload = {
    domain: domain, clientName: clientName,
    mode: state.mode, bizType: state.bizType,
    agency: state.agency, answers: state.answers,
    logoSessionId: state.agency.logoSessionId || ''
  };

  fetch('/generate', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  }).then(function(resp) {
    if (!resp.ok) throw new Error('Server responded ' + resp.status);
    var reader = resp.body.getReader();
    var dec = new TextDecoder();
    var buf = '';
    function pump() {
      reader.read().then(function(r) {
        if (r.done) return;
        buf += dec.decode(r.value, {stream: true});
        var parts = buf.split('\\n\\n'); buf = parts.pop();
        parts.forEach(function(part) {
          if (!part.startsWith('data: ')) return;
          try {
            var evt = JSON.parse(part.slice(6));
            if (evt.step === 'progress') setProgress(evt.pct || 0);
            else if (evt.step === 'result') renderReport(evt.report, evt.ahrefs, evt.clientName, evt.domain, evt.agency);
            else if (evt.step === 'error') {
              rw.innerHTML = '<div class="loading-state"><h3 style="color:#ff8080">Error</h3>'
                + '<p>' + escHtml(evt.msg || 'Unknown error') + '</p>'
                + '<div style="margin-top:16px"><button class="btn btn-ghost" onclick="backToQuestionnaire()">← Back</button></div></div>';
            }
          } catch(e) {}
        });
        pump();
      });
    }
    pump();
  }).catch(function(err) {
    rw.innerHTML = '<div class="loading-state"><h3 style="color:#ff8080">Could not connect</h3>'
      + '<p style="color:var(--muted)">Check the server is running.<br><small>' + escHtml(err.message) + '</small></p>'
      + '<div style="margin-top:16px"><button class="btn btn-ghost" onclick="backToQuestionnaire()">← Back</button></div></div>';
  });
}

// ─── RENDER REPORT ────────────────────────────────────────────────────────────
var currentSlide = 0;

function renderReport(report, ahrefs, clientName, domain, agencyOverride) {
  var ag = agencyOverride || state.agency;
  var agencyName = ag.name || 'Your Agency';
  var accent = ag.color || '#3cc168';
  var logoDataUrl = ag.logoDataUrl || state.agency.logoDataUrl || '';
  var logoSessionId = ag.logoSessionId || state.agency.logoSessionId || '';
  currentSlide = 0;

  var slides = buildSlides(report, ahrefs, clientName, domain, agencyName, accent, logoDataUrl, logoSessionId);

  // Slide nav
  var navHtml = '';
  slides.forEach(function(s, i) {
    navHtml += '<span style="display:inline-block;padding:6px 14px;border-radius:6px;font-size:11px;font-weight:600;letter-spacing:.04em;cursor:pointer;border:1px solid ' + (i === 0 ? accent : 'var(--border)') + ';color:' + (i === 0 ? accent : 'var(--muted)') + ';margin-right:6px;transition:all .15s" id="sn_' + i + '" onclick="goSlide(' + i + ')">' + escHtml(s.label) + '</span>';
  });
  document.getElementById('slideNavWrap').innerHTML = navHtml;
  document.getElementById('slideNavWrap').style.display = 'block';

  var slidesHtml = '<div style="max-width:960px;margin:0 auto;padding:24px 20px 60px">';
  slides.forEach(function(s, i) {
    slidesHtml += '<div class="slide' + (i === 0 ? ' active' : '') + '" id="slide_' + i + '">' + s.content + '</div>';
  });
  slidesHtml += '</div>';
  document.getElementById('reportWrap').innerHTML = slidesHtml;
  document.getElementById('exportBar').style.display = 'flex';
  document.getElementById('progressDisplay').innerHTML = '<span style="font-size:13px;color:var(--muted)">' + slides.length + ' slides</span>';

  window._reportData = { report, ahrefs, clientName, domain, agencyName, accent, logoDataUrl };
  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowRight') goSlide(currentSlide + 1);
    if (e.key === 'ArrowLeft') goSlide(currentSlide - 1);
  });
}

function goSlide(i) {
  var slides = document.querySelectorAll('.slide');
  if (i < 0 || i >= slides.length) return;
  document.querySelectorAll('.slide').forEach(function(s){ s.classList.remove('active'); });
  slides[i].classList.add('active');
  var accent = (state.agency.color || '#3cc168');
  document.querySelectorAll('[id^="sn_"]').forEach(function(el) {
    el.style.borderColor = 'var(--border)'; el.style.color = 'var(--muted)';
  });
  var active = document.getElementById('sn_' + i);
  if (active) { active.style.borderColor = accent; active.style.color = accent; active.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'}); }
  currentSlide = i;
  window.scrollTo(0, 60);
}

// ─── LOGO HTML HELPER ─────────────────────────────────────────────────────────
function logoHtml(logoDataUrl, logoSessionId, size, radius, initials, bg) {
  var s = size || 40; var r = radius || 8;
  var style = 'width:' + s + 'px;height:' + s + 'px;border-radius:' + r + 'px;overflow:hidden;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
  if (logoDataUrl) {
    return '<div style="' + style + '"><img src="' + logoDataUrl + '" style="width:100%;height:100%;object-fit:cover"></div>';
  } else if (logoSessionId) {
    return '<div style="' + style + '"><img src="/logo/' + logoSessionId + '" style="width:100%;height:100%;object-fit:cover" onerror="this.parentNode.innerHTML=\\'' + escHtml(initials||'A') + '\\'"></div>';
  }
  return '<div style="' + style + 'background:' + (bg||'#3cc168') + ';font-weight:700;font-size:' + Math.round(s*0.35) + 'px;color:#071a0e">' + escHtml(initials||'A') + '</div>';
}

// ─── SLIDE BUILDER ────────────────────────────────────────────────────────────
function buildSlides(report, ahrefs, clientName, domain, agencyName, accent, logoDataUrl, logoSessionId) {
  var A = accent || '#3cc168';
  var today = new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
  var slides = [];
  var initials = agencyName.split(' ').slice(0,2).map(function(w){return w[0];}).join('').toUpperCase() || 'A';

  function card(content) { return '<div style="background:var(--card);border-radius:12px;padding:28px;margin-bottom:14px">' + content + '</div>'; }
  function sh(title, sub) {
    return '<div style="border-left:3px solid ' + A + ';padding-left:16px;margin-bottom:22px">'
      + '<div style="font-size:20px;font-weight:700">' + escHtml(title) + '</div>'
      + (sub ? '<div style="font-size:13px;color:var(--muted);margin-top:3px">' + escHtml(sub) + '</div>' : '')
      + '</div>';
  }
  function grid(cols, content) { return '<div style="display:grid;grid-template-columns:' + cols + ';gap:14px;margin-bottom:14px">' + content + '</div>'; }
  function metBox(val, label, sub, color) {
    return '<div style="background:#071a0e;border-radius:10px;padding:18px;text-align:center">'
      + '<div style="font-size:26px;font-weight:800;color:' + (color || A) + '">' + escHtml(String(val === null || val === undefined ? '—' : val)) + '</div>'
      + '<div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-top:5px">' + escHtml(label) + '</div>'
      + (sub ? '<div style="font-size:11px;color:var(--muted);margin-top:3px">' + escHtml(sub) + '</div>' : '')
      + '</div>';
  }
  function pill(text, type) {
    var styles = { good:'background:#0d3320;color:var(--green-light)', warn:'background:#2a2000;color:#ffd580', bad:'background:#2a0a0a;color:#ff8080' };
    return '<span style="' + (styles[type] || styles.warn) + ';font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:3px 9px;border-radius:10px;flex-shrink:0">' + escHtml(text) + '</span>';
  }
  function tag(text, color) {
    return '<span style="background:' + color + '22;color:' + color + ';font-size:11px;font-weight:600;padding:3px 10px;border-radius:8px;border:1px solid ' + color + '44;white-space:nowrap">' + escHtml(text) + '</span>';
  }
  function scoreBar(label, score, note) {
    var s = Math.min(100, Math.max(0, parseInt(score) || 0));
    var color = s >= 70 ? A : s >= 40 ? '#ffd580' : '#ff6b6b';
    return '<div style="margin-bottom:14px">'
      + '<div style="display:flex;justify-content:space-between;margin-bottom:5px">'
      + '<span style="font-size:13px;font-weight:500">' + escHtml(label) + '</span>'
      + '<span style="font-size:14px;font-weight:700;color:' + color + '">' + s + '/100</span>'
      + '</div><div style="height:6px;background:#071a0e;border-radius:3px">'
      + '<div style="height:6px;width:' + s + '%;background:' + color + ';border-radius:3px"></div></div>'
      + (note ? '<div style="font-size:11px;color:var(--muted);margin-top:4px">' + escHtml(note) + '</div>' : '')
      + '</div>';
  }

  var agLogoHtml = logoHtml(logoDataUrl, logoSessionId, 44, 8, initials, A);
  var agLogoSmall = logoHtml(logoDataUrl, logoSessionId, 28, 6, initials, A);

  // Report footer for light slides
  function slideFooter() {
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 28px;background:#f5f5f3;border-top:1px solid #e8e8e0;margin-top:4px">'
      + '<div style="display:flex;align-items:center;gap:8px">'
      + logoHtml(logoDataUrl, logoSessionId, 22, 4, initials, A)
      + '<span style="font-size:12px;font-weight:600;color:#444">' + escHtml(agencyName) + '</span>'
      + '</div>'
      + '<span style="font-size:11px;color:#aaa">' + escHtml(clientName) + ' — Brand Diagnostic — ' + today + '</span>'
      + '</div>';
  }

  var dr = ahrefs.domain_rating || 0;
  var orgT = ahrefs.org_traffic || 0;
  var orgK = ahrefs.org_keywords || 0;
  var orgK13 = ahrefs.org_keywords_1_3 || 0;
  var paidT = ahrefs.paid_traffic || 0;
  var paidK = ahrefs.paid_keywords || 0;
  var blLive = ahrefs.backlinks_live || 0;
  var blRD = ahrefs.ref_domains || 0;
  var keywords = ahrefs.keywords || [];
  var competitors = ahrefs.competitors || [];
  var topPages = ahrefs.top_pages || [];

  // ── SLIDE 1: COVER ──
  slides.push({ label: 'Cover', content:
    '<div style="background:linear-gradient(135deg,#071a0e 0%,#0a2e15 50%,#071a0e 100%);min-height:520px;border-radius:14px;position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;padding:48px">'
    + '<div style="position:absolute;width:420px;height:420px;border-radius:50%;border:1px solid ' + A + '20;top:-100px;right:-100px"></div>'
    + '<div style="position:absolute;width:220px;height:220px;border-radius:50%;border:1px solid ' + A + '30;top:60px;right:80px"></div>'
    + '<div style="position:absolute;width:100px;height:100px;border-radius:50%;background:' + A + '08;bottom:80px;right:200px"></div>'
    + '<div style="display:flex;align-items:center;gap:12px;position:relative;z-index:2">'
    + agLogoHtml
    + '<div>'
    + '<div style="font-size:14px;font-weight:700;color:' + A + ';letter-spacing:.04em">' + escHtml(agencyName) + '</div>'
    + (state.agency.tagline ? '<div style="font-size:11px;color:rgba(255,255,255,.4)">' + escHtml(state.agency.tagline) + '</div>' : '')
    + '</div></div>'
    + '<div style="position:relative;z-index:2">'
    + '<div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:' + A + ';margin-bottom:14px">' + escHtml(state.mode === 'quick' ? 'Quick Diagnostic — $500' : 'Deep Workshop Diagnostic — $1,000–$1,500') + '</div>'
    + '<div style="font-family:\'DM Serif Display\',serif;font-size:52px;font-weight:900;line-height:1;color:#fff;margin-bottom:8px">Brand<br>Diagnostic</div>'
    + '<div style="width:48px;height:4px;background:' + A + ';border-radius:99px;margin-bottom:20px"></div>'
    + '<div style="font-size:13px;color:rgba(255,255,255,.4);margin-bottom:4px">Prepared for</div>'
    + '<div style="font-size:32px;font-weight:800;color:#fff">' + escHtml(clientName) + '</div>'
    + (domain ? '<div style="font-size:14px;color:' + A + ';margin-top:6px">' + escHtml(domain) + '</div>' : '')
    + '<div style="font-size:12px;color:rgba(255,255,255,.3);margin-top:14px">' + today + '</div>'
    + '</div></div>'
  });

  // ── SLIDE 2: EXECUTIVE SUMMARY ──
  slides.push({ label: 'Summary', content:
    card(sh('Executive Summary', 'Strategic overview')
    + grid('1fr 1fr 1fr',
      ['Where They Are', 'Where They Want to Go', 'Our Recommended Approach'].map(function(t, i) {
        var txt = [report.exec_past, report.exec_future, report.exec_agency][i] || '';
        return '<div style="background:#071a0e;border-radius:10px;padding:20px">'
          + '<div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:' + A + ';margin-bottom:10px">' + t + '</div>'
          + '<p style="font-size:13px;color:#ccc;line-height:1.7">' + escHtml(txt) + '</p></div>';
      }).join('')
    ))
    + slideFooter()
  });

  // ── SLIDE 3: HEALTH SCORECARD ──
  var hs = report.health_scores || { seo:0, paid:0, content:0, brand:0, conversion:0, retention:0 };
  var hn = report.health_notes || {};
  var hsKeys = ['seo','paid','content','brand','conversion','retention'];
  var overall = Math.round(hsKeys.reduce(function(a,k){ return a + (hs[k] || 0); }, 0) / hsKeys.length);
  var overallColor = overall >= 60 ? A : overall >= 35 ? '#ffd580' : '#ff6b6b';
  slides.push({ label: 'Health', content:
    card(sh('Performance Health Scorecard', 'Scored from questionnaire + live Ahrefs signals')
    + '<div style="display:grid;grid-template-columns:160px 1fr;gap:24px">'
    + '<div style="background:#071a0e;border-radius:12px;padding:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">'
    + '<div style="font-size:58px;font-weight:900;color:' + overallColor + '">' + overall + '</div>'
    + '<div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-top:4px">Overall</div>'
    + '<div style="font-size:11px;color:var(--muted)">out of 100</div>'
    + '</div><div>'
    + ['SEO', 'Paid Ads', 'Content', 'Brand', 'Conversion', 'Retention'].map(function(l, i) {
        return scoreBar(l, hs[hsKeys[i]] || 0, hn[hsKeys[i]] || '');
      }).join('')
    + '</div></div>')
    + slideFooter()
  });

  // ── SLIDE 4: DIGITAL POSITION ──
  var signals = (report.digital_analysis || {}).signals || [];
  slides.push({ label: 'Digital', content:
    card(sh('Digital Position', 'Live Ahrefs data · ' + escHtml(domain))
    + grid('repeat(4,1fr)',
      metBox(dr || '—', 'Domain Rating', '0–100 authority', dr < 20 ? '#ff6b6b' : A)
      + metBox(orgT ? orgT.toLocaleString() : '0', 'Organic Traffic', 'Monthly visits', '')
      + metBox(orgK ? orgK.toLocaleString() : '0', 'Keywords', 'Top 100 rankings', '')
      + metBox(orgK13 || 0, 'Top 3 Rankings', 'High-intent', orgK13 > 0 ? A : '#ff6b6b')
    )
    + grid('repeat(4,1fr)',
      metBox(paidT ? paidT.toLocaleString() : '0', 'Paid Traffic', paidT > 0 ? 'Active paid ads' : 'No paid ads', paidT > 0 ? A : '#ff6b6b')
      + metBox(paidK ? paidK.toLocaleString() : '0', 'Paid Keywords', paidK > 0 ? 'Active' : 'None', paidK > 0 ? A : 'var(--muted)')
      + metBox(blLive ? blLive.toLocaleString() : '0', 'Backlinks', 'Live links', '#ffd580')
      + metBox(blRD ? blRD.toLocaleString() : '0', 'Ref. Domains', 'Unique linking', '#ffd580')
    )
    + (signals.length ? '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:' + A + ';margin-bottom:10px">Detected Signals</div>'
      + signals.map(function(s) {
        return '<div style="background:#071a0e;border-radius:8px;padding:12px 14px;display:flex;gap:12px;align-items:center;margin-bottom:8px">'
          + '<div style="flex:1"><div style="font-size:13px;font-weight:600">' + escHtml(s.label || '') + '</div>'
          + (s.value ? '<div style="font-size:13px;color:' + A + ';font-weight:700">' + escHtml(s.value) + '</div>' : '')
          + '<div style="font-size:12px;color:var(--muted)">' + escHtml(s.insight || '') + '</div></div>'
          + pill(s.status || 'warn', s.status || 'warn') + '</div>';
      }).join('') : ''))
    + slideFooter()
  });

  // ── SLIDE 5: SEO KEYWORDS ──
  var kwTable = keywords.length
    ? '<table style="width:100%;border-collapse:collapse;font-size:12px">'
      + '<tr style="border-bottom:1px solid var(--border)"><th style="text-align:left;padding:8px 0;color:var(--muted);font-weight:500">Keyword</th><th style="text-align:center;padding:8px;color:var(--muted);font-weight:500">Pos</th><th style="text-align:center;padding:8px;color:var(--muted);font-weight:500">Volume</th><th style="text-align:left;padding:8px;color:var(--muted);font-weight:500">Intent</th></tr>'
      + keywords.slice(0, 10).map(function(k) {
          var pos = k.best_position || k.position || '—';
          var posColor = pos <= 3 ? A : pos <= 10 ? '#ffd580' : 'var(--muted)';
          var vol = k.volume ? (k.volume >= 1000 ? (k.volume / 1000).toFixed(1) + 'k' : k.volume) : '—';
          var intent = k.is_transactional ? 'transactional' : k.is_commercial ? 'commercial' : 'informational';
          var intentColor = k.is_transactional ? A : k.is_commercial ? '#ffd580' : '#80c8ff';
          return '<tr style="border-bottom:1px solid #0e2618"><td style="padding:10px 0;font-weight:500;color:#fff">' + escHtml(k.keyword || '') + '</td>'
            + '<td style="text-align:center;color:' + posColor + ';font-weight:700">' + pos + '</td>'
            + '<td style="text-align:center;color:var(--muted)">' + vol + '</td>'
            + '<td style="padding:8px">' + tag(intent, intentColor) + '</td></tr>';
        }).join('') + '</table>'
    : '<div style="color:var(--muted);font-size:13px">No keyword data available for this domain.</div>';

  slides.push({ label: 'SEO Intel', content:
    card(sh('Keyword & SEO Intelligence', 'Organic ranking data from Ahrefs')
    + ((report.digital_analysis || {}).keyword_opportunity
      ? '<div style="background:#0d3320;border:1px solid ' + A + '44;border-radius:8px;padding:14px;margin-bottom:16px;display:flex;gap:10px"><div style="font-size:18px">🎯</div><div><div style="font-size:12px;font-weight:700;color:' + A + ';margin-bottom:3px">KEY OPPORTUNITY</div><div style="font-size:13px;color:#ccc">' + escHtml(report.digital_analysis.keyword_opportunity) + '</div></div></div>'
      : '')
    + kwTable)
    + slideFooter()
  });

  // ── SLIDE 6: COMPETITORS ──
  var ca = report.competitor_analysis || {};
  var compTable = competitors.length
    ? '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px">'
      + '<tr style="border-bottom:1px solid var(--border)"><th style="text-align:left;padding:8px 0;color:var(--muted);font-weight:500">Domain</th><th style="text-align:center;padding:8px;color:var(--muted);font-weight:500">DR</th><th style="text-align:center;padding:8px;color:var(--muted);font-weight:500">Traffic</th><th style="text-align:center;padding:8px;color:var(--muted);font-weight:500">Common KW</th><th style="text-align:center;padding:8px;color:var(--muted);font-weight:500">vs You</th></tr>'
      + competitors.map(function(c) {
          var theirDR = parseFloat(c.domain_rating || c.dr || 0);
          var diff = Math.round(theirDR - dr);
          var diffColor = diff > 10 ? '#ff8080' : diff < -5 ? A : '#ffd580';
          return '<tr style="border-bottom:1px solid #0e2618"><td style="padding:10px 0;font-weight:500">' + escHtml(c.competitor_domain || c.domain || '') + '</td>'
            + '<td style="text-align:center;color:#ffd580;font-weight:700">' + Math.round(theirDR) + '</td>'
            + '<td style="text-align:center;color:var(--muted)">' + (c.traffic ? Number(c.traffic).toLocaleString() : '—') + '</td>'
            + '<td style="text-align:center;color:var(--muted)">' + (c.keywords_common ? Number(c.keywords_common).toLocaleString() : '—') + '</td>'
            + '<td style="text-align:center;color:' + diffColor + ';font-weight:600">' + (diff > 0 ? '+' : '') + diff + '</td></tr>';
        }).join('') + '</table>'
    : '<div style="color:var(--muted);font-size:13px;margin-bottom:16px">No competitor data returned for this domain.</div>';

  slides.push({ label: 'Competitors', content:
    card(sh('Competitor Analysis', 'Market position intelligence')
    + (ca.summary ? '<div style="background:#071a0e;border-radius:8px;padding:16px;margin-bottom:14px"><p style="font-size:13px;color:#ccc;line-height:1.7">' + escHtml(ca.summary) + '</p></div>' : '')
    + compTable
    + grid('1fr 1fr 1fr',
      '<div style="background:#071a0e;border-radius:10px;padding:16px"><div style="font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:' + A + ';margin-bottom:8px">Your Advantages</div>'
      + (ca.strengths_vs_competitors || []).map(function(s) { return '<div style="font-size:12px;color:#ccc;padding:3px 0"><span style="color:' + A + '">+ </span>' + escHtml(s) + '</div>'; }).join('') + '</div>'
      + '<div style="background:#071a0e;border-radius:10px;padding:16px"><div style="font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#ff8080;margin-bottom:8px">Areas to Close</div>'
      + (ca.weaknesses_vs_competitors || []).map(function(s) { return '<div style="font-size:12px;color:#ccc;padding:3px 0"><span style="color:#ff8080">- </span>' + escHtml(s) + '</div>'; }).join('') + '</div>'
      + '<div style="background:#071a0e;border-radius:10px;padding:16px"><div style="font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#ffd580;margin-bottom:8px">Market Gaps</div>'
      + (ca.market_gaps || []).map(function(s) { return '<div style="font-size:12px;color:#ccc;padding:3px 0"><span style="color:#ffd580">&gt; </span>' + escHtml(s) + '</div>'; }).join('') + '</div>'
    ))
    + slideFooter()
  });

  // ── SLIDE 7: REPUTATION ──
  var ri = report.review_insights || {};
  var research = report.web_research || {};
  var sentColor = ri.overall_sentiment === 'positive' ? A : ri.overall_sentiment === 'negative' ? '#ff6b6b' : '#ffd580';
  slides.push({ label: 'Reputation', content:
    card(sh('Brand Reputation & Reviews', 'Customer sentiment and brand signals')
    + grid('1fr 2fr',
      '<div style="background:#071a0e;border-radius:12px;padding:20px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center">'
      + '<div style="font-size:36px;font-weight:900;color:' + sentColor + ';text-transform:capitalize">' + escHtml(ri.overall_sentiment || 'Unknown') + '</div>'
      + '<div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-top:6px">Sentiment</div>'
      + (ri.avg_rating ? '<div style="font-size:22px;font-weight:700;color:#ffd580;margin-top:10px">' + escHtml(ri.avg_rating) + '</div>' : '')
      + '</div>'
      + '<div><div style="background:#071a0e;border-radius:10px;padding:16px;margin-bottom:12px">'
      + '<p style="font-size:13px;color:#ccc;line-height:1.6">' + escHtml(research.review_summary || ri.recommendation || 'No review data available.') + '</p>'
      + '</div>'
      + (ri.key_themes && ri.key_themes.length ? '<div style="display:flex;flex-wrap:wrap;gap:8px">' + ri.key_themes.map(function(t){ return tag(t, A); }).join('') + '</div>' : '')
      + '</div>'
    )
    + grid('1fr 1fr',
      '<div style="background:#071a0e;border-radius:10px;padding:16px"><div style="font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:' + A + ';margin-bottom:8px">What Customers Praise</div>'
      + (ri.trust_signals || research.common_praise || []).map(function(s) { return '<div style="font-size:12px;color:#ccc;padding:2px 0">• ' + escHtml(s) + '</div>'; }).join('') + '</div>'
      + '<div style="background:#071a0e;border-radius:10px;padding:16px"><div style="font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#ff8080;margin-bottom:8px">Common Complaints</div>'
      + (ri.reputation_risks || research.common_complaints || []).map(function(s) { return '<div style="font-size:12px;color:#ccc;padding:2px 0">• ' + escHtml(s) + '</div>'; }).join('') + '</div>'
    ))
    + slideFooter()
  });

  // ── SLIDE 8: PERSONAS ──
  var personas = report.personas || [];
  var persHtml = personas.map(function(p) {
    return '<div style="background:#071a0e;border-radius:12px;padding:22px;margin-bottom:14px">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:16px">'
      + '<div><div style="font-size:18px;font-weight:700">' + escHtml(p.name || '') + '</div>'
      + '<div style="font-size:13px;color:var(--muted);margin-top:2px">' + escHtml(p.tagline || p.who || '') + '</div></div>'
      + (p.messaging_hook ? '<div style="background:' + A + '15;border-left:3px solid ' + A + ';padding:12px 14px;border-radius:0 8px 8px 0;max-width:280px">'
        + '<div style="font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:' + A + ';margin-bottom:3px">Messaging Hook</div>'
        + '<div style="font-size:13px;color:#fff;font-style:italic">' + escHtml(p.messaging_hook) + '</div></div>' : '')
      + '</div>'
      + grid('1fr 1fr 1fr',
        '<div><div style="font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:' + A + ';margin-bottom:6px">Dream Outcome</div><p style="font-size:12px;color:#ccc;line-height:1.5">' + escHtml(p.dream_outcome || '') + '</p></div>'
        + '<div><div style="font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#ff8080;margin-bottom:6px">Pain Points</div>'
        + (p.pains || []).map(function(x){ return '<div style="font-size:12px;color:#ccc;padding:2px 0">• ' + escHtml(x) + '</div>'; }).join('') + '</div>'
        + '<div><div style="font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Objections</div>'
        + (p.objections || []).map(function(x){ return '<div style="font-size:12px;color:#ccc;padding:2px 0">• ' + escHtml(x) + '</div>'; }).join('') + '</div>'
      ) + '</div>';
  }).join('');
  slides.push({ label: 'Personas', content: card(sh('Customer Avatar', 'Who you are speaking to and what drives them') + persHtml) + slideFooter() });

  // ── SLIDE 9: GAP ANALYSIS ──
  var gaps = report.gap_analysis || [];
  var catColors = { SEO: A, Paid:'#80c8ff', Content:'#ffd580', Brand:'#ff8080', CRO:'#c084fc', Retention:'#fb923c', Strategy:'#34d399' };
  var highGaps = gaps.filter(function(g){ return g.priority === 'high'; });
  var otherGaps = gaps.filter(function(g){ return g.priority !== 'high'; });
  function gapCard(g, i) {
    var col = catColors[g.category] || A;
    return '<div style="background:#071a0e;border-radius:10px;padding:16px;border-left:3px solid ' + col + '">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;gap:8px">'
      + '<div style="display:flex;gap:8px;align-items:center">'
      + '<div style="width:22px;height:22px;border-radius:50%;background:' + col + ';color:#071a0e;font-weight:800;font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0">' + (i + 1) + '</div>'
      + '<div style="font-size:14px;font-weight:700">' + escHtml(g.title || '') + '</div>'
      + '</div>'
      + '<div style="display:flex;gap:6px;flex-shrink:0">' + (g.category ? tag(g.category, col) : '') + (g.quick_win ? tag('quick win', A) : '') + '</div>'
      + '</div>'
      + '<p style="font-size:13px;color:var(--muted);line-height:1.6">' + escHtml(g.desc || '') + '</p></div>';
  }
  slides.push({ label: 'Gaps', content:
    card(sh('Gap Analysis', 'Critical gaps ranked by revenue impact')
    + (highGaps.length ? '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#ff8080;margin-bottom:10px">Critical / High Priority</div>'
      + '<div style="display:grid;gap:10px;margin-bottom:16px">' + highGaps.map(gapCard).join('') + '</div>' : '')
    + (otherGaps.length ? '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#ffd580;margin-bottom:10px">Medium Priority</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' + otherGaps.map(gapCard).join('') + '</div>' : ''))
    + slideFooter()
  });

  // ── SLIDE 10: FORECAST ──
  var fc = report.forecast || {};
  slides.push({ label: 'Forecast', content:
    card(sh('Revenue Forecast', '12-month projections and channel model')
    + grid('1fr 1fr 1fr',
      metBox(fc.current_revenue || '—', 'Current Position', 'Baseline', '#888')
      + metBox(fc.conservative_12m || '—', 'Conservative 12m', 'Foundational fixes', A)
      + metBox(fc.optimistic_12m || '—', 'Optimistic 12m', 'Full execution', '#ffd580')
    )
    + (fc.revenue_per_channel && fc.revenue_per_channel.length
      ? '<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:4px">'
        + '<tr style="border-bottom:1px solid var(--border)"><th style="text-align:left;padding:8px 0;color:var(--muted);font-weight:500">Channel</th><th style="text-align:right;padding:8px;color:var(--muted);font-weight:500">Current</th><th style="text-align:right;padding:8px;color:var(--muted);font-weight:500">12m Potential</th></tr>'
        + fc.revenue_per_channel.map(function(r) {
            return '<tr style="border-bottom:1px solid #0e2618"><td style="padding:10px 0;font-weight:500">' + escHtml(r.channel || '') + '</td>'
              + '<td style="text-align:right;color:var(--muted)">' + escHtml(r.current || '—') + '</td>'
              + '<td style="text-align:right;color:' + A + ';font-weight:600">' + escHtml(r.potential || '—') + '</td></tr>';
          }).join('') + '</table>' : '')
    + (fc.key_assumptions && fc.key_assumptions.length
      ? '<div style="background:#071a0e;border-radius:8px;padding:14px;margin-top:14px">'
        + '<div style="font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Key Assumptions</div>'
        + fc.key_assumptions.map(function(a) { return '<div style="font-size:12px;color:#ccc;padding:3px 0">· ' + escHtml(a) + '</div>'; }).join('')
        + '</div>' : ''))
    + slideFooter()
  });

  // ── SLIDE 11: ROADMAP ──
  var rm = report.roadmap || [];
  var phaseColors = [A, '#ffd580', '#80c8ff'];
  slides.push({ label: 'Roadmap', content:
    card(sh('6-Month Growth Roadmap', 'Phase-by-phase execution plan')
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">'
    + rm.map(function(phase, pi) {
        var col = phaseColors[pi] || A;
        return '<div style="background:#071a0e;border-radius:10px;padding:18px">'
          + '<div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:' + col + ';margin-bottom:4px">' + escHtml(phase.phase || '') + '</div>'
          + '<div style="font-size:12px;color:var(--muted);margin-bottom:4px">' + escHtml(phase.months || '') + '</div>'
          + '<div style="font-size:15px;font-weight:700;margin-bottom:14px">' + escHtml(phase.label || '') + '</div>'
          + (phase.items || []).map(function(item) {
              var t = typeof item === 'string' ? item : (item.task || '');
              var d = typeof item === 'object' ? item.detail : '';
              return '<div style="margin-bottom:10px"><div style="font-size:12px;color:#fff;font-weight:500;display:flex;gap:6px"><span style="color:' + col + ';font-weight:700;flex-shrink:0">→</span>' + escHtml(t) + '</div>'
                + (d ? '<div style="font-size:11px;color:var(--muted);margin-left:14px;margin-top:2px;line-height:1.4">' + escHtml(d) + '</div>' : '') + '</div>';
            }).join('')
          + '</div>';
      }).join('') + '</div>')
    + slideFooter()
  });

  // ── SLIDE 12: CHECKLIST ──
  var chk = report.onboarding_checklist || [];
  var phaseGroups = {};
  chk.forEach(function(c) { var p = c.phase || 'General'; if (!phaseGroups[p]) phaseGroups[p] = []; phaseGroups[p].push(c); });
  var chkIdx = 0;
  var chkHtml = '';
  ['Foundation','Acquisition','Conversion','Retention','Scale','General'].forEach(function(ph) {
    if (!phaseGroups[ph]) return;
    chkHtml += '<div style="margin-bottom:20px"><div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:' + A + ';margin-bottom:8px">' + ph + '</div>';
    phaseGroups[ph].forEach(function(c) {
      var priColor = c.priority === 'critical' ? '#ff6b6b' : c.priority === 'high' ? '#ff8080' : c.priority === 'medium' ? '#ffd580' : A;
      chkHtml += '<div style="display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border)">'
        + '<div class="chk" id="chk_' + chkIdx + '" onclick="toggleChk(' + chkIdx + ')" style="flex-shrink:0;margin-top:2px"></div>'
        + '<div style="flex:1"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
        + '<div class="chk-text" id="chktxt_' + chkIdx + '">' + escHtml(c.task || '') + '</div>'
        + tag(c.priority || 'medium', priColor)
        + (c.owner ? tag(c.owner, 'var(--muted)') : '')
        + (c.week ? '<span style="font-size:10px;color:var(--muted)">' + escHtml(c.week) + '</span>' : '')
        + '</div>'
        + (c.detail ? '<div style="font-size:12px;color:var(--muted);margin-top:3px;line-height:1.4">' + escHtml(c.detail) + '</div>' : '')
        + '</div></div>';
      chkIdx++;
    });
    chkHtml += '</div>';
  });
  slides.push({ label: 'Checklist', content:
    card(sh('Onboarding Checklist', 'Click to mark complete — ' + chk.length + ' tasks')
    + '<div style="background:#071a0e;border-radius:8px;padding:12px 16px;margin-bottom:16px;display:flex;gap:12px;align-items:center">'
    + '<div style="flex:1;height:6px;background:#0e2618;border-radius:3px"><div id="chkBar" style="height:6px;width:0%;background:' + A + ';border-radius:3px;transition:width .3s"></div></div>'
    + '<div id="chkCount" style="font-size:12px;color:var(--muted);white-space:nowrap">0 / ' + chk.length + ' complete</div></div>'
    + chkHtml)
    + slideFooter()
  });

  // ── SLIDE 13: CLOSING ──
  var cl = report.closing || {};
  slides.push({ label: 'Next Steps', content:
    card(sh('Closing Recommendation', 'The most important insight from this diagnostic')
    + '<div style="background:' + A + '12;border:1px solid ' + A + '33;border-radius:12px;padding:28px;margin-bottom:20px">'
    + (cl.headline ? '<div style="font-size:22px;font-weight:800;color:#fff;margin-bottom:14px;line-height:1.2">' + escHtml(cl.headline) + '</div>' : '')
    + '<p style="font-size:15px;color:#ccc;line-height:1.8">' + escHtml(cl.narrative || report.exec_agency || '') + '</p>'
    + (cl.next_step ? '<div style="margin-top:20px;background:' + A + ';color:#071a0e;border-radius:8px;padding:14px 20px;display:inline-block;font-weight:700;font-size:14px">Next Step: ' + escHtml(cl.next_step) + '</div>' : '')
    + '</div>'
    + '<div style="background:#071a0e;border-radius:12px;padding:28px;display:flex;align-items:center;gap:20px">'
    + agLogoHtml
    + '<div><div style="font-size:22px;font-weight:800">' + escHtml(agencyName) + '</div>'
    + (state.agency.tagline ? '<div style="font-size:13px;color:var(--muted)">' + escHtml(state.agency.tagline) + '</div>' : '')
    + (state.agency.email ? '<div style="font-size:13px;color:' + A + ';margin-top:4px">' + escHtml(state.agency.email) + '</div>' : '')
    + '</div></div>')
    + slideFooter()
  });

  return slides;
}

function toggleChk(i) {
  var total = document.querySelectorAll('[id^="chk_"]').length;
  var el = document.getElementById('chk_' + i);
  var txt = document.getElementById('chktxt_' + i);
  if (el) el.classList.toggle('checked');
  if (txt) txt.classList.toggle('done');
  var done = document.querySelectorAll('.chk.checked').length;
  var bar = document.getElementById('chkBar');
  var count = document.getElementById('chkCount');
  if (bar) bar.style.width = Math.round(done / total * 100) + '%';
  if (count) count.textContent = done + ' / ' + total + ' complete';
}

function backToQuestionnaire() {
  document.getElementById('exportBar').style.display = 'none';
  document.getElementById('slideNavWrap').style.display = 'none';
  document.getElementById('reportWrap').classList.remove('active');
  document.getElementById('reportWrap').innerHTML = '';
  document.getElementById('progressDisplay').innerHTML = '';
  currentSlide = 0;
  document.getElementById('tabsWrap').style.display = 'block';
  document.getElementById('questionnaireWrap').style.display = 'block';
  renderTabs(); renderSection();
}

function exportHTML() {
  var container = document.getElementById('reportWrap');
  if (!container || !container.innerHTML) { alert('Generate a report first'); return; }
  var clientName = (state.answers.client && state.answers.client.biz_name) || 'client';
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Brand Diagnostic — ' + escHtml(clientName) + '</title>'
    + '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">'
    + '<style>body{font-family:Inter,sans-serif;background:#071a0e;color:#fff;margin:0;padding:20px}' + document.querySelector('style').textContent + '</style></head>'
    + '<body>' + container.outerHTML + '</body></html>';
  var blob = new Blob([html], { type: 'text/html' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = clientName.replace(/\\s+/g, '-') + '_brand_diagnostic.html';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

updateTopBarLogo();
</script>
</body>
</html>`;

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(TOOL_HTML);
});

// ─── Main report generation endpoint ─────────────────────────────────────────
app.post('/generate', async (req, res) => {
  const { domain, clientName, mode, bizType, agency, answers } = req.body;
  if (!domain || !clientName) {
    return res.status(400).json({ error: 'domain and clientName are required' });
  }

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const send = (step, data) => res.write(`data: ${JSON.stringify({ step, ...data })}\n\n`);

    send('progress', { msg: 'Fetching domain rating & metrics', pct: 10 });
    const [drData, metricsData] = await Promise.all([
      ahrefsGet('site-explorer/domain-rating', { target: domain, date: ahrefsDate() }),
      ahrefsGet('site-explorer/metrics', { target: domain, date: ahrefsDate(), mode: 'subdomains' })
    ]);

    const ahrefs = {
      domain_rating:    drData?.domain_rating?.domain_rating ?? 0,
      ahrefs_rank:      drData?.domain_rating?.ahrefs_rank ?? null,
      org_traffic:      metricsData?.metrics?.org_traffic ?? 0,
      org_keywords:     metricsData?.metrics?.org_keywords ?? 0,
      org_keywords_1_3: metricsData?.metrics?.org_keywords_1_3 ?? 0,
      org_cost:         metricsData?.metrics?.org_cost ?? null,
      paid_traffic:     metricsData?.metrics?.paid_traffic ?? 0,
      paid_keywords:    metricsData?.metrics?.paid_keywords ?? 0,
      paid_pages:       metricsData?.metrics?.paid_pages ?? 0,
    };

    send('progress', { msg: 'Pulling keyword rankings', pct: 25 });
    const kwData = await ahrefsGet('site-explorer/organic-keywords', {
      target: domain, date: ahrefsDate(), mode: 'subdomains',
      limit: 12, order_by: 'sum_traffic:desc',
      select: 'keyword,best_position,volume,sum_traffic,keyword_difficulty,is_transactional,is_commercial'
    });
    ahrefs.keywords = kwData?.keywords ?? [];

    send('progress', { msg: 'Analysing competitors', pct: 40 });
    const compData = await ahrefsGet('site-explorer/organic-competitors', {
      target: domain, date: ahrefsDate(), mode: 'subdomains',
      country: 'us', limit: 6, order_by: 'traffic:desc',
      select: 'competitor_domain,domain_rating,keywords_common,traffic'
    });
    ahrefs.competitors = compData?.competitors ?? [];

    send('progress', { msg: 'Fetching backlinks & top pages', pct: 55 });
    const [blData, pagesData] = await Promise.all([
      ahrefsGet('site-explorer/backlinks-stats', { target: domain, date: ahrefsDate(), mode: 'subdomains' }),
      ahrefsGet('site-explorer/top-pages', {
        target: domain, date: ahrefsDate(), mode: 'subdomains',
        limit: 6, order_by: 'sum_traffic:desc',
        select: 'url,sum_traffic,keywords,top_keyword'
      })
    ]);
    ahrefs.backlinks_live = blData?.metrics?.live ?? 0;
    ahrefs.ref_domains    = blData?.metrics?.live_refdomains ?? 0;
    ahrefs.top_pages      = pagesData?.pages ?? [];

    send('progress', { msg: 'Researching reviews & brand signals', pct: 68 });
    const research = await webResearch(clientName, domain);

    send('progress', { msg: 'Running deep AI analysis', pct: 82 });
    const report = await runAnalysis(clientName, domain, mode, bizType, ahrefs, research, answers);
    report.web_research = research;

    send('progress', { msg: 'Done', pct: 100 });
    // Pass agency back so logo session ID is available client-side
    send('result', { ahrefs, report, clientName, domain, agency });
    res.end();

  } catch (err) {
    console.error('Generate error:', err);
    try {
      res.write(`data: ${JSON.stringify({ step: 'error', msg: err.message })}\n\n`);
      res.end();
    } catch(e) {}
  }
});

// ─── Ahrefs REST helper ───────────────────────────────────────────────────────
async function ahrefsGet(path, params) {
  const url = new URL(`https://api.ahrefs.com/v3/${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });
  try {
    const r = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AHREFS_API_KEY}` }
    });
    if (!r.ok) {
      const text = await r.text();
      console.warn(`Ahrefs /${path} ${r.status}:`, text.slice(0, 200));
      return {};
    }
    return r.json();
  } catch (e) {
    console.warn(`Ahrefs /${path} fetch error:`, e.message);
    return {};
  }
}

function ahrefsDate() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// ─── Web research ─────────────────────────────────────────────────────────────
async function webResearch(clientName, domain) {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: 'You are a brand research analyst. Search the web for real, specific information. Return ONLY valid JSON — no markdown, no fences.',
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `Research "${clientName}" (website: ${domain}). Find:
1. Customer reviews on Google, Trustpilot, G2 — star rating and what customers say
2. Whether they run Google Ads or Meta Ads (check Meta Ad Library, Google Transparency)
3. Social media presence and activity level
4. Recent news or press mentions

Return JSON: {"review_summary":"","avg_rating":"","common_praise":[],"common_complaints":[],"ad_signals":"","social_presence":"","recent_news":[],"brand_reputation":""}`
      }]
    });
    const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const clean = text.replace(/```[\w]*/g, '').replace(/```/g, '').trim();
    const s = clean.indexOf('{'), e = clean.lastIndexOf('}');
    if (s >= 0 && e > s) return JSON.parse(clean.substring(s, e + 1));
  } catch (err) {
    console.warn('Web research failed:', err.message);
  }
  return { review_summary: 'Research unavailable', avg_rating: '', common_praise: [], common_complaints: [], ad_signals: 'Unable to detect', social_presence: 'Unknown', recent_news: [], brand_reputation: 'Unknown' };
}

// ─── Deep AI analysis ─────────────────────────────────────────────────────────
async function runAnalysis(clientName, domain, mode, bizType, ahrefs, research, answers) {
  const q = answers || {};
  const lines = [
    `Generate a complete brand diagnostic report for ${clientName} (${domain}).`,
    `MODE: ${mode} | TYPE: ${bizType}`, ``,
    q.financials   ? `FINANCIALS: ${JSON.stringify(q.financials)}`    : '',
    q.brand        ? `BRAND: ${JSON.stringify(q.brand)}`              : '',
    q.goals        ? `GOALS: ${JSON.stringify(q.goals)}`              : '',
    q.obstacles    ? `OBSTACLES: ${JSON.stringify(q.obstacles)}`      : '',
    q.customer     ? `CUSTOMER: ${JSON.stringify(q.customer)}`        : '',
    q.painpoints   ? `PAIN POINTS: ${JSON.stringify(q.painpoints)}`   : '',
    q.objections   ? `OBJECTIONS: ${JSON.stringify(q.objections)}`    : '',
    q.products     ? `PRODUCTS: ${JSON.stringify(q.products)}`        : '',
    q.competitors  ? `COMPETITORS: ${JSON.stringify(q.competitors)}`  : '',
    q.acquisition  ? `ACQUISITION: ${JSON.stringify(q.acquisition)}`  : '',
    q.retention    ? `RETENTION: ${JSON.stringify(q.retention)}`      : '',
    q.type_specific ? `TYPE-SPECIFIC: ${JSON.stringify(q.type_specific)}` : '',
    ``,
    `LIVE AHREFS DATA:`,
    `Domain Rating: ${ahrefs.domain_rating}/100`,
    `Organic Traffic: ${(ahrefs.org_traffic || 0).toLocaleString()}/mo`,
    `Ranking Keywords: ${(ahrefs.org_keywords || 0).toLocaleString()} (${ahrefs.org_keywords_1_3} in top 3)`,
    `Traffic Value: ${ahrefs.org_cost ? '$' + Math.round(ahrefs.org_cost / 100).toLocaleString() + '/mo' : 'N/A'}`,
    `Paid Traffic: ${ahrefs.paid_traffic} | Paid Keywords: ${ahrefs.paid_keywords}`,
    `Backlinks: ${ahrefs.backlinks_live} | Referring Domains: ${ahrefs.ref_domains}`,
    `Top Keywords: ${JSON.stringify(ahrefs.keywords?.slice(0, 8))}`,
    `Competitors: ${JSON.stringify(ahrefs.competitors)}`,
    `Top Pages: ${JSON.stringify(ahrefs.top_pages?.slice(0, 5))}`,
    ``,
    `WEB RESEARCH: ${JSON.stringify(research)}`,
    ``,
    `SIGNAL RULES: paid_traffic=0 → flag "No paid advertising" as HIGH gap; domain_rating<30 → "Low domain authority" as HIGH gap; org_keywords_1_3=0 → "Zero top-3 rankings" as HIGH gap`,
    ``,
    `Return ONLY this exact JSON (specific data-driven content, no placeholders):`,
    JSON.stringify({
      exec_past: "specific 2-3 sentences citing actual Ahrefs numbers",
      exec_future: "2-3 sentences on goals from questionnaire",
      exec_agency: "2-3 sentences on recommended strategic approach",
      health_scores: { seo: 0, paid: 0, content: 0, brand: 0, conversion: 0, retention: 0 },
      health_notes: { seo: "", paid: "", content: "", brand: "", conversion: "", retention: "" },
      digital_analysis: { summary: "paragraph with specific numbers", signals: [{ label: "", status: "good|warn|bad", value: "", insight: "" }], keyword_opportunity: "", paid_gap: "" },
      business_canvas: { key_partners: [], key_activities: [], key_resources: [], value_propositions: [], customer_relationships: [], channels: [], customer_segments: [], cost_structure: [], revenue_streams: [] },
      personas: [{ name: "", tagline: "", dream_outcome: "", who: "", income: "", trigger: "", pains: [], objections: [], product_focus: [], messaging_hook: "" }],
      competitor_analysis: { summary: "", strengths_vs_competitors: [], weaknesses_vs_competitors: [], market_gaps: [] },
      review_insights: { overall_sentiment: "positive|mixed|negative", avg_rating: "", key_themes: [], trust_signals: [], reputation_risks: [], recommendation: "" },
      gap_analysis: [{ title: "", desc: "2 sentences with revenue impact", priority: "high|medium|low", category: "SEO|Paid|Content|Brand|CRO|Retention|Strategy", quick_win: false }],
      forecast: { current_revenue: "", conservative_12m: "", optimistic_12m: "", revenue_per_channel: [{ channel: "", current: "", potential: "" }], key_assumptions: [] },
      roadmap: [{ phase: "Phase 1", months: "Month 1-2", label: "Foundation", items: [{ task: "", detail: "" }] }],
      onboarding_checklist: [{ task: "", phase: "Foundation", priority: "critical|high|medium|low", owner: "Agency|Client|Both", week: "Week 1", detail: "" }],
      closing: { headline: "", narrative: "", next_step: "" }
    })
  ];

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: 'You are a world-class brand strategist. Use ALL data provided. Write specific, commercially sharp content. No generic filler. Return ONLY valid JSON.',
    messages: [{ role: 'user', content: lines.filter(Boolean).join('\n') }]
  });

  const text = msg.content[0]?.text ?? '{}';
  const clean = text.replace(/```[\w]*/g, '').replace(/```/g, '').trim();
  const s = clean.indexOf('{'), e = clean.lastIndexOf('}');
  if (s >= 0 && e > s) return JSON.parse(clean.substring(s, e + 1));
  throw new Error('Failed to parse analysis JSON');
}

app.listen(PORT, () => console.log(`Brand Diagnostic running on port ${PORT}`));
