# John's Pilot Companion v2.5

Adds CRAFT IFR Clearance builder:
- Clearance limit
- Route waypoint bubbles
- Maintain / Expect altitude quick buttons
- Expect time selector
- Departure frequency bubbles from selected airport
- Squawk input
- Live readback generator
- CRAFT completion checklist

Keep airport_database_A_M.json and airport_database_N_Z.json in the data directory.

## Weather proxy

`api/metar.js` is a Node serverless function (Vercel-style `/api` route). It requests the official NOAA/NWS Aviation Weather Center endpoint server-side because AWC does not permit browser CORS. It validates one ICAO code per request, caches each station for 60 seconds, limits each client to 30 proxy requests per minute, and exposes observation age/staleness instead of masking it. No API key is required.

Deploy the static PWA and `api/` function on the same origin. The client calls `/api/metar?icao=KDEN`. If another serverless host is used, adapt only the request/response wrapper while preserving validation, cache, rate-limit and response fields. AWC requests should remain no more frequent than once per station per minute.

## Performance datasets

Public users can select saved aircraft but cannot upload or approve performance data. The public catalog starts empty, so the app displays **Performance data unavailable**. See `docs/performance-data.md` for the exact-aircraft schema and developer-only validation/approval workflow. No calculations are enabled by this work.
