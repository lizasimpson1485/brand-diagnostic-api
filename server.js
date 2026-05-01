const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(cors());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const AHREFS_API_KEY = process.env.AHREFS_API_KEY;
const PORT = process.env.PORT || 3000;

// ─── Serve the Brand Diagnostic tool as the landing page ───────────────────
const TOOL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Brand Diagnostic Tool</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#071a0e;color:#fff;min-height:100vh}
:root{--green:#3cc168;--green-light:#a8ffd0;--green-dim:#1a5c35;--card:#0e2618;--field:#162b1f;--border:#1e4a2a;--muted:#6b8f74}

/* TOP BAR */
.topbar{background:#050f09;border-bottom:1px solid var(--border);padding:0 32px;display:flex;align-items:center;justify-content:space-between;height:60px;position:sticky;top:0;z-index:100}
.topbar-brand{display:flex;align-items:center;gap:12px}
.topbar-logo{width:36px;height:36px;border-radius:8px;background:var(--green);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#071a0e;cursor:pointer}
.topbar-name{font-weight:600;font-size:15px;cursor:pointer}
.topbar-right{display:flex;align-items:center;gap:16px}
.mode-badge{padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase}
.mode-quick{background:#0d3320;color:var(--green-light);border:1px solid var(--green-dim)}
.mode-deep{background:#1a1a0d;color:#ffd580;border:1px solid #4a4a0d}

/* SECTION TABS */
.tabs-wrap{background:#050f09;border-bottom:1px solid var(--border);padding:0 32px;overflow-x:auto;white-space:nowrap}
.tabs{display:inline-flex;gap:0}
.tab{padding:14px 18px;font-size:12px;font-weight:500;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;transition:all .15s;letter-spacing:.03em;white-space:nowrap}
.tab:hover{color:#fff}
.tab.active{color:var(--green-light);border-bottom-color:var(--green-light)}
.tab.done{color:var(--green)}
.tab.locked{opacity:.4;cursor:not-allowed}

/* MAIN CONTENT */
.main{max-width:760px;margin:0 auto;padding:40px 24px 80px}
.section-header{margin-bottom:32px}
.section-num{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:var(--green);color:#071a0e;font-weight:700;font-size:13px;margin-bottom:12px}
.section-title{font-size:24px;font-weight:700;color:#fff;margin-bottom:6px}
.section-sub{font-size:14px;color:var(--muted)}

/* FIELDS */
.field{margin-bottom:24px}
.field label{display:block;font-size:13px;font-weight:500;color:#fff;margin-bottom:8px;letter-spacing:.02em}
.field input,.field textarea,.field select{width:100%;background:var(--field);border:1px solid var(--border);border-radius:8px;padding:12px 14px;font-size:14px;color:#fff;font-family:'Inter',sans-serif;outline:none;transition:border-color .15s}
.field input::placeholder,.field textarea::placeholder{color:var(--muted)}
.field input:focus,.field textarea:focus,.field select:focus{border-color:var(--green)}
.field select option{background:#0e2618}
.field textarea{min-height:80px;resize:vertical}

/* COLOR PICKER */
.color-row{display:flex;align-items:center;gap:12px}
.color-row input[type=color]{width:44px;height:44px;border-radius:8px;border:1px solid var(--border);background:none;cursor:pointer;padding:2px}
.color-row input[type=text]{flex:1}

/* OPTION CARDS */
.options-grid{display:grid;gap:10px}
.options-grid.cols2{grid-template-columns:1fr 1fr}
.options-grid.cols3{grid-template-columns:1fr 1fr 1fr}
.opt-card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px 16px;cursor:pointer;transition:all .15s;text-align:left}
.opt-card:hover{border-color:var(--green-dim)}
.opt-card.selected{background:#0d3320;border-color:var(--green);color:#fff}
.opt-card .opt-title{font-size:14px;font-weight:500;color:#fff}
.opt-card .opt-desc{font-size:12px;color:var(--muted);margin-top:4px}
.opt-card.selected .opt-desc{color:var(--green-light)}

/* NAV */
.nav-row{display:flex;justify-content:space-between;align-items:center;margin-top:40px;padding-top:24px;border-top:1px solid var(--border)}
.btn{padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:all .15s;border:none;font-family:'Inter',sans-serif}
.btn-primary{background:var(--green);color:#071a0e}
.btn-primary:hover{background:var(--green-light)}
.btn-ghost{background:transparent;color:var(--muted);border:1px solid var(--border)}
.btn-ghost:hover{color:#fff;border-color:#fff}
.btn-generate{background:linear-gradient(135deg,var(--green),#1d9e75);color:#071a0e;padding:14px 32px;font-size:15px}
.progress-text{font-size:13px;color:var(--muted)}

/* MODE SELECT SCREEN */
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

/* TYPE SELECT */
.type-screen{max-width:680px;margin:60px auto;padding:0 24px}
.type-cards{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
.type-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;cursor:pointer;transition:all .15s;text-align:center}
.type-card:hover{border-color:var(--green-dim)}
.type-card.selected{border-color:var(--green);background:#0d3320}
.type-card .tc-icon{font-size:28px;margin-bottom:10px}
.type-card h4{font-size:15px;font-weight:600;margin-bottom:6px}
.type-card p{font-size:12px;color:var(--muted)}

/* REPORT */
.report-wrap{display:none}
.report-wrap.active{display:block}
.slide-nav{display:flex;gap:6px;padding:16px 32px;background:#050f09;border-bottom:1px solid var(--border);overflow-x:auto;position:sticky;top:60px;z-index:50}
.slide-thumb{width:40px;height:28px;border-radius:5px;background:var(--card);border:1px solid var(--border);cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;color:var(--muted);transition:all .15s;flex-shrink:0}
.slide-thumb.active{border-color:var(--green);color:var(--green)}
.slide{display:none;min-height:420px;padding:40px 32px}
.slide.active{display:block}

/* REPORT SLIDES */
.slide-cover{background:linear-gradient(135deg,#0a2e15 0%,#071a0e 60%,#0d1a0a 100%);min-height:480px;position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;border-radius:12px;margin-bottom:16px}
.cover-circle1{position:absolute;width:300px;height:300px;border-radius:50%;border:2px solid rgba(60,193,104,.15);top:-80px;right:-80px}
.cover-circle2{position:absolute;width:180px;height:180px;border-radius:50%;border:2px solid rgba(60,193,104,.1);top:40px;right:60px}
.cover-content{padding:40px;position:relative;z-index:2}
.cover-agency{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--green);margin-bottom:8px}
.cover-title{font-size:36px;font-weight:800;line-height:1.1;margin-bottom:8px}
.cover-client{font-size:16px;color:rgba(255,255,255,.6)}
.cover-date{font-size:12px;color:rgba(255,255,255,.4);margin-top:16px}

.slide-section{background:var(--card);border-radius:12px;padding:32px;margin-bottom:16px}
.slide-section-header{border-left:3px solid var(--green);padding-left:16px;margin-bottom:24px}
.slide-section-header h2{font-size:20px;font-weight:700}
.slide-section-header p{font-size:13px;color:var(--muted);margin-top:4px}

.metric-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
.metric-card{background:#071a0e;border-radius:10px;padding:16px;text-align:center}
.metric-val{font-size:26px;font-weight:700;color:var(--green)}
.metric-label{font-size:11px;color:var(--muted);margin-top:4px;text-transform:uppercase;letter-spacing:.05em}
.metric-signal{font-size:11px;margin-top:6px;padding:2px 8px;border-radius:10px;display:inline-block}
.signal-good{background:#0d3320;color:var(--green-light)}
.signal-warn{background:#2a2000;color:#ffd580}
.signal-bad{background:#2a0d0d;color:#ff8080}

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
.chk-priority{font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:2px 8px;border-radius:10px;margin-top:4px;display:inline-block}
.priority-high{background:#2a0d0d;color:#ff8080}
.priority-med{background:#2a2000;color:#ffd580}
.priority-low{background:#0d2a1a;color:var(--green-light)}

.persona-card{background:#071a0e;border-radius:10px;padding:20px;margin-bottom:12px}
.persona-name{font-size:16px;font-weight:700;margin-bottom:4px}
.persona-who{font-size:13px;color:var(--muted);margin-bottom:12px}
.persona-section{margin-bottom:12px}
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
.btn-back{background:transparent;color:var(--muted);border:1px solid var(--border)}
.btn-back:hover{color:#fff;border-color:#fff}

.forecast-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.forecast-card{background:#071a0e;border-radius:10px;padding:20px}
.forecast-card .fc-label{font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
.forecast-card .fc-val{font-size:28px;font-weight:800;color:var(--green)}
.forecast-card .fc-desc{font-size:12px;color:var(--muted);margin-top:6px;line-height:1.5}

/* BRANDING MODAL */
.modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:200;align-items:center;justify-content:center}
.modal-overlay.open{display:flex}
.modal{background:#0e2618;border:1px solid var(--border);border-radius:14px;padding:32px;width:480px;max-width:90vw}
.modal h3{font-size:20px;font-weight:700;margin-bottom:24px}

@media print{.topbar,.tabs-wrap,.slide-nav,.export-bar,.nav-row{display:none!important}.slide{display:block!important;page-break-after:always}.report-wrap{display:block!important}}
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
  </div>
</div>

<!-- BRANDING MODAL -->
<div class="modal-overlay" id="brandModal">
  <div class="modal">
    <h3>Agency branding</h3>
    <div class="field"><label>Agency name</label><input type="text" id="bm_name" placeholder="Your agency name" oninput="updateBranding()"></div>
    <div class="field"><label>Your name</label><input type="text" id="bm_contact" placeholder="Your name"></div>
    <div class="field"><label>Your email</label><input type="email" id="bm_email" placeholder="you@agency.com"></div>
    <div class="field">
      <label>Brand colour</label>
      <div class="color-row">
        <input type="color" id="bm_color" value="#3cc168" oninput="updateAccent(this.value)">
        <input type="text" id="bm_color_hex" value="#3cc168" placeholder="#3cc168" oninput="updateAccentFromHex(this.value)">
      </div>
    </div>
    <div class="field"><label>Tagline (optional)</label><input type="text" id="bm_tagline" placeholder="Your agency tagline"></div>
    <div style="display:flex;gap:12px;margin-top:8px">
      <button class="btn btn-primary" onclick="saveBranding()">Save</button>
      <button class="btn btn-ghost" onclick="closeBrandingModal()">Cancel</button>
    </div>
  </div>
</div>

<!-- SECTION TABS (hidden until questionnaire starts) -->
<div class="tabs-wrap" id="tabsWrap" style="display:none">
  <div class="tabs" id="tabsEl"></div>
</div>

<!-- REPORT EXPORT BAR -->
<div class="export-bar" id="exportBar" style="display:none">
  <button class="btn-sm btn-back" onclick="backToQuestionnaire()">← Back</button>
  <button class="btn-sm btn-print" onclick="window.print()">Save PDF</button>
  <button class="btn-sm" style="background:#1a3a1a;color:var(--green-light);border:1px solid var(--green-dim)" onclick="exportToSheets()">Export Report (HTML)</button>
</div>

<!-- REPORT SLIDES NAV -->
<div class="slide-nav" id="slideNav" style="display:none" id="slideNavEl"></div>

<!-- MAIN AREA -->
<div id="app">

  <!-- MODE SELECT -->
  <div id="modeScreen" class="mode-screen">
    <h1>Brand Diagnostic</h1>
    <p>Select a diagnostic type to begin. Each is designed to uncover specific gaps and opportunities for your client.</p>
    <div class="mode-cards">
      <div class="mode-card" id="mc_quick" onclick="selectMode('quick')">
        <div class="mc-tag">Quick diagnostic</div>
        <h3>Discovery</h3>
        <p>A focused 30-minute diagnostic covering the core pillars of business performance.</p>
        <div class="mc-price">$500</div>
        <div class="mc-time">30 min call</div>
        <ul>
          <li>6 sections</li>
          <li>Live SEO signals</li>
          <li>Gap analysis</li>
          <li>12-month forecast</li>
          <li>Onboarding checklist</li>
        </ul>
      </div>
      <div class="mode-card deep" id="mc_deep" onclick="selectMode('deep')">
        <div class="mc-tag">Deep diagnostic</div>
        <h3>Workshop</h3>
        <p>An in-depth 1–2 hour workshop that maps every dimension of the business.</p>
        <div class="mc-price">$1,000–$1,500</div>
        <div class="mc-time">1–2 hour workshop</div>
        <ul>
          <li>13 sections</li>
          <li>Live SEO + competitor data</li>
          <li>Full gap analysis</li>
          <li>Revenue forecast</li>
          <li>Business canvas</li>
          <li>Persona mapping</li>
        </ul>
      </div>
    </div>
    <div style="text-align:center;margin-top:24px">
      <button class="btn btn-ghost" onclick="openBrandingModal()" style="font-size:13px">Set agency branding ↗</button>
    </div>
  </div>

  <!-- TYPE SELECT -->
  <div id="typeScreen" class="type-screen" style="display:none">
    <div style="margin-bottom:8px;font-size:13px;color:var(--muted);cursor:pointer" onclick="showModeScreen()">← Back</div>
    <h2 style="font-size:28px;font-weight:700;margin-bottom:8px">Client type</h2>
    <p style="color:var(--muted);margin-bottom:32px;font-size:14px">What type of business is your client?</p>
    <div class="type-cards">
      <div class="type-card" id="tc_ecomm" onclick="selectType('ecomm')">
        <div class="tc-icon">🛒</div>
        <h4>E-commerce</h4>
        <p>Product-based online store</p>
      </div>
      <div class="type-card" id="tc_leadgen" onclick="selectType('leadgen')">
        <div class="tc-icon">🎯</div>
        <h4>Lead generation</h4>
        <p>Service-based business</p>
      </div>
      <div class="type-card" id="tc_coaching" onclick="selectType('coaching')">
        <div class="tc-icon">🎓</div>
        <h4>Coaching & consulting</h4>
        <p>Knowledge / program based</p>
      </div>
    </div>
    <div style="text-align:center;margin-top:32px">
      <button class="btn btn-primary" onclick="startQuestionnaire()">Start diagnostic →</button>
    </div>
  </div>

  <!-- QUESTIONNAIRE -->
  <div id="questionnaireWrap" style="display:none">
    <div class="main" id="questionnaireMain"></div>
  </div>

  <!-- REPORT -->
  <div id="reportWrap" class="report-wrap">
    <div id="slidesContainer"></div>
  </div>

</div>

<script>
var state = {
  mode: null,
  bizType: null,
  agency: {name:'',contact:'',email:'',color:'#3cc168',tagline:''},
  answers: {},
  currentSection: 0,
  ahrefsData: null,
  reportData: null
};

// ---- SECTIONS DEFINITION ----
function getSections() {
  var quick = [
    {id:'branding', title:'Agency branding', sub:'Who is producing this report', fields:[
      {id:'agency_name', label:'Agency name', type:'text', placeholder:'Your agency name'},
      {id:'agency_contact', label:'Your name', type:'text', placeholder:'Your full name'},
      {id:'agency_email', label:'Your email', type:'email', placeholder:'you@agency.com'},
      {id:'agency_color', label:'Brand colour', type:'colorpicker'},
      {id:'agency_tagline', label:'Tagline (optional)', type:'text', placeholder:'Your tagline'}
    ]},
    {id:'client', title:'Client details', sub:'Business being diagnosed', fields:[
      {id:'biz_name', label:'Business name', type:'text', placeholder:'Client business name'},
      {id:'biz_url', label:'Website URL', type:'url', placeholder:'https://'},
      {id:'biz_industry', label:'Industry / niche', type:'text', placeholder:'e.g. Health & wellness'}
    ]},
    {id:'financials', title:'Financial position', sub:'Current business performance', fields:[
      {id:'fin_revenue', label:'Current annual revenue', type:'select', options:['Under $250k','$250k–$500k','$500k–$1M','$1M–$3M','$3M–$10M','$10M+']},
      {id:'fin_target', label:'Revenue target (12 months)', type:'text', placeholder:'e.g. $2M'},
      {id:'fin_adspend', label:'Current monthly ad spend', type:'text', placeholder:'e.g. $5,000/month'},
      {id:'fin_goals', label:'Primary business goal', type:'textarea', placeholder:'What does success look like in 12 months?'}
    ]},
    {id:'brand', title:'Brand & market', sub:'How the business is positioned', fields:[
      {id:'b_describe', label:'Describe the business in 2–3 sentences', type:'textarea', placeholder:'What do they do, who do they serve, what makes them different?'},
      {id:'b_usp', label:'Core differentiator / USP', type:'textarea', placeholder:'Why do customers choose them over competitors?'},
      {id:'b_challenge', label:'Biggest marketing challenge right now', type:'textarea', placeholder:'What is the #1 thing holding growth back?'}
    ]},
    {id:'obstacles', title:'Obstacles & gaps', sub:'Where the business is struggling', fields:[
      {id:'o_main', label:'Main obstacle to hitting revenue target', type:'textarea', placeholder:'What is getting in the way?'},
      {id:'o_tried', label:'What have they already tried?', type:'textarea', placeholder:'Previous marketing efforts, campaigns, strategies...'},
      {id:'o_competitors', label:'Key competitors (name 2–3)', type:'textarea', placeholder:'Who are they competing with?'}
    ]},
    {id:'acquisition', title:'Acquisition channels', sub:'How they currently get clients', fields:[
      {id:'a_channels', label:'Active marketing channels', type:'multicheck', options:['Google Ads','Meta Ads','SEO / Content','Email marketing','Social organic','Referrals','Events','TikTok Ads','YouTube Ads']},
      {id:'a_best', label:'Best performing channel', type:'text', placeholder:'Which channel brings the most revenue?'},
      {id:'a_cac', label:'Estimated cost to acquire a customer', type:'text', placeholder:'e.g. $120 per lead, $800 per sale'}
    ]}
  ];

  var deep = [
    {id:'branding', title:'Agency branding', sub:'Who is producing this report', fields:[
      {id:'agency_name', label:'Agency name', type:'text', placeholder:'Your agency name'},
      {id:'agency_contact', label:'Your name', type:'text', placeholder:'Your full name'},
      {id:'agency_email', label:'Your email', type:'email', placeholder:'you@agency.com'},
      {id:'agency_color', label:'Brand colour', type:'colorpicker'},
      {id:'agency_tagline', label:'Tagline (optional)', type:'text', placeholder:'Your tagline'}
    ]},
    {id:'client', title:'Client details', sub:'Business being diagnosed', fields:[
      {id:'biz_name', label:'Business name', type:'text', placeholder:'Client business name'},
      {id:'biz_url', label:'Website URL', type:'url', placeholder:'https://'},
      {id:'biz_industry', label:'Industry / niche', type:'text', placeholder:'e.g. Health & wellness'}
    ]},
    {id:'financials', title:'Financial position', sub:'Current business performance', fields:[
      {id:'fin_revenue', label:'Current annual revenue', type:'select', options:['Under $250k','$250k–$500k','$500k–$1M','$1M–$3M','$3M–$10M','$10M+']},
      {id:'fin_target', label:'Revenue target (12 months)', type:'text', placeholder:'e.g. $2M'},
      {id:'fin_adspend', label:'Monthly ad spend', type:'text', placeholder:'e.g. $5,000/month'},
      {id:'fin_margin', label:'Approximate gross margin', type:'select', options:['Under 20%','20–40%','40–60%','60–80%','80%+','Unknown']},
      {id:'fin_goals', label:'Primary business goals', type:'textarea', placeholder:'Top 3 goals in the next 12 months'}
    ]},
    {id:'brand', title:'Brand foundations', sub:'Identity, positioning and market fit', fields:[
      {id:'b_describe', label:'Describe the business', type:'textarea', placeholder:'What do they do, who do they serve, what makes them different?'},
      {id:'b_values', label:'Core brand values', type:'textarea', placeholder:'What principles guide the business?'},
      {id:'b_usp', label:'Core differentiator / USP', type:'textarea', placeholder:'Why do customers choose them over competitors?'},
      {id:'b_voice', label:'Brand voice and tone', type:'text', placeholder:'e.g. Professional but approachable, bold, empathetic'}
    ]},
    {id:'goals', title:'Goals & vision', sub:'Where they want to go', fields:[
      {id:'g_vision', label:'12-month vision', type:'textarea', placeholder:'What does success look like in 12 months?'},
      {id:'g_priority', label:'Top 3 priorities right now', type:'textarea', placeholder:'What are they most focused on achieving?'},
      {id:'g_longterm', label:'3–5 year ambition', type:'textarea', placeholder:'Where does the founder want to take this business?'}
    ]},
    {id:'obstacles', title:'Obstacles & challenges', sub:'What is holding them back', fields:[
      {id:'o_main', label:'Main obstacle to growth', type:'textarea', placeholder:'What is getting in the way of hitting targets?'},
      {id:'o_tried', label:'What have they already tried?', type:'textarea', placeholder:'Previous marketing efforts, campaigns, strategies...'},
      {id:'o_fear', label:'Biggest fear or concern about marketing', type:'textarea', placeholder:'What worries them most about investing in marketing?'}
    ]},
    {id:'customer', title:'Customer & persona', sub:'Who they serve', fields:[
      {id:'c_describe', label:'Describe the ideal customer', type:'textarea', placeholder:'Demographics, psychographics, where they live, what they do...'},
      {id:'c_motivation', label:'Primary motivation to buy', type:'textarea', placeholder:'What drives them to take action?'},
      {id:'c_journey', label:'Buying journey', type:'textarea', placeholder:'How does a customer typically find them and make a purchase decision?'}
    ]},
    {id:'painpoints', title:'Pain points & dream outcome', sub:'Emotional drivers', fields:[
      {id:'pp_pains', label:'Top 3 customer pain points', type:'textarea', placeholder:'What problems keep the customer up at night?'},
      {id:'pp_dream', label:'Dream outcome', type:'textarea', placeholder:'What transformation does the customer desire?'},
      {id:'pp_trigger', label:'Buying trigger', type:'textarea', placeholder:'What event or moment makes them decide to buy?'}
    ]},
    {id:'objections', title:'Objections', sub:'Why prospects do not buy', fields:[
      {id:'obj_main', label:'Top 3 objections', type:'textarea', placeholder:'What reasons do prospects give for not buying?'},
      {id:'obj_handle', label:'How are objections currently handled?', type:'textarea', placeholder:'What does the sales process do to overcome these?'}
    ]},
    {id:'products', title:'Products & offers', sub:'What they sell', fields:[
      {id:'prod_main', label:'Main product or service', type:'textarea', placeholder:'Describe the core offer — what is it, what does it deliver, what does it cost?'},
      {id:'prod_funnel', label:'Offer funnel or product ladder', type:'textarea', placeholder:'Do they have a lead magnet, entry offer, core offer, premium tier?'},
      {id:'prod_aov', label:'Average order / transaction value', type:'text', placeholder:'e.g. $297, $1,200, $5,000+'}
    ]},
    {id:'competitors', title:'Competitor landscape', sub:'Who they compete with', fields:[
      {id:'co_names', label:'Top 3 competitors', type:'textarea', placeholder:'Name them and their websites if known'},
      {id:'co_diff', label:'How are competitors different?', type:'textarea', placeholder:'What do competitors do that this business does not?'},
      {id:'co_advantage', label:'Where does the client have an advantage?', type:'textarea', placeholder:'What can they do or say that competitors cannot?'}
    ]},
    {id:'acquisition', title:'Acquisition channels', sub:'How they currently get clients', fields:[
      {id:'a_channels', label:'Active marketing channels', type:'multicheck', options:['Google Ads','Meta Ads','SEO / Content','Email marketing','Social organic','Referrals','Events','TikTok Ads','YouTube Ads']},
      {id:'a_best', label:'Best performing channel', type:'text', placeholder:'Which channel drives the most revenue?'},
      {id:'a_cac', label:'Cost to acquire a customer', type:'text', placeholder:'e.g. $120 per lead, $800 per sale'},
      {id:'a_missing', label:'Channels they are NOT using that they should be', type:'textarea', placeholder:'What acquisition gaps exist?'}
    ]},
    {id:'retention', title:'Retention & LTV', sub:'How they keep customers', fields:[
      {id:'r_ltv', label:'Customer lifetime value', type:'text', placeholder:'e.g. $1,200 over 12 months'},
      {id:'r_retention', label:'Retention strategy', type:'textarea', placeholder:'How do they keep existing customers buying again?'},
      {id:'r_referral', label:'Referral and word of mouth', type:'textarea', placeholder:'Do they have a referral programme? How do reviews work?'}
    ]}
  ];

  // Type-specific section
  var typeSection = getTypeSection();
  if(typeSection) {
    quick.push(typeSection);
    deep.push(typeSection);
  }

  return state.mode === 'quick' ? quick : deep;
}

function getTypeSection() {
  if(state.bizType === 'ecomm') {
    return {id:'type_specific', title:'E-commerce specifics', sub:'Online store performance', fields:[
      {id:'ec_platform', label:'E-commerce platform', type:'text', placeholder:'e.g. Shopify, WooCommerce'},
      {id:'ec_aov', label:'Average order value', type:'text', placeholder:'e.g. $85'},
      {id:'ec_roas', label:'Current ROAS (if running ads)', type:'text', placeholder:'e.g. 2.4x'},
      {id:'ec_cro', label:'Website conversion rate', type:'text', placeholder:'e.g. 1.8%'},
      {id:'ec_repeat', label:'Repeat purchase rate', type:'text', placeholder:'e.g. 30% of customers buy again'},
      {id:'ec_topcat', label:'Top product category', type:'text', placeholder:'What sells the most?'}
    ]};
  } else if(state.bizType === 'leadgen') {
    return {id:'type_specific', title:'Lead generation specifics', sub:'Sales pipeline performance', fields:[
      {id:'lg_leads', label:'Leads per month (current)', type:'text', placeholder:'e.g. 40 leads/month'},
      {id:'lg_close', label:'Close rate', type:'text', placeholder:'e.g. 25% of leads close'},
      {id:'lg_cycle', label:'Average sales cycle', type:'text', placeholder:'e.g. 2 weeks from lead to close'},
      {id:'lg_qualif', label:'Lead qualification process', type:'textarea', placeholder:'How are leads qualified before sales?'},
      {id:'lg_nurture', label:'Lead nurturing sequence', type:'textarea', placeholder:'What happens after someone opts in or enquires?'}
    ]};
  } else if(state.bizType === 'coaching') {
    return {id:'type_specific', title:'Coaching specifics', sub:'Program and audience', fields:[
      {id:'coa_program', label:'Core program or offer', type:'textarea', placeholder:'Describe the main coaching program — delivery, duration, outcome'},
      {id:'coa_students', label:'Current number of students/clients', type:'text', placeholder:'e.g. 45 active clients'},
      {id:'coa_authority', label:'Authority and credibility', type:'textarea', placeholder:'Credentials, results, case studies, audience size'},
      {id:'coa_content', label:'Content strategy', type:'textarea', placeholder:'What content do they publish and where?'},
      {id:'coa_enrol', label:'Enrolment process', type:'textarea', placeholder:'How do prospects become clients?'}
    ]};
  }
  return null;
}

// ---- MODE & TYPE SELECTION ----
function selectMode(m) {
  state.mode = m;
  document.querySelectorAll('.mode-card').forEach(function(c){c.classList.remove('selected')});
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
  document.querySelectorAll('.type-card').forEach(function(c){c.classList.remove('selected')});
  document.getElementById('tc_'+t).classList.add('selected');
}

function startQuestionnaire() {
  if(!state.bizType) {alert('Please select a client type first');return;}
  document.getElementById('typeScreen').style.display = 'none';
  document.getElementById('questionnaireWrap').style.display = 'block';
  document.getElementById('tabsWrap').style.display = 'block';
  var badge = document.getElementById('modeBadge');
  badge.style.display = 'inline-block';
  badge.className = 'mode-badge ' + (state.mode === 'quick' ? 'mode-quick' : 'mode-deep');
  badge.textContent = state.mode === 'quick' ? 'Quick • $500' : 'Deep Workshop • $1,000–$1,500';
  state.currentSection = 0;
  renderTabs();
  renderSection();
}

// ---- TABS ----
function renderTabs() {
  var sections = getSections();
  var html = '';
  sections.forEach(function(s, i) {
    var cls = 'tab';
    if(i === state.currentSection) cls += ' active';
    else if(state.answers[s.id] && Object.keys(state.answers[s.id]).length) cls += ' done';
    html += '<div class="'+cls+'" onclick="goToSection('+i+')" data-idx="'+i+'">'+s.title+'</div>';
  });
  html += '<div class="tab" onclick="goToSection('+sections.length+')" style="color:var(--green-light)">Generate report →</div>';
  document.getElementById('tabsEl').innerHTML = html;
}

function goToSection(i) {
  saveCurrentSection();
  var sections = getSections();
  if(i >= sections.length) {
    generateReport();
    return;
  }
  state.currentSection = i;
  renderTabs();
  renderSection();
}

// ---- RENDER SECTION ----
function renderSection() {
  var sections = getSections();
  var s = sections[state.currentSection];
  var answers = state.answers[s.id] || {};
  var html = '<div class="section-header">';
  html += '<div class="section-num">'+(state.currentSection+1)+'</div>';
  html += '<div class="section-title">'+s.title+'</div>';
  html += '<div class="section-sub">'+s.sub+'</div></div>';

  s.fields.forEach(function(f) {
    var val = answers[f.id] || '';
    html += '<div class="field" id="f_'+f.id+'">';
    html += '<label>'+f.label+'</label>';

    if(f.type === 'text' || f.type === 'email' || f.type === 'url') {
      html += '<input type="'+f.type+'" id="fld_'+f.id+'" value="'+escHtml(val)+'" placeholder="'+escHtml(f.placeholder || '')+'">';
    } else if(f.type === 'textarea') {
      html += '<textarea id="fld_'+f.id+'" placeholder="'+escHtml(f.placeholder || '')+'">'+escHtml(val)+'</textarea>';
    } else if(f.type === 'select') {
      html += '<select id="fld_'+f.id+'">';
      html += '<option value="">Select...</option>';
      f.options.forEach(function(o){html += '<option value="'+o+'"'+(val===o?' selected':'')+'>'+o+'</option>';});
      html += '</select>';
    } else if(f.type === 'colorpicker') {
      var cv = val || state.agency.color || '#3cc168';
      html += '<div class="color-row">';
      html += '<input type="color" id="fld_'+f.id+'_picker" value="'+cv+'" oninput="syncColor(\\''+f.id+'\\')">';
      html += '<input type="text" id="fld_'+f.id+'" value="'+cv+'" placeholder="#3cc168" oninput="syncColorFromText(\\''+f.id+'\\')">';
      html += '</div>';
    } else if(f.type === 'multicheck') {
      var selected = val ? val.split(',') : [];
      html += '<div class="options-grid cols3">';
      f.options.forEach(function(o){
        var isSel = selected.indexOf(o) >= 0;
        html += '<div class="opt-card'+(isSel?' selected':'')+'" onclick="toggleMultiCheck(this,\\'fld_'+f.id+'\\',\\''+o+'\\')">';
        html += '<div class="opt-title">'+o+'</div></div>';
      });
      html += '</div>';
      html += '<input type="hidden" id="fld_'+f.id+'" value="'+escHtml(val)+'">';
    }
    html += '</div>';
  });

  html += '<div class="nav-row">';
  html += '<div>';
  if(state.currentSection > 0) html += '<button class="btn btn-ghost" onclick="prevSection()">← Back</button>';
  html += '</div>';
  html += '<div style="display:flex;align-items:center;gap:16px">';
  html += '<span class="progress-text">Section '+(state.currentSection+1)+' of '+sections.length+'</span>';
  if(state.currentSection < sections.length - 1) {
    html += '<button class="btn btn-primary" onclick="nextSection()">Continue →</button>';
  } else {
    html += '<button class="btn btn-generate" onclick="generateReport()">Generate report ✦</button>';
  }
  html += '</div></div>';

  document.getElementById('questionnaireMain').innerHTML = html;
  document.getElementById('progressDisplay').innerHTML = '<span style="font-size:13px;color:var(--muted)">'+(state.currentSection+1)+' / '+sections.length+'</span>';
}

function syncColor(id) {
  var picker = document.getElementById('fld_'+id+'_picker');
  var text = document.getElementById('fld_'+id);
  if(picker && text) {
    text.value = picker.value;
    updateAccent(picker.value);
  }
}

function syncColorFromText(id) {
  var text = document.getElementById('fld_'+id);
  var picker = document.getElementById('fld_'+id+'_picker');
  if(text && picker && /^#[0-9a-f]{6}$/i.test(text.value)) {
    picker.value = text.value;
    updateAccent(text.value);
  }
}

function toggleMultiCheck(el, hiddenId, val) {
  el.classList.toggle('selected');
  var hidden = document.getElementById(hiddenId);
  var vals = hidden.value ? hidden.value.split(',') : [];
  var idx = vals.indexOf(val);
  if(idx >= 0) vals.splice(idx,1);
  else vals.push(val);
  hidden.value = vals.filter(Boolean).join(',');
}

function saveCurrentSection() {
  var sections = getSections();
  if(state.currentSection >= sections.length) return;
  var s = sections[state.currentSection];
  var answers = {};
  s.fields.forEach(function(f) {
    var el = document.getElementById('fld_'+f.id);
    if(el) answers[f.id] = el.value;
  });
  state.answers[s.id] = answers;

  // sync agency branding
  if(s.id === 'branding') {
    state.agency.name = answers.agency_name || state.agency.name;
    state.agency.contact = answers.agency_contact || state.agency.contact;
    state.agency.email = answers.agency_email || state.agency.email;
    state.agency.color = answers.agency_color || state.agency.color;
    state.agency.tagline = answers.agency_tagline || state.agency.tagline;
    updateTopBar();
  }
}

function nextSection() {
  saveCurrentSection();
  state.currentSection++;
  renderTabs();
  renderSection();
  window.scrollTo(0,0);
}

function prevSection() {
  saveCurrentSection();
  state.currentSection--;
  renderTabs();
  renderSection();
  window.scrollTo(0,0);
}

// ---- BRANDING ----
function updateTopBar() {
  var n = state.agency.name || 'Brand Diagnostic';
  document.getElementById('topName').textContent = n;
  var initials = n.split(' ').slice(0,2).map(function(w){return w[0]}).join('').toUpperCase();
  document.getElementById('topLogo').textContent = initials || 'BD';
  document.getElementById('topLogo').style.background = state.agency.color || '#3cc168';
}

function updateAccent(hex) {
  document.documentElement.style.setProperty('--green', hex);
  state.agency.color = hex;
  document.getElementById('bm_color_hex').value = hex;
}

function updateAccentFromHex(hex) {
  if(/^#[0-9a-f]{6}$/i.test(hex)) {
    document.getElementById('bm_color').value = hex;
    updateAccent(hex);
  }
}

function updateBranding() {
  var n = document.getElementById('bm_name').value;
  if(n) { state.agency.name = n; updateTopBar(); }
}

function openBrandingModal() {
  document.getElementById('bm_name').value = state.agency.name;
  document.getElementById('bm_contact').value = state.agency.contact;
  document.getElementById('bm_email').value = state.agency.email;
  document.getElementById('bm_color').value = state.agency.color;
  document.getElementById('bm_color_hex').value = state.agency.color;
  document.getElementById('bm_tagline').value = state.agency.tagline;
  document.getElementById('brandModal').classList.add('open');
}

function closeBrandingModal() {
  document.getElementById('brandModal').classList.remove('open');
}

function saveBranding() {
  state.agency.name = document.getElementById('bm_name').value;
  state.agency.contact = document.getElementById('bm_contact').value;
  state.agency.email = document.getElementById('bm_email').value;
  state.agency.color = document.getElementById('bm_color').value;
  state.agency.tagline = document.getElementById('bm_tagline').value;
  updateTopBar();
  closeBrandingModal();
}

// ---- REPORT GENERATION ----

// ---- REPORT GENERATION ----
// ---- REPORT GENERATION ----
// Architecture: artifact calls Anthropic API directly with Ahrefs MCP server.
// All 4 calls run sequentially: core metrics → keywords → competitors → AI analysis.


// ── Set this to your Railway/Render URL after deploying ─────────────────────
var API_URL = '';
// ─────────────────────────────────────────────────────────────────────────────

function generateReport() {
  saveCurrentSection();
  var domain = '';
  if(state.answers.client && state.answers.client.biz_url) {
    domain = state.answers.client.biz_url
      .replace(/https?:\\/\\//,'').replace(/\\/.*$/,'').replace(/^www\\./,'').trim();
  }
  var clientName = (state.answers.client && state.answers.client.biz_name) || 'Client';

  document.getElementById('tabsWrap').style.display = 'none';
  document.getElementById('questionnaireWrap').style.display = 'none';
  document.getElementById('modeScreen').style.display = 'none';
  document.getElementById('typeScreen').style.display = 'none';
  document.getElementById('exportBar').style.display = 'none';
  document.getElementById('progressDisplay').innerHTML = '';

  var rw = document.getElementById('reportWrap');
  rw.classList.add('active');

  function showLoading(body) {
    rw.innerHTML = '<div class="loading-state"><div class="spinner"></div><h3>Generating your report</h3>'
      +'<p>'+body+'</p>'
      +'<ul class="loading-steps">'
      +'<li id="ls0" class="current"><div class="step-dot"></div>Domain rating &amp; metrics</li>'
      +'<li id="ls1"><div class="step-dot"></div>Keyword rankings</li>'
      +'<li id="ls2"><div class="step-dot"></div>Competitor analysis</li>'
      +'<li id="ls3"><div class="step-dot"></div>Backlinks &amp; top pages</li>'
      +'<li id="ls4"><div class="step-dot"></div>Web research &amp; reviews</li>'
      +'<li id="ls5"><div class="step-dot"></div>AI analysis &amp; report</li>'
      +'</ul></div>';
  }

  function setProgress(pct) {
    var ids = ['ls0','ls1','ls2','ls3','ls4','ls5'];
    var active = Math.min(Math.floor(pct / 17), 5);
    ids.forEach(function(id, i) {
      var el = document.getElementById(id); if(!el) return;
      var dot = el.querySelector('.step-dot');
      el.className = ''; if(dot) dot.style.background = '';
      if(i < active) { el.className='done'; if(dot) dot.style.background='var(--green)'; }
      else if(i === active) { el.className='current'; if(dot) dot.style.background='#ffd580'; }
    });
  }

  if(API_URL.indexOf('YOUR-APP') > -1) {
    rw.innerHTML = '<div class="loading-state"><h3 style="color:#ff8080">API URL not configured</h3>'
      +'<p style="color:var(--muted)">Deploy the server to Railway or Render, then update <code>API_URL</code> at the top of the script in this HTML file.</p>'
      +'<div style="margin-top:16px"><button class="btn btn-ghost" onclick="backToQuestionnaire()">Back</button></div></div>';
    return;
  }

  showLoading('Pulling live data for <strong>'+escHtml(domain||clientName)+'</strong>&hellip;');

  var payload = { domain:domain, clientName:clientName, mode:state.mode, bizType:state.bizType, agency:state.agency, answers:state.answers };

  fetch(API_URL + '/generate', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  }).then(function(resp) {
    if(!resp.ok) throw new Error('Server responded ' + resp.status);
    var reader = resp.body.getReader();
    var dec = new TextDecoder();
    var buf = '';
    function pump() {
      reader.read().then(function(r) {
        if(r.done) return;
        buf += dec.decode(r.value, {stream:true});
        var parts = buf.split('\\n\\n'); buf = parts.pop();
        parts.forEach(function(part) {
          if(!part.startsWith('data: ')) return;
          try {
            var evt = JSON.parse(part.slice(6));
            if(evt.step === 'progress') setProgress(evt.pct||0);
            else if(evt.step === 'result') renderReport(evt.report, evt.ahrefs, evt.clientName, evt.domain);
            else if(evt.step === 'error') {
              rw.innerHTML = '<div class="loading-state"><h3 style="color:#ff8080">Error</h3><p>'+escHtml(evt.msg||'Unknown error')+'</p>'
                +'<div style="margin-top:16px"><button class="btn btn-ghost" onclick="backToQuestionnaire()">Back</button></div></div>';
            }
          } catch(e) {}
        });
        pump();
      });
    }
    pump();
  }).catch(function(err) {
    rw.innerHTML = '<div class="loading-state"><h3 style="color:#ff8080">Could not connect</h3>'
      +'<p style="color:var(--muted)">Check the API_URL is correct and the server is running.<br><small>'+escHtml(err.message)+'</small></p>'
      +'<div style="margin-top:16px"><button class="btn btn-ghost" onclick="backToQuestionnaire()">Back</button></div></div>';
  });
}


function getAhrefsDate(){
  var d = new Date(); d.setMonth(d.getMonth()-1);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-01';
}

function buildAnalysisPrompt(clientName, domain, ahrefs, research, q) {
  var lines = [
    'Generate a complete brand diagnostic report for '+clientName+' ('+domain+').',
    'MODE: '+state.mode+' | TYPE: '+state.bizType,
    ''
  ];
  if(q.financials) lines.push('FINANCIALS: '+JSON.stringify(q.financials));
  if(q.brand) lines.push('BRAND: '+JSON.stringify(q.brand));
  if(q.goals) lines.push('GOALS: '+JSON.stringify(q.goals));
  if(q.obstacles) lines.push('OBSTACLES: '+JSON.stringify(q.obstacles));
  if(q.customer) lines.push('CUSTOMER: '+JSON.stringify(q.customer));
  if(q.painpoints) lines.push('PAIN POINTS: '+JSON.stringify(q.painpoints));
  if(q.objections) lines.push('OBJECTIONS: '+JSON.stringify(q.objections));
  if(q.products) lines.push('PRODUCTS: '+JSON.stringify(q.products));
  if(q.competitors) lines.push('COMPETITORS (questionnaire): '+JSON.stringify(q.competitors));
  if(q.acquisition) lines.push('ACQUISITION: '+JSON.stringify(q.acquisition));
  if(q.retention) lines.push('RETENTION: '+JSON.stringify(q.retention));
  if(q.type_specific) lines.push('TYPE-SPECIFIC: '+JSON.stringify(q.type_specific));
  lines.push('');
  lines.push('LIVE AHREFS DATA: '+JSON.stringify(ahrefs));
  lines.push('WEB RESEARCH: '+JSON.stringify(research));
  lines.push('');
  lines.push('Based on the Ahrefs data, detect and flag these signals: zero/low paid traffic = not running ads, low domain rating vs competitors, zero top-3 rankings, no organic growth, high-value keywords not being targeted.');
  lines.push('');
  lines.push('Return ONLY this exact JSON structure with specific data-driven content (no generic placeholder text):');
  lines.push(JSON.stringify({
    exec_past:"2-3 specific sentences using actual data",
    exec_future:"2-3 sentences on goals",
    exec_agency:"2-3 sentences on recommended approach",
    health_scores:{seo:0,paid:0,content:0,brand:0,conversion:0,retention:0},
    health_notes:{seo:"",paid:"",content:"",brand:"",conversion:"",retention:""},
    digital_analysis:{summary:"paragraph using specific Ahrefs numbers",signals:[{label:"",status:"good|warn|bad",value:"",insight:""}],keyword_opportunity:"",paid_gap:""},
    business_canvas:{key_partners:[],key_activities:[],key_resources:[],value_propositions:[],customer_relationships:[],channels:[],customer_segments:[],cost_structure:[],revenue_streams:[]},
    personas:[{name:"",tagline:"",dream_outcome:"",who:"",income:"",trigger:"",pains:[],objections:[],product_focus:[],messaging_hook:""}],
    competitor_analysis:{summary:"",strengths_vs_competitors:[],weaknesses_vs_competitors:[],market_gaps:[]},
    review_insights:{overall_sentiment:"positive|mixed|negative",avg_rating:"",key_themes:[],trust_signals:[],reputation_risks:[],recommendation:""},
    gap_analysis:[{title:"",desc:"",priority:"high|medium|low",category:"SEO|Paid|Content|Brand|CRO|Retention|Strategy",quick_win:false}],
    forecast:{current_revenue:"",conservative_12m:"",optimistic_12m:"",revenue_per_channel:[{channel:"",current:"",potential:""}],key_assumptions:[]},
    roadmap:[{phase:"Phase 1",months:"Month 1-2",label:"Foundation",items:[{task:"",detail:""}]}],
    onboarding_checklist:[{task:"",phase:"Foundation",priority:"critical|high|medium|low",owner:"Agency|Client|Both",week:"Week 1",detail:""}],
    closing:{headline:"",narrative:"",next_step:""}
  }));
  return lines.join('\\n');
}

// ---- RENDER REPORT ----
function getFallbackReport(name) {
  return {
    exec_past: name+' is an established business with growth potential across multiple digital channels.',
    exec_future: 'The primary goal is to build predictable, scalable revenue through structured acquisition and retention systems.',
    exec_agency: 'We recommend auditing current digital infrastructure, closing conversion gaps, then systematically scaling acquisition.',
    health_scores:{seo:30,paid:15,content:25,brand:40,conversion:35,retention:20},
    health_notes:{seo:'Limited organic visibility detected',paid:'No active paid advertising infrastructure',content:'Content strategy underdeveloped',brand:'Brand positioning needs sharpening',conversion:'CRO opportunities identified',retention:'No systematic retention programme'},
    digital_analysis:{summary:'Initial analysis shows significant untapped digital opportunity. Organic presence is limited and no paid advertising was detected.',signals:[{label:'Paid advertising',status:'bad',value:'No paid traffic',insight:'Missing a major acquisition channel'},{label:'Organic rankings',status:'warn',value:'Limited top-3 positions',insight:'Not capturing high-intent searches at the decision moment'}],keyword_opportunity:'Commercial-intent keywords available with low competition',paid_gap:'No paid advertising detected — this is the biggest acquisition gap'},
    business_canvas:{key_partners:['Strategic partners','Suppliers'],key_activities:['Core service delivery','Customer acquisition','Retention'],key_resources:['Team expertise','Brand','Customer base'],value_propositions:['Core transformation','Quality & reliability','Unique approach'],customer_relationships:['Direct engagement','Ongoing support'],channels:['Website','Social media','Referrals'],customer_segments:['Primary ideal customer','Secondary audience'],cost_structure:['Team & labour','Marketing','Technology'],revenue_streams:['Primary offer','Upsells & renewals']},
    personas:[{name:'Primary Buyer',tagline:'Decision-maker seeking results',dream_outcome:'Achieve their core business transformation',who:'Professional aged 30-50, growth-oriented',income:'$75k-$150k',trigger:'A specific problem makes the status quo unacceptable',pains:['Wasted budget on solutions that failed','Uncertainty about the right path','Feeling behind competitors'],objections:['Too expensive','Not sure it will work','No time'],product_focus:['Core offer','Results'],messaging_hook:'Stop guessing. Here is the proven path to [outcome].'}],
    competitor_analysis:{summary:'Competitors have stronger digital presence. Clear gaps and underserved segments exist.',strengths_vs_competitors:['Personalised service','Niche expertise'],weaknesses_vs_competitors:['Lower domain authority','Smaller ad spend'],market_gaps:['Underserved customer segment','Content gap on key topics']},
    review_insights:{overall_sentiment:'mixed',avg_rating:'',key_themes:['Service quality','Communication'],trust_signals:['Customer testimonials','Track record'],reputation_risks:['Limited public reviews','No systematic review generation'],recommendation:'Implement post-purchase review generation immediately.'},
    gap_analysis:[
      {title:'No paid acquisition system',desc:'No paid advertising detected. Competitors are capturing demand daily while this business is absent from paid channels. Estimated missed revenue: significant monthly opportunity.',priority:'high',category:'Paid',quick_win:false},
      {title:'Weak domain authority',desc:'Domain rating is below key competitors making organic rankings harder. Building DR typically doubles organic traffic within 12 months.',priority:'high',category:'SEO',quick_win:false},
      {title:'No email nurture sequence',desc:'Leads are not being systematically nurtured. A 7-email sequence improves close rates by 20-40%.',priority:'high',category:'Retention',quick_win:true},
      {title:'Zero review generation strategy',desc:'Online reviews are a critical trust signal. Without systematic generation, losing conversions to competitors with stronger social proof.',priority:'medium',category:'Brand',quick_win:true}
    ],
    forecast:{current_revenue:'Based on questionnaire data',conservative_12m:'With foundational fixes',optimistic_12m:'With full strategy execution',revenue_per_channel:[{channel:'Paid search',current:'$0',potential:'$15k-$40k/mo'},{channel:'Organic SEO',current:'Minimal',potential:'$8k-$25k/mo'}],key_assumptions:['Conversion rate improves 15-25% with CRO','Paid ROAS 3-4x based on benchmarks']},
    roadmap:[
      {phase:'Phase 1',months:'Month 1-2',label:'Foundation & Quick Wins',items:[{task:'Set up full tracking stack',detail:'GA4, GTM, Meta Pixel, Google Ads — non-negotiable first step'},{task:'Implement review generation',detail:'Automated post-purchase email. Expect 15-25% response rate.'},{task:'Build primary landing page',detail:'Conversion-focused page for primary offer'}]},
      {phase:'Phase 2',months:'Month 3-4',label:'Acquisition Engine',items:[{task:'Launch Google Search Ads',detail:'Target bottom-funnel transactional keywords first'},{task:'Launch Meta prospecting',detail:'Lookalike from customer list + interest targeting'},{task:'Publish SEO content',detail:'4 pillar articles targeting low-competition commercial keywords'}]},
      {phase:'Phase 3',months:'Month 5-6',label:'Scale & Optimise',items:[{task:'Scale winning paid channels',detail:'Double budget on campaigns hitting target ROAS'},{task:'Launch retention programme',detail:'Win-back, loyalty, upsell sequences'},{task:'Build referral programme',detail:'Structured incentive — typically 10-20% of new revenue at near-zero CAC'}]}
    ],
    onboarding_checklist:[
      {task:'Set up Google Analytics 4',phase:'Foundation',priority:'critical',owner:'Agency',week:'Week 1',detail:'Install GA4 with conversion events'},
      {task:'Install Meta Pixel + Conversions API',phase:'Foundation',priority:'critical',owner:'Agency',week:'Week 1',detail:'Essential for Meta ads effectiveness'},
      {task:'Set up Google Tag Manager',phase:'Foundation',priority:'critical',owner:'Agency',week:'Week 1',detail:'Central tag management'},
      {task:'Website speed audit',phase:'Foundation',priority:'high',owner:'Agency',week:'Week 1-2',detail:'Core Web Vitals — impacts SEO and conversion'},
      {task:'Keyword research & content gap analysis',phase:'Foundation',priority:'high',owner:'Agency',week:'Week 2',detail:'Map top 30 target keywords'},
      {task:'Set up review generation email',phase:'Foundation',priority:'high',owner:'Both',week:'Week 2',detail:'Automated post-purchase Google review request'},
      {task:'Competitor ad intelligence audit',phase:'Foundation',priority:'medium',owner:'Agency',week:'Week 2',detail:'Meta Ad Library + Google transparency for all competitors'},
      {task:'Build primary landing page',phase:'Acquisition',priority:'high',owner:'Agency',week:'Week 3-4',detail:'Dedicated conversion page for primary offer'},
      {task:'Launch Google Search Ads',phase:'Acquisition',priority:'high',owner:'Agency',week:'Week 4',detail:'Exact/phrase match on bottom-funnel terms'},
      {task:'Build email nurture sequence',phase:'Acquisition',priority:'high',owner:'Agency',week:'Week 3-4',detail:'7-email welcome and education sequence'},
      {task:'Launch Meta prospecting',phase:'Acquisition',priority:'high',owner:'Agency',week:'Week 5-6',detail:'Lookalike audiences from customer list'},
      {task:'Set up retargeting (Google + Meta)',phase:'Conversion',priority:'high',owner:'Agency',week:'Week 6',detail:'Retarget website visitors'},
      {task:'A/B test primary CTA',phase:'Conversion',priority:'medium',owner:'Agency',week:'Week 6-8',detail:'Test button copy, placement, colour'},
      {task:'Abandoned lead recovery email',phase:'Conversion',priority:'high',owner:'Agency',week:'Week 6',detail:'Recover 10-15% of enquiries'},
      {task:'Monthly reporting dashboard',phase:'Foundation',priority:'high',owner:'Agency',week:'Week 2',detail:'Looker Studio with all KPIs'}
    ],
    closing:{headline:'The gap between where you are and where you need to be is entirely fixable in 90 days.',narrative:'This diagnostic has identified the critical gaps costing revenue. None of these are complex to solve — they require systematic execution. The businesses winning in your market have the right systems in place, not necessarily better products.',next_step:'Book a strategy session this week to confirm Phase 1 priorities and start the tracking setup immediately.'}
  };
}


function renderReport(report, ahrefs, clientName, domain) {
  var agencyName = state.agency.name || 'Your Agency';
  var accent = state.agency.color || '#3cc168';
  currentSlide = 0;

  var slides = buildSlides(report, ahrefs, clientName, domain, agencyName, accent);

  var navHtml = '<div style="display:flex;gap:6px;padding:12px 24px;background:#050f09;border-bottom:1px solid var(--border);overflow-x:auto;position:sticky;top:60px;z-index:50">';
  slides.forEach(function(s,i){
    navHtml += '<div class="slide-thumb'+(i===0?' active':'')+'" onclick="goSlide('+i+')" style="width:auto;padding:0 12px;font-size:10px;letter-spacing:.04em;white-space:nowrap">'+escHtml(s.label)+'</div>';
  });
  navHtml += '</div>';

  var slidesHtml = '<div style="max-width:960px;margin:0 auto;padding:24px 20px 60px">';
  slides.forEach(function(s,i){
    slidesHtml += '<div class="slide'+(i===0?' active':'')+'" id="slide_'+i+'">'+s.content+'</div>';
  });
  slidesHtml += '</div>';

  document.getElementById('reportWrap').innerHTML = navHtml + slidesHtml;
  document.getElementById('exportBar').style.display = 'flex';
  document.getElementById('progressDisplay').innerHTML = '<span style="font-size:13px;color:var(--muted)">'+slides.length+' slides ready</span>';

  document.addEventListener('keydown', function(e){
    if(e.key==='ArrowRight') goSlide(currentSlide+1);
    if(e.key==='ArrowLeft') goSlide(currentSlide-1);
  });

  window._reportData = { report:report, ahrefs:ahrefs, clientName:clientName, domain:domain, agencyName:agencyName, accent:accent };
}

var currentSlide = 0;
function goSlide(i) {
  var slides = document.querySelectorAll('.slide');
  var thumbs = document.querySelectorAll('.slide-thumb');
  if(i < 0 || i >= slides.length) return;
  slides[currentSlide].classList.remove('active');
  thumbs[currentSlide].classList.remove('active');
  currentSlide = i;
  slides[i].classList.add('active');
  thumbs[i].classList.add('active');
  thumbs[i].scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
  window.scrollTo(0, 60);
}

// ---- SLIDE BUILDER ----
function buildSlides(report, ahrefs, clientName, domain, agencyName, accent) {
  var A = accent || '#3cc168';
  var today = new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
  var slides = [];

  // Helpers
  function card(content) {
    return '<div style="background:var(--card);border-radius:12px;padding:28px;margin-bottom:14px">'+content+'</div>';
  }
  function sh(title, sub) {
    return '<div style="border-left:3px solid '+A+';padding-left:16px;margin-bottom:22px">'
      +'<div style="font-size:20px;font-weight:700">'+escHtml(title)+'</div>'
      +(sub ? '<div style="font-size:13px;color:var(--muted);margin-top:3px">'+escHtml(sub)+'</div>' : '')
      +'</div>';
  }
  function grid(cols, content) {
    return '<div style="display:grid;grid-template-columns:'+cols+';gap:14px;margin-bottom:14px">'+content+'</div>';
  }
  function metBox(val, label, sub, color) {
    return '<div style="background:#071a0e;border-radius:10px;padding:18px;text-align:center">'
      +'<div style="font-size:26px;font-weight:800;color:'+(color||A)+'">'+escHtml(String(val===null||val===undefined?'—':val))+'</div>'
      +'<div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-top:5px">'+escHtml(label)+'</div>'
      +(sub ? '<div style="font-size:11px;color:var(--muted);margin-top:3px">'+escHtml(sub)+'</div>' : '')
      +'</div>';
  }
  function pill(text, type) {
    var styles = {
      good:'background:#0d3320;color:var(--green-light)',
      warn:'background:#2a2000;color:#ffd580',
      bad:'background:#2a0a0a;color:#ff8080'
    };
    return '<span style="'+(styles[type]||styles.warn)+';font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:3px 9px;border-radius:10px;flex-shrink:0">'+escHtml(text)+'</span>';
  }
  function tag(text, color) {
    return '<span style="background:'+color+'22;color:'+color+';font-size:11px;font-weight:600;padding:3px 10px;border-radius:8px;border:1px solid '+color+'44;white-space:nowrap">'+escHtml(text)+'</span>';
  }
  function scoreBar(label, score, note) {
    var s = Math.min(100, Math.max(0, parseInt(score)||0));
    var color = s>=70?'var(--green)':s>=40?'#ffd580':'#ff6b6b';
    return '<div style="margin-bottom:14px">'
      +'<div style="display:flex;justify-content:space-between;margin-bottom:5px">'
      +'<span style="font-size:13px;font-weight:500">'+escHtml(label)+'</span>'
      +'<span style="font-size:14px;font-weight:700;color:'+color+'">'+s+'/100</span>'
      +'</div>'
      +'<div style="height:6px;background:#071a0e;border-radius:3px">'
      +'<div style="height:6px;width:'+s+'%;background:'+color+';border-radius:3px"></div>'
      +'</div>'
      +(note ? '<div style="font-size:11px;color:var(--muted);margin-top:4px">'+escHtml(note)+'</div>' : '')
      +'</div>';
  }

  // Safely get nested ahrefs data
  var dr = ahrefs.domain_rating || 0;
  var orgT = ahrefs.org_traffic || 0;
  var orgK = ahrefs.org_keywords || 0;
  var orgK13 = ahrefs.org_keywords_1_3 || 0;
  var paidT = ahrefs.paid_traffic || 0;
  var paidK = ahrefs.paid_keywords || 0;
  var orgCost = ahrefs.org_cost ? Math.round(ahrefs.org_cost/100) : null;
  var blLive = ahrefs.backlinks_live || 0;
  var blRD = ahrefs.ref_domains || 0;
  var keywords = ahrefs.keywords || [];
  var competitors = ahrefs.competitors || [];
  var topPages = ahrefs.top_pages || [];

  // ---- SLIDE 1: COVER ----
  slides.push({label:'Cover', content:
    '<div style="background:linear-gradient(135deg,#071a0e 0%,#0a2e15 50%,#071a0e 100%);min-height:500px;border-radius:14px;position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;padding:48px">'
    +'<div style="position:absolute;width:400px;height:400px;border-radius:50%;border:1px solid '+A+'22;top:-100px;right:-100px"></div>'
    +'<div style="position:absolute;width:200px;height:200px;border-radius:50%;border:1px solid '+A+'33;top:60px;right:80px"></div>'
    +'<div>'
    +'<div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:'+A+';margin-bottom:16px">'+escHtml(agencyName)+(state.agency.tagline?' · '+escHtml(state.agency.tagline):'')+'</div>'
    +'<div style="font-size:52px;font-weight:900;line-height:1;color:#fff">Brand<br>Diagnostic</div>'
    +'<div style="font-size:13px;color:rgba(255,255,255,.45);margin-top:10px">'+escHtml(state.mode==='quick'?'Quick Diagnostic — $500':'Deep Workshop Diagnostic — $1,000–$1,500')+'</div>'
    +'</div>'
    +'<div style="display:flex;justify-content:space-between;align-items:flex-end">'
    +'<div><div style="font-size:13px;color:rgba(255,255,255,.4);margin-bottom:4px">Prepared for</div>'
    +'<div style="font-size:30px;font-weight:800">'+escHtml(clientName)+'</div>'
    +(domain ? '<div style="font-size:13px;color:'+A+';margin-top:4px">'+escHtml(domain)+'</div>' : '')
    +'</div>'
    +'<div style="text-align:right;font-size:12px;color:rgba(255,255,255,.3)">'+today+'</div>'
    +'</div>'
    +'</div>'
  });

  // ---- SLIDE 2: EXECUTIVE SUMMARY ----
  slides.push({label:'Summary', content:
    card(sh('Executive summary','Strategic overview')
    + grid('1fr 1fr 1fr',
      ['Where they are','Where they want to go','Recommended approach'].map(function(t,i){
        var txt = [report.exec_past, report.exec_future, report.exec_agency][i] || '';
        return '<div style="background:#071a0e;border-radius:10px;padding:20px">'
          +'<div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:'+A+';margin-bottom:10px">'+t+'</div>'
          +'<p style="font-size:13px;color:#ccc;line-height:1.7">'+escHtml(txt)+'</p>'
          +'</div>';
      }).join('')
    ))
  });

  // ---- SLIDE 3: HEALTH SCORECARD ----
  var hs = report.health_scores || {seo:0,paid:0,content:0,brand:0,conversion:0,retention:0};
  var hn = report.health_notes || {};
  var hsKeys = ['seo','paid','content','brand','conversion','retention'];
  var overall = Math.round(hsKeys.reduce(function(a,k){return a+(hs[k]||0);},0)/hsKeys.length);
  var overallColor = overall>=60?A:overall>=35?'#ffd580':'#ff6b6b';
  slides.push({label:'Health', content:
    card(sh('Performance health scorecard','Scored from questionnaire data + live Ahrefs signals')
    +'<div style="display:grid;grid-template-columns:180px 1fr;gap:24px">'
    +'<div style="background:#071a0e;border-radius:12px;padding:24px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">'
    +'<div style="font-size:64px;font-weight:900;color:'+overallColor+'">'+overall+'</div>'
    +'<div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-top:4px">Overall score</div>'
    +'<div style="font-size:11px;color:var(--muted);margin-top:6px">out of 100</div>'
    +'</div>'
    +'<div>'+['SEO','Paid ads','Content','Brand','Conversion','Retention'].map(function(l,i){
      var k=hsKeys[i]; return scoreBar(l, hs[k]||0, hn[k]||'');
    }).join('')+'</div>'
    +'</div>')
  });

  // ---- SLIDE 4: DIGITAL POSITION (LIVE AHREFS) ----
  var signals = report.digital_analysis ? (report.digital_analysis.signals||[]) : [];
  var sigHtml = signals.map(function(s){
    return '<div style="background:#071a0e;border-radius:8px;padding:14px;display:flex;gap:14px;align-items:flex-start;margin-bottom:8px">'
      +'<div style="flex:1">'
      +'<div style="font-size:13px;font-weight:600;margin-bottom:3px">'+escHtml(s.label||'')+'</div>'
      +(s.value ? '<div style="font-size:13px;color:'+A+';font-weight:700;margin-bottom:3px">'+escHtml(s.value)+'</div>' : '')
      +'<div style="font-size:12px;color:var(--muted);line-height:1.5">'+escHtml(s.insight||'')+'</div>'
      +'</div>'+pill(s.status||'warn',s.status||'warn')
      +'</div>';
  }).join('');

  slides.push({label:'Digital', content:
    card(sh('Digital position', 'Live Ahrefs data · '+escHtml(domain))
    + grid('repeat(4,1fr)',
      metBox(dr||'—','Domain rating','0–100 authority','')
      + metBox(orgT?orgT.toLocaleString():'0','Organic traffic','Monthly visits','')
      + metBox(orgK?orgK.toLocaleString():'0','Ranking keywords','In top 100','')
      + metBox(orgK13||0,'Top 3 rankings','High-intent',A)
    )
    + grid('repeat(4,1fr)',
      metBox(paidT?paidT.toLocaleString():'0','Paid traffic',paidT>0?'Active paid ads':'No paid ads',paidT>0?A:'#ff6b6b')
      + metBox(paidK?paidK.toLocaleString():'0','Paid keywords','Active ad keywords',paidK>0?A:'var(--muted)')
      + metBox(blLive?blLive.toLocaleString():'0','Backlinks','Live links','#ffd580')
      + metBox(blRD?blRD.toLocaleString():'0','Referring domains','Unique linking domains','#ffd580')
    )
    + (orgCost ? '<div style="background:#071a0e;border-radius:8px;padding:14px;margin-bottom:12px;display:flex;gap:10px;align-items:center">'
      +'<div style="font-size:22px;font-weight:800;color:'+A+'">$'+orgCost.toLocaleString()+'/mo</div>'
      +'<div><div style="font-size:12px;font-weight:600;color:#fff">Estimated organic traffic value</div>'
      +'<div style="font-size:11px;color:var(--muted)">What it would cost to buy this traffic via paid ads</div></div>'
      +'</div>' : '')
    + (signals.length ? '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:'+A+';margin-bottom:10px">Signal analysis</div>'+sigHtml : '')
    + ((report.digital_analysis && report.digital_analysis.summary) ? '<div style="background:#071a0e;border-radius:8px;padding:16px;margin-top:8px"><p style="font-size:13px;color:#ccc;line-height:1.7">'+escHtml(report.digital_analysis.summary)+'</p></div>' : '')
    )
  });

  // ---- SLIDE 5: KEYWORD INTELLIGENCE ----
  var kwTable = '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:'+A+';margin-bottom:10px">Top ranking keywords</div>';
  if(keywords.length) {
    kwTable += '<table style="width:100%;border-collapse:collapse;font-size:12px">'
      +'<tr style="border-bottom:1px solid var(--border)">'
      +'<th style="text-align:left;padding:8px 0;color:var(--muted);font-weight:500">Keyword</th>'
      +'<th style="text-align:center;padding:8px;color:var(--muted);font-weight:500">Pos</th>'
      +'<th style="text-align:center;padding:8px;color:var(--muted);font-weight:500">Volume</th>'
      +'<th style="text-align:center;padding:8px;color:var(--muted);font-weight:500">Traffic</th>'
      +'<th style="text-align:center;padding:8px;color:var(--muted);font-weight:500">Difficulty</th>'
      +'<th style="text-align:left;padding:8px;color:var(--muted);font-weight:500">Intent</th>'
      +'</tr>';
    keywords.slice(0,10).forEach(function(k){
      var pos = k.best_position||k.position||'—';
      var posColor = pos<=3?'var(--green)':pos<=10?'#ffd580':'var(--muted)';
      var vol = k.volume ? (k.volume>=1000?(k.volume/1000).toFixed(1)+'k':k.volume) : '—';
      var intent = k.is_transactional?'transactional':k.is_commercial?'commercial':'informational';
      var intentColor = k.is_transactional?A:k.is_commercial?'#ffd580':'#80c8ff';
      kwTable += '<tr style="border-bottom:1px solid #0e2618">'
        +'<td style="padding:10px 0;font-weight:500;color:#fff">'+escHtml(k.keyword||'')+'</td>'
        +'<td style="text-align:center;color:'+posColor+';font-weight:700">'+pos+'</td>'
        +'<td style="text-align:center;color:var(--muted)">'+vol+'</td>'
        +'<td style="text-align:center;color:var(--muted)">'+(k.sum_traffic||k.traffic||'—')+'</td>'
        +'<td style="text-align:center;color:var(--muted)">'+(k.keyword_difficulty||'—')+'</td>'
        +'<td style="padding:8px">'+tag(intent, intentColor)+'</td>'
        +'</tr>';
    });
    kwTable += '</table>';
  } else {
    kwTable += '<div style="color:var(--muted);font-size:13px;padding:16px 0">No keyword data available.</div>';
  }

  var pgTable = '';
  if(topPages.length) {
    pgTable = '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:'+A+';margin:16px 0 10px">Top performing pages</div>'
      +'<table style="width:100%;border-collapse:collapse;font-size:12px">'
      +'<tr style="border-bottom:1px solid var(--border)"><th style="text-align:left;padding:6px 0;color:var(--muted);font-weight:500">Page</th><th style="text-align:center;padding:6px;color:var(--muted);font-weight:500">Traffic</th><th style="text-align:center;padding:6px;color:var(--muted);font-weight:500">Keywords</th></tr>';
    topPages.slice(0,5).forEach(function(p){
      var url = (p.url||'').replace(/https?:\\/\\//,'').substring(0,55);
      pgTable += '<tr style="border-bottom:1px solid #0e2618">'
        +'<td style="padding:8px 0;color:var(--muted);font-size:11px">'+escHtml(url)+'</td>'
        +'<td style="text-align:center;color:'+A+';font-weight:600">'+(p.sum_traffic||'—')+'</td>'
        +'<td style="text-align:center;color:var(--muted)">'+(p.keywords||'—')+'</td>'
        +'</tr>';
    });
    pgTable += '</table>';
  }

  var kwOpp = report.digital_analysis && report.digital_analysis.keyword_opportunity;
  slides.push({label:'SEO Intel', content:
    card(sh('Keyword & SEO intelligence','Ranking data from Ahrefs')
    + (kwOpp ? '<div style="background:#0d3320;border:1px solid '+A+'44;border-radius:8px;padding:14px;margin-bottom:16px;display:flex;gap:10px"><div style="font-size:18px">🎯</div><div><div style="font-size:12px;font-weight:700;color:'+A+';margin-bottom:3px">KEY OPPORTUNITY</div><div style="font-size:13px;color:#ccc">'+escHtml(kwOpp)+'</div></div></div>' : '')
    + kwTable + pgTable)
  });

  // ---- SLIDE 6: COMPETITOR ANALYSIS ----
  var ca = report.competitor_analysis || {};
  var compTable = '';
  if(competitors.length) {
    compTable = '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px">'
      +'<tr style="border-bottom:1px solid var(--border)">'
      +'<th style="text-align:left;padding:8px 0;color:var(--muted);font-weight:500">Domain</th>'
      +'<th style="text-align:center;padding:8px;color:var(--muted);font-weight:500">DR</th>'
      +'<th style="text-align:center;padding:8px;color:var(--muted);font-weight:500">Traffic</th>'
      +'<th style="text-align:center;padding:8px;color:var(--muted);font-weight:500">Common KW</th>'
      +'<th style="text-align:center;padding:8px;color:var(--muted);font-weight:500">DR vs You</th>'
      +'</tr>';
    competitors.forEach(function(c){
      var theirDR = parseFloat(c.domain_rating||c.dr||0);
      var diff = Math.round(theirDR - dr);
      var diffColor = diff>10?'#ff8080':diff<-5?'var(--green)':'#ffd580';
      compTable += '<tr style="border-bottom:1px solid #0e2618">'
        +'<td style="padding:10px 0;font-weight:500">'+escHtml(c.competitor_domain||c.domain||'')+'</td>'
        +'<td style="text-align:center;color:#ffd580;font-weight:700">'+Math.round(theirDR)+'</td>'
        +'<td style="text-align:center;color:var(--muted)">'+(c.traffic?Number(c.traffic).toLocaleString():'—')+'</td>'
        +'<td style="text-align:center;color:var(--muted)">'+(c.keywords_common?Number(c.keywords_common).toLocaleString():'—')+'</td>'
        +'<td style="text-align:center;color:'+diffColor+';font-weight:600">'+(diff>0?'+':'')+diff+'</td>'
        +'</tr>';
    });
    compTable += '</table>';
  }

  var compStrBox = '<div style="background:#071a0e;border-radius:10px;padding:18px"><div style="font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--green);margin-bottom:10px">Your advantages</div><ul style="list-style:none">'+(ca.strengths_vs_competitors||[]).map(function(s){return '<li style="font-size:12px;color:#ccc;padding:4px 0;display:flex;gap:6px"><span style="color:var(--green)">+</span>'+escHtml(s)+'</li>';}).join('')+'</ul></div>';
  var compWeakBox = '<div style="background:#071a0e;border-radius:10px;padding:18px"><div style="font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#ff8080;margin-bottom:10px">Areas to close</div><ul style="list-style:none">'+(ca.weaknesses_vs_competitors||[]).map(function(s){return '<li style="font-size:12px;color:#ccc;padding:4px 0;display:flex;gap:6px"><span style="color:#ff8080">-</span>'+escHtml(s)+'</li>';}).join('')+'</ul></div>';
  var compGapBox = '<div style="background:#071a0e;border-radius:10px;padding:18px"><div style="font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#ffd580;margin-bottom:10px">Market gaps</div><ul style="list-style:none">'+(ca.market_gaps||[]).map(function(s){return '<li style="font-size:12px;color:#ccc;padding:4px 0;display:flex;gap:6px"><span style="color:#ffd580">&gt;</span>'+escHtml(s)+'</li>';}).join('')+'</ul></div>';

  slides.push({label:'Competitors', content:
    card(sh('Competitor analysis','Market position intelligence')
    + (ca.summary ? '<div style="background:#071a0e;border-radius:8px;padding:16px;margin-bottom:14px"><p style="font-size:13px;color:#ccc;line-height:1.7">'+escHtml(ca.summary)+'</p></div>' : '')
    + compTable
    + grid('1fr 1fr 1fr', compStrBox+compWeakBox+compGapBox))
  });

  // ---- SLIDE 7: REVIEWS & REPUTATION ----
  var ri = report.review_insights || {};
  var research = report.web_research || {};
  var sentColor = ri.overall_sentiment==='positive'?'var(--green)':ri.overall_sentiment==='negative'?'#ff6b6b':'#ffd580';
  var sentBox = '<div style="background:#071a0e;border-radius:12px;padding:24px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">'
    +'<div style="font-size:36px;font-weight:900;color:'+sentColor+';text-transform:capitalize">'+escHtml(ri.overall_sentiment||'Unknown')+'</div>'
    +'<div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-top:8px">Sentiment</div>'
    +(ri.avg_rating ? '<div style="font-size:22px;font-weight:700;color:#ffd580;margin-top:12px">'+escHtml(ri.avg_rating)+'</div>' : '')
    +'</div>';
  var summBox = '<div><div style="background:#071a0e;border-radius:10px;padding:16px;margin-bottom:12px"><div style="font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:'+A+';margin-bottom:8px">Review summary</div><p style="font-size:13px;color:#ccc;line-height:1.6">'+escHtml(research.review_summary||ri.recommendation||'No review data available.')+'</p></div>'
    +(ri.key_themes&&ri.key_themes.length ? '<div style="display:flex;flex-wrap:wrap;gap:8px">'+ri.key_themes.map(function(t){return tag(t,A);}).join('')+'</div>' : '')
    +'</div>';
  var praiseBox = '<div style="background:#071a0e;border-radius:10px;padding:16px"><div style="font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--green);margin-bottom:8px">What customers praise</div><ul style="list-style:none">'+(ri.trust_signals||research.common_praise||[]).map(function(s){return '<li style="font-size:12px;color:#ccc;padding:3px 0">'+escHtml(s)+'</li>';}).join('')+'</ul></div>';
  var complainBox = '<div style="background:#071a0e;border-radius:10px;padding:16px"><div style="font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#ff8080;margin-bottom:8px">Common complaints</div><ul style="list-style:none">'+(ri.reputation_risks||research.common_complaints||[]).map(function(s){return '<li style="font-size:12px;color:#ccc;padding:3px 0">'+escHtml(s)+'</li>';}).join('')+'</ul></div>';
  var adBox = '<div style="background:#071a0e;border-radius:10px;padding:16px"><div style="font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#ffd580;margin-bottom:8px">Ad & social signals</div><p style="font-size:12px;color:#ccc;line-height:1.5">'+escHtml(research.ad_signals||'Checking ad presence…')+'</p>'+(research.social_presence?'<p style="font-size:12px;color:var(--muted);margin-top:8px;line-height:1.5">'+escHtml(research.social_presence)+'</p>':'')+'</div>';

  slides.push({label:'Reputation', content:
    card(sh('Brand reputation & customer intelligence','Reviews, sentiment, and brand signals')
    + grid('1fr 2fr', sentBox+summBox)
    + grid('1fr 1fr 1fr', praiseBox+complainBox+adBox))
  });

  // ---- SLIDE 8: BUSINESS CANVAS ----
  var bc = report.business_canvas || {};
  function canvasBlock(title, items, color) {
    return '<div style="background:#071a0e;border-radius:8px;padding:14px;height:100%">'
      +'<div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:'+(color||A)+';margin-bottom:8px">'+escHtml(title)+'</div>'
      +'<ul style="list-style:none">'+(items||[]).map(function(i){return '<li style="font-size:12px;color:#ccc;padding:3px 0;line-height:1.4">'+escHtml(i)+'</li>';}).join('')+'</ul>'
      +'</div>';
  }
  slides.push({label:'Canvas', content:
    card(sh('Business model canvas','Strategic mapping of the full business model')
    +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;gap:10px;margin-bottom:10px">'
    +canvasBlock('Key partners', bc.key_partners,'#80c8ff')
    +'<div style="display:grid;grid-template-rows:1fr 1fr;gap:10px">'
    +canvasBlock('Key activities', bc.key_activities, A)
    +canvasBlock('Key resources', bc.key_resources, A)
    +'</div>'
    +'<div style="background:'+A+'15;border:1px solid '+A+'33;border-radius:8px;padding:14px">'
    +'<div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:'+A+';margin-bottom:8px">Value propositions</div>'
    +'<ul style="list-style:none">'+(bc.value_propositions||[]).map(function(v){return '<li style="font-size:12px;color:#fff;padding:4px 0;font-weight:500">'+escHtml(v)+'</li>';}).join('')+'</ul>'
    +'</div>'
    +'<div style="display:grid;grid-template-rows:1fr 1fr;gap:10px">'
    +canvasBlock('Customer relationships', bc.customer_relationships,'#ffd580')
    +canvasBlock('Channels', bc.channels,'#ffd580')
    +'</div>'
    +canvasBlock('Customer segments', bc.customer_segments,'#ff8080')
    +'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    +canvasBlock('Cost structure', bc.cost_structure,'#ff8080')
    +canvasBlock('Revenue streams', bc.revenue_streams, A)
    +'</div>')
  });

  // ---- SLIDE 9: CUSTOMER AVATARS ----
  var personas = report.personas || [];
  var persHtml = personas.map(function(p){
    return '<div style="background:#071a0e;border-radius:12px;padding:24px;margin-bottom:14px">'
      +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;gap:16px">'
      +'<div>'
      +'<div style="font-size:18px;font-weight:700">'+escHtml(p.name||'')+'</div>'
      +'<div style="font-size:13px;color:var(--muted);margin-top:2px">'+escHtml(p.tagline||p.who||'')+'</div>'
      +(p.income ? '<div style="font-size:12px;color:'+A+';margin-top:4px">Income: '+escHtml(p.income)+'</div>' : '')
      +'</div>'
      +(p.messaging_hook ? '<div style="background:'+A+'15;border-left:3px solid '+A+';padding:12px 14px;border-radius:0 8px 8px 0;max-width:280px">'
        +'<div style="font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:'+A+';margin-bottom:4px">Messaging hook</div>'
        +'<div style="font-size:13px;color:#fff;font-style:italic">'+escHtml(p.messaging_hook)+'</div>'
        +'</div>' : '')
      +'</div>'
      +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">'
      +'<div><div style="font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:'+A+';margin-bottom:6px">Dream outcome</div><p style="font-size:12px;color:#ccc;line-height:1.5">'+escHtml(p.dream_outcome||'')+'</p></div>'
      +'<div><div style="font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#ff8080;margin-bottom:6px">Pain points</div><ul style="list-style:none">'+(p.pains||[]).map(function(x){return '<li style="font-size:12px;color:#ccc;padding:2px 0">'+escHtml(x)+'</li>';}).join('')+'</ul></div>'
      +'<div><div style="font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#ffd580;margin-bottom:6px">Buying trigger</div><p style="font-size:12px;color:#ccc;line-height:1.5">'+escHtml(p.trigger||'')+'</p></div>'
      +'<div><div style="font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Objections</div><ul style="list-style:none">'+(p.objections||[]).map(function(x){return '<li style="font-size:12px;color:#ccc;padding:2px 0">'+escHtml(x)+'</li>';}).join('')+'</ul></div>'
      +'</div>'
      +'</div>';
  }).join('');
  slides.push({label:'Personas', content: card(sh('Customer avatar','Who you are speaking to and what drives them') + persHtml)});

  // ---- SLIDE 10: GAP ANALYSIS ----
  var gaps = report.gap_analysis || [];
  var catColors = {SEO:A,Paid:'#80c8ff',Content:'#ffd580',Brand:'#ff8080',CRO:'#c084fc',Retention:'#fb923c',Strategy:'#34d399'};
  var highGaps = gaps.filter(function(g){return g.priority==='high';});
  var otherGaps = gaps.filter(function(g){return g.priority!=='high';});
  function gapCard(g,i){
    var col = catColors[g.category]||A;
    return '<div style="background:#071a0e;border-radius:10px;padding:18px;border-left:3px solid '+col+'">'
      +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;gap:8px">'
      +'<div style="display:flex;gap:8px;align-items:center">'
      +'<div style="width:24px;height:24px;border-radius:50%;background:'+col+';color:#071a0e;font-weight:800;font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0">'+(i+1)+'</div>'
      +'<div style="font-size:14px;font-weight:700">'+escHtml(g.title||'')+'</div>'
      +'</div>'
      +'<div style="display:flex;gap:6px;flex-shrink:0">'+(g.category?tag(g.category,col):'')+(g.quick_win?tag('quick win',A):'')+'</div>'
      +'</div>'
      +'<p style="font-size:13px;color:var(--muted);line-height:1.6">'+escHtml(g.desc||'')+'</p>'
      +'</div>';
  }
  slides.push({label:'Gaps', content:
    card(sh('Gap analysis','Critical gaps ranked by revenue impact')
    + (highGaps.length ? '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#ff8080;margin-bottom:10px">Critical / high priority</div>'
      +'<div style="display:grid;gap:10px;margin-bottom:16px">'+highGaps.map(gapCard).join('')+'</div>' : '')
    + (otherGaps.length ? '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#ffd580;margin-bottom:10px">Medium priority</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'+otherGaps.map(gapCard).join('')+'</div>' : ''))
  });

  // ---- SLIDE 11: REVENUE FORECAST ----
  var fc = report.forecast || {};
  slides.push({label:'Forecast', content:
    card(sh('Revenue forecast','12-month projections and channel model')
    + grid('1fr 1fr 1fr',
      metBox(fc.current_revenue||'—','Current position','Baseline','#888')
      + metBox(fc.conservative_12m||'—','Conservative (12m)','Foundational fixes',A)
      + metBox(fc.optimistic_12m||'—','Optimistic (12m)','Full execution','#ffd580')
    )
    + (fc.revenue_per_channel&&fc.revenue_per_channel.length ?
      '<div style="margin-top:4px"><div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:'+A+';margin-bottom:10px">Channel opportunity model</div>'
      +'<table style="width:100%;border-collapse:collapse;font-size:13px">'
      +'<tr style="border-bottom:1px solid var(--border)"><th style="text-align:left;padding:8px 0;color:var(--muted);font-weight:500">Channel</th><th style="text-align:right;padding:8px;color:var(--muted);font-weight:500">Current</th><th style="text-align:right;padding:8px;color:var(--muted);font-weight:500">12-month potential</th></tr>'
      +fc.revenue_per_channel.map(function(r){
        return '<tr style="border-bottom:1px solid #0e2618">'
          +'<td style="padding:10px 0;font-weight:500">'+escHtml(r.channel||'')+'</td>'
          +'<td style="text-align:right;color:var(--muted)">'+escHtml(r.current||'—')+'</td>'
          +'<td style="text-align:right;color:'+A+';font-weight:600">'+escHtml(r.potential||'—')+'</td>'
          +'</tr>';
      }).join('')+'</table></div>' : '')
    + (fc.key_assumptions&&fc.key_assumptions.length ?
      '<div style="background:#071a0e;border-radius:8px;padding:14px;margin-top:14px">'
      +'<div style="font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Key assumptions</div>'
      +fc.key_assumptions.map(function(a){return '<div style="font-size:12px;color:#ccc;padding:3px 0">· '+escHtml(a)+'</div>';}).join('')
      +'</div>' : '')
    )
  });

  // ---- SLIDE 12: 6-MONTH ROADMAP ----
  var rm = report.roadmap || [];
  var phaseColors = [A,'#ffd580','#80c8ff'];
  slides.push({label:'Roadmap', content:
    card(sh('6-month growth roadmap','Phase-by-phase execution plan')
    +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">'
    +rm.map(function(phase,pi){
      var col = phaseColors[pi]||A;
      return '<div style="background:#071a0e;border-radius:10px;padding:18px">'
        +'<div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:'+col+';margin-bottom:4px">'+escHtml(phase.phase||'')+'</div>'
        +'<div style="font-size:12px;color:var(--muted);margin-bottom:4px">'+escHtml(phase.months||'')+'</div>'
        +'<div style="font-size:15px;font-weight:700;margin-bottom:14px">'+escHtml(phase.label||'')+'</div>'
        +(phase.items||[]).map(function(item){
          var t = typeof item==='string'?item:(item.task||'');
          var d = typeof item==='object'?item.detail:'';
          return '<div style="margin-bottom:10px">'
            +'<div style="font-size:12px;color:#fff;font-weight:500;display:flex;gap:6px">'
            +'<span style="color:'+col+';font-weight:700;flex-shrink:0">→</span>'
            +escHtml(t)+'</div>'
            +(d ? '<div style="font-size:11px;color:var(--muted);margin-left:14px;margin-top:2px;line-height:1.4">'+escHtml(d)+'</div>' : '')
            +'</div>';
        }).join('')
        +'</div>';
    }).join('')+'</div>')
  });

  // ---- SLIDE 13: ONBOARDING CHECKLIST ----
  var chk = report.onboarding_checklist || [];
  var phaseGroups = {};
  chk.forEach(function(c){ var p=c.phase||'General'; if(!phaseGroups[p])phaseGroups[p]=[]; phaseGroups[p].push(c); });
  var chkIdx = 0;
  var chkHtml = '';
  ['Foundation','Acquisition','Conversion','Retention','Scale','General'].forEach(function(ph){
    if(!phaseGroups[ph]) return;
    chkHtml += '<div style="margin-bottom:20px">'
      +'<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:'+A+';margin-bottom:8px">'+ph+'</div>';
    phaseGroups[ph].forEach(function(c){
      var priColor = c.priority==='critical'?'#ff6b6b':c.priority==='high'?'#ff8080':c.priority==='medium'?'#ffd580':'var(--green)';
      chkHtml += '<div style="display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border)">'
        +'<div class="chk" id="chk_'+chkIdx+'" onclick="toggleChk('+chkIdx+')" style="width:18px;height:18px;border-radius:4px;border:2px solid var(--border);cursor:pointer;flex-shrink:0;margin-top:2px;transition:all .15s"></div>'
        +'<div style="flex:1">'
        +'<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
        +'<div class="chk-text" id="chktxt_'+chkIdx+'" style="font-size:13px;color:#fff;font-weight:500">'+escHtml(c.task||'')+'</div>'
        +tag(c.priority||'medium',priColor)
        +(c.owner ? tag(c.owner,'var(--muted)') : '')
        +(c.week ? '<span style="font-size:10px;color:var(--muted)">'+escHtml(c.week)+'</span>' : '')
        +'</div>'
        +(c.detail ? '<div style="font-size:12px;color:var(--muted);margin-top:3px;line-height:1.4">'+escHtml(c.detail)+'</div>' : '')
        +'</div>'
        +'</div>';
      chkIdx++;
    });
    chkHtml += '</div>';
  });
  slides.push({label:'Checklist', content:
    card(sh('Onboarding checklist','Click to mark complete — '+chk.length+' tasks')
    +'<div style="background:#071a0e;border-radius:8px;padding:12px 16px;margin-bottom:16px;display:flex;gap:12px;align-items:center">'
    +'<div style="flex:1;height:6px;background:#0e2618;border-radius:3px">'
    +'<div id="chkBar" style="height:6px;width:0%;background:'+A+';border-radius:3px;transition:width .3s"></div>'
    +'</div>'
    +'<div id="chkCount" style="font-size:12px;color:var(--muted);white-space:nowrap">0 / '+chk.length+' complete</div>'
    +'</div>'+chkHtml)
  });

  // ---- SLIDE 14: CLOSING ----
  var cl = report.closing || {};
  slides.push({label:'Next Steps', content:
    card(sh('Closing recommendation','The single most important insight from this diagnostic')
    +'<div style="background:'+A+'10;border:1px solid '+A+'33;border-radius:12px;padding:28px;margin-bottom:20px">'
    +(cl.headline ? '<div style="font-size:24px;font-weight:800;color:#fff;margin-bottom:16px;line-height:1.2">'+escHtml(cl.headline)+'</div>' : '')
    +'<p style="font-size:15px;color:#ccc;line-height:1.8">'+escHtml(cl.narrative||report.exec_agency||'')+'</p>'
    +(cl.next_step ? '<div style="margin-top:20px;background:'+A+';color:#071a0e;border-radius:8px;padding:14px 20px;display:inline-block;font-weight:700;font-size:14px">Next step: '+escHtml(cl.next_step)+'</div>' : '')
    +'</div>'
    +'<div style="text-align:center;padding:32px;border:1px solid var(--border);border-radius:12px">'
    +'<div style="font-size:28px;font-weight:800;margin-bottom:6px">'+escHtml(agencyName)+'</div>'
    +(state.agency.tagline ? '<div style="font-size:14px;color:var(--muted)">'+escHtml(state.agency.tagline)+'</div>' : '')
    +'</div>')
  });

  return slides;
}

function toggleChk(i){
  var total = document.querySelectorAll('[id^="chk_"]').length;
  var el = document.getElementById('chk_'+i);
  var txt = document.getElementById('chktxt_'+i);
  if(el) el.classList.toggle('checked');
  if(txt) txt.classList.toggle('done');
  var done = document.querySelectorAll('.chk.checked').length;
  var bar = document.getElementById('chkBar');
  var count = document.getElementById('chkCount');
  if(bar) bar.style.width = Math.round(done/total*100)+'%';
  if(count) count.textContent = done+' / '+total+' complete';
}

function backToQuestionnaire(){
  document.getElementById('exportBar').style.display = 'none';
  document.getElementById('reportWrap').classList.remove('active');
  document.getElementById('reportWrap').innerHTML = '';
  document.getElementById('progressDisplay').innerHTML = '';
  currentSlide = 0;
  document.getElementById('tabsWrap').style.display = 'block';
  var qWrap = document.getElementById('questionnaireWrap');
  qWrap.style.display = 'block';
  if(!document.getElementById('questionnaireMain')) {
    qWrap.innerHTML = '<div class="main" id="questionnaireMain"></div>';
  }
  renderTabs();
  renderSection();
}

// ---- GOOGLE SHEETS EXPORT (nicely formatted HTML for Google Sheets) ----
function exportToSheets(){
  var d = window._reportData;
  if(!d){ alert('Generate a report first'); return; }
  var r = d.report; var ahrefs = d.ahrefs;
  var A = d.accent || '#3cc168';

  // Build a full styled HTML report for Google Sheets import
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">'
    +'<style>'
    +'body{font-family:Arial,sans-serif;font-size:11pt;color:#1a1a1a;margin:0;padding:0}'
    +'.cover{background:#071a0e;color:#fff;padding:48px;page-break-after:always}'
    +'.cover h1{font-size:36pt;font-weight:900;margin:0 0 8px}'
    +'.cover .client{font-size:16pt;color:'+A+';margin-top:16px}'
    +'.cover .date{font-size:10pt;color:#888;margin-top:8px}'
    +'.section{padding:32px;page-break-inside:avoid;border-bottom:2px solid #f0f0f0}'
    +'.section-title{font-size:16pt;font-weight:700;color:#1a1a1a;border-left:4px solid '+A+';padding-left:12px;margin-bottom:4px}'
    +'.section-sub{font-size:10pt;color:#888;margin-left:16px;margin-bottom:20px}'
    +'.metric-row{display:flex;gap:16px;margin-bottom:16px}'
    +'.metric-box{flex:1;background:#f8f8f6;border-radius:8px;padding:16px;text-align:center;border:1px solid #e8e8e0}'
    +'.metric-val{font-size:20pt;font-weight:800;color:'+A+'}'
    +'.metric-label{font-size:9pt;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-top:4px}'
    +'.table{width:100%;border-collapse:collapse;margin-bottom:16px}'
    +'.table th{background:#f0f0f0;padding:8px 12px;text-align:left;font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#666;border:1px solid #e0e0e0}'
    +'.table td{padding:8px 12px;border:1px solid #e0e0e0;font-size:10pt;vertical-align:top}'
    +'.table tr:nth-child(even) td{background:#fafaf8}'
    +'.gap-row td:first-child{border-left:3px solid '+A+'}'
    +'.gap-high td:first-child{border-left:3px solid #ff4444}'
    +'.gap-med td:first-child{border-left:3px solid #ff9900}'
    +'.score-bar{height:8px;background:#e8e8e8;border-radius:4px;margin-top:4px}'
    +'.score-fill{height:8px;border-radius:4px;background:'+A+'}'
    +'.tag{display:inline-block;padding:2px 8px;border-radius:10px;font-size:9pt;font-weight:700;margin:2px}'
    +'.chk-row{display:flex;gap:8px;padding:6px 0;border-bottom:1px solid #f0f0f0}'
    +'.chk-box{width:14px;height:14px;border:2px solid #ccc;border-radius:3px;flex-shrink:0;margin-top:2px}'
    +'.canvas-grid{display:grid;grid-template-columns:1fr 1fr 1.5fr 1fr 1fr;gap:8px}'
    +'.canvas-cell{background:#f8f8f6;border-radius:6px;padding:12px;border:1px solid #e8e8e0}'
    +'.canvas-label{font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:'+A+';margin-bottom:6px}'
    +'.canvas-vp{background:'+A+'15;border:2px solid '+A+'44}'
    +'.canvas-bottom{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}'
    +'</style></head><body>';

  // Cover
  html += '<div class="cover">'
    +'<div style="font-size:10pt;letter-spacing:.1em;text-transform:uppercase;color:'+A+';margin-bottom:16px">'+escHtml(d.agencyName)+'</div>'
    +'<h1>Brand Diagnostic</h1>'
    +'<div class="client">'+escHtml(d.clientName)+'</div>'
    +'<div style="font-size:12pt;color:#888;margin-top:8px">'+escHtml(d.domain||'')+'</div>'
    +'<div class="date">'+new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})+'</div>'
    +'</div>';

  // Executive Summary
  html += '<div class="section"><div class="section-title">Executive Summary</div><div class="section-sub">Strategic overview</div>'
    +'<table class="table"><tr><th style="width:20%">Dimension</th><th>Analysis</th></tr>'
    +'<tr><td><b>Current Position</b></td><td>'+escHtml(r.exec_past||'')+'</td></tr>'
    +'<tr><td><b>Goals & Vision</b></td><td>'+escHtml(r.exec_future||'')+'</td></tr>'
    +'<tr><td><b>Recommended Approach</b></td><td>'+escHtml(r.exec_agency||'')+'</td></tr>'
    +'</table></div>';

  // Health Scores
  var hs = r.health_scores||{}; var hn = r.health_notes||{};
  var hsKeys = ['seo','paid','content','brand','conversion','retention'];
  var overall = Math.round(hsKeys.reduce(function(a,k){return a+(hs[k]||0);},0)/hsKeys.length);
  html += '<div class="section"><div class="section-title">Performance Health Scores</div><div class="section-sub">Overall: '+overall+'/100</div>'
    +'<table class="table"><tr><th>Dimension</th><th>Score</th><th style="width:200px">Visual</th><th>Finding</th></tr>'
    +hsKeys.map(function(k){
      var s=hs[k]||0; var color=s>=70?'#2ecc71':s>=40?'#f39c12':'#e74c3c';
      return '<tr><td><b>'+k.charAt(0).toUpperCase()+k.slice(1)+'</b></td>'
        +'<td style="color:'+color+';font-weight:700">'+s+'/100</td>'
        +'<td><div class="score-bar"><div class="score-fill" style="width:'+s+'%;background:'+color+'"></div></div></td>'
        +'<td style="font-size:9pt;color:#666">'+escHtml(hn[k]||'')+'</td></tr>';
    }).join('')
    +'</table></div>';

  // Digital Position
  html += '<div class="section"><div class="section-title">Digital Position (Live Ahrefs Data)</div><div class="section-sub">'+escHtml(d.domain||'')+'</div>'
    +'<table class="table"><tr><th>Metric</th><th>Value</th><th>Signal</th></tr>'
    +'<tr><td>Domain Rating</td><td><b>'+(ahrefs.domain_rating||0)+'</b>/100</td><td>'+(ahrefs.domain_rating>=50?'Strong':'Needs building')+'</td></tr>'
    +'<tr><td>Organic Traffic (monthly)</td><td><b>'+(ahrefs.org_traffic||0).toLocaleString()+'</b></td><td>Estimated monthly visitors from search</td></tr>'
    +'<tr><td>Ranking Keywords (top 100)</td><td><b>'+(ahrefs.org_keywords||0).toLocaleString()+'</b></td><td>Total keywords in organic rankings</td></tr>'
    +'<tr><td>Top 3 Rankings</td><td><b>'+(ahrefs.org_keywords_1_3||0).toLocaleString()+'</b></td><td>'+(ahrefs.org_keywords_1_3>0?'Has top-3 presence':'No top-3 rankings — critical gap')+'</td></tr>'
    +'<tr><td>Paid Traffic</td><td><b>'+(ahrefs.paid_traffic||0).toLocaleString()+'</b></td><td>'+(ahrefs.paid_traffic>0?'Running paid ads':'No paid ads detected')+'</td></tr>'
    +'<tr><td>Paid Keywords</td><td><b>'+(ahrefs.paid_keywords||0).toLocaleString()+'</b></td><td>'+(ahrefs.paid_keywords>0?'Active paid campaigns':'No paid presence')+'</td></tr>'
    +'<tr><td>Backlinks (live)</td><td><b>'+(ahrefs.backlinks_live||0).toLocaleString()+'</b></td><td>Total inbound links</td></tr>'
    +'<tr><td>Referring Domains</td><td><b>'+(ahrefs.ref_domains||0).toLocaleString()+'</b></td><td>Unique sites linking to domain</td></tr>'
    +(ahrefs.org_cost ? '<tr><td>Monthly Traffic Value</td><td><b>$'+Math.round(ahrefs.org_cost/100).toLocaleString()+'</b></td><td>Estimated value of organic traffic</td></tr>' : '')
    +'</table>'
    +((r.digital_analysis&&r.digital_analysis.summary) ? '<p style="font-size:10pt;color:#444;line-height:1.6;background:#f8f8f6;padding:12px;border-radius:6px">'+escHtml(r.digital_analysis.summary)+'</p>' : '')
    +'</div>';

  // Keywords
  if((ahrefs.keywords||[]).length) {
    html += '<div class="section"><div class="section-title">Top Ranking Keywords</div><div class="section-sub">From Ahrefs organic keyword data</div>'
      +'<table class="table"><tr><th>Keyword</th><th>Position</th><th>Monthly Volume</th><th>Traffic</th><th>Difficulty</th><th>Intent</th></tr>'
      +(ahrefs.keywords||[]).slice(0,12).map(function(k){
        var intent = k.is_transactional?'Transactional':k.is_commercial?'Commercial':'Informational';
        return '<tr><td><b>'+escHtml(k.keyword||'')+'</b></td>'
          +'<td style="font-weight:700;color:'+(k.best_position<=3?'#2ecc71':k.best_position<=10?'#f39c12':'#e74c3c')+'">'+( k.best_position||'—')+'</td>'
          +'<td>'+(k.volume?(k.volume/1000).toFixed(1)+'k':k.volume||'—')+'</td>'
          +'<td>'+(k.sum_traffic||'—')+'</td>'
          +'<td>'+(k.keyword_difficulty||'—')+'</td>'
          +'<td>'+intent+'</td></tr>';
      }).join('')
      +'</table></div>';
  }

  // Competitors
  if((ahrefs.competitors||[]).length) {
    html += '<div class="section"><div class="section-title">Organic Competitor Analysis</div><div class="section-sub">Ahrefs organic competitors data</div>'
      +'<table class="table"><tr><th>Domain</th><th>Domain Rating</th><th>Est. Traffic</th><th>Common Keywords</th><th>DR vs You</th></tr>'
      +(ahrefs.competitors||[]).map(function(c){
        var theirDR = parseFloat(c.domain_rating||c.dr||0);
        var diff = Math.round(theirDR - (ahrefs.domain_rating||0));
        return '<tr><td><b>'+escHtml(c.competitor_domain||c.domain||'')+'</b></td>'
          +'<td>'+Math.round(theirDR)+'</td>'
          +'<td>'+(c.traffic?Number(c.traffic).toLocaleString():'—')+'</td>'
          +'<td>'+(c.keywords_common?Number(c.keywords_common).toLocaleString():'—')+'</td>'
          +'<td style="color:'+(diff>10?'#e74c3c':diff<-5?'#2ecc71':'#f39c12')+';font-weight:700">'+(diff>0?'+':'')+diff+'</td></tr>';
      }).join('')
      +'</table></div>';
  }

  // Reviews & Reputation
  var ri2 = r.review_insights||{}; var res2 = r.web_research||{};
  html += '<div class="section"><div class="section-title">Brand Reputation & Reviews</div><div class="section-sub">Customer sentiment and brand signals</div>'
    +'<table class="table"><tr><th style="width:25%">Dimension</th><th>Details</th></tr>'
    +'<tr><td><b>Overall Sentiment</b></td><td style="font-weight:700;color:'+(ri2.overall_sentiment==='positive'?'#2ecc71':ri2.overall_sentiment==='negative'?'#e74c3c':'#f39c12')+'">'+escHtml(ri2.overall_sentiment||'Unknown')+'</td></tr>'
    +(ri2.avg_rating?'<tr><td><b>Average Rating</b></td><td>'+escHtml(ri2.avg_rating)+'</td></tr>':'')
    +'<tr><td><b>Review Summary</b></td><td>'+escHtml(res2.review_summary||ri2.recommendation||'')+'</td></tr>'
    +'<tr><td><b>What Customers Praise</b></td><td>'+(ri2.trust_signals||res2.common_praise||[]).map(function(s){return '• '+escHtml(s);}).join('<br>')+'</td></tr>'
    +'<tr><td><b>Common Complaints</b></td><td>'+(ri2.reputation_risks||res2.common_complaints||[]).map(function(s){return '• '+escHtml(s);}).join('<br>')+'</td></tr>'
    +'<tr><td><b>Paid Ad Signals</b></td><td>'+escHtml(res2.ad_signals||'Not detected')+'</td></tr>'
    +'<tr><td><b>Social Presence</b></td><td>'+escHtml(res2.social_presence||'Unknown')+'</td></tr>'
    +(res2.recent_news&&res2.recent_news.length?'<tr><td><b>Recent News</b></td><td>'+res2.recent_news.map(function(s){return '• '+escHtml(s);}).join('<br>')+'</td></tr>':'')
    +'</table></div>';

  // Business Canvas
  var bc2 = r.business_canvas||{};
  html += '<div class="section"><div class="section-title">Business Model Canvas</div><div class="section-sub">Strategic mapping of the business model</div>'
    +'<div class="canvas-grid">'
    +'<div class="canvas-cell"><div class="canvas-label">Key Partners</div>'+(bc2.key_partners||[]).map(function(i){return '<div style="font-size:10pt;padding:2px 0">'+escHtml(i)+'</div>';}).join('')+'</div>'
    +'<div style="display:flex;flex-direction:column;gap:8px">'
    +'<div class="canvas-cell"><div class="canvas-label">Key Activities</div>'+(bc2.key_activities||[]).map(function(i){return '<div style="font-size:10pt;padding:2px 0">'+escHtml(i)+'</div>';}).join('')+'</div>'
    +'<div class="canvas-cell"><div class="canvas-label">Key Resources</div>'+(bc2.key_resources||[]).map(function(i){return '<div style="font-size:10pt;padding:2px 0">'+escHtml(i)+'</div>';}).join('')+'</div>'
    +'</div>'
    +'<div class="canvas-cell canvas-vp"><div class="canvas-label" style="color:'+A+'">Value Propositions</div>'+(bc2.value_propositions||[]).map(function(i){return '<div style="font-size:10pt;font-weight:600;padding:3px 0">'+escHtml(i)+'</div>';}).join('')+'</div>'
    +'<div style="display:flex;flex-direction:column;gap:8px">'
    +'<div class="canvas-cell"><div class="canvas-label" style="color:#f39c12">Customer Relationships</div>'+(bc2.customer_relationships||[]).map(function(i){return '<div style="font-size:10pt;padding:2px 0">'+escHtml(i)+'</div>';}).join('')+'</div>'
    +'<div class="canvas-cell"><div class="canvas-label" style="color:#f39c12">Channels</div>'+(bc2.channels||[]).map(function(i){return '<div style="font-size:10pt;padding:2px 0">'+escHtml(i)+'</div>';}).join('')+'</div>'
    +'</div>'
    +'<div class="canvas-cell"><div class="canvas-label" style="color:#e74c3c">Customer Segments</div>'+(bc2.customer_segments||[]).map(function(i){return '<div style="font-size:10pt;padding:2px 0">'+escHtml(i)+'</div>';}).join('')+'</div>'
    +'</div>'
    +'<div class="canvas-bottom">'
    +'<div class="canvas-cell"><div class="canvas-label" style="color:#e74c3c">Cost Structure</div>'+(bc2.cost_structure||[]).map(function(i){return '<div style="font-size:10pt;padding:2px 0">'+escHtml(i)+'</div>';}).join('')+'</div>'
    +'<div class="canvas-cell"><div class="canvas-label">Revenue Streams</div>'+(bc2.revenue_streams||[]).map(function(i){return '<div style="font-size:10pt;font-weight:600;padding:2px 0">'+escHtml(i)+'</div>';}).join('')+'</div>'
    +'</div>'
    +'</div>';

  // Gap Analysis
  var gaps2 = r.gap_analysis||[];
  html += '<div class="section"><div class="section-title">Gap Analysis</div><div class="section-sub">Critical gaps ranked by revenue impact</div>'
    +'<table class="table"><tr><th>#</th><th>Gap</th><th>Category</th><th>Priority</th><th>Quick Win</th><th>Detail</th></tr>'
    +gaps2.map(function(g,i){
      var rowCls = g.priority==='high'?'gap-high':'gap-row';
      return '<tr class="'+rowCls+'"><td>'+( i+1)+'</td><td><b>'+escHtml(g.title||'')+'</b></td>'
        +'<td>'+escHtml(g.category||'')+'</td>'
        +'<td style="font-weight:700;color:'+(g.priority==='high'?'#e74c3c':g.priority==='medium'?'#f39c12':'#2ecc71')+'">'+escHtml(g.priority||'')+'</td>'
        +'<td>'+(g.quick_win?'Yes':'No')+'</td>'
        +'<td style="font-size:9pt;color:#666">'+escHtml(g.desc||'')+'</td></tr>';
    }).join('')
    +'</table></div>';

  // Forecast
  var fc2 = r.forecast||{};
  html += '<div class="section"><div class="section-title">Revenue Forecast</div><div class="section-sub">12-month projections and channel model</div>'
    +'<table class="table"><tr><th>Scenario</th><th>Revenue</th><th>Basis</th></tr>'
    +'<tr><td>Current position</td><td><b>'+escHtml(fc2.current_revenue||'—')+'</b></td><td>Based on reported data</td></tr>'
    +'<tr><td style="color:#3498db"><b>Conservative (12m)</b></td><td><b>'+escHtml(fc2.conservative_12m||'—')+'</b></td><td>Foundational improvements only</td></tr>'
    +'<tr><td style="color:#2ecc71"><b>Optimistic (12m)</b></td><td><b>'+escHtml(fc2.optimistic_12m||'—')+'</b></td><td>Full strategy execution</td></tr>'
    +'</table>'
    +((fc2.revenue_per_channel||[]).length ? '<table class="table"><tr><th>Channel</th><th>Current</th><th>12-Month Potential</th></tr>'
      +fc2.revenue_per_channel.map(function(c){
        return '<tr><td>'+escHtml(c.channel||'')+'</td><td>'+escHtml(c.current||'—')+'</td><td style="color:'+A+';font-weight:700">'+escHtml(c.potential||'—')+'</td></tr>';
      }).join('')+'</table>' : '')
    +'</div>';

  // Roadmap
  html += '<div class="section"><div class="section-title">6-Month Growth Roadmap</div><div class="section-sub">Phase-by-phase execution plan</div>'
    +'<table class="table"><tr><th>Phase</th><th>Timeline</th><th>Focus</th><th>Actions</th></tr>'
    +(r.roadmap||[]).map(function(phase){
      var items = (phase.items||[]).map(function(item){
        var t = typeof item==='string'?item:(item.task||'');
        var det = typeof item==='object'?item.detail:'';
        return '<div style="margin-bottom:6px"><b>→ '+escHtml(t)+'</b>'+(det?'<br><span style="font-size:9pt;color:#888">'+escHtml(det)+'</span>':'')+'</div>';
      }).join('');
      return '<tr><td><b>'+escHtml(phase.phase||'')+'</b></td><td>'+escHtml(phase.months||'')+'</td><td>'+escHtml(phase.label||'')+'</td><td>'+items+'</td></tr>';
    }).join('')
    +'</table></div>';

  // Checklist
  html += '<div class="section"><div class="section-title">Onboarding Checklist</div><div class="section-sub">'+(r.onboarding_checklist||[]).length+' tasks</div>'
    +'<table class="table"><tr><th style="width:30px"></th><th>Task</th><th>Phase</th><th>Priority</th><th>Owner</th><th>When</th><th>Detail</th></tr>'
    +(r.onboarding_checklist||[]).map(function(c){
      var priColor = c.priority==='critical'?'#e74c3c':c.priority==='high'?'#e67e22':c.priority==='medium'?'#f39c12':'#2ecc71';
      return '<tr><td style="text-align:center"><div class="chk-box"></div></td>'
        +'<td><b>'+escHtml(c.task||'')+'</b></td>'
        +'<td>'+escHtml(c.phase||'')+'</td>'
        +'<td style="color:'+priColor+';font-weight:700">'+escHtml(c.priority||'')+'</td>'
        +'<td>'+escHtml(c.owner||'')+'</td>'
        +'<td>'+escHtml(c.week||'')+'</td>'
        +'<td style="font-size:9pt;color:#666">'+escHtml(c.detail||'')+'</td></tr>';
    }).join('')
    +'</table></div>';

  // Closing
  var cl2 = r.closing||{};
  html += '<div class="section" style="background:#071a0e;color:#fff;border-bottom:none">'
    +'<div class="section-title" style="border-left-color:'+A+';color:#fff">Closing Recommendation</div>'
    +(cl2.headline?'<div style="font-size:20pt;font-weight:900;color:#fff;margin:16px 0">'+escHtml(cl2.headline)+'</div>':'')
    +'<p style="font-size:11pt;color:#ccc;line-height:1.7;margin-bottom:16px">'+escHtml(cl2.narrative||'')+'</p>'
    +(cl2.next_step?'<div style="background:'+A+';color:#071a0e;display:inline-block;padding:12px 20px;border-radius:6px;font-weight:700;font-size:11pt">Next Step: '+escHtml(cl2.next_step)+'</div>':'')
    +'<div style="margin-top:32px;font-size:14pt;font-weight:700;color:'+A+'">'+escHtml(d.agencyName)+'</div>'
    +'</div>';

  html += '</body></html>';

  var blob = new Blob([html], {type:'text/html'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = (d.clientName||'client').replace(/\\s+/g,'-')+'_brand_diagnostic_report.html';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escHtml(s) {
  if(!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Init
updateTopBar();
</script>
</body>
</html>
`;

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(TOOL_HTML);
});

// ─── Health check ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ ok: true, version: '1.0.0' }));

// ─── Main report generation endpoint ───────────────────────────────────────
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
    send('result', { ahrefs, report, clientName, domain, agency });
    res.end();

  } catch (err) {
    console.error('Generate error:', err);
    res.write(`data: ${JSON.stringify({ step: 'error', msg: err.message })}\n\n`);
    res.end();
  }
});

// ─── Ahrefs REST helper ─────────────────────────────────────────────────────
async function ahrefsGet(path, params) {
  const url = new URL(`https://api.ahrefs.com/v3/${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${AHREFS_API_KEY}` }
  });
  if (!res.ok) {
    const text = await res.text();
    console.warn(`Ahrefs /${path} ${res.status}:`, text.slice(0, 200));
    return {};
  }
  return res.json();
}

function ahrefsDate() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// ─── Web research ───────────────────────────────────────────────────────────
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
    const clean = text.replace(/\`\`\`[\w]*/g, '').replace(/\`\`\`/g, '').trim();
    const s = clean.indexOf('{'), e = clean.lastIndexOf('}');
    if (s >= 0 && e > s) return JSON.parse(clean.substring(s, e + 1));
  } catch (err) {
    console.warn('Web research failed:', err.message);
  }
  return { review_summary: 'Research unavailable', avg_rating: '', common_praise: [], common_complaints: [], ad_signals: 'Unable to detect', social_presence: 'Unknown', recent_news: [], brand_reputation: 'Unknown' };
}

// ─── Deep AI analysis ───────────────────────────────────────────────────────
async function runAnalysis(clientName, domain, mode, bizType, ahrefs, research, answers) {
  const q = answers || {};
  const lines = [
    `Generate a complete brand diagnostic report for ${clientName} (${domain}).`,
    `MODE: ${mode} | TYPE: ${bizType}`,
    ``,
    q.financials  ? `FINANCIALS: ${JSON.stringify(q.financials)}`   : '',
    q.brand       ? `BRAND: ${JSON.stringify(q.brand)}`             : '',
    q.goals       ? `GOALS: ${JSON.stringify(q.goals)}`             : '',
    q.obstacles   ? `OBSTACLES: ${JSON.stringify(q.obstacles)}`     : '',
    q.customer    ? `CUSTOMER: ${JSON.stringify(q.customer)}`       : '',
    q.painpoints  ? `PAIN POINTS: ${JSON.stringify(q.painpoints)}`  : '',
    q.objections  ? `OBJECTIONS: ${JSON.stringify(q.objections)}`   : '',
    q.products    ? `PRODUCTS: ${JSON.stringify(q.products)}`       : '',
    q.competitors ? `COMPETITORS: ${JSON.stringify(q.competitors)}` : '',
    q.acquisition ? `ACQUISITION: ${JSON.stringify(q.acquisition)}` : '',
    q.retention   ? `RETENTION: ${JSON.stringify(q.retention)}`     : '',
    q.type_specific ? `TYPE-SPECIFIC: ${JSON.stringify(q.type_specific)}` : '',
    ``,
    `LIVE AHREFS DATA:`,
    `Domain Rating: ${ahrefs.domain_rating}/100`,
    `Organic Traffic: ${(ahrefs.org_traffic||0).toLocaleString()}/mo`,
    `Ranking Keywords: ${(ahrefs.org_keywords||0).toLocaleString()} (${ahrefs.org_keywords_1_3} in top 3)`,
    `Traffic Value: ${ahrefs.org_cost ? '$' + Math.round(ahrefs.org_cost/100).toLocaleString() + '/mo' : 'N/A'}`,
    `Paid Traffic: ${ahrefs.paid_traffic} | Paid Keywords: ${ahrefs.paid_keywords}`,
    `Backlinks: ${ahrefs.backlinks_live} | Referring Domains: ${ahrefs.ref_domains}`,
    `Top Keywords: ${JSON.stringify(ahrefs.keywords?.slice(0,8))}`,
    `Competitors: ${JSON.stringify(ahrefs.competitors)}`,
    `Top Pages: ${JSON.stringify(ahrefs.top_pages?.slice(0,5))}`,
    ``,
    `WEB RESEARCH: ${JSON.stringify(research)}`,
    ``,
    `SIGNAL RULES: paid_traffic=0 → "No paid advertising" HIGH gap; domain_rating<30 → "Low domain authority" HIGH gap; org_keywords_1_3=0 → "Zero top-3 rankings" HIGH gap`,
    ``,
    `Return ONLY this JSON (specific data-driven content, no placeholders):`,
    JSON.stringify({
      exec_past:"specific sentences citing Ahrefs numbers",exec_future:"goals from questionnaire",exec_agency:"strategic approach",
      health_scores:{seo:0,paid:0,content:0,brand:0,conversion:0,retention:0},
      health_notes:{seo:"",paid:"",content:"",brand:"",conversion:"",retention:""},
      digital_analysis:{summary:"paragraph with specific numbers",signals:[{label:"",status:"good|warn|bad",value:"",insight:""}],keyword_opportunity:"",paid_gap:""},
      business_canvas:{key_partners:[],key_activities:[],key_resources:[],value_propositions:[],customer_relationships:[],channels:[],customer_segments:[],cost_structure:[],revenue_streams:[]},
      personas:[{name:"",tagline:"",dream_outcome:"",who:"",income:"",trigger:"",pains:[],objections:[],product_focus:[],messaging_hook:""}],
      competitor_analysis:{summary:"",strengths_vs_competitors:[],weaknesses_vs_competitors:[],market_gaps:[]},
      review_insights:{overall_sentiment:"positive|mixed|negative",avg_rating:"",key_themes:[],trust_signals:[],reputation_risks:[],recommendation:""},
      gap_analysis:[{title:"",desc:"2 sentences with revenue impact",priority:"high|medium|low",category:"SEO|Paid|Content|Brand|CRO|Retention|Strategy",quick_win:false}],
      forecast:{current_revenue:"",conservative_12m:"",optimistic_12m:"",revenue_per_channel:[{channel:"",current:"",potential:""}],key_assumptions:[]},
      roadmap:[{phase:"Phase 1",months:"Month 1-2",label:"Foundation",items:[{task:"",detail:""}]}],
      onboarding_checklist:[{task:"",phase:"Foundation",priority:"critical|high|medium|low",owner:"Agency|Client|Both",week:"Week 1",detail:""}],
      closing:{headline:"",narrative:"",next_step:""}
    })
  ];

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: 'You are a world-class brand strategist. Use ALL data provided. Write specific, commercially sharp content. No generic filler. Return ONLY valid JSON.',
    messages: [{ role: 'user', content: lines.filter(Boolean).join('\n') }]
  });

  const text = msg.content[0]?.text ?? '{}';
  const clean = text.replace(/\`\`\`[\w]*/g, '').replace(/\`\`\`/g, '').trim();
  const s = clean.indexOf('{'), e = clean.lastIndexOf('}');
  if (s >= 0 && e > s) return JSON.parse(clean.substring(s, e + 1));
  throw new Error('Failed to parse analysis JSON');
}

app.listen(PORT, () => console.log(`Brand Diagnostic running on port ${PORT}`));
