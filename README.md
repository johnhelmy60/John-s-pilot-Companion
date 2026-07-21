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

## Performance datasets

Public users can select saved aircraft but cannot upload or approve performance data. The public catalog starts empty, so the app displays **Performance data unavailable**. See `docs/performance-data.md` for the exact-aircraft schema and developer-only validation/approval workflow. No calculations are enabled by this work.
