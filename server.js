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
.agency-logo{width:34px;height:34px;border-radius:8px;background:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:#fff;overflow:hidden;flex-shrink:0;padding:0;position:relative}
.agency-logo img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;border-radius:8px;background:#fff;padding:2px}
.tb-name{font-weight:600;font-size:14px;color:var(--text)}
.tb-badge{font-size:11px;padding:2px 8px;border-radius:20px;background:rgba(60,193,104,.15);color:var(--accent);font-weight:600;letter-spacing:.04em}
.progress-wrap{flex:1;max-width:280px;margin:0 24px}
.progress-bar{height:3px;background:var(--border);border-radius:99px;overflow:hidden}
.progress-fill{height:100%;background:var(--accent);border-radius:99px;transition:width .4s ease}
.progress-label{font-size:11px;color:var(--text3);margin-top:5px}
.tabs{display:flex;background:var(--surface);border-bottom:1px solid var(--border);overflow-x:auto;scrollbar-width:none;padding:0 28px;gap:2px}
.tab{padding:13px 14px;font-size:11px;font-weight:600;color:var(--text3);cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;transition:all .2s;letter-spacing:.05em;text-transform:uppercase;display:flex;align-items:center;gap:5px}
.tab:hover{color:#fff}.tab.active{color:#fff;border-color:var(--accent)}.tab.done{color:var(--accent)}
.dot{width:5px;height:5px;border-radius:50%;background:var(--border);flex-shrink:0}
.tab.done .dot{background:var(--accent)}.tab.active .dot{background:var(--accent);box-shadow:0 0 5px var(--accent)}
.screen{display:none}.screen.active{display:block}
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
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.opt-grid{display:grid;gap:10px}
.opt-grid.cols2{grid-template-columns:1fr 1fr}.opt-grid.cols3{grid-template-columns:1fr 1fr 1fr}
.opt-card{background:var(--field-bg);border:1.5px solid var(--border);border-radius:8px;padding:14px 16px;cursor:pointer;transition:all .2s;font-size:13px;font-weight:500;color:var(--text2)}
.opt-card:hover{border-color:var(--text3);color:#fff}
.opt-card.selected{border-color:var(--accent);background:rgba(60,193,104,.1);color:#fff}
.color-row{display:flex;align-items:center;gap:12px}
.logo-upload{border:2px dashed var(--border);border-radius:8px;padding:24px;text-align:center;cursor:pointer;transition:border-color .2s}
.logo-upload:hover{border-color:var(--accent)}.logo-upload.has-file{border-color:var(--accent);border-style:solid}
.logo-upload input{display:none}
.logo-up-text{font-size:13px;color:var(--text2)}.logo-up-hint{font-size:11px;color:var(--text3);margin-top:4px}
.logo-thumb{max-height:60px;max-width:180px;margin:0 auto 8px;display:block;border-radius:4px}
.nav-row{display:flex;justify-content:space-between;align-items:center;margin-top:36px;padding-top:24px;border-top:1px solid var(--border)}
.btn-back{background:transparent;border:1px solid var(--border);color:var(--text2);padding:11px 22px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s}
.btn-back:hover{border-color:var(--text2);color:#fff}
.btn-next{background:var(--accent);color:#fff;border:none;padding:11px 28px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;letter-spacing:.04em;text-transform:uppercase;transition:opacity .2s}
.btn-next:hover{opacity:.9}.btn-next:disabled{opacity:.4;cursor:not-allowed}
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
.loading-step.done{color:var(--accent)}.loading-step.active{color:#fff;font-weight:600}
.step-dot{width:8px;height:8px;border-radius:50%;background:var(--border);flex-shrink:0}
.loading-step.done .step-dot{background:var(--accent)}
.loading-step.active .step-dot{background:var(--warn);animation:pulse .8s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.export-bar{display:flex;gap:10px;padding:12px 28px;background:var(--surface);border-bottom:1px solid var(--border);align-items:center}
.btn-sm{padding:8px 16px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all .15s}
.btn-export{background:var(--accent);color:#fff}.btn-export:hover{opacity:.9}
.btn-export-ghost{background:transparent;color:var(--text2);border:1px solid var(--border)}
.btn-export-ghost:hover{color:#fff;border-color:var(--accent)}
.slide-nav-bar{position:sticky;top:58px;z-index:50;background:var(--surface2);border-bottom:1px solid var(--border);padding:0 28px;display:flex;align-items:center;gap:8px}
.slide-nav-inner{flex:1;overflow-x:auto;white-space:nowrap;scrollbar-width:none;padding:10px 0}
.slide-nav-btn{display:inline-block;padding:5px 14px;border-radius:6px;font-size:11px;font-weight:600;letter-spacing:.04em;cursor:pointer;border:1px solid var(--border);color:var(--text3);margin-right:6px;transition:all .15s;background:transparent}
.slide-nav-btn:hover{border-color:var(--accent);color:#fff}
.slide-nav-btn.active{border-color:var(--accent);color:var(--accent)}
.slide-arrow{background:var(--surface);border:1px solid var(--border);color:var(--text2);width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;flex-shrink:0;transition:all .15s}
.slide-arrow:hover{border-color:var(--accent);color:#fff}
.slide-counter{font-size:12px;color:var(--text3);white-space:nowrap;flex-shrink:0}
.slides-wrap{max-width:960px;margin:0 auto;padding:28px 20px 60px}
.slide{display:none}.slide.active{display:block}
.s-cover{border-radius:14px;position:relative;overflow:hidden;min-height:500px;display:flex;flex-direction:column;justify-content:space-between;padding:48px;margin-bottom:14px}
.s-light{background:#fff;border-radius:14px;overflow:hidden;margin-bottom:14px}
.s-light-header{padding:16px 28px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between}
.s-light-body{padding:24px 28px}
.s-footer{padding:10px 28px;background:#f8f8f8;border-top:1px solid #eee;display:flex;justify-content:space-between;align-items:center}
.s-footer span{font-size:11px;color:#bbb}
.s-tag{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:3px 10px;border-radius:4px;margin-bottom:12px}
.s-title{font-family:'DM Serif Display',serif;font-size:24px;color:#111;margin-bottom:5px;line-height:1.2}
.s-line{width:36px;height:3px;border-radius:99px;margin-bottom:18px}
.r-metric-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:14px 0}
.r-metric-grid.cols2{grid-template-columns:repeat(2,1fr)}
.r-metric-grid.cols4{grid-template-columns:repeat(4,1fr)}
.r-metric{background:#f8f9fa;border-radius:10px;padding:14px}
.r-metric-label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px}
.r-metric-val{font-size:20px;font-weight:700;color:#111;margin-bottom:2px}
.r-metric-sub{font-size:12px;color:#999}
.r-data-table{width:100%;border-collapse:collapse;margin-top:12px}
.r-data-table th{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:8px 10px;border-bottom:2px solid #eee;text-align:left;color:#888}
.r-data-table td{font-size:13px;padding:9px 10px;border-bottom:1px solid #f0f0f0;color:#222}
.r-gap{border-radius:10px;padding:14px 16px;border-left:4px solid;margin-bottom:10px}
.r-gap.critical{background:#fef2f2;border-color:#dc2626}.r-gap.critical .r-gap-title{color:#dc2626}
.r-gap.opportunity{background:#f0fdf4;border-color:#16a34a}.r-gap.opportunity .r-gap-title{color:#16a34a}
.r-gap.warning{background:#fffbeb;border-color:#d97706}.r-gap.warning .r-gap-title{color:#d97706}
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
.r-persona-tag{display:inline-block;background:#eee;color:#555;font-size:12px;padding:2px 9px;border-radius:4px;margin:2px 2px 2px 0}
.badge-ok{background:#f0fdf4;color:#16a34a;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;display:inline-block}
.badge-warn{background:#fffbeb;color:#d97706;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;display:inline-block}
.badge-bad{background:#fef2f2;color:#dc2626;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;display:inline-block}
.review-card{background:#f8f9fa;border-radius:10px;padding:16px;margin-bottom:10px}
.stars{color:#f59e0b;font-size:16px;margin-bottom:6px}
.toast{position:fixed;bottom:24px;right:24px;background:var(--surface);border:1px solid var(--border);padding:10px 16px;border-radius:8px;font-size:13px;color:#fff;z-index:999;opacity:0;transform:translateY(8px);transition:all .3s;pointer-events:none}
.toast.show{opacity:1;transform:translateY(0)}
.toast.error{border-color:var(--danger);color:var(--danger)}
.toast.success{border-color:var(--accent);color:var(--accent)}
@media print{.topbar,.tabs,.export-bar,.slide-nav-bar,.nav-row{display:none!important}.slide{display:block!important;page-break-after:always}.slides-wrap{padding:0!important}body{background:#fff!important}}
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
        <div class="fg"><label class="fl">Agency Name</label><input class="fi" id="agencyName" placeholder="Your Agency Name" oninput="updateBranding()"></div>
        <div class="fg"><label class="fl">Your Email</label><input class="fi" id="agencyEmail" placeholder="you@agency.com" type="email"></div>
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
          <div id="logoUploadContent"><div class="logo-up-text">Click to upload logo</div><div class="logo-up-hint">PNG, SVG or JPG — appears on every slide</div></div>
        </div>
      </div>
    </div>
    <div style="font-size:12px;font-weight:700;color:#fff;margin-bottom:16px;text-transform:uppercase;letter-spacing:.05em">Diagnostic Type</div>
    <div class="mode-cards">
      <div class="mode-card" id="modeQuick" onclick="selectMode('quick')">
        <div class="mode-card-badge">Quick Diagnostic</div>
        <div class="mode-card-title">Express</div>
        <div class="mode-card-price">$500</div>
        <div class="mode-card-desc">30-minute call. Core discovery with live data signals.</div>
        <ul class="mode-card-list"><li>6 focused sections</li><li>Live Ahrefs data pull</li><li>Gap analysis + forecast</li><li>10-slide branded report</li></ul>
      </div>
      <div class="mode-card" id="modeDeep" onclick="selectMode('deep')">
        <div class="mode-card-badge">Deep Diagnostic</div>
        <div class="mode-card-title">Full Workshop</div>
        <div class="mode-card-price">$1,000–$1,500</div>
        <div class="mode-card-desc">1–2 hour workshop. Every dimension mapped in detail.</div>
        <ul class="mode-card-list"><li>13 in-depth sections</li><li>Live Ahrefs + competitor data</li><li>Website + ads + reviews audit</li><li>Full business canvas</li><li>Revenue forecast model</li><li>Full branded slide deck</li></ul>
      </div>
    </div>
    <div style="text-align:center"><button class="btn-next" id="startBtn" disabled onclick="startDiagnostic()">Start Diagnostic →</button></div>
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
    <div style="text-align:center"><button class="btn-next" onclick="confirmClientType()">Start Diagnostic →</button></div>
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
    <p style="font-size:14px;color:var(--text2);margin-bottom:8px" id="loadingDomain"></p>
    <ul class="loading-steps">
      <li class="loading-step active" id="ls0"><div class="step-dot"></div>Domain rating &amp; metrics</li>
      <li class="loading-step" id="ls1"><div class="step-dot"></div>Keyword rankings</li>
      <li class="loading-step" id="ls2"><div class="step-dot"></div>Competitor analysis</li>
      <li class="loading-step" id="ls3"><div class="step-dot"></div>Backlinks &amp; top pages</li>
      <li class="loading-step" id="ls4"><div class="step-dot"></div>Reviews, ads &amp; website audit</li>
      <li class="loading-step" id="ls5"><div class="step-dot"></div>5-pass AI analysis (exec, gaps, personas, competitors, roadmap)</li>
    </ul>
  </div>
</div>

<!-- REPORT -->
<div id="reportScreen" class="screen">
  <div class="export-bar">
    <button class="btn-sm btn-export-ghost" onclick="backToQuestionnaire()">← Back</button>
    <button class="btn-sm btn-export" onclick="window.print()">Save PDF</button>
    <button class="btn-sm btn-export-ghost" onclick="downloadHTML()">Download HTML</button>
    <button class="btn-sm btn-export-ghost" onclick="startOver()">New Diagnostic</button>
  </div>
  <div class="slide-nav-bar">
    <div class="slide-arrow" onclick="prevSlide()">←</div>
    <div class="slide-nav-inner" id="slideNavInner"></div>
    <div class="slide-arrow" onclick="nextSlide()">→</div>
    <div class="slide-counter" id="slideCounter">1 / 1</div>
  </div>
  <div class="slides-wrap" id="slidesWrap"></div>
</div>

<div class="toast" id="toast"></div>

<script>
var state = {
  mode: null, clientType: null,
  agency: {name:'',email:'',color:'#3cc168',logoUrl:'',logoInitials:'BD'},
  answers: {}, currentSection: 0, currentSlide: 0
};
var slideCount = 0;
var logoDataUrl = null;
var sessionId = 'sess_' + Math.random().toString(36).slice(2);

function updateBranding() {
  var name = document.getElementById('agencyName').value || 'Brand Diagnostic';
  var color = document.getElementById('agencyColor').value;
  state.agency.name = name; state.agency.color = color;
  var initials = name.split(' ').map(function(w){return w[0];}).join('').slice(0,2).toUpperCase() || 'BD';
  state.agency.logoInitials = initials;
  document.getElementById('topbarName').textContent = name;
  document.documentElement.style.setProperty('--accent', color);
  document.getElementById('agencyColorHex').value = color;
  updateTopbarLogo();
}
function syncColorHex() {
  var hex = document.getElementById('agencyColorHex').value;
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) { document.getElementById('agencyColor').value = hex; updateBranding(); }
}
function updateTopbarLogo() {
  var el = document.getElementById('topbarLogo');
  if (logoDataUrl) { el.innerHTML = '<img src="' + logoDataUrl + '">'; }
  else { el.textContent = state.agency.logoInitials || 'BD'; el.style.background = state.agency.color || '#3cc168'; }
}
function handleLogoUpload(e) {
  var file = e.target.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    logoDataUrl = ev.target.result; state.agency.logoUrl = logoDataUrl;
    document.getElementById('logoUploadContent').innerHTML = '<img class="logo-thumb" src="' + logoDataUrl + '"><div class="logo-up-hint">' + file.name + '</div>';
    document.getElementById('logoUploadBox').classList.add('has-file');
    updateTopbarLogo();
    fetch('/upload-logo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({logoData:logoDataUrl,sessionId:sessionId})}).catch(function(){});
  };
  reader.readAsDataURL(file);
}
function selectMode(m) {
  state.mode = m;
  document.getElementById('modeQuick').classList.toggle('selected', m==='quick');
  document.getElementById('modeDeep').classList.toggle('selected', m==='deep');
  document.getElementById('startBtn').disabled = false;
  document.getElementById('topbarMode').textContent = m==='quick'?'Quick $500':'Deep $1,000+';
}
function startDiagnostic() {
  if (!state.mode) return;
  var name = document.getElementById('agencyName').value;
  if (!name) { showToast('Please enter your agency name','error'); return; }
  state.agency.name = name;
  state.agency.email = document.getElementById('agencyEmail').value;
  state.agency.color = document.getElementById('agencyColor').value;
  showScreen('typeScreen');
}
function selectClientType(t) {
  state.clientType = t;
  document.querySelectorAll('.type-card').forEach(function(c){c.classList.remove('selected');});
  var el = document.getElementById('type_'+t); if (el) el.classList.add('selected');
}
function confirmClientType() {
  if (!state.clientType) { showToast('Please select a client type','error'); return; }
  buildSections(); showScreen('questionScreen');
  document.getElementById('progressWrap').style.display='';
  document.getElementById('topbarMode').style.display='inline-block';
  document.getElementById('topbarMode').textContent = state.mode==='quick'?'Quick $500':'Deep $1,000+';
  renderSection(0);
}

var sections = [];
function buildSections() { sections = getSections(); }
function getSections() {
  var quick = [
    {id:'client',title:'Client Details',sub:'The business you are diagnosing.'},
    {id:'financials',title:'Financials & Goals',sub:'Current revenue and growth targets.'},
    {id:'brand',title:'Brand & Market',sub:'How they position themselves and who they serve.'},
    {id:'obstacles',title:'Obstacles & Gaps',sub:'What is blocking growth right now.'},
    {id:'marketing',title:'Marketing Channels',sub:'What is running and what is not.'},
    {id:'competitors',title:'Competitors',sub:'Who they are up against in the market.'}
  ];
  var deep = [
    {id:'client',title:'Client Details',sub:'The business you are diagnosing.'},
    {id:'financials',title:'Financials & Goals',sub:'Current revenue, targets and financial position.'},
    {id:'brand',title:'Brand & Positioning',sub:'How they are positioned and what makes them different.'},
    {id:'goals',title:'Goals & Vision',sub:'Where they want to go and what drives them.'},
    {id:'obstacles',title:'Obstacles & Challenges',sub:'What is holding them back from growth.'},
    {id:'personas',title:'Customer Personas',sub:'Who buys from them, why, and what drives the decision.'},
    {id:'painpoints',title:'Pain Points & Dream Outcome',sub:'The emotional and functional drivers behind the purchase.'},
    {id:'objections',title:'Sales Objections',sub:'Why prospects do not buy and how they are handled.'},
    {id:'products',title:'Products, Offers & Pricing',sub:'What they sell, how it is packaged and priced.'},
    {id:'competitors',title:'Competitor Landscape',sub:'Who they compete with and how they compare.'},
    {id:'marketing',title:'Marketing & Acquisition',sub:'Every channel — what is running, what works, what does not.'},
    {id:'retention',title:'Retention & LTV',sub:'How they keep customers and grow their value over time.'},
    {id:'reviews',title:'Reviews & Reputation',sub:'What customers say publicly and how it is managed.'}
  ];
  var typeSection = getTypeSection();
  if (typeSection) { quick.push(typeSection); deep.push(typeSection); }
  return state.mode==='quick' ? quick : deep;
}
function getTypeSection() {
  if (state.clientType==='ecommerce') return {id:'type_specific',title:'E-Commerce Details',sub:'Online store performance metrics.',fields:[
    {type:'text',key:'ec_platform',label:'E-commerce platform',ph:'e.g. Shopify, WooCommerce'},
    {type:'text',key:'ec_aov',label:'Average order value',ph:'e.g. $85'},
    {type:'text',key:'ec_roas',label:'Current ROAS (if running ads)',ph:'e.g. 2.4x'},
    {type:'text',key:'ec_cro',label:'Website conversion rate',ph:'e.g. 1.8%'},
    {type:'text',key:'ec_repeat',label:'Repeat purchase rate',ph:'e.g. 30% of customers buy again'},
    {type:'text',key:'ec_cart',label:'Cart abandonment rate',ph:'e.g. 72%'},
    {type:'textarea',key:'ec_top_products',label:'Top selling products',ph:'What are the 3 best sellers and why?'}
  ]};
  if (state.clientType==='leadgen') return {id:'type_specific',title:'Lead Generation Details',sub:'Sales pipeline and conversion metrics.',fields:[
    {type:'text',key:'lg_leads',label:'Leads per month (current)',ph:'e.g. 40 leads/month'},
    {type:'text',key:'lg_close',label:'Close/conversion rate',ph:'e.g. 25% of leads close'},
    {type:'text',key:'lg_cycle',label:'Average sales cycle',ph:'e.g. 2 weeks from lead to close'},
    {type:'text',key:'lg_cpl',label:'Cost per lead (if known)',ph:'e.g. $45 per lead'},
    {type:'textarea',key:'lg_qualify',label:'Lead qualification process',ph:'How are leads qualified before the sales team touches them?'},
    {type:'textarea',key:'lg_nurture',label:'Lead nurture sequence',ph:'What automated follow-up happens after a lead opts in?'}
  ]};
  if (state.clientType==='coaching') return {id:'type_specific',title:'Coaching & Program Details',sub:'Program, audience and enrolment.',fields:[
    {type:'textarea',key:'coa_program',label:'Core program or offer',ph:'Describe the main coaching program — delivery, duration, outcome'},
    {type:'text',key:'coa_students',label:'Current active clients',ph:'e.g. 45 active clients'},
    {type:'text',key:'coa_price',label:'Program price',ph:'e.g. $3,500 for 12 weeks'},
    {type:'textarea',key:'coa_authority',label:'Authority and credibility',ph:'Credentials, case studies, audience size, social proof'},
    {type:'textarea',key:'coa_content',label:'Content and audience building',ph:'What content do they publish and where? YouTube, podcast, Instagram?'},
    {type:'textarea',key:'coa_enrol',label:'Enrolment process',ph:'How do prospects become clients? Discovery call, webinar, direct?'}
  ]};
  return null;
}
function getFields(secId) {
  var isDeep = state.mode==='deep';
  var f = {
    client:[
      {type:'text',key:'biz_name',label:'Business Name',ph:'e.g. Peak Performance Gym'},
      {type:'text',key:'biz_url',label:'Website URL',ph:'e.g. peakperformance.com.au'},
      {type:'text',key:'biz_industry',label:'Industry / Niche',ph:'e.g. Health & Fitness, B2B Software'}
    ],
    financials: isDeep ? [
      {type:'opts',key:'fin_revenue',label:'Current Annual Revenue',cols:3,opts:[{val:'<100k',label:'Under $100k'},{val:'100-500k',label:'$100k-$500k'},{val:'500k-1m',label:'$500k-$1M'},{val:'1-3m',label:'$1M-$3M'},{val:'3-10m',label:'$3M-$10M'},{val:'10m+',label:'$10M+'}]},
      {type:'text',key:'fin_target',label:'Revenue Target (12 months)',ph:'e.g. $2M'},
      {type:'opts',key:'fin_adspend',label:'Monthly Ad Spend',cols:3,opts:[{val:'none',label:'None'},{val:'<2k',label:'< $2k'},{val:'2-10k',label:'$2k-$10k'},{val:'10-30k',label:'$10k-$30k'},{val:'30k+',label:'$30k+'}]},
      {type:'text',key:'fin_margin',label:'Approximate gross margin',ph:'e.g. 65%'},
      {type:'text',key:'fin_team',label:'Team size',ph:'e.g. 8 full-time, 3 contractors'},
      {type:'textarea',key:'fin_goals',label:'Primary Business Goals (top 3)',ph:'What does success look like in 12 months?'}
    ] : [
      {type:'opts',key:'fin_revenue',label:'Current Annual Revenue',cols:3,opts:[{val:'<100k',label:'Under $100k'},{val:'100-500k',label:'$100k-$500k'},{val:'500k-1m',label:'$500k-$1M'},{val:'1-3m',label:'$1M-$3M'},{val:'3-10m',label:'$3M-$10M'},{val:'10m+',label:'$10M+'}]},
      {type:'text',key:'fin_target',label:'Revenue Target (12 months)',ph:'e.g. $2M'},
      {type:'opts',key:'fin_adspend',label:'Monthly Ad Spend',cols:3,opts:[{val:'none',label:'None'},{val:'<2k',label:'< $2k'},{val:'2-10k',label:'$2k-$10k'},{val:'10-30k',label:'$10k-$30k'},{val:'30k+',label:'$30k+'}]},
      {type:'textarea',key:'fin_goals',label:'Primary Business Goals',ph:'What does success look like in 12 months?'}
    ],
    brand: isDeep ? [
      {type:'textarea',key:'brand_desc',label:'Describe the brand',ph:'What do they do, who do they serve, what makes them different?'},
      {type:'textarea',key:'brand_values',label:'Core brand values',ph:'What principles guide how the business operates?'},
      {type:'textarea',key:'brand_usp',label:'Unique Selling Proposition',ph:'Why do customers choose them over every competitor?'},
      {type:'text',key:'brand_voice',label:'Brand voice and tone',ph:'e.g. Bold and direct, professional but warm, playful'},
      {type:'opts',key:'brand_stage',label:'Brand Maturity Stage',cols:2,opts:[{val:'startup',label:'Startup (0-2 years)'},{val:'growth',label:'Growth (2-5 years)'},{val:'established',label:'Established (5+ years)'},{val:'enterprise',label:'Enterprise'}]}
    ] : [
      {type:'textarea',key:'brand_desc',label:'Describe the brand',ph:'What makes them different? What do they stand for?'},
      {type:'textarea',key:'brand_usp',label:'Unique Selling Proposition',ph:'Why do customers choose them over competitors?'},
      {type:'opts',key:'brand_stage',label:'Brand Maturity Stage',cols:2,opts:[{val:'startup',label:'Startup (0-2 years)'},{val:'growth',label:'Growth (2-5 years)'},{val:'established',label:'Established (5+ years)'},{val:'enterprise',label:'Enterprise'}]}
    ],
    goals:[
      {type:'textarea',key:'goals_primary',label:'Primary 12-month goal',ph:'e.g. Hit $2M revenue, launch in new market, exit the business'},
      {type:'text',key:'goals_timeline',label:'Timeline to achieve',ph:'e.g. December this year, 18 months'},
      {type:'textarea',key:'goals_secondary',label:'Secondary goals',ph:'Other outcomes they want in the next 12 months'},
      {type:'textarea',key:'goals_longterm',label:'3-5 year ambition',ph:'Where does the founder want to take this business long term?'}
    ],
    obstacles: isDeep ? [
      {type:'textarea',key:'obs_main',label:'#1 obstacle to growth right now',ph:'What is the single biggest thing holding them back?'},
      {type:'textarea',key:'obs_tried',label:'What have they already tried?',ph:'Agencies, tools, campaigns, hires — what did not work and why?'},
      {type:'textarea',key:'obs_internal',label:'Internal constraints',ph:'Team capacity, budget limits, tech debt, founder bottlenecks?'},
      {type:'textarea',key:'obs_fear',label:'Biggest fear about marketing investment',ph:'What worries them most about spending more on marketing?'}
    ] : [
      {type:'textarea',key:'obs_main',label:'#1 obstacle to growth right now',ph:'What is the single biggest thing holding them back?'},
      {type:'textarea',key:'obs_tried',label:'What have they already tried?',ph:'Agencies, tools, campaigns — what did not work?'},
      {type:'textarea',key:'obs_internal',label:'Internal constraints',ph:'Budget, team capacity, tech limitations?'}
    ],
    personas:[
      {type:'textarea',key:'persona_who',label:'Describe the ideal customer',ph:'Demographics, psychographics, income, location, job title, lifestyle'},
      {type:'textarea',key:'persona_why',label:'Why do they buy?',ph:'What is the emotional and rational trigger to purchase?'},
      {type:'textarea',key:'persona_journey',label:'Buying journey',ph:'How do they find the business? What does the path to purchase look like?'},
      {type:'textarea',key:'persona_ltv',label:'What does a great customer look like?',ph:'How much do they spend? How long do they stay? Do they refer others?'}
    ],
    painpoints:[
      {type:'textarea',key:'pain_before',label:'What is the customer\\'s life like BEFORE buying?',ph:'What problems, frustrations, failures do they experience?'},
      {type:'textarea',key:'pain_dream',label:'What is the dream outcome AFTER buying?',ph:'What transformation do they experience? What does success feel like?'},
      {type:'textarea',key:'pain_trigger',label:'What triggers the buying decision?',ph:'What event, moment or frustration makes them finally take action?'},
      {type:'textarea',key:'pain_alternative',label:'What do they do instead of buying?',ph:'DIY, competitor, do nothing — what are they settling for now?'}
    ],
    objections:[
      {type:'textarea',key:'obj_main',label:'Top 3 objections from prospects',ph:'Price too high, not the right time, tried it before — what comes up?'},
      {type:'textarea',key:'obj_handle',label:'How are objections currently handled?',ph:'Scripts, guarantees, proof, trials, payment plans?'},
      {type:'textarea',key:'obj_missing',label:'What objection-handling is MISSING?',ph:'What do they wish they had but don\\'t — case studies, a guarantee, testimonials?'}
    ],
    products:[
      {type:'textarea',key:'prod_main',label:'Main products/services and pricing',ph:'List all core offers with prices — what do they actually sell?'},
      {type:'textarea',key:'prod_ladder',label:'Offer ladder / product funnel',ph:'Lead magnet → entry offer → core offer → premium tier — how is it structured?'},
      {type:'text',key:'prod_aov',label:'Average order / transaction value',ph:'e.g. $297 per sale, $1,800 retainer, $4,500 project'},
      {type:'text',key:'prod_best',label:'Highest converting offer',ph:'What sells best or easiest?'},
      {type:'textarea',key:'prod_unique',label:'What makes the offer genuinely different?',ph:'Features, delivery, guarantees, bonuses that competitors do not have'}
    ],
    competitors:[
      {type:'textarea',key:'comp_main',label:'Top 3-5 competitors (name and website)',ph:'Who are the main businesses competing for the same customer?'},
      {type:'textarea',key:'comp_stronger',label:'Where are competitors stronger?',ph:'What do competitors do better? Bigger audience, more reviews, better price?'},
      {type:'textarea',key:'comp_weaker',label:'Where does the client have an advantage?',ph:'What can they do or say that competitors cannot?'},
      {type:'textarea',key:'comp_indirect',label:'Indirect competitors / alternatives',ph:'What else does the customer consider? DIY, cheaper options, doing nothing?'}
    ],
    marketing: isDeep ? [
      {type:'opts',key:'mkt_channels',label:'Active marketing channels',cols:3,multi:true,opts:[{val:'meta',label:'Meta Ads'},{val:'google',label:'Google Ads'},{val:'seo',label:'SEO / Content'},{val:'email',label:'Email'},{val:'social',label:'Social Media'},{val:'tiktok',label:'TikTok Ads'},{val:'youtube',label:'YouTube'},{val:'referral',label:'Referral'},{val:'pr',label:'PR / Press'},{val:'events',label:'Events'},{val:'none',label:'None active'}]},
      {type:'text',key:'mkt_best',label:'Best performing channel (highest ROI)',ph:'What drives the most revenue for the least spend?'},
      {type:'textarea',key:'mkt_worst',label:'What has not worked and why?',ph:'Channels, campaigns or agencies that underdelivered — and why they think that is'},
      {type:'textarea',key:'mkt_funnel',label:'Current acquisition funnel',ph:'Describe the path from first touch to sale — ads → landing page → call → close?'},
      {type:'text',key:'mkt_cac',label:'Customer acquisition cost (if known)',ph:'e.g. $120 per lead, $800 per sale'}
    ] : [
      {type:'opts',key:'mkt_channels',label:'Active marketing channels',cols:3,multi:true,opts:[{val:'meta',label:'Meta Ads'},{val:'google',label:'Google Ads'},{val:'seo',label:'SEO'},{val:'email',label:'Email'},{val:'social',label:'Social Media'},{val:'tiktok',label:'TikTok'},{val:'youtube',label:'YouTube'},{val:'referral',label:'Referral'},{val:'none',label:'None active'}]},
      {type:'text',key:'mkt_best',label:'Best performing channel',ph:'Which channel brings the most revenue?'},
      {type:'textarea',key:'mkt_worst',label:'What is not working?',ph:'Channels or campaigns that have underperformed'}
    ],
    retention:[
      {type:'text',key:'ret_ltv',label:'Customer lifetime value',ph:'e.g. $1,200 over 12 months, $4,500 per project'},
      {type:'text',key:'ret_churn',label:'Churn rate or repeat purchase rate',ph:'e.g. 35% buy again, 15% monthly churn'},
      {type:'textarea',key:'ret_strategy',label:'Current retention strategy',ph:'What do they actively do to keep customers buying? Email sequences, loyalty, upsells?'},
      {type:'textarea',key:'ret_referral',label:'Referral and word of mouth',ph:'Is there a referral programme? How much business comes from WOM?'},
      {type:'textarea',key:'ret_upsell',label:'Upsell and cross-sell strategy',ph:'What other products do existing customers buy? Is there a deliberate upsell path?'}
    ],
    reviews:[
      {type:'opts',key:'rev_platforms',label:'Where do reviews appear?',cols:3,multi:true,opts:[{val:'google',label:'Google'},{val:'fb',label:'Facebook'},{val:'trustpilot',label:'Trustpilot'},{val:'g2',label:'G2 / Capterra'},{val:'productHunt',label:'Product Hunt'},{val:'none',label:'Minimal/None'}]},
      {type:'text',key:'rev_rating',label:'Average rating and volume',ph:'e.g. 4.3/5 on Google with 127 reviews'},
      {type:'textarea',key:'rev_positive',label:'What do customers consistently praise?',ph:'Top themes in positive reviews — what do they love?'},
      {type:'textarea',key:'rev_negative',label:'What do customers complain about?',ph:'Recurring complaints or 1-2 star themes'},
      {type:'textarea',key:'rev_strategy',label:'Review generation strategy',ph:'How do they ask for reviews? Is there an automated system?'}
    ]
  };
  var ts = getTypeSection();
  if (ts && secId==='type_specific') return ts.fields || [];
  return f[secId] || [];
}

function renderSection(idx) {
  state.currentSection = idx;
  var sec = sections[idx];
  var total = sections.length;
  document.getElementById('progressFill').style.width = Math.round((idx/total)*100)+'%';
  document.getElementById('progressLabel').textContent = 'Section '+(idx+1)+' of '+total;
  var tabsHtml = '';
  sections.forEach(function(s,i){
    var done = i<idx; var active = i===idx;
    tabsHtml += '<div class="tab '+(active?'active':done?'done':'')+'" onclick="jumpSection('+i+')"><span class="dot"></span>'+s.title+'</div>';
  });
  document.getElementById('tabsBar').innerHTML = tabsHtml;
  var fields = sec.fields || getFields(sec.id);
  var html = '<div class="sec-hd"><div class="sec-num">'+(idx+1)+'</div><div class="sec-title">'+sec.title+'</div><div class="sec-sub">'+sec.sub+'</div></div>';
  fields.forEach(function(f){html += renderField(f, sec.id);});
  html += '<div class="nav-row">';
  html += idx>0 ? '<button class="btn-back" onclick="prevSection()">← Back</button>' : '<div></div>';
  html += idx<sections.length-1
    ? '<button class="btn-next" onclick="nextSection()">Continue →</button>'
    : '<button class="btn-next" onclick="goToGenerate()">Generate Report →</button>';
  html += '</div>';
  document.getElementById('sectionContent').innerHTML = html;
  restoreAnswers(sec.id);
  window.scrollTo(0,0);
}
function renderField(f, secId) {
  var key = secId+'_'+f.key;
  var html = '<div class="fg"><label class="fl">'+f.label+'</label>';
  if (f.type==='text') html += '<input class="fi" id="'+key+'" placeholder="'+esc(f.ph||'')+'" onchange="saveAnswer(\\''+secId+'\\',\\''+f.key+'\\',this.value)">';
  else if (f.type==='textarea') html += '<textarea class="ft" id="'+key+'" placeholder="'+esc(f.ph||'')+'" onchange="saveAnswer(\\''+secId+'\\',\\''+f.key+'\\',this.value)"></textarea>';
  else if (f.type==='opts') {
    var cols = f.cols||2;
    html += '<div class="opt-grid cols'+cols+'">';
    f.opts.forEach(function(o){
      html += '<div class="opt-card" id="opt_'+key+'_'+o.val+'" onclick="selectOpt(\\''+secId+'\\',\\''+f.key+'\\',\\''+o.val+'\\','+(f.multi?'true':'false')+')">'+o.label+'</div>';
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
  var id = secId+'_'+key;
  if (multi) {
    var cur = state.answers[secId][key]||[];
    if (!Array.isArray(cur)) cur=[cur];
    var i=cur.indexOf(val);
    if (i>=0) cur.splice(i,1); else cur.push(val);
    state.answers[secId][key]=cur;
    document.querySelectorAll('[id^="opt_'+id+'_"]').forEach(function(el){el.classList.remove('selected');});
    cur.forEach(function(v){var el=document.getElementById('opt_'+id+'_'+v);if(el)el.classList.add('selected');});
  } else {
    state.answers[secId][key]=val;
    document.querySelectorAll('[id^="opt_'+id+'_"]').forEach(function(el){el.classList.remove('selected');});
    var el=document.getElementById('opt_'+id+'_'+val);if(el)el.classList.add('selected');
  }
}
function restoreAnswers(secId) {
  var ans=state.answers[secId]||{};
  var fields=getFields(secId);
  fields.forEach(function(f){
    var key=secId+'_'+f.key; var val=ans[f.key]; if(!val)return;
    if(f.type==='text'||f.type==='textarea'){var el=document.getElementById(key);if(el)el.value=val;}
    else if(f.type==='opts'){var vals=Array.isArray(val)?val:[val];vals.forEach(function(v){var el=document.getElementById('opt_'+key+'_'+v);if(el)el.classList.add('selected');});}
  });
}
function saveCurrentTextareas() {
  var sec=sections[state.currentSection];
  var fields=sec.fields||getFields(sec.id);
  fields.forEach(function(f){
    var key=sec.id+'_'+f.key; var el=document.getElementById(key);
    if(el&&(f.type==='text'||f.type==='textarea'))saveAnswer(sec.id,f.key,el.value);
  });
}
function jumpSection(idx){saveCurrentTextareas();renderSection(idx);}
function nextSection(){saveCurrentTextareas();if(state.currentSection<sections.length-1)renderSection(state.currentSection+1);}
function prevSection(){saveCurrentTextareas();if(state.currentSection>0)renderSection(state.currentSection-1);}

function goToGenerate() {
  saveCurrentTextareas();
  var biz_url=(state.answers.client||{}).biz_url||'';
  var domain=biz_url.replace(/https?:\\/\\//,'').replace(/\\/.*$/,'').replace(/^www\\./,'').trim();
  var clientName=(state.answers.client||{}).biz_name||'Client';
  document.getElementById('loadingDomain').textContent = 'Pulling live data for ' + (domain||clientName) + '...';
  showScreen('loadingScreen');
  document.getElementById('progressWrap').style.display='none';
  function setProgress(pct){
    var ids=['ls0','ls1','ls2','ls3','ls4','ls5'];
    var active=Math.min(Math.floor(pct/17),5);
    ids.forEach(function(id,i){
      var el=document.getElementById(id);if(!el)return;
      var dot=el.querySelector('.step-dot');
      if(i<active){el.className='loading-step done';if(dot)dot.style.background='var(--accent)';}
      else if(i===active){el.className='loading-step active';if(dot)dot.style.background='var(--warn)';}
      else{el.className='loading-step';if(dot)dot.style.background='';}
    });
  }
  var payload={domain:domain,clientName:clientName,mode:state.mode,bizType:state.clientType,
    agency:{name:state.agency.name,email:state.agency.email,color:state.agency.color,logoUrl:state.agency.logoUrl,logoSessionId:sessionId},
    answers:state.answers};
  fetch('/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
  .then(function(resp){
    if(!resp.ok)throw new Error('Server error '+resp.status);
    var reader=resp.body.getReader();var dec=new TextDecoder();var buf='';
    function pump(){
      reader.read().then(function(r){
        if(r.done)return;
        buf+=dec.decode(r.value,{stream:true});
        var parts=buf.split('\\n\\n');buf=parts.pop();
        parts.forEach(function(part){
          if(!part.startsWith('data: '))return;
          try{
            var evt=JSON.parse(part.slice(6));
            if(evt.step==='progress')setProgress(evt.pct||0);
            else if(evt.step==='result')renderReport(evt.report,evt.ahrefs,evt.clientName,evt.domain,evt.agency,evt.research);
            else if(evt.step==='error'){showErrScreen(evt.msg||'Unknown error');}
          }catch(e){console.error(e);}
        });
        pump();
      }).catch(function(e){showErrScreen(e.message);});
    }
    pump();
  }).catch(function(err){showErrScreen(err.message);});
}
function showErrScreen(msg){
  showScreen('loadingScreen');
  document.querySelector('.loading-wrap').innerHTML='<h3 style="color:var(--danger);margin-bottom:12px">Error generating report</h3><p style="color:var(--text2);margin-bottom:20px">'+esc(msg)+'</p><button class="btn-next" onclick="showScreen(\\'questionScreen\\');document.getElementById(\\'progressWrap\\').style.display=\\'\\';">← Back to questionnaire</button>';
}

function renderReport(report, ahrefs, clientName, domain, ag, research) {
  var a=ag||state.agency;
  var color=a.color||'#3cc168';
  var agencyName=a.name||'Your Agency';
  var logoUrl=logoDataUrl||a.logoUrl||'';
  var today=new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
  var initials=agencyName.split(' ').slice(0,2).map(function(w){return w[0];}).join('').toUpperCase()||'A';
  var res=research||{};

  function logoBox(size,rad,fsize){
    var s=size||40;var r=rad||8;
    var style='width:'+s+'px;height:'+s+'px;border-radius:'+r+'px;overflow:hidden;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
    if(logoUrl)return '<div style="'+style+'"><img src="'+logoUrl+'" style="width:100%;height:100%;object-fit:cover"></div>';
    return '<div style="'+style+'background:'+color+';font-weight:700;font-size:'+(fsize||14)+'px;color:#fff">'+initials+'</div>';
  }
  function footer(){
    return '<div class="s-footer"><div style="display:flex;align-items:center;gap:7px">'+logoBox(20,4,9)+'<span style="font-size:11px;font-weight:600;color:#555">'+esc(agencyName)+'</span></div><span>'+esc(clientName)+' — Brand Diagnostic — '+today+'</span><span>Confidential</span></div>';
  }
  function lightSlide(label, content){
    return {label:label,html:'<div class="s-light"><div class="s-light-header"><div style="display:flex;align-items:center;gap:8px">'+logoBox(26,5,10)+'<span style="font-size:12px;font-weight:600;color:#333">'+esc(agencyName)+'</span></div><span style="font-size:12px;color:#999">'+esc(clientName)+' — Brand Diagnostic</span></div><div class="s-light-body">'+content+'</div>'+footer()+'</div>'};
  }
  function tag(t){return '<div class="s-tag" style="background:'+hexRgba(color,.1)+';color:'+color+'">'+t+'</div>';}
  function title(t){return '<div class="s-title">'+esc(t)+'</div><div class="s-line" style="background:'+color+'"></div>';}
  function metCard(val,label,sub,c){return '<div class="r-metric"><div class="r-metric-label">'+esc(label)+'</div><div class="r-metric-val" style="color:'+(c||'#111')+'">'+esc(String(val==null?'—':val))+'</div><div class="r-metric-sub">'+esc(sub||'')+'</div></div>';}
  function fmt(n){if(n==null)return 'N/A';if(n>=1000000)return(n/1000000).toFixed(1)+'M';if(n>=1000)return(n/1000).toFixed(1)+'K';return String(n);}
  function pill(text,type){var colors={ok:'#16a34a',warn:'#d97706',bad:'#dc2626'};var bgs={ok:'#f0fdf4',warn:'#fffbeb',bad:'#fef2f2'};return '<span style="background:'+(bgs[type]||bgs.warn)+';color:'+(colors[type]||colors.warn)+';font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px">'+esc(text)+'</span>';}

  var d=ahrefs||{};
  var dr=d.domain_rating||0;var orgT=d.org_traffic||0;var paidT=d.paid_traffic||0;
  var slides=[];

  // SLIDE 1: COVER
  var shade=shadeColor(color,-50);
  slides.push({label:'Cover',html:
    '<div class="s-cover" style="background:linear-gradient(135deg,'+shade+' 0%,'+color+' 100%)">'
    +'<div style="position:absolute;width:320px;height:320px;border-radius:50%;border:1px solid rgba(255,255,255,.1);top:-80px;right:-60px"></div>'
    +'<div style="position:absolute;width:180px;height:180px;border-radius:50%;border:1px solid rgba(255,255,255,.08);top:40%;right:10%"></div>'
    +'<div style="display:flex;align-items:center;gap:10px;position:relative;z-index:2">'+logoBox(48,10,16)
    +'<div><div style="font-size:14px;font-weight:700;color:rgba(255,255,255,.8)">'+esc(agencyName)+'</div></div></div>'
    +'<div style="position:relative;z-index:2">'
    +'<div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:12px">Brand Diagnostic Report</div>'
    +'<div style="font-family:\\'DM Serif Display\\',serif;font-size:48px;font-weight:900;color:#fff;line-height:1;margin-bottom:8px">Brand<br>Diagnostic</div>'
    +'<div style="width:48px;height:4px;background:rgba(255,255,255,.4);border-radius:99px;margin-bottom:20px"></div>'
    +'<div style="font-size:13px;color:rgba(255,255,255,.4);margin-bottom:4px">Prepared for</div>'
    +'<div style="font-size:30px;font-weight:800;color:#fff">'+esc(clientName)+'</div>'
    +(domain?'<div style="font-size:14px;color:rgba(255,255,255,.6);margin-top:6px">'+esc(domain)+'</div>':'')
    +'<div style="font-size:12px;color:rgba(255,255,255,.3);margin-top:14px">'+today+' · '+(state.mode==='deep'?'Deep Workshop':'Quick Diagnostic')+'</div>'
    +'</div></div>'
  });

  // SLIDE 2: EXECUTIVE SUMMARY
  slides.push(lightSlide('Summary',
    tag('Executive Summary')+title("Where They Are & Where They're Going")
    +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">'
    +['Current Position','Goals & Vision','Recommended Approach'].map(function(t,i){
      var txt=[report.exec_past||report.exec_summary||'',report.exec_future||'',report.exec_agency||''][i]||'';
      return '<div style="background:#f8f9fa;border-radius:10px;padding:16px"><div style="font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:'+color+';margin-bottom:8px">'+t+'</div><p style="font-size:13px;color:#444;line-height:1.6">'+esc(txt)+'</p></div>';
    }).join('')+'</div>'
    +'<div class="r-metric-grid">'
    +metCard(report.revenue_now||'—','Current Revenue','Stated / estimated',color)
    +metCard(report.revenue_target||'—','12-Month Target','Client goal','#111')
    +metCard((report.revenue_forecast_conservative||'—')+'–'+(report.revenue_forecast_optimistic||'—'),'Our Forecast','With agency support',color)
    +'</div>'
  ));

  // SLIDE 3: DIGITAL POSITION
  var kwHtml='';
  if(d.keywords&&d.keywords.length){
    kwHtml='<table class="r-data-table" style="margin-top:16px"><thead><tr><th>Keyword</th><th>Position</th><th>Volume</th><th>Traffic</th></tr></thead><tbody>';
    d.keywords.slice(0,6).forEach(function(k){
      var pos=k.best_position||'—';var posColor=pos<=3?color:pos<=10?'#d97706':'#999';
      kwHtml+='<tr><td>'+esc(k.keyword||'')+'</td><td style="font-weight:700;color:'+posColor+'">'+pos+'</td><td>'+fmt(k.volume)+'</td><td>'+fmt(k.sum_traffic)+'</td></tr>';
    });
    kwHtml+='</tbody></table>';
  }
  slides.push(lightSlide('Digital Position',
    tag('Digital Position')+title('Live Domain Intelligence')
    +'<div class="r-metric-grid cols4">'
    +metCard(dr||'—','Domain Rating','Authority score /100',dr<20?'#dc2626':dr<40?'#d97706':color)
    +metCard(fmt(orgT),'Organic Traffic','Monthly visits','#111')
    +metCard(paidT===0?'None':fmt(paidT),'Paid Traffic','From ads',paidT===0?'#dc2626':'#111')
    +metCard(fmt(d.org_keywords),'Keywords','Ranking in top 100','#111')
    +'</div>'
    +'<div class="r-metric-grid cols4">'
    +metCard(d.org_keywords_1_3||0,'Top 3 Rankings','High-intent positions',d.org_keywords_1_3>0?color:'#dc2626')
    +metCard(fmt(d.backlinks_live),'Backlinks','Live inbound links','#111')
    +metCard(fmt(d.ref_domains),'Ref. Domains','Unique linking domains','#111')
    +metCard(d.org_cost?'$'+Math.round(d.org_cost/100).toLocaleString():'N/A','Traffic Value','/month est.','#111')
    +'</div>'
    +kwHtml
  ));

  // SLIDE 4: COMPETITORS
  var compHtml='';
  if(d.competitors&&d.competitors.length){
    compHtml='<table class="r-data-table"><thead><tr><th>Competitor</th><th>DR</th><th>Traffic</th><th>Common KW</th><th>DR vs You</th></tr></thead><tbody>';
    d.competitors.slice(0,6).forEach(function(c){
      var theirDR=parseFloat(c.domain_rating||0);var diff=Math.round(theirDR-dr);
      var diffColor=diff>10?'#dc2626':diff<-5?'#16a34a':'#d97706';
      compHtml+='<tr><td><strong>'+esc(c.competitor_domain||'')+'</strong></td><td>'+Math.round(theirDR)+'</td><td>'+fmt(c.traffic)+'</td><td>'+fmt(c.keywords_common)+'</td><td style="color:'+diffColor+';font-weight:600">'+(diff>0?'+':'')+diff+'</td></tr>';
    });
    compHtml+='</tbody></table>';
  } else { compHtml='<p style="color:#999;font-size:13px;margin-top:16px">No competitor data returned for this domain.</p>'; }
  var ca=report.competitor_analysis||{};
  slides.push(lightSlide('Competitors',
    tag('Competitive Landscape')+title('How They Stack Up')
    +(ca.summary?'<p style="font-size:14px;color:#444;line-height:1.6;margin-bottom:12px">'+esc(ca.summary)+'</p>':'')
    +compHtml
    +(ca.market_gaps&&ca.market_gaps.length?'<div style="margin-top:14px"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#888;margin-bottom:8px">Market Gaps Identified</div>'
    +ca.market_gaps.map(function(g){return '<div style="background:#f0fdf4;border-left:3px solid #16a34a;border-radius:6px;padding:10px 12px;margin-bottom:8px;font-size:13px;color:#333">'+esc(g)+'</div>';}).join('')+'</div>':'')
  ));

  // SLIDE 5: WEBSITE & CRO AUDIT
  var croScore=res.website_cro_score||'unknown';
  var croBadge=croScore==='excellent'?'ok':croScore==='good'?'ok':croScore==='fair'?'warn':'bad';
  slides.push(lightSlide('Website Audit',
    tag('Website & CRO Audit')+title('What the Website Is Doing')
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">'
    +'<div>'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">'
    +'<div style="font-size:13px;font-weight:600;color:#333">CRO Assessment:</div>'
    +pill(croScore.toUpperCase(),croBadge)
    +'</div>'
    +'<p style="font-size:13px;color:#444;line-height:1.6;margin-bottom:12px">'+esc(res.website_assessment||'Website assessment not available.')+'</p>'
    +(res.website_trust_signals&&res.website_trust_signals.length?'<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#888;margin-bottom:6px">Trust Signals Found</div>'
    +res.website_trust_signals.map(function(s){return '<div style="font-size:12px;color:#333;padding:3px 0;display:flex;gap:6px"><span style="color:#16a34a">✓</span>'+esc(s)+'</div>';}).join(''):'')
    +'</div>'
    +'<div>'
    +(res.website_cro_issues&&res.website_cro_issues.length?'<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#dc2626;margin-bottom:8px">CRO Issues to Fix</div>'
    +res.website_cro_issues.map(function(i){return '<div style="background:#fef2f2;border-left:3px solid #dc2626;border-radius:6px;padding:8px 12px;margin-bottom:6px;font-size:12px;color:#333">'+esc(i)+'</div>';}).join(''):'<p style="font-size:13px;color:#999">CRO issue data not available.</p>')
    +'</div>'
    +'</div>'
    +(res.offer_analysis?'<div style="background:#f8f9fa;border-radius:10px;padding:16px;border-left:4px solid '+color+'"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#888;margin-bottom:6px">Offer Analysis</div>'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><span style="font-size:13px;color:#333">Offer Strength:</span>'+pill((res.offer_strength||'unknown').toUpperCase(),res.offer_strength==='strong'?'ok':res.offer_strength==='moderate'?'warn':'bad')+'</div>'
    +'<p style="font-size:13px;color:#444;line-height:1.6">'+esc(res.offer_analysis)+'</p></div>':'')
  ));

  // SLIDE 6: ADS & REVIEWS AUDIT
  var adsRunning = res.ads_running===true||res.ads_running==='true';
  slides.push(lightSlide('Ads & Reviews',
    tag('Ads Intelligence & Reviews')+title('What the Market Is Saying')
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">'
    +'<div>'
    +'<div style="font-size:13px;font-weight:700;color:#333;margin-bottom:10px">Paid Advertising</div>'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">'
    +pill(adsRunning?'ADS RUNNING':'NO ADS DETECTED',adsRunning?'ok':'bad')
    +(res.ad_platforms&&res.ad_platforms.length?'<span style="font-size:12px;color:#666">'+res.ad_platforms.join(', ')+'</span>':'')
    +'</div>'
    +'<p style="font-size:13px;color:#444;line-height:1.6;margin-bottom:8px">'+esc(res.ad_description||'Paid advertising data not available.')+'</p>'
    +(res.ad_spend_estimate?'<div style="font-size:12px;color:#666">Estimated spend level: <strong>'+esc(res.ad_spend_estimate)+'</strong></div>':'')
    +(res.social_platforms&&res.social_platforms.length?'<div style="margin-top:14px"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#888;margin-bottom:8px">Social Media Presence</div>'
    +res.social_platforms.map(function(p){return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:13px"><span style="font-weight:600">'+esc(p.platform||'')+'</span><span style="color:#666">'+esc(p.followers||'')+'</span><span>'+pill(p.activity||'unknown',p.activity==='high'?'ok':p.activity==='medium'?'warn':'bad')+'</span></div>';}).join('')+'</div>':'')
    +'</div>'
    +'<div>'
    +'<div style="font-size:13px;font-weight:700;color:#333;margin-bottom:10px">Customer Reviews</div>'
    +(res.avg_rating?'<div style="font-size:28px;font-weight:900;color:'+color+';margin-bottom:4px">'+esc(res.avg_rating)+'</div>':'')
    +(res.review_count?'<div style="font-size:12px;color:#888;margin-bottom:10px">'+esc(res.review_count)+' reviews found</div>':'')
    +'<p style="font-size:13px;color:#444;line-height:1.6;margin-bottom:12px">'+esc(res.review_summary||'Review data not available.')+'</p>'
    +(res.common_praise&&res.common_praise.length?'<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#16a34a;margin-bottom:6px">What Customers Love</div>'
    +res.common_praise.map(function(p){return '<div style="font-size:12px;color:#333;padding:3px 0"><span style="color:#16a34a">✓ </span>'+esc(p)+'</div>';}).join(''):'')
    +(res.common_complaints&&res.common_complaints.length?'<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#dc2626;margin:10px 0 6px">Common Complaints</div>'
    +res.common_complaints.map(function(c){return '<div style="font-size:12px;color:#333;padding:3px 0"><span style="color:#dc2626">✗ </span>'+esc(c)+'</div>';}).join(''):'')
    +'</div>'
    +'</div>'
  ));

  // SLIDE 7: PERSONAS
  if(report.personas&&report.personas.length){
    var p=report.personas[0];
    slides.push(lightSlide('Avatar',
      tag('Customer Avatar')+title("Who's Buying — And Why")
      +'<div class="r-persona"><div class="r-persona-name">'+esc(p.name||'')+'</div><div class="r-persona-who">'+esc(p.who||p.tagline||'')+'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px">'
      +'<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:'+color+';margin-bottom:6px">Dream Outcome</div><p style="font-size:13px;color:#444;font-style:italic">"'+esc(p.dream_outcome||'')+'"</p></div>'
      +'<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#dc2626;margin-bottom:6px">Pain Points</div>'+(p.pains||[]).map(function(x){return '<span class="r-persona-tag">'+esc(x)+'</span>';}).join('')+'</div>'
      +'<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#d97706;margin-bottom:6px">Objections</div>'+(p.objections||[]).map(function(x){return '<span class="r-persona-tag">'+esc(x)+'</span>';}).join('')+'</div>'
      +'</div>'
      +(p.messaging_hook?'<div style="margin-top:14px;background:'+hexRgba(color,.08)+';border-left:3px solid '+color+';border-radius:0 8px 8px 0;padding:14px"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:'+color+';margin-bottom:4px">Messaging Hook</div><div style="font-size:14px;color:#333;font-weight:600;font-style:italic">'+esc(p.messaging_hook)+'</div></div>':'')
      +'</div>'
    ));
  }

  // SLIDE 8: GAP ANALYSIS
  var allGaps = report.gaps||report.gap_analysis||[];
  var gapHtml='<div style="margin-top:14px">';
  allGaps.forEach(function(g){
    var type=g.type||(g.priority==='high'?'critical':g.priority==='medium'?'warning':'opportunity');
    gapHtml+='<div class="r-gap '+type+'"><div class="r-gap-title">'+esc(g.title||'')+'</div><div class="r-gap-desc">'+esc(g.desc||'')+'</div></div>';
  });
  gapHtml+='</div>';
  if(res.biggest_digital_gap){
    gapHtml='<div style="background:'+hexRgba(color,.08)+';border:2px solid '+color+';border-radius:10px;padding:14px;margin-bottom:14px;display:flex;gap:10px"><div style="font-size:24px">🎯</div><div><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:'+color+';margin-bottom:4px">Biggest Digital Gap Detected</div><div style="font-size:14px;color:#333;font-weight:600">'+esc(res.biggest_digital_gap)+'</div></div></div>'+gapHtml;
  }
  slides.push(lightSlide('Gaps',
    tag('Gap Analysis')+title('Where the Revenue Is Being Lost')+gapHtml
  ));

  // SLIDE 9: FORECAST
  var fc=report.forecast||{};
  slides.push(lightSlide('Forecast',
    tag('Revenue Forecast')+title('The Financial Opportunity')
    +'<div class="r-metric-grid">'
    +metCard(report.revenue_now||fc.current_revenue||'—','Current Revenue','Today','#111')
    +metCard(report.revenue_forecast_conservative||fc.conservative_12m||'—','Conservative 12m','Foundational fixes',color)
    +metCard(report.revenue_forecast_optimistic||fc.optimistic_12m||'—','Optimistic 12m','Full execution',color)
    +'</div>'
    +(report.forecast_reasoning||fc.key_assumptions?'<div style="background:#f8f9fa;border-radius:10px;padding:16px;border-left:4px solid '+color+';margin-top:4px"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#888;margin-bottom:6px">Forecast Rationale</div><div style="font-size:13px;color:#444;line-height:1.6">'+esc(report.forecast_reasoning||(fc.key_assumptions||[]).join(' '))+'</div></div>':'')
    +(fc.revenue_per_channel&&fc.revenue_per_channel.length?'<table class="r-data-table" style="margin-top:14px"><thead><tr><th>Channel</th><th>Current</th><th>12m Potential</th></tr></thead><tbody>'
    +fc.revenue_per_channel.map(function(r){return '<tr><td><strong>'+esc(r.channel||'')+'</strong></td><td style="color:#999">'+esc(r.current||'—')+'</td><td style="color:'+color+';font-weight:700">'+esc(r.potential||'—')+'</td></tr>';}).join('')+'</tbody></table>':'')
  ));

  // SLIDE 10: ROADMAP
  var rm=report.roadmap||[];
  var rmHtml='<div class="r-roadmap">';
  rm.forEach(function(m,i){var c=i<2?color:i<4?'#f0a500':'#3b82f6';
    rmHtml+='<div class="r-rm-card" style="border-color:'+c+'"><div class="r-rm-month" style="color:'+c+'">'+esc(m.month||m.phase||'')+'</div><div class="r-rm-label">'+esc(m.label||'')+'</div><ul class="r-rm-items">'+(m.items||[]).map(function(it){var t=typeof it==='string'?it:(it.task||'');return '<li>'+esc(t)+'</li>';}).join('')+'</ul></div>';
  });
  rmHtml+='</div>';
  slides.push(lightSlide('Roadmap',tag('6-Month Roadmap')+title('The Plan to Get There')+rmHtml));

    // SLIDE 11: CHECKLIST
  var rawChk=report.checklist||report.onboarding_checklist||[];
  // Normalise: handle both flat [{task,phase}] and grouped [{phase,items:[]}] formats
  var chkGroups={};
  var chkOrder=[];
  rawChk.forEach(function(item){
    if(item.items){
      // Grouped format
      var ph=item.phase||'General';
      if(!chkGroups[ph]){chkGroups[ph]=[];chkOrder.push(ph);}
      (item.items||[]).forEach(function(it){chkGroups[ph].push(typeof it==='string'?it:(it.task||it));});
    } else if(item.task){
      // Flat format
      var ph=item.phase||'Foundation';
      if(!chkGroups[ph]){chkGroups[ph]=[];chkOrder.push(ph);}
      chkGroups[ph].push(item.task+(item.detail?' — '+item.detail:''));
    }
  });
  var chkHtml='<ul style="list-style:none;margin-top:14px">';
  var phaseColors={Foundation:color,Acquisition:'#3b82f6',Conversion:'#d97706',Retention:'#8b5cf6',Scale:'#ef4444',General:'#6b7280'};
  chkOrder.forEach(function(ph){
    var phColor=phaseColors[ph]||color;
    chkHtml+='<li style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:'+phColor+';margin:14px 0 6px;padding-bottom:4px;border-bottom:1px solid '+phColor+'22">'+esc(ph)+'</li>';
    (chkGroups[ph]||[]).forEach(function(task){
      chkHtml+='<li class="r-chk-item" onclick="this.classList.toggle(\\'checked\\')">\<div class="r-chk-box">✓</div><span class="r-chk-text">'+esc(task)+'</span></li>';
    });
  });
  if(chkOrder.length===0){chkHtml+='<li style="color:#999;font-size:13px;padding:10px 0">No checklist data available.</li>';}
  chkHtml+='</ul>';
  slides.push(lightSlide('Checklist',tag('Onboarding Checklist')+title('Getting Started — Tick It Off')+chkHtml));

  // SLIDE 12: CLOSING
  var cl=report.closing||{};
  slides.push(lightSlide('Next Steps',
    tag('Closing Recommendation')+title('The Single Most Important Next Step')
    +'<div style="background:'+color+';border-radius:12px;padding:28px;margin-bottom:20px">'
    +(cl.headline?'<div style="font-family:\\'DM Serif Display\\',serif;font-size:20px;color:#fff;margin-bottom:12px">'+esc(cl.headline)+'</div>':'')
    +'<div style="font-size:15px;color:rgba(255,255,255,.9);line-height:1.7">'+esc(cl.narrative||report.closing||'')+'</div>'
    +(cl.next_step?'<div style="margin-top:16px;background:rgba(255,255,255,.15);border-radius:8px;padding:12px 16px;font-size:14px;font-weight:700;color:#fff">Next Step: '+esc(cl.next_step)+'</div>':'')
    +'</div>'
    +'<div style="display:flex;gap:14px">'
    +'<div style="flex:1;background:#f8f9fa;border-radius:10px;padding:16px;text-align:center"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#888;margin-bottom:4px">Prepared by</div><div style="font-size:15px;font-weight:700;color:#111">'+esc(agencyName)+'</div><div style="font-size:13px;color:#888">'+esc(a.email||'')+'</div></div>'
    +'<div style="flex:1;background:#f8f9fa;border-radius:10px;padding:16px;text-align:center"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#888;margin-bottom:4px">Report Date</div><div style="font-size:15px;font-weight:700;color:#111">'+today+'</div><div style="font-size:13px;color:#888">'+(state.mode==='deep'?'Deep Diagnostic':'Quick Diagnostic')+'</div></div>'
    +'</div>'
  ));

  slideCount=slides.length;
  state.currentSlide=0;
  window._reportSlides=slides;
  window._reportData={report,ahrefs,research,clientName,domain,agencyName,color,logoUrl};

  var navHtml='';
  slides.forEach(function(s,i){navHtml+='<span class="slide-nav-btn'+(i===0?' active':'')+'" id="snb_'+i+'" onclick="goToSlide('+i+')">'+esc(s.label)+'</span>';});
  document.getElementById('slideNavInner').innerHTML=navHtml;
  document.getElementById('slideCounter').textContent='1 / '+slideCount;

  var slidesHtml='';
  slides.forEach(function(s,i){slidesHtml+='<div class="slide'+(i===0?' active':'')+'" id="slide_'+i+'">'+s.html+'</div>';});
  document.getElementById('slidesWrap').innerHTML=slidesHtml;

  showScreen('reportScreen');
}

function goToSlide(i){
  if(i<0||i>=slideCount)return;
  document.querySelectorAll('.slide').forEach(function(s){s.classList.remove('active');});
  document.querySelectorAll('.slide-nav-btn').forEach(function(b){b.classList.remove('active');});
  var slide=document.getElementById('slide_'+i);var btn=document.getElementById('snb_'+i);
  if(slide)slide.classList.add('active');
  if(btn){btn.classList.add('active');btn.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});}
  state.currentSlide=i;
  document.getElementById('slideCounter').textContent=(i+1)+' / '+slideCount;
  window.scrollTo(0,60);
}
function prevSlide(){goToSlide(state.currentSlide-1);}
function nextSlide(){goToSlide(state.currentSlide+1);}

function backToQuestionnaire(){
  showScreen('questionScreen');
  document.getElementById('progressWrap').style.display='';
  renderSection(state.currentSection);
}
function startOver(){
  if(!confirm('Start a new diagnostic? This will clear all current data.'))return;
  state.answers={};state.mode=null;state.clientType=null;state.currentSection=0;state.currentSlide=0;
  document.getElementById('modeQuick').classList.remove('selected');
  document.getElementById('modeDeep').classList.remove('selected');
  document.getElementById('startBtn').disabled=true;
  document.getElementById('progressWrap').style.display='none';
  showScreen('modeScreen');
}
function downloadHTML(){
  var d=window._reportData;if(!d){alert('Generate a report first');return;}
  var slides=window._reportSlides||[];
  var html='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Brand Diagnostic — '+esc(d.clientName)+'</title>'
    +'<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet">'
    +'<style>body{font-family:Inter,sans-serif;background:#fff;margin:0;padding:20px}'+document.querySelector('style').textContent+'</style></head><body>';
  slides.forEach(function(s){html+='<div style="margin-bottom:40px;page-break-after:always">'+s.html+'</div>';});
  html+='</body></html>';
  var blob=new Blob([html],{type:'text/html'});var url=URL.createObjectURL(blob);
  var a=document.createElement('a');a.href=url;a.download=(d.clientName||'client').replace(/\\s+/g,'-')+'_brand_diagnostic.html';
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
}
function showScreen(id){document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('active');});document.getElementById(id).classList.add('active');}
function showToast(msg,type){var t=document.getElementById('toast');t.textContent=msg;t.className='toast show '+(type||'');setTimeout(function(){t.classList.remove('show');},3000);}
function esc(s){if(!s)return '';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function shadeColor(hex,pct){var num=parseInt(hex.replace('#',''),16);var r=Math.min(255,Math.max(0,(num>>16)+pct));var g=Math.min(255,Math.max(0,((num>>8)&0xff)+pct));var b=Math.min(255,Math.max(0,(num&0xff)+pct));return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);}
function hexRgba(hex,alpha){var num=parseInt(hex.replace('#',''),16);return 'rgba('+((num>>16)&255)+','+((num>>8)&255)+','+(num&255)+','+alpha+')';}
document.addEventListener('keydown',function(e){
  if(!document.getElementById('reportScreen').classList.contains('active'))return;
  if(e.key==='ArrowRight'||e.key==='ArrowDown')nextSlide();
  if(e.key==='ArrowLeft'||e.key==='ArrowUp')prevSlide();
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
    // Detect country from domain TLD
    const tld = domain.split('.').pop().toLowerCase();
    const countryMap = {'au':'au','uk':'gb','co.uk':'gb','nz':'nz','ca':'ca','ie':'ie','sg':'sg','in':'in','za':'za'};
    const detectedCountry = countryMap[tld] || 'us';

    const compData = await ahrefsGet('site-explorer/organic-competitors', {
      target: domain, date: ahrefsDate(), mode: 'subdomains',
      country: detectedCountry, limit: 6, order_by: 'traffic:desc',
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

    send('progress', { msg: 'Running AI analysis (5 parallel passes)...', pct: 82 });
    const report = await runAnalysis(clientName, domain, mode, bizType, ahrefs, research, answers);
    report.web_research = research;

    send('progress', { msg: 'Done', pct: 100 });
    // Pass agency back so logo session ID is available client-side
    send('result', { ahrefs, report, clientName, domain, agency, research });
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
      max_tokens: 3000,
      system: 'You are a senior brand and digital marketing analyst. Search the web thoroughly. Return ONLY valid JSON with no markdown, no code fences, no extra text.',
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: 'Do a thorough research audit of "' + clientName + '" (website: https://' + domain + '). Search for reviews, ads presence (Meta Ad Library, Google Transparency), website quality, their offer and pricing, social media presence, and recent news.\n\nReturn ONLY this JSON:\n{"review_summary":"","avg_rating":"e.g. 4.2/5 (127 Google reviews)","review_count":"","common_praise":[],"common_complaints":[],"review_platforms":[],"ads_running":false,"ad_platforms":[],"ad_description":"","ad_spend_estimate":"low/medium/high","website_assessment":"","website_cro_score":"poor/fair/good/excellent","website_trust_signals":[],"website_cro_issues":[],"offer_analysis":"","offer_strength":"weak/moderate/strong","pricing_visible":false,"social_presence":"","social_platforms":[{"platform":"","followers":"","activity":""}],"content_strategy":"","recent_news":[],"brand_reputation":"positive/mixed/negative","competitive_position":"","biggest_digital_gap":""}'
      }]
    });
    const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const clean = text.replace(/```[\w]*/g, '').replace(/```/g, '').trim();
    const s = clean.indexOf('{'), e = clean.lastIndexOf('}');
    if (s >= 0 && e > s) return JSON.parse(clean.substring(s, e + 1));
  } catch (err) {
    console.warn('Web research failed:', err.message);
  }
  return {
    review_summary: 'Research unavailable', avg_rating: '', review_count: '', common_praise: [], common_complaints: [],
    review_platforms: [], ads_running: false, ad_platforms: [], ad_description: 'Could not detect',
    ad_spend_estimate: 'unknown', website_assessment: 'Unable to assess', website_cro_score: 'unknown',
    website_trust_signals: [], website_cro_issues: [], offer_analysis: 'Unable to analyse',
    offer_strength: 'unknown', pricing_visible: false, social_presence: 'Unknown',
    social_platforms: [], content_strategy: 'Unknown', recent_news: [],
    brand_reputation: 'Unknown', competitive_position: 'Unknown', biggest_digital_gap: 'Unable to determine'
  };
}

// ─── Multi-pass AI Analysis Engine ───────────────────────────────────────────
// Each pass focuses deeply on one area. Results are combined into a rich report.

async function runAnalysis(clientName, domain, mode, bizType, ahrefs, research, answers) {
  const q = answers || {};
  const isDeep = mode === 'deep';

  // Build a shared context string used across all passes
  const ctx = buildContext(clientName, domain, bizType, ahrefs, research, q);

  // Run passes in parallel where possible
  const [
    execAndScores,
    gapAndForecast,
    personaAndOffer,
    competitorIntel,
    roadmapAndChecklist
  ] = await Promise.all([
    pass_execAndScores(ctx, clientName, domain, ahrefs, research, isDeep),
    pass_gapAndForecast(ctx, clientName, ahrefs, research, isDeep),
    pass_personaAndOffer(ctx, clientName, research, q, isDeep),
    pass_competitorIntel(ctx, clientName, domain, ahrefs, research, isDeep),
    pass_roadmapAndChecklist(ctx, clientName, bizType, ahrefs, research, isDeep)
  ]);

  // Merge all passes into one report object
  return {
    ...execAndScores,
    ...gapAndForecast,
    ...personaAndOffer,
    ...competitorIntel,
    ...roadmapAndChecklist
  };
}

function buildContext(clientName, domain, bizType, ahrefs, research, q) {
  return `
CLIENT: ${clientName} | DOMAIN: ${domain} | TYPE: ${bizType}
FINANCIALS: Revenue ${(q.financials||{}).fin_revenue} → Target ${(q.financials||{}).fin_target} | Ad spend: ${(q.financials||{}).fin_adspend}
GOALS: ${(q.financials||{}).fin_goals}
BRAND: ${(q.brand||{}).brand_desc} | USP: ${(q.brand||{}).brand_usp}
OBSTACLES: ${(q.obstacles||{}).obs_main} | Tried: ${(q.obstacles||{}).obs_tried}
MARKETING: Channels: ${JSON.stringify((q.marketing||{}).mkt_channels)} | Best: ${(q.marketing||{}).mkt_best}
COMPETITORS (stated): ${(q.competitors||{}).comp_main}
PRODUCTS: ${(q.products||{}).prod_main} | AOV: ${(q.products||{}).prod_aov}
RETENTION: LTV: ${(q.retention||{}).ret_ltv} | Strategy: ${(q.retention||{}).ret_strategy}
PERSONAS: ${(q.personas||{}).persona_who} | Journey: ${(q.personas||{}).persona_journey}
PAIN POINTS: Before: ${(q.painpoints||{}).pain_before} | Dream: ${(q.painpoints||{}).pain_dream}
OBJECTIONS: ${(q.objections||{}).obj_main} | Handling: ${(q.objections||{}).obj_handle}
REVIEWS (stated): ${(q.reviews||{}).rev_rating} | Positive: ${(q.reviews||{}).rev_positive}

LIVE AHREFS DATA:
DR: ${ahrefs.domain_rating}/100 | Organic: ${(ahrefs.org_traffic||0).toLocaleString()}/mo | Paid: ${ahrefs.paid_traffic||0}
Keywords: ${ahrefs.org_keywords||0} total (${ahrefs.org_keywords_1_3||0} in top 3)
Backlinks: ${ahrefs.backlinks_live||0} | Ref domains: ${ahrefs.ref_domains||0}
Traffic value: ${ahrefs.org_cost ? '$'+Math.round(ahrefs.org_cost/100).toLocaleString()+'/mo' : 'N/A'}
Top keywords: ${JSON.stringify((ahrefs.keywords||[]).slice(0,6))}

WEB RESEARCH:
Reviews: ${research.avg_rating} (${research.review_count}) | Sentiment: ${research.brand_reputation}
Praise: ${(research.common_praise||[]).join('; ')}
Complaints: ${(research.common_complaints||[]).join('; ')}
Ads: ${research.ads_running ? 'RUNNING on '+((research.ad_platforms||[]).join(', ')) : 'NOT DETECTED'} | ${research.ad_description}
Website CRO: ${research.website_cro_score} | ${research.website_assessment}
CRO Issues: ${(research.website_cro_issues||[]).join('; ')}
Offer: ${research.offer_strength} — ${research.offer_analysis}
Social: ${research.social_presence}
Biggest gap from research: ${research.biggest_digital_gap}
`;
}

async function pass_execAndScores(ctx, clientName, domain, ahrefs, research, isDeep) {
  const prompt = `You are a world-class brand strategist producing a paid brand diagnostic for ${clientName}.

${ctx}

TASK: Write a sharp, specific executive summary and performance health scorecard. Use REAL numbers from the Ahrefs and research data. Be commercially direct — this is a paid deliverable.

Return ONLY valid JSON:
{
  "exec_past": "3-4 sentences: their current position using specific numbers (DR, traffic, revenue band, what's working/not). Name the domain. Cite actual Ahrefs metrics.",
  "exec_future": "2-3 sentences: their stated goals, timeline, and what achieving it would mean for the business.",
  "exec_agency": "2-3 sentences: the strategic approach this agency recommends — specific, not generic.",
  "revenue_now": "stated/estimated current revenue",
  "revenue_target": "their stated 12-month target",
  "revenue_forecast_conservative": "conservative 12-month forecast with agency support",
  "revenue_forecast_optimistic": "optimistic 12-month forecast",
  "forecast_reasoning": "3-4 sentences: specific reasoning citing channels, conversion assumptions, and which gaps drive the uplift",
  "health_scores": {
    "seo": 0,
    "paid": 0,
    "content": 0,
    "brand": 0,
    "conversion": 0,
    "retention": 0
  },
  "health_notes": {
    "seo": "1 specific sentence on why this score — cite DR, keyword count, top-3 rankings",
    "paid": "1 specific sentence — cite whether ads detected, spend level, platform",
    "content": "1 specific sentence — cite content strategy finding from research",
    "brand": "1 specific sentence — cite offer strength, CRO score, messaging clarity",
    "conversion": "1 specific sentence — cite CRO assessment, website issues found",
    "retention": "1 specific sentence — cite LTV, churn, retention strategy"
  },
  "digital_analysis": {
    "summary": "4-5 sentences using specific Ahrefs numbers. Mention the DR, compare paid vs organic, highlight the most important signal. Be direct about what the numbers mean commercially.",
    "signals": [
      {"label": "specific signal name", "status": "good|warn|bad", "value": "specific metric", "insight": "what this means for revenue"}
    ],
    "keyword_opportunity": "specific untapped keyword opportunity based on their niche and current rankings",
    "paid_gap": "specific assessment of their paid advertising gap and what it is costing them monthly"
  }
}`;

  return await callClaude(prompt, 2000, true);
}

async function pass_gapAndForecast(ctx, clientName, ahrefs, research, isDeep) {
  const prompt = `You are a senior growth strategist. Analyse the data below and identify the most commercially significant gaps for ${clientName}.

${ctx}

TASK: Produce a rigorous gap analysis and revenue forecast. Each gap must have a specific revenue impact estimate. Use the Ahrefs data and web research to ground every finding — no generic gaps.

Return ONLY valid JSON:
{
  "gaps": [
    {
      "title": "specific gap title",
      "type": "critical|opportunity|warning",
      "desc": "3-4 sentences: what the gap is, specific evidence from the data (cite Ahrefs numbers or research findings), estimated monthly/annual revenue being lost or left on the table, and why fixing it should be prioritised",
      "revenue_impact": "e.g. $8,000-$15,000/month opportunity",
      "effort": "low|medium|high",
      "timeframe": "e.g. 2-4 weeks to implement"
    }
  ],
  "forecast": {
    "current_revenue": "stated or estimated",
    "conservative_12m": "with foundational fixes only",
    "optimistic_12m": "with full strategy execution",
    "revenue_per_channel": [
      {"channel": "channel name", "current": "current contribution", "potential": "12-month potential"}
    ],
    "key_assumptions": ["specific assumption 1", "specific assumption 2", "specific assumption 3"]
  }
}

Rules:
- Minimum 5 gaps for quick mode, 8 gaps for deep mode
- Every gap must cite specific data (a number, a finding, a missing element)
- Revenue impact must be specific (not "significant" — give a dollar range)
- Include gaps from: SEO, paid ads, CRO, email/retention, offer, brand, content, social proof`;

  const result = await callClaude(prompt, 2500, false);
  // Also search for additional competitive intelligence
  if (isDeep) {
    try {
      const extraResearch = await callClaudeWithSearch(
        `Research the competitive paid advertising landscape for businesses like ${clientName} in their industry. What are competitors spending on ads? What keywords are they bidding on? What offers are converting in this market? What benchmarks should ${clientName} be targeting for CAC, ROAS, and conversion rates? Return specific, actionable intelligence.`,
        1000
      );
      if (result.gaps && extraResearch) {
        result.competitive_ad_intel = extraResearch;
      }
    } catch(e) { console.warn('Extra research failed:', e.message); }
  }
  return result;
}

async function pass_personaAndOffer(ctx, clientName, research, q, isDeep) {
  const prompt = `You are a direct response copywriter and customer psychology expert analysing ${clientName}.

${ctx}

TASK: Build a detailed customer avatar and offer analysis. Use the questionnaire answers AND the web research (especially reviews) to make this specific and real. The persona should feel like a real person, not a template.

Return ONLY valid JSON:
{
  "personas": [
    {
      "name": "specific persona name (not 'Persona 1')",
      "tagline": "one-line description of who they are",
      "who": "specific demographics and psychographics",
      "income": "income range and financial situation",
      "dream_outcome": "their specific dream outcome in their own words",
      "trigger": "the exact moment/event that makes them decide to buy",
      "pains": ["specific pain 1 (from reviews/questionnaire)", "specific pain 2", "specific pain 3", "specific pain 4"],
      "objections": ["most common objection 1", "objection 2", "objection 3"],
      "product_focus": ["which offers resonate most"],
      "messaging_hook": "a specific, emotionally resonant hook this agency should test in ads and copy",
      "where_to_find": "exactly where this person spends time online — platforms, communities, content they consume",
      "buying_process": "how long, how many touchpoints, what convinces them"
    }
  ],
  "offer_analysis": {
    "offer_strength": "weak|moderate|strong",
    "pricing_assessment": "specific assessment of whether pricing is competitive, too high, too low",
    "value_proposition_clarity": "poor|fair|good|excellent",
    "missing_elements": ["what the offer is missing vs best-in-class competitors"],
    "conversion_killers": ["specific things on the website/in the sales process killing conversions"],
    "quick_wins": ["3-5 specific changes to the offer or positioning that could increase conversions immediately"],
    "upsell_opportunities": ["specific upsell or cross-sell opportunities they are missing"]
  }
}`;

  return await callClaude(prompt, 2000, false);
}

async function pass_competitorIntel(ctx, clientName, domain, ahrefs, research, isDeep) {
  const competitors = (ahrefs.competitors || []).slice(0, 5);
  const prompt = `You are a competitive intelligence analyst. Analyse the market position of ${clientName} (${domain}).

${ctx}

AHREFS COMPETITOR DATA: ${JSON.stringify(competitors)}

TASK: Produce a sharp competitor analysis that identifies where ${clientName} can win, where they are losing, and specific gaps in the market they can exploit. If ads are running, analyse the messaging. Be specific.

Return ONLY valid JSON:
{
  "competitor_analysis": {
    "summary": "4-5 sentences on the competitive landscape — who the real threats are, how ${clientName} stacks up on DR/traffic, what the market looks like",
    "strengths_vs_competitors": ["specific advantage 1 with evidence", "advantage 2", "advantage 3"],
    "weaknesses_vs_competitors": ["specific weakness 1 with evidence", "weakness 2", "weakness 3"],
    "market_gaps": ["specific gap in the market competitors are not filling", "gap 2", "gap 3"],
    "positioning_opportunity": "specific positioning recommendation — what angle ${clientName} should own that competitors are not",
    "keyword_gaps": ["specific high-value keyword competitors rank for that ${clientName} does not"],
    "content_gaps": ["specific content topics competitors are winning on that ${clientName} should create"]
  },
  "review_insights": {
    "overall_sentiment": "positive|mixed|negative",
    "avg_rating": "rating if found",
    "key_themes": ["theme 1", "theme 2", "theme 3"],
    "trust_signals": ["what builds trust with this audience"],
    "reputation_risks": ["specific reputation gaps or risks"],
    "recommendation": "specific action to improve review volume and sentiment"
  }
}`;

  return await callClaude(prompt, 1500, false);
}

async function pass_roadmapAndChecklist(ctx, clientName, bizType, ahrefs, research, isDeep) {
  const numPhases = isDeep ? 6 : 3;
  const prompt = `You are a digital marketing director creating an execution roadmap for ${clientName}.

${ctx}

TASK: Create a specific, prioritised ${numPhases}-phase roadmap and detailed onboarding checklist. Every action must be specific to this business — no generic templates. Order by highest-impact-first within each phase. The checklist should be the literal first 90 days of work.

Return ONLY valid JSON:
{
  "roadmap": [
    {
      "phase": "Phase 1",
      "months": "Month 1-2",
      "label": "Foundation & Quick Wins",
      "items": [
        {"task": "specific action", "detail": "why this matters for ${clientName} specifically, expected outcome"},
        {"task": "specific action 2", "detail": "detail"}
      ]
    }
  ],
  "checklist": [
    {
      "phase": "Foundation",
      "items": [
        "Set up Google Analytics 4 with purchase/lead conversion events",
        "Install Meta Pixel + Conversions API",
        "Connect Google Search Console",
        "Set up Google Tag Manager"
      ]
    },
    {
      "phase": "Acquisition",
      "items": [
        "specific acquisition task for ${clientName}",
        "specific task 2"
      ]
    },
    {
      "phase": "Conversion",
      "items": ["specific CRO task based on issues found", "specific task 2"]
    },
    {
      "phase": "Retention",
      "items": ["specific retention task", "specific task 2"]
    }
  ],
  "closing": {
    "headline": "a specific, commercially compelling headline summarising the opportunity",
    "narrative": "4-5 sentences: what this diagnostic has revealed, the specific opportunity size, why acting now matters, what the cost of inaction is (use specific numbers where possible)",
    "next_step": "one specific, concrete next step with a timeframe"
  }
}

Rules:
- ${isDeep ? 'Create all 6 phases, minimum 3 specific actions per phase' : 'Create 3 phases, minimum 3 specific actions per phase'}
- Every roadmap item must reference something specific about ${clientName}'s situation
- Checklist items must be in the order an agency would actually do them in week 1-8
- Closing narrative must mention a specific number (revenue opportunity, traffic gap, conversion rate)`;

  return await callClaude(prompt, 2000, false);
}

// ─── Claude API helpers ───────────────────────────────────────────────────────
async function callClaude(prompt, maxTokens, useSearch) {
  const tools = useSearch ? [{ type: 'web_search_20250305', name: 'web_search' }] : undefined;
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens || 2000,
    system: 'You are a world-class brand strategist and growth consultant. Every output is a paid deliverable. Be specific, commercially sharp, and data-driven. Use real numbers. No generic filler. Return ONLY valid JSON — no markdown, no fences, no extra text.',
    tools: tools,
    messages: [{ role: 'user', content: prompt }]
  });
  const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
  const clean = text.replace(/```[\w]*/g, '').replace(/```/g, '').trim();
  const s = clean.indexOf('{'), e = clean.lastIndexOf('}');
  if (s >= 0 && e > s) return JSON.parse(clean.substring(s, e + 1));
  throw new Error('Failed to parse JSON from Claude response');
}

async function callClaudeWithSearch(prompt, maxTokens) {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens || 1000,
    system: 'You are a competitive intelligence analyst. Search the web and return specific, actionable findings. Be concise and direct.',
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: [{ role: 'user', content: prompt }]
  });
  return msg.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
}


app.listen(PORT, () => console.log(`Brand Diagnostic running on port ${PORT}`));
