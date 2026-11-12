// Keter shopping assistant: backend for ketergroup.com.au
// Serves the widget, keeps the Shopify catalogue and Google Sheet knowledge in memory,
// answers shopper questions with Claude, and logs every conversation back to the sheet.

import express from "express";
import { google } from "googleapis";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = process.env;
const PORT = env.PORT || 3000;
const MODEL = env.CLAUDE_MODEL || "claude-haiku-5-5";
const SITE_URL = (env.SITE_URL || "https://www.ketergroup.com.au").replace(/\/$/, "");
const ALLOWED = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);

if (!env.SHOPIFY_ADMIN_TOKEN && !(env.SHOPIFY_CLIENT_ID && env.SHOPIFY_CLIENT_SECRET)) {
  console.warn("Missing Shopify credentials: set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET (Dev Dashboard app) or SHOPIFY_ADMIN_TOKEN");
}
for (const k of ["ANTHROPIC_API_KEY", "SHOPIFY_STORE_DOMAIN", "GOOGLE_SHEET_ID", "GOOGLE_SERVICE_ACCOUNT_JSON"]) {
  if (!env[k]) console.warn(`Missing environment variable: ${k}`);
}

/* ------------------------------------------------------------------ */
/* Categories: maps Shopify collections to the assistant's 12 ranges   */
/* Order matters: the first match wins.                               */
/* ------------------------------------------------------------------ */
const CATEGORIES = [
  { type: "pets", collections: ["pets"] },
  { type: "cool bar", collections: ["coolers"] },
  { type: "bar shed & gazebo", title: /gazebo|garden bar|bar shed|pergola/i },
  { type: "adirondack chair", title: /adirondack/i },
  { type: "bin storage", collections: ["bin-storage"], title: /hideaway/i },
  { type: "tool storage", collections: ["tool-storage", "connect-tools", "tools"] },
  { type: "deck box", collections: ["storage-boxes-only", "boxes"] },
  { type: "shed", collections: ["sheds", "garden-sheds", "small-garden-sheds", "medium-shed", "vertical-sheds"] },
  { type: "planters & garden", collections: ["planters", "elevated-garden-beds", "garden"] },
  { type: "outdoor entertaining", collections: ["outdoor-entertainment", "unity-storage-table", "entertaining"] },
  { type: "indoor storage & laundry", collections: ["storage-baskets-boxes", "storage-laundry", "bins-recycling", "indoor-living", "indoor-cabinets"] },
  { type: "outdoor furniture", collections: ["furniture", "lounge-sets", "dining", "balcony-sets", "loungers", "individual-furniture"] }
];
const RANGE = CATEGORIES.map(c => c.type);

const CATEGORY_WORDS = {
  "pets": /\bpet|dog|cat\b|litter|kibble|pet food/i,
  "cool bar": /cool ?bar|go bar|bevy|drinks cooler|cooler/i,
  "bar shed & gazebo": /gazebo|garden bar|bar shed|pergola/i,
  "adirondack chair": /adirondack|troy|alpine|everest/i,
  "bin storage": /wheelie|bin storage|hideaway|hide (my|the) bins/i,
  "tool storage": /tool|sawhorse|workbench|work table|stack ?n|bike rack|garage/i,
  "deck box": /deck box|storage box|cushion|pool (gear|toys)|outdoor box/i,
  "shed": /\bshed|mower|garden storage|store it out|tidy|garage/i,
  "planters & garden": /plant|garden bed|raised bed|grow|veggie|vegetable|herb/i,
  "outdoor entertaining": /entertain|bbq|barbecue|prep bench|unity|beverage cart/i,
  "indoor storage & laundry": /indoor|laundry|hamper|drier|dryer|totem|recycl|basket|wardrobe/i,
  "outdoor furniture": /furniture|chair|lounge|dining|balcony|sofa|setting|stool|sun ?lounger|table/i
};

/* ------------------------------------------------------------------ */
/* Shopify catalogue sync                                             */
/* ------------------------------------------------------------------ */
let CATALOG = [];
let catalogUpdated = null;
let lastSyncError = null;
let catalogSource = null;

// Dev Dashboard apps: swap the client ID and secret for a short-lived access token,
// and fetch a new one before it expires. Older custom apps can set SHOPIFY_ADMIN_TOKEN instead.
let shopifyToken = { value: null, expires: 0 };
async function shopifyAccessToken() {
  if (env.SHOPIFY_ADMIN_TOKEN) return env.SHOPIFY_ADMIN_TOKEN;
  if (shopifyToken.value && Date.now() < shopifyToken.expires - 5 * 60 * 1000) return shopifyToken.value;
  const res = await fetch(`https://${env.SHOPIFY_STORE_DOMAIN}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: env.SHOPIFY_CLIENT_ID, client_secret: env.SHOPIFY_CLIENT_SECRET })
  });
  if (!res.ok) {
    const body = await res.text();
    const reason = (body.match(/Oauth error [^<]+/i) || body.match(/<title>([^<]+)<\/title>/i) || [body.slice(0, 200)])[0];
    throw new Error(`Shopify token request ${res.status}: ${reason.replace(/<\/?title>/g, "").trim()}`);
  }
  const json = await res.json();
  shopifyToken = { value: json.access_token, expires: Date.now() + (Number(json.expires_in) || 3600) * 1000 };
  return shopifyToken.value;
}

async function shopify(query, variables = {}, attempt = 1) {
  const token = await shopifyAccessToken();
  const res = await fetch(`https://${env.SHOPIFY_STORE_DOMAIN}/admin/api/${env.SHOPIFY_API_VERSION || "2026-10"}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables })
  });
  const json = await res.json();
  if (json.errors) {
    // Shopify limits how much can be read per second; wait and retry when throttled
    const throttled = JSON.stringify(json.errors).includes("THROTTLED");
    if (throttled && attempt < 6) { await new Promise(r => setTimeout(r, 2000 * attempt)); return shopify(query, variables, attempt + 1); }
    throw new Error(JSON.stringify(json.errors).slice(0, 500));
  }
  return json.data;
}

