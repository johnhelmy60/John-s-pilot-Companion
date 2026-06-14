# AGENTS.md

## Project
John's Pilot Companion is an offline-first iPhone-installable PWA for pilot tools.

## Safety
This app is reference-only. Do not present aviation data as guaranteed current. Always keep visible disclaimers to verify with ForeFlight, FAA/current sources, POH/W&B, instructor, and school procedures.

## Architecture Goal
Refactor the current single-file app into a maintainable structure:
- /public/index.html
- /public/manifest.webmanifest
- /public/sw.js
- /src/app.js
- /src/aircraft.js
- /src/airports.js
- /src/frequencies.js
- /src/craft.js
- /src/fuel.js
- /src/wb.js
- /data/airport_database_A_M.json
- /data/airport_database_N_Z.json

## Current Features
Preserve all existing behavior:
- Crosswind calculator
- Aircraft profiles
- Weight & balance
- Fuel and reserve
- Tank timer
- Hobbs/Tach tracker
- Route frequencies
- Airport database search
- Active/standby radio stack
- Go/No-Go
- CRAFT IFR clearance builder

## Rules
- Keep the app installable as a PWA.
- Keep offline behavior working.
- Do not remove existing features unless requested.
- Avoid large frameworks unless necessary.
- Prefer plain JavaScript modules.
- Keep iPhone Safari compatibility.
- After changes, test basic loading and no-console-error behavior.
