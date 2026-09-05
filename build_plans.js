#!/usr/bin/env node
/**
 * build_plans.js — generates the trip site from plans/*.json
 *
 *   node build_plans.js          rebuild all pages
 *   node build_plans.js --check  rebuild in memory and report any page that
 *                                would change (exit 1 if so). Run this first.
 *
 * Source of truth:
 *   plans/cities.json  – the 12 city pages (days, items, food tables, ...)
 *   plans/hub.json     – calendar / transport / booking pages
 *   plans/style.css    – the shared stylesheet
 *   plans/static/      – pages kept verbatim (overview+index, Jiuzhaigou
 *                        valley-day writeup, Universal, Pokemon). These are
 *                        copied through untouched, never regenerated.
 *
 * Editing rule: change plans/, then rebuild. Do not hand-edit the generated
 * HTML at the repo root — a rebuild overwrites it.
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const P = f => path.join(ROOT, 'plans', f);
const read = f => fs.readFileSync(f, 'utf8');

const CSS    = read(P('style.css'));
const cities = JSON.parse(read(P('cities.json')));
const hub    = JSON.parse(read(P('hub.json')));

const STATIC_PAGES = fs.readdirSync(P('static'));
// pages copied to a second name as well
const ALIASES = { '00-overview.html': ['index.html'] };

/* ---------- shared bits ---------- */
const badge = (cls, txt) => `<span class="badge badge-${cls}">${txt}</span>`;

function shell(title, body) {
  return `<!DOCTYPE html>\n<html lang="he" dir="rtl">\n<head>\n<meta charset="UTF-8">\n`
       + `<title>${title}</title>\n<style>\n${CSS}</style>\n</head>\n<body>\n\n`
       + body
       + `\n</body>\n</html>\n`;
}
const nav = inner => `<div class="nav">\n${inner}\n</div>\n`;

/* ---------- city pages ---------- */
function renderItem(it) {
  const kind = it.kind === 'bonus' ? 'bonus-item' : 'after-item';
  const id   = it.id ? ` id="${it.id}"` : '';
  const b = [];
  if (it.tier) b.push(badge(it.tier.toLowerCase(), it.tier));
  if (it.day)  b.push(badge('daytag', it.day));
  if (it.book) b.push(badge('book', it.book));
  if (it.tag)  b.push(badge(it.tag, it.tagText));
  let s = `<div class="${kind}"${id}>\n  ${b.join(it.badgeSep || '')}\n`
        + `  <span class="title">${it.title}</span>`;
  if (it.venue !== undefined) s += ` <span class="desc">${it.venue}</span>`;
  if (it.desc  !== undefined) s += `\n  <div class="desc">${it.desc}</div>`;
  return s + `\n</div>`;
}
const items = list => list.map(renderItem).join('\n');

function renderFood(sec) {
  let o = sec.lead;
  if (sec.note !== null) o += `<div class="food-note">${sec.note}</div>` + sec.betweenNoteTable;
  o += `<table class="food-table">\n<tr>` + sec.headers.map(h => `<th>${h}</th>`).join('') + `</tr>\n`;
  o += sec.rows.map(r => {
    const venue = r.venue !== null ? `<td class="venue">${r.venue}</td>` : '';
    return `<tr>\n  ` + r.cells.map(v => `<td>${v}</td>`).join('\n  ') + `\n  ${venue}\n</tr>`;
  }).join('\n');
  return o + `\n</table>` + sec.trail;
}

function renderCity(c) {
  let o = `<h1>${c.h1}</h1>\n` + nav(c.nav);
  if (c.intro !== null) o += `<p class="intro">${c.intro}</p>\n`;
  o += `\n<span class="label">${c.mainLabel}</span>\n<div class="main-box">\n`
     + c.main.map(m => `<div class="item">${m}</div>`).join('\n') + `\n</div>`;
  o += c.preBlocks;
  for (const name of c.sectionOrder) {
    const s = c.sections[name];
    o += `<h2>${name}</h2>`;
    if (s.type === 'items')      o += s.lead + items(s.items) + s.trail;
    else if (s.type === 'food')  o += renderFood(s);
    else {
      o += s.pre;
      for (const d of s.days)
        o += `<div class="day-heading">${d.label}</div>` + d.lead + items(d.items) + d.trail;
      if (s.extra)
        o += `<div class="day-heading extra-options-heading">${s.extra.label}</div>`
           + s.extra.lead + items(s.extra.items) + s.extra.trail;
      if (s.bonusLabel)
        o += `<span class="label">${s.bonusLabel}</span>\n`
           + s.bonusLead + items(s.bonus) + s.bonusTrail;
    }
  }
  return shell(c.title, o + `\n` + nav(c.navFooter));
}

/* ---------- hub pages ---------- */
function renderCalendar(k) {
  let o = `<h1>${k.h1}</h1>\n` + nav(k.navTop) + `<p class="intro">${k.intro}</p>` + k.preTable;
  o += `<table>\n<tr>` + k.headers.map(h => `<th>${h}</th>`).join('') + `</tr>\n`;
  o += k.rows.map(r => `<tr>\n` + r.map(v => `  <td>${v}</td>`).join('\n') + `\n</tr>`).join('\n');
  o += `\n</table>` + k.postTable + nav(k.navFooter);
  return shell(k.title, o);
}
function renderMoves(k, key) {
  let o = k.head + k[key].map(m => `<h2>${m.h2}</h2>${m.body}`).join('');
  return shell(k.title, o + `\n` + nav(k.navFooter));
}

/* ---------- build ---------- */
const outputs = new Map();
for (const c of cities) outputs.set(c.file, renderCity(c));
outputs.set('00b-calendar.html',           renderCalendar(hub.calendar));
outputs.set('00d-transport.html',          renderMoves(hub.transport, 'moves'));
outputs.set('00c-booking-and-chains.html', renderMoves(hub.booking, 'sections'));
for (const f of STATIC_PAGES) {
  const body = read(P(path.join('static', f)));
  outputs.set(f, body);
  for (const alias of (ALIASES[f] || [])) outputs.set(alias, body);
}

const check = process.argv.includes('--check');
let changed = 0;
for (const [file, body] of [...outputs].sort()) {
  const dest = path.join(ROOT, file);
  const before = fs.existsSync(dest) ? read(dest) : null;
  if (before === body) continue;
  changed++;
  console.log(`${check ? 'WOULD CHANGE' : 'wrote'}  ${file}`);
  if (!check) fs.writeFileSync(dest, body);
}
console.log(`\n${outputs.size} pages, ${changed} ${check ? 'would change' : 'changed'}.`);
if (check && changed) process.exit(1);