const PRODUCTS_QUERY = `query($after: String) {
  products(first: 25, after: $after, query: "status:active") {
    pageInfo { hasNextPage endCursor }
    nodes {
      title handle tags productType
      description(truncateAt: 280)
      priceRangeV2 { minVariantPrice { amount } }
      compareAtPriceRange { maxVariantCompareAtPrice { amount } }
      featuredMedia { preview { image { url(transform: { maxWidth: 300 }) } } }
      collections(first: 25) { nodes { handle } }
      specs: metafield(namespace: "custom", key: "specifications") { value }
      feats: metafield(namespace: "custom", key: "products_feature") { value }
      sqm: metafield(namespace: "custom", key: "square_meters") { value }
      warranty: metafield(namespace: "custom", key: "service_warranty") { value }
      assembly: metafield(namespace: "custom", key: "assembly") { value }
    }
  }
}`;

function categorise(p, handles) {
  for (const c of CATEGORIES) {
    if (c.title && c.title.test(p.title)) return c.type;
    if (c.collections && c.collections.some(h => handles.includes(h))) return c.type;
  }
  return null;
}

// Main sync: Shopify Admin API (full specs). If it fails for any reason, fall back to the public store pages.
async function syncCatalog() {
  try {
    await syncCatalogAdmin();
    catalogSource = "Shopify Admin API (full specs)";
  } catch (e) {
    console.error("Admin catalogue sync failed, using public store pages instead:", e.message);
    lastSyncError = `Admin sync: ${e.message}`.slice(0, 300);
    await syncCatalogPublic();
    catalogSource = "Public store pages (no detailed specs)";
  }
}

// Fallback: the public product JSON every Shopify store serves (no app or token needed)
async function getJSON(url) {
  const res = await fetch(url, { headers: { "Accept": "application/json", "User-Agent": "KeterShoppingAssistant/1.0" } });
  if (!res.ok) throw new Error(`${res.status} from ${url}`);
  return res.json();
}
async function publicProducts(path) {
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const data = await getJSON(`${SITE_URL}${path}?limit=250&page=${page}`);
    const list = data.products || [];
    all.push(...list);
    if (list.length < 250) break;
    await new Promise(r => setTimeout(r, 300));
  }
  return all;
}
async function syncCatalogPublic() {
  // Which collections each product is in, for categorising
  const inCollections = {};
  const handles = [...new Set([...CATEGORIES.flatMap(c => c.collections || []), ...KNOWLEDGE.promos.map(promoCollection).filter(Boolean)])];
  for (const h of handles) {
    try {
      for (const p of await publicProducts(`/collections/${h}/products.json`)) (inCollections[p.handle] ||= []).push(h);
    } catch (e) { /* a collection that doesn't exist is fine */ }
    await new Promise(r => setTimeout(r, 200));
  }
  const out = [];
  for (const n of await publicProducts("/products.json")) {
    const type = categorise(n, inCollections[n.handle] || []);
    if (!type) continue;
    let name = n.title, preorder = null;
    const m = name.match(/^PRE ?ORDER:?\s*([A-Za-z]+)\.?\s*-\s*(.*)$/i);
    if (m) { preorder = `Pre-order, ships ${monthName(m[1])}`; name = m[2]; }
    const variants = n.variants || [];
    const price = Math.min(...variants.map(v => Number(v.price || 0)).filter(x => x > 0), Infinity);
    const was = Math.max(0, ...variants.map(v => Number(v.compare_at_price || 0)));
    const tags = Array.isArray(n.tags) ? n.tags : String(n.tags || "").split(",");
    const outOfStock = tags.some(t => /out of stock/i.test(t));
    const img = (n.images && n.images[0] && n.images[0].src) ? n.images[0].src.replace(/(\.[a-z]+)(\?|$)/i, "_300x$1$2") : "";
    out.push({
      id: n.handle,
      collections: inCollections[n.handle] || [],
      name: name.replace(/\s+/g, " ").trim(),
      type,
      price: isFinite(price) ? price : 0,
      ...(was > price ? { was } : {}),
      ...(preorder ? { preorder } : {}),
      stock: outOfStock ? "Out of stock" : (preorder ? preorder : "In stock"),
      img,
      url: `${SITE_URL}/products/${n.handle}`,
      desc: String(n.body_html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300),
      specs: "", features: "", sqm: "", warranty: "", assembly: "",
      roof: type === "shed" ? roofStyle(n.title) : ""
    });
  }
  if (!out.length) throw new Error("Public store pages returned no products in the 12 categories");
  CATALOG = out;
  catalogUpdated = new Date();
  console.log(`Catalogue synced from public store pages: ${out.length} products`);
}

