#!/usr/bin/env node
// 在命令列排行程：找出最短的造訪順序、算距離，並產生可以直接打開的地圖連結。算法和網頁共用 trip-order.js
//
// 用法: node plan_route.js [--one-way] [--keep-order] [--lang=zh-Hant] <站> <站> ...
//   站可以是 IATA 代碼、城市、機場名稱或國家，9 種語言都可以；第一站固定是出發地
//   --one-way     不回到出發地（預設 3 站以上會回到出發地，和網頁一樣）
//   --keep-order  不改順序，只算距離和產生連結
//   --lang=       連結和地名用的語言：zh-Hant, zh-Hans, en, ja, ko, de, fr, es, ru
// 例: node plan_route.js TPE Tokyo Singapore London
const fs = require('fs');
const path = require('path');
const { EARTH_R, MAX_STOPS, EXACT_STOPS, bestOrder } = require('./trip-order.js');

const SITE = 'https://iantpe.github.io/tetra-unfold/';
const LANGS = ['zh-Hant', 'zh-Hans', 'en', 'ja', 'ko', 'de', 'fr', 'es', 'ru'];
const CITY_SUFFIX = /(特別市|広域市|특별시|광역시|市|縣|县|都|府|県|시)$/;
const normText = t => String(t).toLowerCase().replace(/台/g, '臺');
const readJson = file => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const opts = { oneWay: false, keepOrder: false, lang: '', queries: [] };
  for (const arg of argv) {
    if (arg === '--one-way') opts.oneWay = true;
    else if (arg === '--keep-order') opts.keepOrder = true;
    else if (arg.startsWith('--lang=')) opts.lang = arg.slice(7);
    else if (arg.startsWith('--')) fail(`Unknown option: ${arg}`);
    else opts.queries.push(...arg.split(',').map(x => x.trim()).filter(Boolean));
  }
  if (opts.lang && !LANGS.includes(opts.lang)) fail(`Unknown language: ${opts.lang}. Use one of: ${LANGS.join(', ')}`);
  return opts;
}

// 清單已經依「大型機場優先、旅客人數多的優先」排好，所以同樣符合時，前面的最常用
function loadAirports(lang) {
  const data = readJson('airports.json');
  const names = LANGS.map(l => readJson(`names/${l}.json`));
  const shown = lang ? names[LANGS.indexOf(lang)] : {};
  return data.airports.map(([iata, name, city, cc, lat, lon]) => {
    const local = names.map(n => n[iata] || ['', '', '']);
    const cityNames = local.flatMap(([, c, alt]) => [c, ...(alt ? alt.split('|') : [])]).filter(Boolean);
    const [lname = '', lcity = ''] = shown[iata] || [];
    const la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
    return {
      iata, cc,
      name: lname || name,
      city: lcity || city,
      v: [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)],
      cities: new Set([city, ...cityNames, ...cityNames.map(x => x.replace(CITY_SUFFIX, ''))].filter(Boolean).map(normText)),
      country: normText(data.countries[cc] || cc),
      all: normText([name, city, data.countries[cc], ...local.flat()].join('|')),
    };
  });
}

// 依序找：代碼 → 城市名完全相同 → 國家名完全相同 → 名稱裡有這幾個字
function findAirport(query, airports) {
  const code = query.toUpperCase(), q = normText(query);
  if (query.length === 3) {
    const a = airports.find(x => x.iata === code);
    if (a) return { airport: a, how: 'code', also: [] };
  }
  const rules = [
    ['city', a => a.cities.has(q)],
    ['country', a => a.country === q],
    ['name contains', a => a.all.includes(q)],
  ];
  for (const [how, match] of rules) {
    const hits = airports.filter(match);
    if (hits.length) return { airport: hits[0], how, also: hits.slice(1, 5).map(a => a.iata) };
  }
  return null;
}

const legKm = (a, b) => Math.acos(Math.max(-1, Math.min(1, a.v[0] * b.v[0] + a.v[1] * b.v[1] + a.v[2] * b.v[2]))) * EARTH_R;
const km = x => Math.round(x).toLocaleString('en-US') + ' km';
function totalKm(stops, round) {
  let sum = round ? legKm(stops[stops.length - 1], stops[0]) : 0;
  for (let k = 0; k + 1 < stops.length; k++) sum += legKm(stops[k], stops[k + 1]);
  return sum;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.queries.length < 2) fail('Give at least two stops, for example: node plan_route.js TPE Tokyo Singapore London');

  const airports = loadAirports(opts.lang);
  const missing = [], matches = [], notes = [];
  let stops = [];
  for (const query of opts.queries) {
    const found = findAirport(query, airports);
    if (!found) { missing.push(query); continue; }
    matches.push({ query, ...found });
    stops.push(found.airport);
  }
  if (missing.length) fail(`No airport found for: ${missing.join(', ')}`);

  // 算順序時，同一個機場只留第一次；不改順序時保留（例如回到轉機點），只去掉連續重複
  const unique = stops.filter((a, k) => (opts.keepOrder ? k === 0 || stops[k - 1] !== a : stops.indexOf(a) === k));
  if (unique.length < stops.length) notes.push(`Removed ${stops.length - unique.length} repeated stop(s).`);
  stops = unique;
  if (stops.length < 2) fail('The trip needs at least two different airports.');
  if (stops.length > MAX_STOPS) fail(`A trip can have at most ${MAX_STOPS} stops; this one has ${stops.length}.`);

  const round = !opts.oneWay && stops.length > 2;
  const before = totalKm(stops, round);
  let method = 'kept as given';
  if (!opts.keepOrder && stops.length >= 3) {
    const d = stops.map(a => stops.map(b => legKm(a, b)));
    const after = bestOrder(d, round).map(k => stops[k]);
    // 比原本短才換，和網頁一樣
    if (before - totalKm(after, round) > 1e-9) stops = after;
    method = stops.length <= EXACT_STOPS ? 'exact shortest' : 'approximate, may not be the shortest';
  }
  const total = totalKm(stops, round);

  console.log('Airports matched:');
  for (const m of matches) {
    const also = m.also.length ? `; also ${m.also.join(', ')}` : '';
    console.log(`  ${m.query} -> ${m.airport.iata} ${m.airport.name} (by ${m.how}${also})`);
  }
  console.log(`\nOrder (${round ? 'round trip' : 'one way'}, ${method}):`);
  stops.forEach((a, k) => {
    const leg = k ? km(legKm(stops[k - 1], a)) : 'start';
    console.log(`  ${String(k + 1).padStart(2)}. ${a.iata}  ${a.city || a.name}  ${leg}`);
  });
  if (round) console.log(`      back to ${stops[0].iata}  ${km(legKm(stops[stops.length - 1], stops[0]))}`);
  const saved = before - total;
  console.log(`\nTotal: ${km(total)}` + (saved > 0.5 ? ` (the order given was ${km(before)}; saves ${km(saved)})` : ''));
  for (const note of notes) console.log(`Note: ${note}`);

  const query = [];
  if (opts.lang) query.push(`lang=${opts.lang}`);
  query.push(`trip=${stops.map(a => a.iata).join(',')}`);
  if (opts.oneWay) query.push('rt=0');
  console.log(`Map: ${SITE}?${query.join('&')}`);
}

main();
