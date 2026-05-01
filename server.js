const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(cors()); // tighten this to your domain in production

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const AHREFS_API_KEY = process.env.AHREFS_API_KEY;
const PORT = process.env.PORT || 3000;

// ─── Health check ───────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ ok: true }));

// ─── Main report generation endpoint ────────────────────────────────────────
app.post('/generate', async (req, res) => {
  const { domain, clientName, mode, bizType, agency, answers } = req.body;

  if (!domain || !clientName) {
    return res.status(400).json({ error: 'domain and clientName are required' });
  }

  try {
    // Stream progress back as Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const send = (step, data) => {
      res.write(`data: ${JSON.stringify({ step, ...data })}\n\n`);
    };

    send('progress', { msg: 'Fetching domain rating & metrics', pct: 10 });
    const [drData, metricsData] = await Promise.all([
      ahrefsGet('site-explorer-domain-rating', { target: domain, date: ahrefsDate() }),
      ahrefsGet('site-explorer-metrics', { target: domain, date: ahrefsDate(), mode: 'subdomains' })
    ]);

    const ahrefs = {
      domain_rating: drData?.domain_rating?.domain_rating ?? 0,
      ahrefs_rank: drData?.domain_rating?.ahrefs_rank ?? null,
      org_traffic: metricsData?.metrics?.org_traffic ?? 0,
      org_keywords: metricsData?.metrics?.org_keywords ?? 0,
      org_keywords_1_3: metricsData?.metrics?.org_keywords_1_3 ?? 0,
      org_cost: metricsData?.metrics?.org_cost ?? null,
      paid_traffic: metricsData?.metrics?.paid_traffic ?? 0,
      paid_keywords: metricsData?.metrics?.paid_keywords ?? 0,
      paid_pages: metricsData?.metrics?.paid_pages ?? 0,
    };

    send('progress', { msg: 'Pulling keyword rankings', pct: 25 });
    const kwData = await ahrefsGet('site-explorer-organic-keywords', {
      target: domain,
      date: ahrefsDate(),
      mode: 'subdomains',
      limit: 12,
      order_by: 'sum_traffic:desc',
      select: 'keyword,best_position,volume,sum_traffic,keyword_difficulty,is_transactional,is_commercial'
    });
    ahrefs.keywords = kwData?.keywords ?? [];

    send('progress', { msg: 'Analysing competitors', pct: 40 });
    const compData = await ahrefsGet('site-explorer-organic-competitors', {
      target: domain,
      date: ahrefsDate(),
      mode: 'subdomains',
      country: 'us',
      limit: 6,
      order_by: 'traffic:desc',
      select: 'competitor_domain,domain_rating,keywords_common,traffic'
    });
    ahrefs.competitors = compData?.competitors ?? [];

    send('progress', { msg: 'Fetching backlinks & top pages', pct: 55 });
    const [blData, pagesData] = await Promise.all([
      ahrefsGet('site-explorer-backlinks-stats', { target: domain, date: ahrefsDate(), mode: 'subdomains' }),
      ahrefsGet('site-explorer-top-pages', {
        target: domain,
        date: ahrefsDate(),
        mode: 'subdomains',
        limit: 6,
        order_by: 'sum_traffic:desc',
        select: 'url,sum_traffic,keywords,top_keyword'
      })
    ]);
    ahrefs.backlinks_live = blData?.metrics?.live ?? 0;
    ahrefs.ref_domains = blData?.metrics?.live_refdomains ?? 0;
    ahrefs.top_pages = pagesData?.pages ?? [];

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

// ─── Ahrefs REST helper ──────────────────────────────────────────────────────
async function ahrefsGet(endpoint, params) {
  const url = new URL(`https://api.ahrefs.com/v3/${endpoint.replace(/-/g, '-')}`);
  // map endpoint name to actual path
  const pathMap = {
    'site-explorer-domain-rating':      'site-explorer/domain-rating',
    'site-explorer-metrics':            'site-explorer/metrics',
    'site-explorer-organic-keywords':   'site-explorer/organic-keywords',
    'site-explorer-organic-competitors':'site-explorer/organic-competitors',
    'site-explorer-backlinks-stats':    'site-explorer/backlinks-stats',
    'site-explorer-top-pages':          'site-explorer/top-pages',
  };
  const path = pathMap[endpoint] || endpoint;
  const fullUrl = new URL(`https://api.ahrefs.com/v3/${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fullUrl.searchParams.set(k, v);
  });

  const res = await fetch(fullUrl.toString(), {
    headers: { Authorization: `Bearer ${AHREFS_API_KEY}` }
  });

  if (!res.ok) {
    const text = await res.text();
    console.warn(`Ahrefs ${endpoint} error ${res.status}: ${text.slice(0, 200)}`);
    return {};
  }
  return res.json();
}

function ahrefsDate() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// ─── Web research via Claude + web search tool ───────────────────────────────
async function webResearch(clientName, domain) {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: 'You are a brand research analyst. Search the web to gather real, specific information. Return ONLY valid JSON — no markdown, no fences.',
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `Research the brand "${clientName}" (website: ${domain}). Find:
1. Customer reviews on Google, Trustpilot, G2, Capterra, or similar — what is the star rating and what do customers say?
2. Whether they are actively running Google Ads or Meta Ads (check Meta Ad Library, Google Ad Transparency)
3. Social media presence — which platforms, approximate follower counts, posting activity
4. Any notable recent news, press coverage, or brand mentions
5. Any notable positives or negatives about the brand reputation

Return JSON: {
  "review_summary": "specific summary of what reviewers say",
  "avg_rating": "e.g. 4.2/5 on Google (127 reviews)",
  "common_praise": ["specific point 1", "specific point 2"],
  "common_complaints": ["specific complaint 1", "specific complaint 2"],
  "ad_signals": "specific description of paid ad activity found or not found",
  "social_presence": "specific platforms and activity level",
  "recent_news": ["item 1", "item 2"],
  "brand_reputation": "overall assessment"
}`
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

// ─── Deep AI analysis ────────────────────────────────────────────────────────
async function runAnalysis(clientName, domain, mode, bizType, ahrefs, research, answers) {
  const q = answers || {};
  const lines = [
    `Generate a complete, specific brand diagnostic report for ${clientName} (${domain}).`,
    `MODE: ${mode} | TYPE: ${bizType}`,
    ``,
    `QUESTIONNAIRE DATA:`,
    q.financials ? `FINANCIALS: ${JSON.stringify(q.financials)}` : '',
    q.brand      ? `BRAND: ${JSON.stringify(q.brand)}` : '',
    q.goals      ? `GOALS: ${JSON.stringify(q.goals)}` : '',
    q.obstacles  ? `OBSTACLES: ${JSON.stringify(q.obstacles)}` : '',
    q.customer   ? `CUSTOMER: ${JSON.stringify(q.customer)}` : '',
    q.painpoints ? `PAIN POINTS: ${JSON.stringify(q.painpoints)}` : '',
    q.objections ? `OBJECTIONS: ${JSON.stringify(q.objections)}` : '',
    q.products   ? `PRODUCTS: ${JSON.stringify(q.products)}` : '',
    q.competitors? `COMPETITORS: ${JSON.stringify(q.competitors)}` : '',
    q.acquisition? `ACQUISITION: ${JSON.stringify(q.acquisition)}` : '',
    q.retention  ? `RETENTION: ${JSON.stringify(q.retention)}` : '',
    q.type_specific ? `TYPE-SPECIFIC: ${JSON.stringify(q.type_specific)}` : '',
    ``,
    `LIVE AHREFS DATA:`,
    `Domain Rating: ${ahrefs.domain_rating}/100`,
    `Organic Traffic: ${ahrefs.org_traffic?.toLocaleString()}/mo`,
    `Ranking Keywords: ${ahrefs.org_keywords?.toLocaleString()} (${ahrefs.org_keywords_1_3} in top 3)`,
    `Traffic Value: ${ahrefs.org_cost ? '$' + Math.round(ahrefs.org_cost / 100).toLocaleString() + '/mo' : 'N/A'}`,
    `Paid Traffic: ${ahrefs.paid_traffic} | Paid Keywords: ${ahrefs.paid_keywords}`,
    `Backlinks: ${ahrefs.backlinks_live} | Referring Domains: ${ahrefs.ref_domains}`,
    `Top Keywords: ${JSON.stringify(ahrefs.keywords?.slice(0, 8))}`,
    `Competitors: ${JSON.stringify(ahrefs.competitors)}`,
    `Top Pages: ${JSON.stringify(ahrefs.top_pages?.slice(0, 5))}`,
    ``,
    `WEB RESEARCH & REVIEWS:`,
    JSON.stringify(research),
    ``,
    `SIGNAL DETECTION RULES (apply these automatically):`,
    `- paid_traffic=0 AND paid_keywords=0 → flag "No paid advertising" as HIGH priority gap`,
    `- domain_rating<30 → flag "Low domain authority" as HIGH priority gap`,
    `- org_keywords_1_3=0 → flag "Zero top-3 rankings" as HIGH priority gap`,
    `- org_traffic<1000 → flag "Very low organic visibility" as HIGH priority gap`,
    `- review data shows complaints → reflect these specifically in review_insights`,
    ``,
    `Return ONLY this exact JSON (every field with specific, data-driven content — no generic placeholders):`,
    JSON.stringify({
      exec_past: "2-3 specific sentences citing actual Ahrefs numbers",
      exec_future: "2-3 sentences on specific goals from questionnaire",
      exec_agency: "2-3 sentences on recommended strategic approach",
      health_scores: { seo: 0, paid: 0, content: 0, brand: 0, conversion: 0, retention: 0 },
      health_notes: { seo: "", paid: "", content: "", brand: "", conversion: "", retention: "" },
      digital_analysis: {
        summary: "paragraph using specific numbers from Ahrefs",
        signals: [{ label: "", status: "good|warn|bad", value: "", insight: "" }],
        keyword_opportunity: "specific opportunity from keyword data",
        paid_gap: "specific paid advertising gap analysis"
      },
      business_canvas: {
        key_partners: [], key_activities: [], key_resources: [],
        value_propositions: [], customer_relationships: [], channels: [],
        customer_segments: [], cost_structure: [], revenue_streams: []
      },
      personas: [{
        name: "", tagline: "", dream_outcome: "", who: "", income: "",
        trigger: "", pains: [], objections: [], product_focus: [], messaging_hook: ""
      }],
      competitor_analysis: {
        summary: "", strengths_vs_competitors: [],
        weaknesses_vs_competitors: [], market_gaps: []
      },
      review_insights: {
        overall_sentiment: "positive|mixed|negative",
        avg_rating: "", key_themes: [], trust_signals: [],
        reputation_risks: [], recommendation: ""
      },
      gap_analysis: [{
        title: "", desc: "2 sentences with revenue impact",
        priority: "high|medium|low",
        category: "SEO|Paid|Content|Brand|CRO|Retention|Strategy",
        quick_win: false
      }],
      forecast: {
        current_revenue: "", conservative_12m: "", optimistic_12m: "",
        revenue_per_channel: [{ channel: "", current: "", potential: "" }],
        key_assumptions: []
      },
      roadmap: [{
        phase: "Phase 1", months: "Month 1-2", label: "Foundation",
        items: [{ task: "", detail: "" }]
      }],
      onboarding_checklist: [{
        task: "", phase: "Foundation", priority: "critical|high|medium|low",
        owner: "Agency|Client|Both", week: "Week 1", detail: ""
      }],
      closing: { headline: "", narrative: "", next_step: "" }
    })
  ];

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: 'You are a world-class brand strategist. Use ALL the data provided to write a specific, commercially sharp diagnostic report. No generic filler. Return ONLY valid JSON.',
    messages: [{ role: 'user', content: lines.filter(Boolean).join('\n') }]
  });

  const text = msg.content[0]?.text ?? '{}';
  const clean = text.replace(/```[\w]*/g, '').replace(/```/g, '').trim();
  const s = clean.indexOf('{'), e = clean.lastIndexOf('}');
  if (s >= 0 && e > s) return JSON.parse(clean.substring(s, e + 1));
  throw new Error('Failed to parse analysis JSON');
}

app.listen(PORT, () => console.log(`Brand Diagnostic API running on port ${PORT}`));