async function syncCatalogAdmin() {
  const out = [];
  let after = null;
  do {
    const data = await shopify(PRODUCTS_QUERY, { after });
    for (const n of data.products.nodes) {
      const handles = n.collections.nodes.map(c => c.handle);
      const type = categorise(n, handles);
      if (!type) continue;
      let name = n.title, preorder = null;
      const m = name.match(/^PRE ?ORDER:?\s*([A-Za-z]+)\.?\s*-\s*(.*)$/i);
      if (m) { preorder = `Pre-order, ships ${monthName(m[1])}`; name = m[2]; }
      const price = Number(n.priceRangeV2?.minVariantPrice?.amount || 0);
      const was = Number(n.compareAtPriceRange?.maxVariantCompareAtPrice?.amount || 0);
      const outOfStock = n.tags.some(t => /out of stock/i.test(t));
      out.push({
        id: n.handle,
        collections: handles,
        name: name.replace(/\s+/g, " ").trim(),
        type,
        price,
        ...(was > price ? { was } : {}),
        ...(preorder ? { preorder } : {}),
        stock: outOfStock ? "Out of stock" : (preorder ? preorder : "In stock"),
        img: n.featuredMedia?.preview?.image?.url || "",
        url: `${SITE_URL}/products/${n.handle}`,
        desc: (n.description || "").replace(/\s+/g, " ").trim(),
        specs: usefulSpecs(listValue(n.specs)),
        features: listValue(n.feats).join(", "),
        sqm: n.sqm?.value || "",
        warranty: richText(n.warranty?.value).replace(/\(refer.*$/i, "").trim(),
        assembly: n.assembly?.value || "",
        roof: type === "shed" ? roofStyle(n.title) : ""
      });
    }
    after = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
    if (after) await new Promise(r => setTimeout(r, 400)); // stay well under Shopify's rate limit
  } while (after);
  if (!out.length) throw new Error("Shopify returned no products in the 12 categories. Check the collection handles in CATEGORIES.");
  CATALOG = out;
  catalogUpdated = new Date();
  console.log(`Catalogue synced: ${out.length} products`);
}

// Keter sheds: "Pent" models have a single sloping (skillion) roof; walk-in garden sheds have a gable (apex) roof
function roofStyle(title) {
  if (/store.?it.?out|mega|alto|2020l|1200l|880l|vertical|shelf kit|tall|premier/i.test(title)) return "";
  return /pent/i.test(title) ? "skillion (pent)" : "gable (apex)";
}

// Shopify list metafields arrive as JSON text: ["External Width: 1900mm", ...]
function listValue(m) {
  if (!m || !m.value) return [];
  try { const v = JSON.parse(m.value); return Array.isArray(v) ? v.map(String) : [String(v)]; } catch (e) { return [m.value]; }
}
// Keep the specs shoppers ask about; drop internal codes and country
function usefulSpecs(list) {
  return list
    .filter(x => !/^(code|manufactured country|package|packaging|skid|delivery|total no|total shipping)/i.test(x.trim()))
    .map(x => x.replace(/\s+/g, " ").trim()).join("; ");
}
// Rich text metafields are JSON trees; pull out just the words
function richText(v) {
  if (!v) return "";
  try {
    const out = [];
    (function walk(n) { if (!n) return; if (n.type === "text" && n.value) out.push(n.value); (n.children || []).forEach(walk); })(JSON.parse(v));
    return out.join(" ").replace(/\s+/g, " ").trim();
  } catch (e) { return ""; }
}

function monthName(s) {
  const m = { JAN: "January", FEB: "February", MAR: "March", APR: "April", MAY: "May", JUN: "June", JUL: "July", AUG: "August", SEP: "September", OCT: "October", NOV: "November", DEC: "December" };
  return m[s.slice(0, 3).toUpperCase()] || s;
}

/* ------------------------------------------------------------------ */
/* Google Sheet: knowledge in, conversation logs out                   */
/* ------------------------------------------------------------------ */
let sheets = null;
function sheetsClient() {
  if (sheets) return sheets;
  const creds = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({ credentials: creds, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  sheets = google.sheets({ version: "v4", auth });
  return sheets;
}

let KNOWLEDGE = { promos: [], faqs: [], notes: {}, store: [] };
let knowledgeUpdated = null;

const yes = v => String(v || "").trim().toLowerCase() === "yes";
// Sale page links can be written as /collections/... or a full address
const fullLink = v => { v = String(v || "").trim(); return !v ? "" : /^https?:/i.test(v) ? v : SITE_URL + (v.startsWith("/") ? v : "/" + v); };

function rowsToObjects(rows) {
  if (!rows || rows.length < 2) return [];
  const [head, ...body] = rows;
  return body.map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

function parseSheetDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

async function syncKnowledge() {
  const res = await sheetsClient().spreadsheets.values.batchGet({
    spreadsheetId: env.GOOGLE_SHEET_ID,
    ranges: ["'Promotions'!A:I", "'FAQs'!A:E", "'Product notes'!A:D", "'Store info'!A:D"],
    valueRenderOption: "FORMATTED_VALUE"
  });
  const [promos, faqs, notes, store] = res.data.valueRanges.map(v => rowsToObjects(v.values));
  const now = new Date();
  // End dates run to the end of that day in Melbourne.
  const endOfDay = d => new Date(d.getTime() + 24 * 3600 * 1000);
  KNOWLEDGE = {
    promos: promos.filter(p => {
      if (!yes(p["Active"])) return false;
      const s = parseSheetDate(p["Start date"]), e = parseSheetDate(p["End date"]);
      return (!s || s <= now) && (!e || endOfDay(e) > now);
    }).map(p => ({ code: p["Code"], offer: p["Offer (as the shopper sees it)"], appliesTo: p["Applies to"], ends: p["End date"], link: fullLink(p["Link (sale page)"]),
      categories: String(p["Show with (categories)"] || "").split(",").map(c => c.trim().toLowerCase()).filter(Boolean) })),
    faqs: faqs.filter(f => yes(f["Active"])).map(f => ({ q: f["Question"], a: f["Answer"] })),
    notes: Object.fromEntries(notes.filter(n => yes(n["Active"]) && n["Product handle"]).map(n => [n["Product handle"].trim(), n["Note for shoppers"]])),
    store: store.filter(s => yes(s["Active"])).map(s => `${s["Topic"]}: ${s["Detail"]}`)
  };
  knowledgeUpdated = now;
  console.log(`Knowledge synced: ${KNOWLEDGE.promos.length} promotions, ${KNOWLEDGE.faqs.length} FAQs`);
}

function melbourneTime() {
  return new Date().toLocaleString("en-AU", { timeZone: "Australia/Melbourne", hour12: false });
}

async function appendRows(tab, rows) {
  try {
    await sheetsClient().spreadsheets.values.append({
      spreadsheetId: env.GOOGLE_SHEET_ID,
      range: `'${tab}'!A:A`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: rows }
    });
  } catch (e) { console.error(`Logging to ${tab} failed:`, e.message); }
}

/* ------------------------------------------------------------------ */
/* Choosing which products to show Claude for each question            */
/* ------------------------------------------------------------------ */
function pickProducts(messages, compareIds = []) {
  const userText = messages.filter(m => m.role === "user").slice(-3).map(m => m.content).join(" ").toLowerCase();
  const picked = new Map();
  const add = p => { if (p && !picked.has(p.id)) picked.set(p.id, p); };

  compareIds.forEach(id => add(CATALOG.find(p => p.id === id)));

  const cats = Object.entries(CATEGORY_WORDS).filter(([, re]) => re.test(userText)).map(([t]) => t);
  const wantsSale = /sale|deal|discount|promo|black friday|cheap|special|save|code/.test(userText);
  const budget = (userText.match(/under \$?(\d{2,5})/) || [])[1];

  let pool = cats.length ? CATALOG.filter(p => cats.includes(p.type)) : CATALOG;
  if (budget) pool = pool.filter(p => p.price <= Number(budget));

  const words = userText.split(/[^a-z0-9]+/).filter(w => w.length > 2);
  const score = p => {
    const hay = `${p.name} ${p.type} ${p.desc}`.toLowerCase();
    let s = words.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0);
    if (wantsSale && p.was) s += 3 + (p.was - p.price) / 200;
    if (p.was) s += 0.5;
    return s;
  };
  [...pool].sort((a, b) => score(b) - score(a)).slice(0, 25).forEach(add);
  if (!cats.length && wantsSale) {
    CATALOG.filter(p => p.was).sort((a, b) => (b.was - b.price) - (a.was - a.price)).slice(0, 15).forEach(add);
  }
  return [...picked.values()].slice(0, 30);
}

// A promotion linked to a collection only applies to products in that collection (e.g. CHAIR30 -> AdirondackBF 2026)
function promoCollection(p) {
  const m = String(p.link || "").match(/\/collections\/([^/?#]+)/);
  return m ? m[1] : null;
}
function promoAppliesTo(p, product) {
  const c = promoCollection(p);
  if (!c) return true;                       // product-page or store-wide promotions: no collection rule
  return (product.collections || []).includes(c);
}
function eligibleCodes(product) {
  return KNOWLEDGE.promos.filter(p => p.code && (p.categories || []).includes(product.type) && promoAppliesTo(p, product)).map(p => p.code);
}

// Which promotion cards to show.
// A general "what's on sale / any codes?" question shows every current promotion (Claude's picks first).
// Otherwise only the one or two codes Claude chose for what the shopper is looking at.
function pickPromos(r, question = "", shownTypes = [], shown = []) {
  const codes = (Array.isArray(r.promo_codes) ? r.promo_codes : []).map(c => String(c).toLowerCase());
  const chosen = codes.map(c => KNOWLEDGE.promos.find(p => (p.code || "").toLowerCase() === c)).filter(Boolean)
    .filter(p => !shown.length || !promoCollection(p) || shown.some(prod => promoAppliesTo(p, prod)));
  // Promotions set in the sheet to always appear with the kind of product being shown (e.g. BFSTORE20 with sheds)
  const forCategory = KNOWLEDGE.promos.filter(p => (p.categories || []).some(c => shownTypes.includes(c)) &&
    (!shown.length || !promoCollection(p) || shown.some(prod => promoAppliesTo(p, prod))));
  const general = isGeneralSaleQuestion(question);
  const list = general ? [...chosen, ...forCategory, ...KNOWLEDGE.promos] : [...forCategory, ...chosen];
  const unique = [...new Map(list.map(p => [p.code || p.offer, p])).values()];
  return unique.slice(0, general ? 20 : 2).map(({ code, offer, ends, link }) => ({ code, offer, ends, link }));
}

// Categories the shopper is looking at: from the products shown, or from what they've asked about
function typesInPlay(shown, question) {
  const types = new Set(shown.map(p => p.type));
  for (const [t, re] of Object.entries(CATEGORY_WORDS)) if (re.test(question)) types.add(t);
  return [...types];
}

function isGeneralSaleQuestion(q) {
  const t = String(q).toLowerCase();
  const asksDeals = /sale|deal|discount|promo|code|offer|black friday|special|cheap|save|saving/.test(t);
  const namesProduct = Object.values(CATEGORY_WORDS).some(re => re.test(t));
  return asksDeals && !namesProduct;
}

function productForPrompt(p) {
  const o = { id: p.id, name: p.name, category: p.type, price: p.price, stock: p.stock };
  if (p.was) o.was = p.was;
  const codes = eligibleCodes(p);
  if (codes.length) o.promo_codes_that_apply = codes;
  if (p.roof) o.roof = p.roof;
  if (p.specs) o.specs = p.specs;
  if (p.sqm) o.floor_area_m2 = p.sqm;
  if (p.features) o.features = p.features;
  if (p.warranty) o.warranty = p.warranty;
  if (p.assembly) o.assembly = p.assembly;
  if (p.desc) o.description = p.desc.slice(0, 200);
  if (KNOWLEDGE.notes[p.id]) o.note = KNOWLEDGE.notes[p.id];
  return o;
}

function systemPrompt(products) {
  return `You are the shopping assistant on ketergroup.com.au, Keter Australia's online store. You help shoppers find the right product and buy with confidence. You are a sales assistant, not customer service, and you don't have a personal name.

PRODUCT RANGE: ${RANGE.join(", ")}.

PRODUCTS RELEVANT TO THIS CONVERSATION (recommend only these, by id; "was" means it is on sale; "specs" has the exact external and internal sizes, door opening and weight; shed names like "6x8" are in feet, and metres are in brackets):
${JSON.stringify(products.map(productForPrompt))}

CURRENT PROMOTIONS (only these exist; never mention any other code):
${JSON.stringify(KNOWLEDGE.promos)}

FAQS (approved answers; use them where they fit):
${JSON.stringify(KNOWLEDGE.faqs)}

STORE FACTS:
${KNOWLEDGE.store.join("\n")}

YOUR GOAL
You are Keter's sales assistant. Your goal is to help the shopper choose and buy. Be confident, positive and enthusiastic about Keter products, highlight benefits, and always move the conversation towards a product they can buy. Every Keter product is made from tough, weather-resistant resin built to last outdoors: it won't rust, rot, peel or need painting, handles the Australian sun and rain, and is easy to clean. Use these points only when someone asks about quality, durability, weather, maintenance or how long something lasts, and say them at most once in a conversation. Don't repeat them in later replies. Never say you can't answer or that you don't know: answer with the benefits you do know, recommend a product, and mention the product page has the warranty and full specs.

HOW TO HELP
- Australian English, warm and plain. Only greet ("Hi") in your very first reply of a conversation; after that, answer straight away with no greeting. Never say "G'day". Max 60 words in "reply". No markdown or lists.
- Recommend early. Ask your questions once, in a single message. As soon as the shopper answers any of them, or says they have no preference or don't mind, stop asking and recommend 1 to 3 specific products by name with a one-line reason each, and include them in product_ids. Never ask a question you've already asked, and never ask more than one round of questions before recommending.
- Keep replies short and specific: no filler, no repeating what the shopper just said back to them at length, no repeating selling points you've already made.
- Sell like a helpful in-store expert. Acknowledge what the shopper said, show the best-matching products straight away, and ask the questions that narrow it down. Put up to three short questions in one friendly message rather than one at a time.
- For sheds, the questions are: what it's for (garden tools, mower, bikes, workshop), gable or skillion roof (use the "roof" field), and any colour preference. If they give a size, first say which sheds come closest to it and their sizes, then ask the questions. Example: "Great, a 2m x 4m footprint. The closest are the Newton Plus 7.5x13 (2.3 x 4.1m) and the Apex 7.5x13 (2.3 x 4.0m). Can you tell me what it's for? Do you prefer a gable or skillion roof? Any colour preference?"
- For other products, ask the equivalent: what it's for, where it's going (size or space), and style or colour.
- Never say you don't have details, can't confirm, or that they should check elsewhere before buying. Use the specs you have; if a product has no specs, use the size in its name.
- A code only applies to products listing it in "promo_codes_that_apply". When a shopper is interested in a promotion, recommend products it applies to (for example, for CHAIR30 show the single Alpine or Troy chairs, not the Premium range). Never put a code next to a product it doesn't apply to.
- Each promotion has "categories". Whenever you recommend or discuss products in one of those categories, add one short sentence about that promotion, including its condition, and put its code in "promo_codes". For sheds and storage, for example: "Plus, take an extra 20% off with code BFSTORE20 when you buy 2 or more items over $200 each."
- Mention a relevant promotion when it applies, and put its code in "promo_codes". Only include codes that apply to what the shopper is looking at right now (usually one, never more than two). For example, for Adirondack chairs use only CHAIR30.
- Only when the shopper asks generally what's on sale or what codes there are, include every current code in "promo_codes", most relevant first, plus the sale products that best match anything they've told you.
- When you talk about a product type, always show matching products in "product_ids" (for Adirondack chairs, show the single chairs the code applies to).
- If a product has no specs, use the size in its name: metres in brackets, e.g. "(2.8 x 2.2m)", or the feet size, e.g. "9x7" is about 2.7 x 2.1m.
- Sizes: when a shopper gives a size or space (e.g. "2m x 4m", "fits a 1.5m gap", "room for two bikes"), use the specs to recommend the closest matching products, quote their external size in metres (convert mm to m, e.g. 1900mm = 1.9m) and say whether it fits. If nothing matches exactly, offer the nearest smaller and larger options. Never say you can't confirm a size when specs are available.
- Warranty, floor and assembly questions: answer from the warranty, features and assembly fields.
- When the shopper asks you to compare the best options for their priority and budget, pick the top 3 that fit (within budget where possible), put them in product_ids in that order, and in "reply" give one short line per product on what makes it different (size, price or saving, key feature), then say which you'd pick for them and why. Up to 100 words for comparisons.
- When comparing, use what is in the data: price, sale saving, stock or pre-order, specs (sizes, door opening, floor area), features, warranty and product notes. Point to the product pages for photos and the manual. If the shopper hasn't named two products, ask which two.
- Never invent specs, dimensions, capacity, assembly details, prices, stock or promotions. If a specific detail isn't in the data, give the benefits you do know, show the most relevant products, and say the product page has the full specs. Set unanswered true only when you truly couldn't help with the question at all.
- When the shopper wants ideas or advice (organising a garage, tidying a garden, entertaining, small balconies, hiding bins, growing veggies), give 2 or 3 practical tips in plain words, then suggest 1 to 3 products that fit. General tips are fine; product facts still come only from the data.
- You only help BEFORE someone buys. If the shopper is asking about something they have already ordered or bought (order status, tracking, delivery delays, damaged or missing items or parts, faulty products, warranty claims, returning or exchanging an item, refunds, price adjustments, cancelling or changing an order, invoices), do NOT try to answer, troubleshoot or quote any policy. Set support true, keep the reply to one or two sentences saying our team can help, and leave product_ids empty. A "Chat with our team" button appears automatically.
- Bulk, trade or wholesale orders, international delivery, and spare parts or accessories not listed for sale also go to the team: set support true.
- "product_ids": at most 6 products, the best matches first. If there are more options (for example many colours), show the most popular few and mention the rest are on the product page.
- "suggestions": up to 3 short next steps the shopper might tap (under 7 words each), written as the shopper, that move them towards choosing or buying (for example "Show me the single chairs", "Which colour is most popular?", "How do I use CHAIR30?"). Never suggest contacting or asking the team for pre-sale questions.

Always answer by calling the "answer" tool.`;
}

// Claude answers through a tool, so the reply always comes back as structured data (never free text to parse)
const ANSWER_TOOL = {
  name: "answer",
  description: "Send the reply to the shopper, with the products and promotion codes to show.",
  input_schema: {
    type: "object",
    properties: {
      reply: { type: "string", description: "What the shopper reads. Max 60 words, plain text, no markdown." },
      product_ids: { type: "array", items: { type: "string" }, description: "Up to 6 product ids to show as cards, best match first." },
      promo_codes: { type: "array", items: { type: "string" }, description: "Promotion codes to show as cards (usually 0 to 2)." },
      suggestions: { type: "array", items: { type: "string" }, description: "Up to 3 short next steps the shopper might tap." },
      support: { type: "boolean", description: "True if this is about an existing order, delivery, damage, warranty claim, return or refund." },
      unanswered: { type: "boolean", description: "True only if you truly couldn't help with the question." }
    },
    required: ["reply", "product_ids", "promo_codes", "suggestions", "support", "unanswered"]
  }
};

async function callClaude(system, messages, maxTokens) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: MODEL, max_tokens: maxTokens, system, messages,
      tools: [ANSWER_TOOL], tool_choice: { type: "tool", name: "answer" }
    })
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const tool = (data.content || []).find(b => b.type === "tool_use" && b.name === "answer");
  if (tool && tool.input && typeof tool.input.reply === "string") return tool.input;
  // Fallback: if a text answer came back instead, hand it to the old reader
  return (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
}

// Reads Claude's JSON answer. If it's cut short or slightly malformed, rescues the reply and product IDs.
function parseAnswer(raw) {
  const text = raw.replace(/```json|```/g, "").trim();
  const start = text.indexOf("{"), end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch (e) { /* fall through to rescue */ }
  }
  const reply = (text.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/) || [])[1];
  if (!reply) return null;
  const ids = ((text.match(/"product_ids"\s*:\s*\[([^\]]*)/) || [])[1] || "").match(/"([^"]+)"/g) || [];
  const codes = ((text.match(/"promo_codes"\s*:\s*\[([^\]]*)/) || [])[1] || "").match(/"([^"]+)"/g) || [];
  return {
    reply: JSON.parse(`"${reply}"`),
    product_ids: ids.map(x => x.slice(1, -1)),
    promo_codes: codes.map(x => x.slice(1, -1)),
    suggestions: [], support: /"support"\s*:\s*true/.test(text), unanswered: false
  };
}

