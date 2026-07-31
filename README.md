# John's Pilot Companion

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

## Flight Math

Aircraft-specific performance development is on hold. Flight Math contains focused Density Altitude, TOC, and TOD planning calculators. It requires no aircraft profile, POH dataset, backend, or live weather. The inactive schema research remains documented in `docs/performance-data.md` for possible future development.

## Zulu Time

More → Zulu Time provides offline Local ↔ Zulu conversions using vendored Luxon and IANA timezone rules, including daylight-saving gaps and duplicated local times.
