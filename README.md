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

## Runway & Flight Math

Aircraft-specific performance development is on hold. The active section contains universal pressure/density altitude, runway wind, climb-gradient, fuel/endurance, and descent calculations. It requires no POH dataset, backend, or live weather. The inactive schema research remains documented in `docs/performance-data.md` for possible future development.