async function askClaude(messages, products) {
  const system = systemPrompt(products);
  const read = out => (out && typeof out === "object") ? out : parseAnswer(out || "");
  const first = read(await callClaude(system, messages, 1500));
  if (first) return first;
  // One retry with a firm reminder
  const retry = read(await callClaude(system + "\n\nIMPORTANT: Keep the reply short and use the answer tool. Six products at most.", messages, 1500));
  if (retry) return retry;
  throw new Error("Could not read the answer from Claude");
}

/* ------------------------------------------------------------------ */
/* Post-sale questions go straight to the team (Gorgias), never Claude */
/* ------------------------------------------------------------------ */
const POST_SALE = [
  /\bmy (order|delivery|parcel|package|shed|chair|box|purchase|item|refund)\b/i,
  /\border (number|no\.?|#)|#\s?\d{4,}|\b\d{5,}\b.*order/i,
  /\b(track|tracking|where('?s| is) my|hasn'?t (arrived|come)|not (arrived|received|delivered)|never (arrived|received)|still waiting|marked (as )?delivered|lost (in the )?(post|mail|transit))/i,
  /\b(damaged|broken|cracked|faulty|defect(ive)?|missing (a |some )?(part|piece|screw|bolt|panel)s?|parts? (missing|broken)|wrong (item|colou?r|size|product))/i,
  /\b(refund|money back|charged twice|double charged|chargeback|cancel (my|the|an) order|change (my|the) (delivery )?address|price adjustment|price difference)/i,
  /\b(warranty claim|make a claim|claim (on|under) (the )?warranty|replacement part|return (my|it|this|the)|send (it|this) back|exchange (it|my|this))/i,
  /\b(invoice|tax invoice|receipt) for (my|an?) order/i
];
const isPostSale = text => POST_SALE.some(re => re.test(text));
const POST_SALE_REPLY = "That’s one for our team, as they can look up your order and sort it out properly. Tap Chat with our team below and they’ll help you from there.";

/* ------------------------------------------------------------------ */
/* HTTP                                                                */
/* ------------------------------------------------------------------ */
const app = express();
app.use(express.json({ limit: "64kb" }));

// Sites allowed to use the assistant: those in ALLOWED_ORIGINS, plus Keter's own domains
// and Shopify's theme preview addresses (so testing an unpublished theme always works)
function originAllowed(origin) {
  if (!origin) return false;
  if (ALLOWED.length === 0 || ALLOWED.includes(origin)) return true;
  return /^https:\/\/([a-z0-9-]+\.)*(ketergroup\.com\.au|ketergroup\.myshopify\.com|shopifypreview\.com)$/i.test(origin);
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && !originAllowed(origin) && req.path.startsWith("/api/")) console.warn(`Blocked request from ${origin} (not in ALLOWED_ORIGINS)`);
  if (origin && originAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Basic rate limit: 30 chat requests per IP per 10 minutes
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now(), win = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter(t => now - t < win);
  list.push(now); hits.set(ip, list);
  return list.length > 30;
}

app.use("/assets", express.static(path.join(__dirname, "public", "assets"), { maxAge: "7d" }));

app.get("/widget.js", (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=300");
  res.sendFile(path.join(__dirname, "public", "widget.js"));
});

// Test page: the real assistant, on the Railway address, before it goes on the Keter site
app.get("/preview", (req, res) => res.sendFile(path.join(__dirname, "public", "preview.html")));

app.get("/health", (req, res) => res.json({
  ok: true, products: CATALOG.length, catalogSource, catalogUpdated, knowledgeUpdated, lastSyncError,
  promotions: KNOWLEDGE.promos.length, faqs: KNOWLEDGE.faqs.length, model: MODEL
}));

// Promotions and products for a category (used by "What's on sale" and the compare picker)
app.get("/api/promos", (req, res) => res.json(KNOWLEDGE.promos.map(({ code, offer, ends, link }) => ({ code, offer, ends, link }))));
app.get("/api/products", (req, res) => {
  const type = String(req.query.type || "");
  res.json(CATALOG.filter(p => p.type === type).sort((a, b) => a.price - b.price).map(publicProduct));
});

function publicProduct(p) {
  const { desc, specs, features, warranty, assembly, sqm, collections, ...rest } = p;
  return rest;
}

app.post("/api/chat", async (req, res) => {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;
  if (rateLimited(ip)) return res.status(429).json({ reply: "You’re sending messages quickly. Please wait a minute and try again." });

  const { conversationId = "", messages = [], page = "", device = "", compareIds = [] } = req.body || {};
  const clean = messages
    .filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12)
    .map(m => ({ role: m.role, content: m.content.slice(0, 1500) }));
  if (!clean.length || clean[clean.length - 1].role !== "user") return res.status(400).json({ error: "No question" });

  const question = clean[clean.length - 1].content;

  // Orders, deliveries, damage, warranty, returns and refunds: no AI answer, straight to the team.
  if (!compareIds.length && isPostSale(question)) {
    res.json({ reply: POST_SALE_REPLY, products: [], promos: [], suggestions: [], support: true });
    appendRows("Conversations", [[melbourneTime(), conversationId, "Sent to team", page, device, question, POST_SALE_REPLY, "", "", ""]]);
    return;
  }

  try {
    const products = pickProducts(clean, compareIds);
    const r = await askClaude(clean, products);
    let ids = Array.isArray(r.product_ids) ? r.product_ids : [];
    if (compareIds.length) ids = compareIds;
    const shown = ids.map(id => CATALOG.find(p => p.id === id)).filter(Boolean).slice(0, 6);
    const codes = KNOWLEDGE.promos.filter(p => p.code && (r.reply || "").includes(p.code)).map(p => p.code);

    if (r.support) {
      res.json({ reply: r.reply || POST_SALE_REPLY, products: [], promos: [], suggestions: [], support: true });
      appendRows("Conversations", [[melbourneTime(), conversationId, "Sent to team", page, device, question, r.reply || POST_SALE_REPLY, "", "", ""]]);
      return;
    }

    res.json({
      reply: r.reply || "",
      products: shown.map(publicProduct),
      promos: pickPromos(r, question, typesInPlay(shown, question), shown),
      suggestions: Array.isArray(r.suggestions) ? r.suggestions.slice(0, 3) : [],
      support: !!r.support
    });

    appendRows("Conversations", [[melbourneTime(), conversationId, "Question", page, device, question, r.reply || "", shown.map(p => p.name).join(", "), codes.join(", "), ""]]);
    if (r.unanswered) appendRows("Unanswered questions", [[melbourneTime(), conversationId, question, r.reply || "", "No", "No", ""]]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ reply: "Sorry, I couldn’t answer that just now. Please try again in a moment.", products: [], promos: [], suggestions: [], support: false });
    appendRows("Unanswered questions", [[melbourneTime(), conversationId, question, `Error: ${e.message.slice(0, 200)}`, "No", "No", ""]]);
  }
});

