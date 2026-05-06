const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const AHREFS_API_KEY = process.env.AHREFS_API_KEY;
const PORT = process.env.PORT || 3000;

const logoStore = {};

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
  const match = data.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return res.status(400).send('Invalid data');
  res.setHeader('Content-Type', match[1]);
  res.send(Buffer.from(match[2], 'base64'));
});

app.get('/health', (req, res) => res.json({ ok: true, version: '2.0.0' }));


const TOOL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Brand Diagnostic Tool</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#060a0f;color:#f0f4f8;min-height:100vh}
:root{--bg:#060a0f;--surface:#0f1419;--surface2:#161d26;--border:#1e2a38;--accent:#3cc168;--text:#f0f4f8;--text2:#8899aa;--text3:#4a5f72;--field-bg:#1a2330;--danger:#e84545;--warn:#f0a500;--radius:12px}

.topbar{background:var(--surface);border-bottom:1px solid var(--border);padding:0 28px;height:58px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
.tb-left{display:flex;align-items:center;gap:10px}
.agency-logo{width:34px;height:34px;border-radius:8px;background:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:#fff;overflow:hidden;flex-shrink:0;padding:0}
.agency-logo img{width:34px;height:34px;object-fit:cover;display:block;border-radius:8px}
.tb-name{font-weight:600;font-size:14px;color:var(--text)}
.tb-badge{font-size:11px;padding:2px 8px;border-radius:20px;background:rgba(60,193,104,.15);color:var(--accent);font-weight:600;letter-spacing:.04em}
.progress-wrap{flex:1;max-width:280px;margin:0 24px}
.progress-bar{height:3px;background:var(--border);border-radius:99px;overflow:hidden}
.progress-fill{height:100%;background:var(--accent);border-radius:99px;transition:width .4s ease}
.progress-label{font-size:11px;color:var(--text3);margin-top:5px}

.tabs{display:flex;background:var(--surface);border-bottom:1px solid var(--border);overflow-x:auto;scrollbar-width:none;padding:0 28px;gap:2px}
.tab{padding:13px 14px;font-size:11px;font-weight:600;color:var(--text3);cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;transition:all .2s;letter-spacing:.05em;text-transform:uppercase;display:flex;align-items:center;gap:5px}
.tab:hover{color:#fff}
.tab.active{color:#fff;border-color:var(--accent)}
.tab.done{color:var(--accent)}
.dot{width:5px;height:5px;border-radius:50%;background:var(--border);flex-shrink:0}
.tab.done .dot{background:var(--accent)}
.tab.active .dot{background:var(--accent);box-shadow:0 0 5px var(--accent)}

.screen{display:none}
.screen.active{display:block}

.main{max-width:820px;margin:0 auto;padding:40px 28px 80px}
.sec-hd{margin-bottom:28px}
.sec-num{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:var(--accent);color:#fff;font-size:11px;font-weight:700;margin-bottom:10px}
.sec-title{font-family:'DM Serif Display',serif;font-size:24px;color:#fff;margin-bottom:5px}
.sec-sub{font-size:14px;color:var(--text2);line-height:1.6}

.fg{margin-bottom:18px}
.fl{font-size:11px;font-weight:700;color:#fff;letter-spacing:.06em;text-transform:uppercase;margin-bottom:7px;display:block}
.fi,.ft,.fs{width:100%;background:var(--field-bg);border:1px solid var(--border);border-radius:8px;color:#fff;font-family:'Inter',sans-serif;font-size:14px;padding:11px 14px;outline:none;transition:border-color .2s}
.fi:focus,.ft:focus,.fs:focus{border-color:var(--accent)}
.fi::placeholder,.ft::placeholder{color:var(--text3)}
.ft{resize:vertical;min-height:85px;line-height:1.6}
.fs{cursor:pointer;appearance:none}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}

.opt-grid{display:grid;gap:10px}
.opt-grid.cols2{grid-template-columns:1fr 1fr}
.opt-grid.cols3{grid-template-columns:1fr 1fr 1fr}
.opt-card{background:var(--field-bg);border:1.5px solid var(--border);border-radius:8px;padding:14px 16px;cursor:pointer;transition:all .2s;font-size:13px;font-weight:500;color:var(--text2)}
.opt-card:hover{border-color:var(--text3);color:#fff}
.opt-card.selected{border-color:var(--accent);background:rgba(60,193,104,.1);color:#fff}

.color-row{display:flex;align-items:center;gap:12px}
.logo-upload{border:2px dashed var(--border);border-radius:8px;padding:24px;text-align:center;cursor:pointer;transition:border-color .2s}
.logo-upload:hover{border-color:var(--accent)}
.logo-upload.has-file{border-color:var(--accent);border-style:solid}
.logo-upload input{display:none}
.logo-up-text{font-size:13px;color:var(--text2)}
.logo-up-hint{font-size:11px;color:var(--text3);margin-top:4px}
.logo-thumb{max-height:60px;max-width:180px;margin:0 auto 8px;display:block;border-radius:4px}

.nav-row{display:flex;justify-content:space-between;align-items:center;margin-top:36px;padding-top:24px;border-top:1px solid var(--border)}
.btn-back{background:transparent;border:1px solid var(--border);color:var(--text2);padding:11px 22px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s}
.btn-back:hover{border-color:var(--text2);color:#fff}
.btn-next{background:var(--accent);color:#fff;border:none;padding:11px 28px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;letter-spacing:.04em;text-transform:uppercase;transition:opacity .2s}
.btn-next:hover{opacity:.9}
.btn-next:disabled{opacity:.4;cursor:not-allowed}

.mode-wrap{max-width:680px;margin:60px auto;padding:0 28px}
.mode-title{font-family:'DM Serif Display',serif;font-size:32px;color:#fff;margin-bottom:10px}
.mode-sub{font-size:15px;color:var(--text2);margin-bottom:32px}
.mode-cards{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px}
.mode-card{background:var(--surface);border:2px solid var(--border);border-radius:var(--radius);padding:28px;cursor:pointer;transition:all .25s}
.mode-card:hover,.mode-card.selected{border-color:var(--accent);background:var(--surface2)}
.mode-card-badge{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin-bottom:10px}
.mode-card-title{font-size:20px;font-weight:700;color:#fff;margin-bottom:6px}
.mode-card-price{font-size:22px;font-weight:700;color:var(--accent);margin-bottom:12px}
.mode-card-desc{font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:16px}
.mode-card-list{list-style:none}
.mode-card-list li{font-size:13px;color:var(--text2);padding:4px 0;display:flex;gap:8px}
.mode-card-list li::before{content:'→';color:var(--accent);flex-shrink:0}

.type-card{background:var(--surface);border:2px solid var(--border);border-radius:var(--radius);padding:24px;cursor:pointer;transition:all .25s;text-align:center}
.type-card:hover,.type-card.selected{border-color:var(--accent);background:var(--surface2)}

.loading-wrap{text-align:center;padding:80px 28px}
.loading-spinner{width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px}
@keyframes spin{to{transform:rotate(360deg)}}
.loading-title{font-size:18px;font-weight:600;color:#fff;margin-bottom:8px}
.loading-steps{list-style:none;text-align:left;display:inline-block;margin-top:20px}
.loading-step{font-size:13px;padding:5px 0;display:flex;align-items:center;gap:10px;color:var(--text3)}
.loading-step.done{color:var(--accent)}
.loading-step.active{color:#fff;font-weight:600}
.step-dot{width:8px;height:8px;border-radius:50%;background:var(--border);flex-shrink:0}
.loading-step.done .step-dot{background:var(--accent)}
.loading-step.active .step-dot{background:var(--warn);animation:pulse .8s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}

.export-bar{display:flex;gap:12px;padding:14px 28px;background:var(--surface);border-bottom:1px solid var(--border)}
.btn-sm{padding:8px 16px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all .15s}
.btn-export{background:var(--accent);color:#fff}
.btn-export:hover{opacity:.9}
.btn-export-ghost{background:transparent;color:var(--text2);border:1px solid var(--border)}
.btn-export-ghost:hover{color:#fff;border-color:var(--accent)}

.slide-nav-wrap{position:sticky;top:58px;z-index:50;background:var(--surface2);border-bottom:1px solid var(--border);padding:10px 28px;overflow-x:auto;white-space:nowrap;scrollbar-width:none}
.slide-nav-btn{display:inline-block;padding:5px 14px;border-radius:6px;font-size:11px;font-weight:600;letter-spacing:.04em;cursor:pointer;border:1px solid var(--border);color:var(--text3);margin-right:6px;transition:all .15s;background:transparent}
.slide-nav-btn:hover{border-color:var(--accent);color:#fff}
.slide-nav-btn.active{border-color:var(--accent);color:var(--accent)}

.slides-wrap{max-width:960px;margin:0 auto;padding:28px 20px 60px}
.slide{display:none}
.slide.active{display:block}

.s-cover{border-radius:14px;position:relative;overflow:hidden;min-height:500px;display:flex;flex-direction:column;justify-content:space-between;padding:48px;margin-bottom:14px}
.s-light{background:#fff;border-radius:14px;overflow:hidden;margin-bottom:14px}
.s-light-header{padding:18px 32px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between}
.s-light-logo{width:26px;height:26px;border-radius:5px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:10px;color:#fff;flex-shrink:0}
.s-light-logo img{width:100%;height:100%;object-fit:cover}
.s-light-body{padding:28px 32px}
.s-footer{padding:12px 32px;background:#f8f8f8;border-top:1px solid #eee;display:flex;justify-content:space-between;align-items:center}
.s-footer span{font-size:11px;color:#bbb}

.s-tag{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:3px 10px;border-radius:4px;margin-bottom:12px}
.s-title{font-family:'DM Serif Display',serif;font-size:24px;color:#111;margin-bottom:5px;line-height:1.2}
.s-line{width:36px;height:3px;border-radius:99px;margin-bottom:18px}
.s-body{font-size:14px;color:#444;line-height:1.7}

.r-metric-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0}
.r-metric{background:#f8f9fa;border-radius:10px;padding:16px}
.r-metric-label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
.r-metric-val{font-size:22px;font-weight:700;color:#111;margin-bottom:2px}
.r-metric-sub{font-size:12px;color:#999}

.r-data-table{width:100%;border-collapse:collapse;margin-top:12px}
.r-data-table th{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:8px 10px;border-bottom:2px solid #eee;text-align:left;color:#888}
.r-data-table td{font-size:13px;padding:9px 10px;border-bottom:1px solid #f0f0f0;color:#222}

.r-gap{border-radius:10px;padding:16px 18px;border-left:4px solid;margin-bottom:10px}
.r-gap.critical{background:#fef2f2;border-color:#dc2626}
.r-gap.critical .r-gap-title{color:#dc2626}
.r-gap.opportunity{background:#f0fdf4;border-color:#16a34a}
.r-gap.opportunity .r-gap-title{color:#16a34a}
.r-gap.warning{background:#fffbeb;border-color:#d97706}
.r-gap.warning .r-gap-title{color:#d97706}
.r-gap-title{font-size:14px;font-weight:700;margin-bottom:4px}
.r-gap-desc{font-size:13px;color:#555;line-height:1.6}

.r-roadmap{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}
.r-rm-card{background:#f8f9fa;border-radius:10px;padding:14px;border-top:3px solid}
.r-rm-month{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px}
.r-rm-label{font-size:13px;font-weight:700;color:#111;margin-bottom:10px}
.r-rm-items{list-style:none}
.r-rm-items li{font-size:12px;color:#555;padding:2px 0 2px 12px;position:relative}
.r-rm-items li::before{content:'•';position:absolute;left:0;color:#999}

.r-chk-item{display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid #f0f0f0;cursor:pointer}
.r-chk-box{width:17px;height:17px;border-radius:4px;border:2px solid #ddd;flex-shrink:0;margin-top:1px;display:flex;align-items:center;justify-content:center;transition:all .2s}
.r-chk-item.checked .r-chk-box{background:#16a34a;border-color:#16a34a}
.r-chk-item.checked .r-chk-text{text-decoration:line-through;color:#bbb}
.r-chk-text{font-size:13px;color:#333;line-height:1.5}
.r-chk-phase{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#aaa;margin-top:14px;margin-bottom:3px}

.r-persona{background:#f8f9fa;border-radius:12px;padding:18px;margin-bottom:12px}
.r-persona-name{font-size:16px;font-weight:700;color:#111;margin-bottom:3px}
.r-persona-who{font-size:13px;color:#666;margin-bottom:12px}
.r-persona-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.r-persona-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#888;margin-bottom:5px}
.r-persona-tag{display:inline-block;background:#eee;color:#555;font-size:12px;padding:2px 9px;border-radius:4px;margin:2px 2px 2px 0}

.toast{position:fixed;bottom:24px;right:24px;background:var(--surface);border:1px solid var(--border);padding:10px 16px;border-radius:8px;font-size:13px;color:#fff;z-index:999;opacity:0;transform:translateY(8px);transition:all .3s;pointer-events:none}
.toast.show{opacity:1;transform:translateY(0)}
.toast.error{border-color:var(--danger);color:var(--danger)}
.toast.success{border-color:var(--accent);color:var(--accent)}

@media print{.topbar,.tabs,.export-bar,.slide-nav-wrap,.nav-row{display:none!important}.slide{display:block!important;page-break-after:always}.slides-wrap{padding:0!important}body{background:#fff!important}}
</style>
</head>
<body>

<div class="topbar">
  <div class="tb-left">
    <div class="agency-logo" id="topbarLogo">BD</div>
    <span class="tb-name" id="topbarName">Brand Diagnostic</span>
    <span class="tb-badge" id="topbarMode" style="display:none">Tool</span>
  </div>
  <div class="progress-wrap" id="progressWrap" style="display:none">
    <div class="progress-bar"><div class="progress-fill" id="progressFill" style="width:0%"></div></div>
    <div class="progress-label" id="progressLabel">Section 1</div>
  </div>
</div>

<!-- MODE SELECT -->
<div id="modeScreen" class="screen active">
  <div class="mode-wrap">
    <div class="mode-title">Brand Diagnostic Tool</div>
    <div class="mode-sub">Set up your agency branding, then choose your diagnostic type</div>
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:24px;margin-bottom:28px">
      <div style="font-size:12px;font-weight:700;color:#fff;margin-bottom:16px;text-transform:uppercase;letter-spacing:.05em">Agency Branding</div>
      <div class="grid2">
        <div class="fg">
          <label class="fl">Agency Name</label>
          <input class="fi" id="agencyName" placeholder="Your Agency Name" oninput="updateBranding()">
        </div>
        <div class="fg">
          <label class="fl">Your Email</label>
          <input class="fi" id="agencyEmail" placeholder="you@agency.com" type="email">
        </div>
      </div>
      <div class="fg">
        <label class="fl">Brand Colour</label>
        <div class="color-row">
          <input type="color" id="agencyColor" value="#3cc168" onchange="updateBranding()" style="width:40px;height:40px;border:2px solid var(--border);border-radius:8px;cursor:pointer;background:none;padding:2px">
          <input class="fi" id="agencyColorHex" value="#3cc168" placeholder="#3cc168" style="width:110px;flex-shrink:0" oninput="syncColorHex()">
          <span style="font-size:12px;color:var(--text3)">Applied to cover, accents and every report slide</span>
        </div>
      </div>
      <div class="fg" style="margin-bottom:0">
        <label class="fl">Agency Logo</label>
        <div class="logo-upload" id="logoUploadBox" onclick="document.getElementById('logoFileInput').click()">
          <input type="file" id="logoFileInput" accept="image/*" onchange="handleLogoUpload(event)" style="display:none">
          <div id="logoUploadContent">
            <div class="logo-up-text">Click to upload logo</div>
            <div class="logo-up-hint">PNG, SVG or JPG — appears on every slide</div>
          </div>
        </div>
      </div>
    </div>
    <div style="font-size:12px;font-weight:700;color:#fff;margin-bottom:16px;text-transform:uppercase;letter-spacing:.05em">Diagnostic Type</div>
    <div class="mode-cards">
      <div class="mode-card" id="modeQuick" onclick="selectMode('quick')">
        <div class="mode-card-badge">Quick Diagnostic</div>
        <div class="mode-card-title">Express</div>
        <div class="mode-card-price">$500</div>
        <div class="mode-card-desc">30-minute call. Core data collection with automated signals.</div>
        <ul class="mode-card-list"><li>6 questionnaire sections</li><li>Live Ahrefs data pull</li><li>Gap analysis + forecast</li><li>Branded slide report</li></ul>
      </div>
      <div class="mode-card" id="modeDeep" onclick="selectMode('deep')">
        <div class="mode-card-badge">Deep Diagnostic</div>
        <div class="mode-card-title">Full Workshop</div>
        <div class="mode-card-price">$1,000–$1,500</div>
        <div class="mode-card-desc">1–2 hour workshop. Full discovery across every channel and growth lever.</div>
        <ul class="mode-card-list"><li>13 questionnaire sections</li><li>Live Ahrefs + competitor data</li><li>Deep gap + revenue forecast</li><li>Full branded slide deck</li></ul>
      </div>
    </div>
    <div style="text-align:center">
      <button class="btn-next" id="startBtn" disabled onclick="startDiagnostic()">Start Diagnostic →</button>
    </div>
  </div>
</div>

<!-- TYPE SELECT -->
<div id="typeScreen" class="screen">
  <div style="max-width:680px;margin:60px auto;padding:0 28px">
    <div style="font-size:13px;color:var(--text3);cursor:pointer;margin-bottom:20px" onclick="showScreen('modeScreen')">← Back</div>
    <div style="font-family:'DM Serif Display',serif;font-size:28px;color:#fff;margin-bottom:8px">Client Type</div>
    <div style="font-size:14px;color:var(--text2);margin-bottom:32px">What type of business is your client?</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:32px">
      <div class="type-card" id="type_ecommerce" onclick="selectClientType('ecommerce')">
        <div style="font-size:32px;margin-bottom:10px">🛒</div>
        <div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:6px">E-Commerce</div>
        <div style="font-size:12px;color:var(--text2)">Product-based online store</div>
      </div>
      <div class="type-card" id="type_leadgen" onclick="selectClientType('leadgen')">
        <div style="font-size:32px;margin-bottom:10px">🎯</div>
        <div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:6px">Lead Generation</div>
        <div style="font-size:12px;color:var(--text2)">Service-based business</div>
      </div>
      <div class="type-card" id="type_coaching" onclick="selectClientType('coaching')">
        <div style="font-size:32px;margin-bottom:10px">🎓</div>
        <div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:6px">Coaching & Consulting</div>
        <div style="font-size:12px;color:var(--text2)">Knowledge / program based</div>
      </div>
    </div>
    <div style="text-align:center">
      <button class="btn-next" onclick="confirmClientType()">Start Diagnostic →</button>
    </div>
  </div>
</div>

<!-- QUESTIONNAIRE -->
<div id="questionScreen" class="screen">
  <div id="tabsBar" class="tabs"></div>
  <div class="main" id="sectionContent"></div>
</div>

<!-- LOADING -->
<div id="loadingScreen" class="screen">
  <div class="loading-wrap">
    <div class="loading-spinner"></div>
    <div class="loading-title">Building your brand diagnostic...</div>
    <ul class="loading-steps" id="loadingSteps">
      <li class="loading-step active" id="ls0"><div class="step-dot"></div>Domain rating &amp; metrics</li>
      <li class="loading-step" id="ls1"><div class="step-dot"></div>Keyword rankings</li>
      <li class="loading-step" id="ls2"><div class="step-dot"></div>Competitor analysis</li>
      <li class="loading-step" id="ls3"><div class="step-dot"></div>Backlinks &amp; top pages</li>
      <li class="loading-step" id="ls4"><div class="step-dot"></div>Web research &amp; reviews</li>
      <li class="loading-step" id="ls5"><div class="step-dot"></div>AI analysis &amp; report</li>
    </ul>
  </div>
</div>

<!-- REPORT -->
<div id="reportScreen" class="screen">
  <div class="export-bar" id="exportBar">
    <button class="btn-sm btn-export-ghost" onclick="backToQuestionnaire()">← Back</button>
    <button class="btn-sm btn-export" onclick="window.print()">Save PDF</button>
    <button class="btn-sm btn-export-ghost" onclick="downloadHTML()">Download HTML</button>
    <button class="btn-sm btn-export-ghost" onclick="startOver()">New Diagnostic</button>
  </div>
  <div class="slide-nav-wrap" id="slideNavWrap"></div>
  <div class="slides-wrap" id="slidesWrap"></div>
</div>

<div class="toast" id="toast"></div>

<script>
var state = {
  mode: null, clientType: null,
  agency: { name:'', email:'', color:'#3cc168', logoUrl:'', logoInitials:'BD', tagline:'' },
  answers: {}, ahrefsData: null, signals: [], report: null,
  currentSection: 0, currentSlide: 0
};
var slideCount = 0;
var logoDataUrl = null;
var sessionId = 'sess_' + Math.random().toString(36).slice(2);

// ── BRANDING ──────────────────────────────────────────────────────────────────
function updateBranding() {
  var name = document.getElementById('agencyName').value || 'Brand Diagnostic';
  var color = document.getElementById('agencyColor').value;
  state.agency.name = name;
  state.agency.color = color;
  var initials = name.split(' ').map(function(w){return w[0];}).join('').slice(0,2).toUpperCase() || 'BD';
  state.agency.logoInitials = initials;
  document.getElementById('topbarName').textContent = name;
  document.documentElement.style.setProperty('--accent', color);
  document.getElementById('agencyColorHex').value = color;
  updateTopbarLogo();
}
function syncColorHex() {
  var hex = document.getElementById('agencyColorHex').value;
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    document.getElementById('agencyColor').value = hex;
    updateBranding();
  }
}
function updateTopbarLogo() {
  var el = document.getElementById('topbarLogo');
  if (logoDataUrl) {
    el.innerHTML = '<img src="' + logoDataUrl + '">';
  } else {
    el.textContent = state.agency.logoInitials || 'BD';
    el.style.background = state.agency.color || '#3cc168';
    el.style.color = '#fff';
  }
}
function handleLogoUpload(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    logoDataUrl = ev.target.result;
    state.agency.logoUrl = logoDataUrl;
    document.getElementById('logoUploadContent').innerHTML = '<img class="logo-thumb" src="' + logoDataUrl + '"><div class="logo-up-hint">' + file.name + ' — click to change</div>';
    document.getElementById('logoUploadBox').classList.add('has-file');
    updateTopbarLogo();
    fetch('/upload-logo', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ logoData: logoDataUrl, sessionId: sessionId })
    }).catch(function(){});
  };
  reader.readAsDataURL(file);
}

// ── MODE & TYPE ───────────────────────────────────────────────────────────────
function selectMode(m) {
  state.mode = m;
  document.getElementById('modeQuick').classList.toggle('selected', m === 'quick');
  document.getElementById('modeDeep').classList.toggle('selected', m === 'deep');
  document.getElementById('startBtn').disabled = false;
  document.getElementById('topbarMode').textContent = m === 'quick' ? 'Quick $500' : 'Deep $1,000+';
}
function startDiagnostic() {
  if (!state.mode) return;
  var name = document.getElementById('agencyName').value;
  if (!name) { showToast('Please enter your agency name', 'error'); return; }
  state.agency.name = name;
  state.agency.email = document.getElementById('agencyEmail').value;
  state.agency.color = document.getElementById('agencyColor').value;
  showScreen('typeScreen');
}
function selectClientType(t) {
  state.clientType = t;
  document.querySelectorAll('.type-card').forEach(function(c){ c.classList.remove('selected'); });
  var el = document.getElementById('type_' + t);
  if (el) el.classList.add('selected');
}
function confirmClientType() {
  if (!state.clientType) { showToast('Please select a client type', 'error'); return; }
  buildSections();
  showScreen('questionScreen');
  document.getElementById('progressWrap').style.display = '';
  document.getElementById('topbarMode').style.display = 'inline-block';
  document.getElementById('topbarMode').textContent = state.mode === 'quick' ? 'Quick $500' : 'Deep $1,000+';
  renderSection(0);
}

// ── SECTIONS ─────────────────────────────────────────────────────────────────
var sections = [];
function buildSections() { sections = getSections(); }
function getSections() {
  var quick = [
    {id:'client',title:'Client Details',sub:'The business being diagnosed.'},
    {id:'financials',title:'Financials & Goals',sub:'Current revenue and growth targets.'},
    {id:'brand',title:'Brand & Market',sub:'How they position themselves.'},
    {id:'obstacles',title:'Obstacles & Gaps',sub:'What is blocking growth right now.'},
    {id:'marketing',title:'Marketing Channels',sub:'What is running and what is not.'},
    {id:'competitors',title:'Competitors',sub:'Who they are up against.'}
  ];
  var deep = [
    {id:'client',title:'Client Details',sub:'The business being diagnosed.'},
    {id:'financials',title:'Financials & Goals',sub:'Current revenue and targets.'},
    {id:'brand',title:'Brand & Market',sub:'Positioning, values and differentiation.'},
    {id:'goals',title:'Goals & Vision',sub:'What they are trying to achieve.'},
    {id:'obstacles',title:'Obstacles & Gaps',sub:'What is blocking growth right now.'},
    {id:'personas',title:'Customer Personas',sub:'Who buys from them and why.'},
    {id:'painpoints',title:'Pain Points',sub:'What their customers struggle with.'},
    {id:'objections',title:'Sales Objections',sub:'Why people do not buy.'},
    {id:'products',title:'Products & Offers',sub:'What they sell and their best performers.'},
    {id:'competitors',title:'Competitors',sub:'Who they are up against.'},
    {id:'marketing',title:'Marketing Channels',sub:'What is running and what works.'},
    {id:'retention',title:'Retention & LTV',sub:'How they keep customers.'},
    {id:'reviews',title:'Reviews & Social Proof',sub:'What their customers say.'}
  ];
  var typeSection = getTypeSection();
  if (typeSection) { quick.push(typeSection); deep.push(typeSection); }
  return state.mode === 'quick' ? quick : deep;
}
function getTypeSection() {
  if (state.clientType === 'ecommerce') return {id:'type_specific',title:'E-Commerce Specifics',sub:'Online store performance', fields:[
    {type:'text',key:'ec_platform',label:'E-commerce platform',ph:'e.g. Shopify'},
    {type:'text',key:'ec_aov',label:'Average order value',ph:'e.g. $85'},
    {type:'text',key:'ec_roas',label:'Current ROAS',ph:'e.g. 2.4x'},
    {type:'text',key:'ec_cro',label:'Conversion rate',ph:'e.g. 1.8%'},
    {type:'text',key:'ec_repeat',label:'Repeat purchase rate',ph:'e.g. 30%'}
  ]};
  if (state.clientType === 'leadgen') return {id:'type_specific',title:'Lead Gen Specifics',sub:'Sales pipeline performance', fields:[
    {type:'text',key:'lg_leads',label:'Leads per month',ph:'e.g. 40/month'},
    {type:'text',key:'lg_close',label:'Close rate',ph:'e.g. 25%'},
    {type:'text',key:'lg_cycle',label:'Average sales cycle',ph:'e.g. 2 weeks'},
    {type:'textarea',key:'lg_nurture',label:'Lead nurturing sequence',ph:'What happens after someone opts in?'}
  ]};
  if (state.clientType === 'coaching') return {id:'type_specific',title:'Coaching Specifics',sub:'Program and audience', fields:[
    {type:'textarea',key:'coa_program',label:'Core program or offer',ph:'Describe the main coaching program'},
    {type:'text',key:'coa_students',label:'Current number of clients',ph:'e.g. 45 active clients'},
    {type:'textarea',key:'coa_authority',label:'Authority and credibility',ph:'Credentials, results, case studies'},
    {type:'textarea',key:'coa_enrol',label:'Enrolment process',ph:'How do prospects become clients?'}
  ]};
  return null;
}
function getFields(secId) {
  var f = {
    client:[
      {type:'text',key:'biz_name',label:'Business Name',ph:'e.g. Peak Performance Gym'},
      {type:'text',key:'biz_url',label:'Website URL',ph:'e.g. peakperformance.com.au'},
      {type:'opts',key:'biz_type',label:'Business Type',cols:3,opts:[{val:'ecommerce',label:'E-Commerce'},{val:'leadgen',label:'Lead Generation'},{val:'coaching',label:'Coaching'},{val:'local',label:'Local Business'},{val:'saas',label:'SaaS'},{val:'other',label:'Other'}]},
      {type:'text',key:'biz_industry',label:'Industry / Niche',ph:'e.g. Health & Fitness'}
    ],
    financials:[
      {type:'opts',key:'fin_revenue',label:'Current Annual Revenue',cols:3,opts:[{val:'<100k',label:'Under $100k'},{val:'100-500k',label:'$100k-$500k'},{val:'500k-1m',label:'$500k-$1M'},{val:'1-3m',label:'$1M-$3M'},{val:'3-10m',label:'$3M-$10M'},{val:'10m+',label:'$10M+'}]},
      {type:'text',key:'fin_target',label:'Revenue Target (12 months)',ph:'e.g. $2M'},
      {type:'opts',key:'fin_adspend',label:'Monthly Ad Spend',cols:3,opts:[{val:'none',label:'None'},{val:'<2k',label:'< $2k'},{val:'2-10k',label:'$2k-$10k'},{val:'10-30k',label:'$10k-$30k'},{val:'30k+',label:'$30k+'}]},
      {type:'textarea',key:'fin_goals',label:'Primary Business Goals',ph:'What does success look like in 12 months?'}
    ],
    brand:[
      {type:'textarea',key:'brand_desc',label:'Describe the brand',ph:'What makes them different? What do they stand for?'},
      {type:'textarea',key:'brand_usp',label:'Unique Selling Proposition',ph:'Why do customers choose them over competitors?'},
      {type:'opts',key:'brand_stage',label:'Brand Maturity',cols:2,opts:[{val:'startup',label:'Startup (0-2 years)'},{val:'growth',label:'Growth (2-5 years)'},{val:'established',label:'Established (5+ years)'},{val:'enterprise',label:'Enterprise'}]}
    ],
    goals:[
      {type:'textarea',key:'goals_primary',label:'Primary Goal',ph:'e.g. Double revenue, launch in new market'},
      {type:'text',key:'goals_timeline',label:'Timeline',ph:'e.g. 12 months'},
      {type:'textarea',key:'goals_secondary',label:'Secondary Goals',ph:'Other things they want to achieve'}
    ],
    obstacles:[
      {type:'textarea',key:'obs_main',label:'Biggest obstacle to growth?',ph:'What is the #1 thing holding them back?'},
      {type:'textarea',key:'obs_tried',label:'What have they already tried?',ph:'Agencies, tools, campaigns — what did not work?'},
      {type:'textarea',key:'obs_internal',label:'Internal constraints?',ph:'Budget, team, tech limitations?'}
    ],
    personas:[
      {type:'textarea',key:'persona_who',label:'Ideal customer',ph:'Demographics, role, income, behaviour'},
      {type:'textarea',key:'persona_why',label:'Why do they buy?',ph:'Emotional and rational triggers'},
      {type:'textarea',key:'persona_journey',label:'Buying journey',ph:'How do they find the business?'}
    ],
    painpoints:[
      {type:'textarea',key:'pain_customer',label:'Customer pain points',ph:'What problems do customers have before buying?'},
      {type:'textarea',key:'pain_dream',label:'Dream outcome',ph:'What transformation do they promise?'}
    ],
    objections:[
      {type:'textarea',key:'obj_main',label:'Top sales objections',ph:'Price, trust, timing — what stops people buying?'},
      {type:'textarea',key:'obj_handle',label:'How are objections handled?',ph:'Scripts, guarantees, social proof?'}
    ],
    products:[
      {type:'textarea',key:'prod_main',label:'Main products/services and prices',ph:'List key offers and pricing'},
      {type:'text',key:'prod_best',label:'Best performing offer',ph:'What converts best?'},
      {type:'text',key:'prod_aov',label:'Average order value',ph:'e.g. $250 per sale'}
    ],
    competitors:[
      {type:'textarea',key:'comp_main',label:'Main competitors',ph:'Top 3-5 competitors and their websites'},
      {type:'textarea',key:'comp_diff',label:'How do they compare?',ph:'Stronger? Weaker? What is the gap?'}
    ],
    marketing:[
      {type:'opts',key:'mkt_channels',label:'Active marketing channels',cols:3,multi:true,opts:[{val:'meta',label:'Meta Ads'},{val:'google',label:'Google Ads'},{val:'seo',label:'SEO'},{val:'email',label:'Email'},{val:'social',label:'Social'},{val:'tiktok',label:'TikTok'},{val:'youtube',label:'YouTube'},{val:'referral',label:'Referral'},{val:'none',label:'None'}]},
      {type:'textarea',key:'mkt_best',label:'What is working?',ph:'Best performing channel or campaign'},
      {type:'textarea',key:'mkt_worst',label:'What is not working?',ph:'Channels that have underperformed'}
    ],
    retention:[
      {type:'textarea',key:'ret_strategy',label:'Retention strategy',ph:'How do they keep customers coming back?'},
      {type:'text',key:'ret_ltv',label:'Average customer lifetime value',ph:'e.g. $3,500 over 12 months'},
      {type:'textarea',key:'ret_referral',label:'Referral / word of mouth',ph:'Do they have a referral programme?'}
    ],
    reviews:[
      {type:'opts',key:'rev_where',label:'Where do reviews appear?',cols:3,multi:true,opts:[{val:'google',label:'Google'},{val:'fb',label:'Facebook'},{val:'trustpilot',label:'Trustpilot'},{val:'none',label:'Minimal/None'}]},
      {type:'text',key:'rev_rating',label:'Average rating',ph:'e.g. 4.3/5 on Google with 120 reviews'},
      {type:'textarea',key:'rev_themes',label:'Common themes in reviews',ph:'What do customers praise or complain about?'}
    ]
  };
  return f[secId] || (getTypeSection() && secId === 'type_specific' ? (getTypeSection().fields || []) : []);
}

function renderSection(idx) {
  state.currentSection = idx;
  var sec = sections[idx];
  var total = sections.length;
  document.getElementById('progressFill').style.width = Math.round((idx/total)*100) + '%';
  document.getElementById('progressLabel').textContent = 'Section ' + (idx+1) + ' of ' + total;
  var tabsHtml = '';
  sections.forEach(function(s,i) {
    var done = i < idx; var active = i === idx;
    tabsHtml += '<div class="tab ' + (active?'active':done?'done':'') + '" onclick="jumpSection(' + i + ')"><span class="dot"></span>' + s.title + '</div>';
  });
  document.getElementById('tabsBar').innerHTML = tabsHtml;
  var fields = sec.fields || getFields(sec.id);
  var html = '<div class="sec-hd"><div class="sec-num">' + (idx+1) + '</div><div class="sec-title">' + sec.title + '</div><div class="sec-sub">' + sec.sub + '</div></div>';
  fields.forEach(function(f) { html += renderField(f, sec.id); });
  html += '<div class="nav-row">';
  html += idx > 0 ? '<button class="btn-back" onclick="prevSection()">← Back</button>' : '<div></div>';
  html += idx < sections.length - 1
    ? '<button class="btn-next" onclick="nextSection()">Continue →</button>'
    : '<button class="btn-next" onclick="goToGenerate()">Generate Report →</button>';
  html += '</div>';
  document.getElementById('sectionContent').innerHTML = html;
  restoreAnswers(sec.id);
  window.scrollTo(0,0);
}
function renderField(f, secId) {
  var key = secId + '_' + f.key;
  var html = '<div class="fg"><label class="fl">' + f.label + '</label>';
  if (f.type === 'text') {
    html += '<input class="fi" id="' + key + '" placeholder="' + esc(f.ph||'') + '" onchange="saveAnswer(\\'' + secId + '\\',\\'' + f.key + '\\',this.value)">';
  } else if (f.type === 'textarea') {
    html += '<textarea class="ft" id="' + key + '" placeholder="' + esc(f.ph||'') + '" onchange="saveAnswer(\\'' + secId + '\\',\\'' + f.key + '\\',this.value)"></textarea>';
  } else if (f.type === 'opts') {
    var cols = f.cols || 2;
    html += '<div class="opt-grid cols' + cols + '">';
    f.opts.forEach(function(o) {
      html += '<div class="opt-card" id="opt_' + key + '_' + o.val + '" onclick="selectOpt(\\'' + secId + '\\',\\'' + f.key + '\\',\\'' + o.val + '\\',' + (f.multi?'true':'false') + ')"><div>' + o.label + '</div></div>';
    });
    html += '</div>';
  }
  html += '</div>';
  return html;
}
function saveAnswer(secId, key, val) {
  if (!state.answers[secId]) state.answers[secId] = {};
  state.answers[secId][key] = val;
}
function selectOpt(secId, key, val, multi) {
  if (!state.answers[secId]) state.answers[secId] = {};
  var id = secId + '_' + key;
  if (multi) {
    var cur = state.answers[secId][key] || [];
    if (!Array.isArray(cur)) cur = [cur];
    var i = cur.indexOf(val);
    if (i >= 0) cur.splice(i,1); else cur.push(val);
    state.answers[secId][key] = cur;
    document.querySelectorAll('[id^="opt_' + id + '_"]').forEach(function(el){ el.classList.remove('selected'); });
    cur.forEach(function(v){ var el = document.getElementById('opt_' + id + '_' + v); if (el) el.classList.add('selected'); });
  } else {
    state.answers[secId][key] = val;
    document.querySelectorAll('[id^="opt_' + id + '_"]').forEach(function(el){ el.classList.remove('selected'); });
    var el = document.getElementById('opt_' + id + '_' + val);
    if (el) el.classList.add('selected');
  }
}
function restoreAnswers(secId) {
  var ans = state.answers[secId] || {};
  var fields = getFields(secId);
  fields.forEach(function(f) {
    var key = secId + '_' + f.key;
    var val = ans[f.key];
    if (!val) return;
    if (f.type === 'text' || f.type === 'textarea') { var el = document.getElementById(key); if (el) el.value = val; }
    else if (f.type === 'opts') {
      var vals = Array.isArray(val) ? val : [val];
      vals.forEach(function(v){ var el = document.getElementById('opt_' + key + '_' + v); if (el) el.classList.add('selected'); });
    }
  });
}
function saveCurrentTextareas() {
  var sec = sections[state.currentSection];
  var fields = sec.fields || getFields(sec.id);
  fields.forEach(function(f) {
    var key = sec.id + '_' + f.key;
    var el = document.getElementById(key);
    if (el && (f.type === 'text' || f.type === 'textarea')) saveAnswer(sec.id, f.key, el.value);
  });
}
function jumpSection(idx) { saveCurrentTextareas(); renderSection(idx); }
function nextSection() { saveCurrentTextareas(); if (state.currentSection < sections.length-1) renderSection(state.currentSection+1); }
function prevSection() { saveCurrentTextareas(); if (state.currentSection > 0) renderSection(state.currentSection-1); }

function goToGenerate() {
  saveCurrentTextareas();
  var biz_url = (state.answers.client || {}).biz_url || '';
  var domain = biz_url.replace(/https?:\\/\\//,'').replace(/\\/.*$/,'').replace(/^www\\./,'').trim();
  var clientName = (state.answers.client || {}).biz_name || 'Client';
  runGenerate(domain, clientName);
}

// ── GENERATE REPORT ──────────────────────────────────────────────────────────
function runGenerate(domain, clientName) {
  showScreen('loadingScreen');
  document.getElementById('progressWrap').style.display = 'none';

  function setProgress(pct) {
    var ids = ['ls0','ls1','ls2','ls3','ls4','ls5'];
    var active = Math.min(Math.floor(pct / 17), 5);
    ids.forEach(function(id, i) {
      var el = document.getElementById(id); if (!el) return;
      var dot = el.querySelector('.step-dot');
      if (i < active) { el.className = 'loading-step done'; if (dot) dot.style.background = 'var(--accent)'; }
      else if (i === active) { el.className = 'loading-step active'; if (dot) dot.style.background = 'var(--warn)'; }
      else { el.className = 'loading-step'; if (dot) dot.style.background = ''; }
    });
  }

  var payload = {
    domain: domain, clientName: clientName,
    mode: state.mode, bizType: state.clientType,
    agency: { name: state.agency.name, email: state.agency.email, color: state.agency.color, tagline: state.agency.tagline, logoUrl: state.agency.logoUrl, logoSessionId: sessionId },
    answers: state.answers
  };

  fetch('/generate', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  }).then(function(resp) {
    if (!resp.ok) throw new Error('Server error ' + resp.status);
    var reader = resp.body.getReader();
    var dec = new TextDecoder();
    var buf = '';
    function pump() {
      reader.read().then(function(r) {
        if (r.done) return;
        buf += dec.decode(r.value, {stream:true});
        var parts = buf.split('\\n\\n'); buf = parts.pop();
        parts.forEach(function(part) {
          if (!part.startsWith('data: ')) return;
          try {
            var evt = JSON.parse(part.slice(6));
            if (evt.step === 'progress') setProgress(evt.pct || 0);
            else if (evt.step === 'result') renderReport(evt.report, evt.ahrefs, evt.clientName, evt.domain, evt.agency);
            else if (evt.step === 'error') {
              showScreen('loadingScreen');
              document.querySelector('.loading-wrap').innerHTML = '<h3 style="color:var(--danger);margin-bottom:12px">Error</h3><p style="color:var(--text2)">' + esc(evt.msg||'Unknown error') + '</p><br><button class="btn-next" onclick="showScreen(\\'questionScreen\\')">← Back</button>';
            }
          } catch(e) { console.error(e); }
        });
        pump();
      }).catch(function(e){ console.error(e); });
    }
    pump();
  }).catch(function(err) {
    showScreen('loadingScreen');
    document.querySelector('.loading-wrap').innerHTML = '<h3 style="color:var(--danger);margin-bottom:12px">Could not connect</h3><p style="color:var(--text2)">' + esc(err.message) + '</p><br><button class="btn-next" onclick="showScreen(\\'questionScreen\\')">← Back</button>';
  });
}

// ── RENDER REPORT ────────────────────────────────────────────────────────────
function renderReport(report, ahrefs, clientName, domain, ag) {
  var a = ag || state.agency;
  var color = a.color || '#3cc168';
  var agencyName = a.name || 'Your Agency';
  var logoUrl = logoDataUrl || a.logoUrl || '';
  var today = new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
  var initials = agencyName.split(' ').slice(0,2).map(function(w){return w[0];}).join('').toUpperCase() || 'A';

  function logoBox(size, rad, fsize) {
    var s = size||40; var r = rad||8;
    var style = 'width:' + s + 'px;height:' + s + 'px;border-radius:' + r + 'px;overflow:hidden;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
    if (logoUrl) return '<div style="' + style + '"><img src="' + logoUrl + '" style="width:100%;height:100%;object-fit:cover"></div>';
    return '<div style="' + style + 'background:' + color + ';font-weight:700;font-size:' + (fsize||14) + 'px;color:#fff">' + initials + '</div>';
  }

  function footer() {
    return '<div class="s-footer">'
      + '<div style="display:flex;align-items:center;gap:7px">' + logoBox(20,4,9) + '<span style="font-size:11px;font-weight:600;color:#555">' + esc(agencyName) + '</span></div>'
      + '<span>' + esc(clientName) + ' — Brand Diagnostic — ' + today + '</span>'
      + '<span>Confidential</span></div>';
  }

  function lightSlide(label, content) {
    return {label: label, html:
      '<div class="s-light">'
      + '<div class="s-light-header">'
      + '<div style="display:flex;align-items:center;gap:8px">' + logoBox(26,5,10) + '<span style="font-size:12px;font-weight:600;color:#333">' + esc(agencyName) + '</span></div>'
      + '<span style="font-size:12px;color:#999">' + esc(clientName) + ' — Brand Diagnostic</span>'
      + '</div>'
      + '<div class="s-light-body">' + content + '</div>'
      + footer()
      + '</div>'
    };
  }

  function tag(lbl, bg) { return '<div class="s-tag" style="background:' + hexRgba(color,.12) + ';color:' + color + '">' + lbl + '</div>'; }
  function title(t) { return '<div class="s-title">' + esc(t) + '</div><div class="s-line" style="background:' + color + '"></div>'; }
  function metCard(val, label, sub, c) {
    return '<div class="r-metric"><div class="r-metric-label">' + esc(label) + '</div><div class="r-metric-val" style="color:' + (c||'#111') + '">' + esc(String(val==null?'—':val)) + '</div><div class="r-metric-sub">' + esc(sub||'') + '</div></div>';
  }
  function fmt(n) { if (n==null) return 'N/A'; if (n>=1000000) return (n/1000000).toFixed(1)+'M'; if (n>=1000) return (n/1000).toFixed(1)+'K'; return String(n); }

  var slides = [];
  var d = ahrefs || {};
  var dr = d.domain_rating||0; var orgT = d.org_traffic||0; var paidT = d.paid_traffic||0;

  // SLIDE 1: COVER
  var shade = shadeColor(color, -50);
  slides.push({ label: 'Cover', html:
    '<div class="s-cover" style="background:linear-gradient(135deg,' + shade + ' 0%,' + color + ' 100%)">'
    + '<div style="position:absolute;width:320px;height:320px;border-radius:50%;border:1px solid rgba(255,255,255,.1);top:-80px;right:-60px"></div>'
    + '<div style="position:absolute;width:180px;height:180px;border-radius:50%;border:1px solid rgba(255,255,255,.08);top:40%;right:10%"></div>'
    + '<div style="display:flex;align-items:center;gap:10px;position:relative;z-index:2">'
    + logoBox(48,10,16)
    + '<div><div style="font-size:14px;font-weight:700;color:rgba(255,255,255,.8);letter-spacing:.04em">' + esc(agencyName) + '</div>'
    + (a.tagline ? '<div style="font-size:11px;color:rgba(255,255,255,.4)">' + esc(a.tagline) + '</div>' : '')
    + '</div></div>'
    + '<div style="position:relative;z-index:2">'
    + '<div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:12px">Brand Diagnostic Report</div>'
    + '<div style="font-family:\\'DM Serif Display\\',serif;font-size:48px;font-weight:900;color:#fff;line-height:1;margin-bottom:8px">Brand<br>Diagnostic</div>'
    + '<div style="width:48px;height:4px;background:rgba(255,255,255,.4);border-radius:99px;margin-bottom:20px"></div>'
    + '<div style="font-size:13px;color:rgba(255,255,255,.4);margin-bottom:4px">Prepared for</div>'
    + '<div style="font-size:30px;font-weight:800;color:#fff">' + esc(clientName) + '</div>'
    + (domain ? '<div style="font-size:14px;color:rgba(255,255,255,.6);margin-top:6px">' + esc(domain) + '</div>' : '')
    + '<div style="font-size:12px;color:rgba(255,255,255,.3);margin-top:14px">' + today + ' · ' + (state.mode==='deep'?'Deep Workshop':'Quick Diagnostic') + '</div>'
    + '</div></div>'
  });

  // SLIDE 2: EXECUTIVE SUMMARY
  slides.push(lightSlide('Summary',
    tag('Executive Summary') + title('Where They Are & Where They\\'re Going')
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">'
    + ['Where They Are','Where They Want to Go','Recommended Approach'].map(function(t,i){
        var txt = [report.exec_summary, report.exec_future||'', report.exec_agency||''][i] || (report.exec_past||'');
        return '<div style="background:#f8f9fa;border-radius:10px;padding:16px"><div style="font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:' + color + ';margin-bottom:8px">' + t + '</div><p style="font-size:13px;color:#444;line-height:1.6">' + esc(txt) + '</p></div>';
      }).join('')
    + '</div>'
    + '<div class="r-metric-grid">'
    + metCard(report.revenue_now||'—','Current Revenue','Stated / estimated',color)
    + metCard(report.revenue_target||'—','12-Month Target','Client goal','#111')
    + metCard((report.revenue_forecast_conservative||'—') + '–' + (report.revenue_forecast_optimistic||'—'),'Forecast','With agency support',color)
    + '</div>'
  ));

  // SLIDE 3: DIGITAL POSITION
  var kwHtml = '';
  if (d.keywords && d.keywords.length) {
    kwHtml = '<table class="r-data-table" style="margin-top:16px"><thead><tr><th>Keyword</th><th>Position</th><th>Volume</th></tr></thead><tbody>';
    d.keywords.slice(0,6).forEach(function(k){ kwHtml += '<tr><td>' + esc(k.keyword||'') + '</td><td style="font-weight:700;color:' + (k.best_position<=3?color:k.best_position<=10?'#d97706':'#999') + '">' + (k.best_position||'—') + '</td><td>' + fmt(k.volume) + '</td></tr>'; });
    kwHtml += '</tbody></table>';
  }
  slides.push(lightSlide('Digital Position',
    tag('Digital Position') + title('Live Domain Intelligence')
    + '<div class="r-metric-grid">'
    + metCard(dr||'—','Domain Rating','Authority score',dr<20?'#dc2626':color)
    + metCard(fmt(orgT),'Organic Traffic','Monthly visits','#111')
    + metCard(paidT===0?'None':fmt(paidT),'Paid Traffic','From ads',paidT===0?'#dc2626':'#111')
    + metCard(fmt(d.org_keywords),'Keywords','Ranking','#111')
    + metCard(fmt(d.backlinks_live),'Backlinks','Total','#111')
    + metCard(fmt(d.ref_domains),'Ref Domains','Unique','#111')
    + '</div>' + kwHtml
  ));

  // SLIDE 4: COMPETITORS
  var compHtml = '';
  if (d.competitors && d.competitors.length) {
    compHtml = '<table class="r-data-table"><thead><tr><th>Competitor</th><th>DR</th><th>Traffic</th><th>Common KW</th><th>Gap</th></tr></thead><tbody>';
    d.competitors.slice(0,5).forEach(function(c){
      var theirDR = parseFloat(c.domain_rating||0);
      var diff = Math.round(theirDR - dr);
      compHtml += '<tr><td><strong>' + esc(c.competitor_domain||'') + '</strong></td><td>' + Math.round(theirDR) + '</td><td>' + fmt(c.traffic) + '</td><td>' + fmt(c.keywords_common) + '</td><td style="color:' + (diff>5?'#dc2626':diff<-5?'#16a34a':'#d97706') + ';font-weight:600">' + (diff>0?'+':'') + diff + '</td></tr>';
    });
    compHtml += '</tbody></table>';
  } else {
    compHtml = '<p style="color:#999;font-size:13px;margin-top:16px">No competitor data available for this domain.</p>';
  }
  slides.push(lightSlide('Competitors',
    tag('Competitive Landscape') + title('How They Stack Up')
    + '<div class="s-body" style="margin-bottom:8px">Organic competitors ranked by traffic — sourced live from Ahrefs.</div>'
    + compHtml
  ));

  // SLIDE 5: PERSONAS
  if (report.personas && report.personas.length) {
    var p = report.personas[0];
    slides.push(lightSlide('Avatar',
      tag('Customer Avatar') + title("Who's Buying — And Why")
      + '<div class="r-persona"><div class="r-persona-name">' + esc(p.name||'') + '</div><div class="r-persona-who">' + esc(p.who||p.tagline||'') + '</div>'
      + '<div class="r-persona-grid">'
      + '<div><div class="r-persona-label">Dream Outcome</div><div style="font-size:13px;color:#555;font-style:italic">"' + esc(p.dream_outcome||'') + '"</div></div>'
      + '<div><div class="r-persona-label">Core Objections</div>' + (p.objections||[]).map(function(o){return '<span class="r-persona-tag">' + esc(o) + '</span>';}).join('') + '</div>'
      + '<div><div class="r-persona-label">Pain Points</div>' + (p.pains||[]).map(function(o){return '<span class="r-persona-tag">' + esc(o) + '</span>';}).join('') + '</div>'
      + (p.messaging_hook ? '<div><div class="r-persona-label">Messaging Hook</div><div style="font-size:13px;color:' + color + ';font-weight:600">' + esc(p.messaging_hook) + '</div></div>' : '<div></div>')
      + '</div></div>'
    ));
  }

  // SLIDE 6: GAP ANALYSIS
  var gapHtml = '<div style="margin-top:16px">';
  (report.gaps || report.gap_analysis || []).forEach(function(g){
    var type = g.type || (g.priority==='high'?'critical':g.priority==='medium'?'warning':'opportunity');
    gapHtml += '<div class="r-gap ' + type + '"><div class="r-gap-title">' + esc(g.title||'') + '</div><div class="r-gap-desc">' + esc(g.desc||'') + '</div></div>';
  });
  gapHtml += '</div>';
  slides.push(lightSlide('Gaps',
    tag('Gap Analysis') + title('Where the Revenue Is Being Lost') + gapHtml
  ));

  // SLIDE 7: FORECAST
  var fc = report.forecast || {};
  slides.push(lightSlide('Forecast',
    tag('Revenue Forecast') + title('The Financial Opportunity')
    + '<div class="r-metric-grid">'
    + metCard(report.revenue_now||fc.current_revenue||'—','Current Revenue','Today','#111')
    + metCard(report.revenue_forecast_conservative||fc.conservative_12m||'—','Conservative Forecast','12 months with agency',color)
    + metCard(report.revenue_forecast_optimistic||fc.optimistic_12m||'—','Optimistic Forecast','Best case 12 months',color)
    + '</div>'
    + (report.forecast_reasoning||fc.key_assumptions ? '<div style="background:#f8f9fa;border-radius:10px;padding:16px;border-left:4px solid ' + color + ';margin-top:4px"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#888;margin-bottom:6px">Forecast Rationale</div><div style="font-size:13px;color:#444;line-height:1.6">' + esc(report.forecast_reasoning || (fc.key_assumptions||[]).join(' ')) + '</div></div>' : '')
  ));

  // SLIDE 8: ROADMAP
  var rm = report.roadmap || [];
  var rmHtml = '<div class="r-roadmap">';
  rm.forEach(function(m,i){
    var c = i<2?color:i<4?'#f0a500':'#3b82f6';
    rmHtml += '<div class="r-rm-card" style="border-color:' + c + '"><div class="r-rm-month" style="color:' + c + '">' + esc(m.month||m.phase||'') + '</div><div class="r-rm-label">' + esc(m.label||'') + '</div><ul class="r-rm-items">';
    (m.items||[]).forEach(function(it){ var t = typeof it==='string'?it:(it.task||''); rmHtml += '<li>' + esc(t) + '</li>'; });
    rmHtml += '</ul></div>';
  });
  rmHtml += '</div>';
  slides.push(lightSlide('Roadmap',
    tag('6-Month Roadmap') + title('The Plan to Get There') + rmHtml
  ));

  // SLIDE 9: CHECKLIST
  var chk = report.checklist || report.onboarding_checklist || [];
  var chkIdx = 0;
  var chkHtml = '<ul style="list-style:none;margin-top:16px">';
  chk.forEach(function(phase){
    if (phase.phase || phase.items) {
      chkHtml += '<li class="r-chk-phase">' + esc(phase.phase||'') + '</li>';
      (phase.items||[]).forEach(function(item){
        var t = typeof item==='string'?item:(item.task||item);
        chkHtml += '<li class="r-chk-item" onclick="toggleChk(this)" id="chkitem_' + chkIdx + '"><div class="r-chk-box">✓</div><span class="r-chk-text">' + esc(t) + '</span></li>';
        chkIdx++;
      });
    } else if (typeof phase === 'object' && phase.task) {
      chkHtml += '<li class="r-chk-item" onclick="toggleChk(this)"><div class="r-chk-box">✓</div><span class="r-chk-text">' + esc(phase.task) + '</span></li>';
    }
  });
  chkHtml += '</ul>';
  slides.push(lightSlide('Checklist',
    tag('Onboarding Checklist') + title('Getting Started — Tick It Off') + chkHtml
  ));

  // SLIDE 10: CLOSING
  var cl = report.closing || {};
  slides.push(lightSlide('Next Steps',
    tag('Closing Recommendation') + title('The Next Step')
    + '<div style="background:' + color + ';border-radius:12px;padding:28px;margin-bottom:20px">'
    + (cl.headline ? '<div style="font-family:\\'DM Serif Display\\',serif;font-size:20px;color:#fff;margin-bottom:12px">' + esc(cl.headline) + '</div>' : '')
    + '<div style="font-size:15px;color:rgba(255,255,255,.9);line-height:1.7">' + esc(cl.narrative||report.closing||'') + '</div>'
    + (cl.next_step ? '<div style="margin-top:16px;background:rgba(255,255,255,.15);border-radius:8px;padding:12px 16px;font-size:14px;font-weight:700;color:#fff">Next Step: ' + esc(cl.next_step) + '</div>' : '')
    + '</div>'
    + '<div style="display:flex;gap:14px">'
    + '<div style="flex:1;background:#f8f9fa;border-radius:10px;padding:16px;text-align:center"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#888;margin-bottom:4px">Prepared by</div><div style="font-size:15px;font-weight:700;color:#111">' + esc(agencyName) + '</div><div style="font-size:13px;color:#888">' + esc(a.email||'') + '</div></div>'
    + '<div style="flex:1;background:#f8f9fa;border-radius:10px;padding:16px;text-align:center"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#888;margin-bottom:4px">Report Date</div><div style="font-size:15px;font-weight:700;color:#111">' + today + '</div><div style="font-size:13px;color:#888">' + (state.mode==='deep'?'Deep Diagnostic':'Quick Diagnostic') + '</div></div>'
    + '</div>'
  ));

  slideCount = slides.length;
  state.currentSlide = 0;
  window._reportSlides = slides;
  window._reportData = {report,ahrefs,clientName,domain,agencyName,color,logoUrl};

  // Build nav
  var navHtml = '';
  slides.forEach(function(s,i){
    navHtml += '<span class="slide-nav-btn' + (i===0?' active':'') + '" id="snb_' + i + '" onclick="goToSlide(' + i + ')">' + esc(s.label) + '</span>';
  });
  document.getElementById('slideNavWrap').innerHTML = navHtml;

  // Build slides
  var slidesHtml = '';
  slides.forEach(function(s,i){
    slidesHtml += '<div class="slide' + (i===0?' active':'') + '" id="slide_' + i + '">' + s.html + '</div>';
  });
  document.getElementById('slidesWrap').innerHTML = slidesHtml;

  showScreen('reportScreen');
  document.addEventListener('keydown', function(e){
    if (!document.getElementById('reportScreen').classList.contains('active')) return;
    if (e.key==='ArrowRight'||e.key==='ArrowDown') goToSlide(state.currentSlide+1);
    if (e.key==='ArrowLeft'||e.key==='ArrowUp') goToSlide(state.currentSlide-1);
  });
}

function goToSlide(i) {
  if (i < 0 || i >= slideCount) return;
  document.querySelectorAll('.slide').forEach(function(s){ s.classList.remove('active'); });
  document.querySelectorAll('.slide-nav-btn').forEach(function(b){ b.classList.remove('active'); });
  var slide = document.getElementById('slide_' + i);
  var btn = document.getElementById('snb_' + i);
  if (slide) slide.classList.add('active');
  if (btn) { btn.classList.add('active'); btn.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'}); }
  state.currentSlide = i;
  window.scrollTo(0,60);
}

function toggleChk(el) {
  el.classList.toggle('checked');
}

function backToQuestionnaire() {
  showScreen('questionScreen');
  document.getElementById('progressWrap').style.display = '';
  renderSection(state.currentSection);
}

function startOver() {
  if (!confirm('Start a new diagnostic? This will clear all current data.')) return;
  state.answers = {}; state.mode = null; state.clientType = null; state.currentSection = 0; state.currentSlide = 0;
  document.getElementById('modeQuick').classList.remove('selected');
  document.getElementById('modeDeep').classList.remove('selected');
  document.getElementById('startBtn').disabled = true;
  document.getElementById('progressWrap').style.display = 'none';
  showScreen('modeScreen');
}

function downloadHTML() {
  var d = window._reportData;
  if (!d) { alert('Generate a report first'); return; }
  var slides = window._reportSlides || [];
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Brand Diagnostic — ' + esc(d.clientName) + '</title>'
    + '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet">'
    + '<style>body{font-family:Inter,sans-serif;background:#060a0f;color:#f0f4f8;margin:0;padding:20px}'
    + document.querySelector('style').textContent + '</style></head><body>';
  slides.forEach(function(s){ html += '<div style="margin-bottom:32px">' + s.html + '</div>'; });
  html += '</body></html>';
  var blob = new Blob([html], {type:'text/html'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = (d.clientName||'client').replace(/\\s+/g,'-') + '_brand_diagnostic.html';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── UTILS ────────────────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
  document.getElementById(id).classList.add('active');
}
function showToast(msg, type) {
  var t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast show ' + (type||'');
  setTimeout(function(){ t.classList.remove('show'); }, 3000);
}
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function shadeColor(hex, pct) {
  var num = parseInt(hex.replace('#',''),16);
  var r = Math.min(255,Math.max(0,(num>>16)+pct));
  var g = Math.min(255,Math.max(0,((num>>8)&0xff)+pct));
  var b = Math.min(255,Math.max(0,(num&0xff)+pct));
  return '#' + ((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}
function hexRgba(hex, alpha) {
  var num = parseInt(hex.replace('#',''),16);
  return 'rgba('+((num>>16)&255)+','+((num>>8)&255)+','+(num&255)+','+alpha+')';
}
document.addEventListener('keydown', function(e){
  if (e.key==='ArrowRight'&&document.getElementById('reportScreen').classList.contains('active')) goToSlide(state.currentSlide+1);
  if (e.key==='ArrowLeft'&&document.getElementById('reportScreen').classList.contains('active')) goToSlide(state.currentSlide-1);
});
updateTopbarLogo();
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
