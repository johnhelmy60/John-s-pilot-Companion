'use strict';

const AWC_ENDPOINT = 'https://aviationweather.gov/api/data/metar';
const CACHE_MS = 60 * 1000;
const STALE_AFTER_MS = 90 * 60 * 1000;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT = 30;
const ALLOWED_ORIGIN = 'https://johnhelmy60.github.io';
const cache = new Map();
const clients = new Map();

function send(response, status, body, extraHeaders) {
  Object.entries(Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Accept, Content-Type',
    'Vary': 'Origin'
  }, extraHeaders || {})).forEach(([name, value]) => response.setHeader(name, value));
  return response.status(status).json(body);
}

function clientAddress(request) {
  return String(request.headers['x-forwarded-for'] || request.socket?.remoteAddress || 'unknown').split(',')[0].trim();
}

function rateLimited(request) {
  const now = Date.now();
  const key = clientAddress(request);
  const entry = clients.get(key);
  if (!entry || now - entry.startedAt >= RATE_WINDOW_MS) {
    clients.set(key, { startedAt: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

function numberOrNull(value) {
  return value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
}

function isoTime(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value < 1e12 ? value * 1000 : value).toISOString();
  const milliseconds = value ? Date.parse(value) : NaN;
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : null;
}

function normalizeMetar(icao, record, fetchedAt, cacheState) {
  const observationTime = isoTime(record.reportTime || record.obsTime || record.observationTime);
  const observedMs = observationTime ? Date.parse(observationTime) : NaN;
  const ageMinutes = Number.isFinite(observedMs) ? Math.max(0, Math.round((Date.now() - observedMs) / 60000)) : null;
  const altimeter = numberOrNull(record.altim);
  const altimeterHpa = altimeter === null ? null : altimeter > 100 ? altimeter : altimeter * 33.8638866667;
  const altimeterInHg = altimeter === null ? null : altimeter > 100 ? altimeter / 33.8638866667 : altimeter;
  return {
    status: 'available',
    station: icao,
    source: 'NOAA/NWS Aviation Weather Center',
    sourceUrl: `${AWC_ENDPOINT}?ids=${encodeURIComponent(icao)}&format=json`,
    fetchedAt,
    observationTime,
    ageMinutes,
    staleAfterMinutes: STALE_AFTER_MS / 60000,
    stale: ageMinutes === null || ageMinutes > STALE_AFTER_MS / 60000,
    cache: cacheState,
    temperatureC: numberOrNull(record.temp),
    altimeterInHg: altimeterInHg === null ? null : Number(altimeterInHg.toFixed(2)),
    altimeterHpa: altimeterHpa === null ? null : Number(altimeterHpa.toFixed(1)),
    wind: {
      directionDegrees: numberOrNull(record.wdir),
      speedKt: numberOrNull(record.wspd),
      gustKt: numberOrNull(record.wgst)
    },
    rawMetar: record.rawOb || record.rawText || null
  };
}

export default async function handler(request, response) {
  const origin = request.headers.origin;
  if (origin && origin !== ALLOWED_ORIGIN) return send(response, 403, { status: 'unavailable', error: 'Origin is not allowed.' });
  if (request.method === 'OPTIONS') {
    response.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
    response.setHeader('Vary', 'Origin');
    return response.status(204).end();
  }
  if (request.method !== 'GET') return send(response, 405, { status: 'unavailable', error: 'Method not allowed.' }, { Allow: 'GET' });
  if (rateLimited(request)) return send(response, 429, { status: 'unavailable', error: 'Proxy rate limit exceeded. Try again in one minute.' }, { 'Retry-After': '60' });

  const icao = String(request.query?.icao || '').trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9]{3}$/.test(icao)) return send(response, 400, { status: 'unavailable', error: 'ICAO must be exactly four letters/numbers and begin with a letter.' });

  const existing = cache.get(icao);
  if (existing && Date.now() - existing.cachedAt < CACHE_MS) {
    return send(response, 200, Object.assign({}, existing.payload, { cache: 'hit' }));
  }

  try {
    const upstream = await fetch(`${AWC_ENDPOINT}?ids=${encodeURIComponent(icao)}&format=json`, {
      headers: { Accept: 'application/json', 'User-Agent': 'JohnsPilotCompanion/2.5 (METAR planning-aid proxy)' },
      signal: AbortSignal.timeout(8000)
    });
    if (upstream.status === 204) return send(response, 404, { status: 'unavailable', station: icao, fetchedAt: new Date().toISOString(), error: 'AWC returned no current METAR for this station.' });
    if (upstream.status === 429) {
      if (existing) return send(response, 200, Object.assign({}, existing.payload, { cache: 'stale-fallback', stale: true, warning: 'AWC rate limited the live request.' }), { Warning: '110 - "Response is stale"' });
      return send(response, 429, { status: 'unavailable', station: icao, fetchedAt: new Date().toISOString(), error: 'AWC rate limited the weather request.' }, { 'Retry-After': upstream.headers.get('retry-after') || '60', 'Cache-Control': 'no-store' });
    }
    if (upstream.status >= 500) {
      if (existing) return send(response, 200, Object.assign({}, existing.payload, { cache: 'stale-fallback', stale: true, warning: `AWC returned HTTP ${upstream.status}.` }), { Warning: '110 - "Response is stale"' });
      return send(response, 502, { status: 'unavailable', station: icao, fetchedAt: new Date().toISOString(), error: `AWC service error: HTTP ${upstream.status}.` }, { 'Cache-Control': 'no-store' });
    }
    if (!upstream.ok) throw new Error(`AWC returned HTTP ${upstream.status}`);
    const records = await upstream.json();
    if (!Array.isArray(records) || !records.length) return send(response, 404, { status: 'unavailable', station: icao, fetchedAt: new Date().toISOString(), error: 'AWC returned no METAR record.' });
    const payload = normalizeMetar(icao, records[0], new Date().toISOString(), 'miss');
    cache.set(icao, { cachedAt: Date.now(), payload });
    return send(response, 200, payload);
  } catch (error) {
    if (existing) {
      const fallback = Object.assign({}, existing.payload, { cache: 'stale-fallback', stale: true, warning: `Live AWC retrieval failed: ${error.message}` });
      return send(response, 200, fallback, { Warning: '110 - "Response is stale"' });
    }
    return send(response, 503, { status: 'unavailable', station: icao, fetchedAt: new Date().toISOString(), error: `AWC weather unavailable: ${error.message}` }, { 'Cache-Control': 'no-store' });
  }
};