// Product clicks, order help clicks and ratings
app.post("/api/event", (req, res) => {
  const { conversationId = "", event = "", page = "", device = "", product = "", rating = "", question = "", answer = "" } = req.body || {};
  const allowed = { "Product click": 1, "Promo click": 1, "Order help": 1, "Rating": 1 };
  if (!allowed[event]) return res.status(400).json({ error: "Unknown event" });
  appendRows("Conversations", [[melbourneTime(), conversationId, event, page, device, String(question).slice(0, 500), String(answer).slice(0, 500), String(product).slice(0, 200), "", rating === "Up" || rating === "Down" ? rating : ""]]);
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* Start                                                               */
/* ------------------------------------------------------------------ */
async function safe(fn, label) {
  try { await fn(); if (label === "Catalogue sync" && catalogSource && catalogSource.startsWith("Shopify")) lastSyncError = null; }
  catch (e) { console.error(`${label} failed:`, e.message); lastSyncError = `${label}: ${e.message}`.slice(0, 400); }
}

app.listen(PORT, async () => {
  console.log(`Shopping assistant listening on ${PORT}`);
  await safe(syncKnowledge, "Knowledge sync");
  await safe(syncCatalog, "Catalogue sync");
  setInterval(() => safe(syncKnowledge, "Knowledge sync"), (Number(env.KNOWLEDGE_REFRESH_MINUTES) || 10) * 60 * 1000);
  setInterval(() => safe(syncCatalog, "Catalogue sync"), (Number(env.CATALOG_REFRESH_HOURS) || 24) * 3600 * 1000);
  // If the first sync failed, keep retrying every 10 minutes until products load
  setInterval(() => { if (!CATALOG.length) safe(syncCatalog, "Catalogue sync"); }, 10 * 60 * 1000);
});
