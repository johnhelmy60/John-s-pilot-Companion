# John's Pilot Companion Data and Storage Architecture

This document defines the target data model and storage direction for John's Pilot Companion. It is intended for future developers extending the app beyond the current student/private pilot toolset.

The product goal is to build the most useful companion app for student pilots and private pilots without attempting to replace ForeFlight, FAA/current sources, aircraft POH data, instructors, or school procedures.

## Product And Safety Principles

- The app is reference-only.
- Aviation data must never be presented as guaranteed current.
- The UI should continue to remind pilots to verify with ForeFlight, FAA/current sources, POH/W&B, instructor, and school procedures.
- Prefer offline-first workflows that help pilots organize, brief, calculate, and remember.
- Avoid building primary navigation, official weather, certified performance, or moving-map behavior.
- Keep the app installable as a static PWA on GitHub Pages unless commercial requirements force a backend.

## Current Storage Baseline

The current app uses browser `localStorage` for:

- Aircraft profiles
- Selected aircraft
- Saved airports
- Route airport list
- Active/standby frequency state
- Form inputs
- Tank timer state
- CRAFT fields and route tokens
- Selected tab

This is acceptable for the current personal tool, but it will not scale cleanly as the app adds checklists, route plans, debrief logs, airport notes, data provenance, or future API-backed data.

## Target Storage Strategy

Use a layered storage approach:

1. `localStorage`
   - Small preferences only.
   - Selected tab, selected aircraft ID, UI mode, last-used simple settings.

2. IndexedDB
   - Structured user data.
   - Aircraft, saved airports, user frequency overrides, routes, checklists, personal minimums, lesson debriefs, app metadata.

3. Cache Storage / Service Worker
   - App shell.
   - Static modules.
   - Airport data files or shards.
   - Cache metadata should be stored separately from user data.

4. Future backend, if commercialized
   - Cloud sync.
   - School/instructor profile packs.
   - Optional API proxy for FAA/weather sources.
   - Never expose private API keys in frontend code.

## Versioning And Migration Rules

Every durable object should include:

```js
{
  schemaVersion: 1,
  createdAt: "2026-06-18T00:00:00.000Z",
  updatedAt: "2026-06-18T00:00:00.000Z"
}
```

Migration rules:

- Never assume stored data matches the latest schema.
- Keep migration functions idempotent.
- Preserve existing `localStorage` keys until a tested migration path exists.
- Add export/import before large storage migrations.
- Treat corrupt user data as recoverable: isolate bad records where possible instead of wiping all storage.

## Data Provenance Rules

Any aviation reference data should support provenance:

```js
{
  source: "user" | "built-in" | "local-json" | "faa-api" | "weather-api" | "school-pack",
  sourceVersion: "string",
  sourceUrl: "string",
  retrievedAt: "2026-06-18T00:00:00.000Z",
  effectiveDate: "2026-06-18",
  expiresAt: "2026-06-19T00:00:00.000Z",
  isUserModified: false,
  verificationWarning: "Verify against ForeFlight/current FAA data before use."
}
```

Do not mix user-entered data, built-in fallback data, and future API data without provenance.

## Schemas

The following schemas are target shapes. They are not yet implemented throughout the app.

### Aircraft

Aircraft profiles support W&B, fuel planning, personal defaults, rental notes, and future aircraft-specific checklist packs.

```js
{
  id: "aircraft_N41498",
  schemaVersion: 1,
  nNumber: "N41498",
  displayName: "N41498",
  type: "PA-28-161",
  category: "airplane",
  class: "single-engine-land",
  emptyWeightLb: 1433,
  emptyArmIn: 87.1,
  maxGrossWeightLb: 2325,
  fuelWeightLbPerGal: 6,
  fuelCapacityGal: null,
  usableFuelGal: null,
  fuelBurnGph: 9,
  arms: {
    frontSeatIn: 80.5,
    rearSeatIn: 118.1,
    baggageIn: 142.8,
    fuelIn: 95
  },
  cgEnvelope: [
    { weight: 1400, forward: 83, aft: 93 },
    { weight: 1950, forward: 83, aft: 93 },
    { weight: 2325, forward: 87, aft: 93 }
  ],
  limits: {
    personalCrosswindLimitKt: 17,
    schoolCrosswindLimitKt: null,
    maxDemonstratedCrosswindKt: null
  },
  tankTimer: {
    defaultIntervalMin: 60
  },
  notes: "",
  source: "user",
  createdAt: "2026-06-18T00:00:00.000Z",
  updatedAt: "2026-06-18T00:00:00.000Z"
}
```

Future considerations:

- Do not add generic takeoff/landing performance until the model can represent aircraft-specific POH data and user verification.
- Keep official W&B responsibility with the pilot, POH, instructor, and school procedures.

### Airport

Airport records should separate source data from user notes and overrides.

```js
{
  id: "airport_KBJC",
  schemaVersion: 1,
  ident: "KBJC",
  faaId: "BJC",
  icao: "KBJC",
  iata: null,
  name: "Rocky Mountain Metro",
  city: "Broomfield",
  state: "CO",
  country: "US",
  elevationFt: 5673,
  latitudeDeg: null,
  longitudeDeg: null,
  runways: ["runway_KBJC_12L_30R"],
  frequencies: ["freq_KBJC_ATIS_126250"],
  userNotes: "",
  cautions: [],
  patternAltitudeFtMsl: null,
  trafficPattern: {
    defaultDirection: null,
    notes: ""
  },
  provenance: {
    source: "local-json",
    sourceVersion: "v3",
    retrievedAt: null,
    effectiveDate: null,
    verificationWarning: "Verify against ForeFlight/current FAA data before use."
  },
  createdAt: "2026-06-18T00:00:00.000Z",
  updatedAt: "2026-06-18T00:00:00.000Z"
}
```

Airport database strategy:

- Maintain a small airport index for search by ident/name/state.
- Load full airport details only when needed.
- Avoid parsing the full national database on startup or for every search.
- Keep user-saved airports as references plus user overrides when possible.

### Runway

Runway data should be typed and measurable. Display strings can be generated from this model.

```js
{
  id: "runway_KBJC_12L_30R",
  schemaVersion: 1,
  airportId: "airport_KBJC",
  ident: "12L/30R",
  lowEnd: {
    ident: "12L",
    headingDeg: 120,
    trafficPattern: null
  },
  highEnd: {
    ident: "30R",
    headingDeg: 300,
    trafficPattern: null
  },
  lengthFt: 9000,
  widthFt: 100,
  surface: "ASP",
  condition: null,
  isClosed: false,
  lighting: null,
  notes: "",
  provenance: {
    source: "local-json",
    sourceVersion: "v3",
    verificationWarning: "Verify against ForeFlight/current FAA data before use."
  },
  createdAt: "2026-06-18T00:00:00.000Z",
  updatedAt: "2026-06-18T00:00:00.000Z"
}
```

Future considerations:

- Runway headings used for crosswind calculations should be pilot-verified.
- Magnetic variation and runway renumbering make old runway data risky.

### Frequency

Frequency records should replace array values like `[label, value, mode]`.

```js
{
  id: "freq_KBJC_ATIS_126250",
  schemaVersion: 1,
  airportId: "airport_KBJC",
  name: "ATIS",
  frequencyMhz: "126.250",
  type: "atis",
  use: ["vfr"],
  serviceArea: null,
  remarks: "",
  isUserAdded: false,
  isUserModified: false,
  provenance: {
    source: "local-json",
    sourceVersion: "v3",
    retrievedAt: null,
    effectiveDate: null,
    verificationWarning: "Verify frequencies with current charts/ForeFlight."
  },
  createdAt: "2026-06-18T00:00:00.000Z",
  updatedAt: "2026-06-18T00:00:00.000Z"
}
```

Recommended `type` values:

- `atis`
- `awos`
- `asos`
- `ctaf`
- `tower`
- `ground`
- `clearance`
- `approach`
- `departure`
- `center`
- `fss`
- `unicom`
- `multicom`
- `other`

Recommended `use` values:

- `vfr`
- `flight-following`
- `ifr`
- `emergency`
- `reference`

Active/standby radio stack state should store frequency IDs, not pipe-delimited strings.

### Route

Routes should support frequency planning, navlog, preflight brief packs, and kneeboard mode.

```js
{
  id: "route_20260618_kbjc_kfmm",
  schemaVersion: 1,
  name: "KBJC to KFMM",
  mode: "vfr",
  aircraftId: "aircraft_N41498",
  departureAirportId: "airport_KBJC",
  destinationAirportId: "airport_KFMM",
  alternateAirportIds: [],
  stops: [
    {
      airportId: "airport_KBJC",
      role: "departure",
      sequence: 0
    },
    {
      airportId: "airport_KFMM",
      role: "destination",
      sequence: 1
    }
  ],
  legs: [
    {
      id: "leg_1",
      fromAirportId: "airport_KBJC",
      toAirportId: "airport_KFMM",
      checkpointName: "",
      courseDeg: null,
      distanceNm: null,
      estimatedGroundspeedKt: null,
      eteMin: null,
      fuelGal: null,
      notes: ""
    }
  ],
  selectedFrequencyIds: [],
  activeFrequencyId: null,
  standbyFrequencyId: null,
  notes: "",
  createdAt: "2026-06-18T00:00:00.000Z",
  updatedAt: "2026-06-18T00:00:00.000Z"
}
```

Future considerations:

- A route is not a clearance or an official flight plan.
- Keep navlog calculations transparent and editable.
- Prefer manual entry and pilot verification over hidden automation.

### Personal Minimums

Personal minimums should feed Go/No-Go, preflight checklists, and flight risk assessment.

```js
{
  id: "minimums_default",
  schemaVersion: 1,
  name: "Default Personal Minimums",
  appliesToAircraftId: null,
  pilotProfile: {
    certificateLevel: "student",
    isSolo: false
  },
  weather: {
    minCeilingFtAgl: 3500,
    minVisibilitySm: 8,
    maxSurfaceWindKt: null,
    maxGustKt: null,
    maxCrosswindKt: 13,
    maxGustCrosswindKt: 17,
    allowNight: false,
    allowMarginalVfr: false
  },
  flight: {
    minFuelReserveMin: 60,
    maxFlightDurationHr: null,
    maxDistanceNm: null,
    allowUnfamiliarAirport: true,
    allowMountainAirport: false,
    allowToweredAirportSolo: true
  },
  pilot: {
    requireImsafeCheck: true,
    maxDaysSinceLastFlight: null,
    requireInstructorReviewForNewRoute: false
  },
  notes: "",
  createdAt: "2026-06-18T00:00:00.000Z",
  updatedAt: "2026-06-18T00:00:00.000Z"
}
```

Future considerations:

- The app can compare values against minimums, but should not make final decisions for the pilot.
- Use language like "outside your saved minimums" instead of "unsafe."

### Checklist

Checklists should support preflight, cockpit, emergency reference cards, school templates, and user customization.

```js
{
  id: "checklist_vfr_preflight_default",
  schemaVersion: 1,
  name: "VFR Preflight",
  category: "preflight",
  aircraftId: null,
  source: "user",
  sections: [
    {
      id: "section_documents",
      title: "Documents",
      items: [
        {
          id: "item_arow",
          text: "AROW documents checked",
          responseType: "checkbox",
          isRequired: true,
          note: ""
        }
      ]
    }
  ],
  completion: {
    lastCompletedAt: null,
    lastCompletedBy: null
  },
  warnings: [
    "Use aircraft POH, instructor guidance, and school procedures as primary sources."
  ],
  createdAt: "2026-06-18T00:00:00.000Z",
  updatedAt: "2026-06-18T00:00:00.000Z"
}
```

Recommended `category` values:

- `preflight`
- `before-start`
- `taxi`
- `runup`
- `departure`
- `cruise`
- `arrival`
- `shutdown`
- `emergency-reference`
- `training`

Future considerations:

- Do not ship aircraft emergency checklists as authoritative.
- Prefer user-created or school-provided checklist packs with visible source labels.

### Lesson Debrief

Lesson debriefs should help students retain instructor feedback and track training progress.

```js
{
  id: "debrief_20260618_001",
  schemaVersion: 1,
  date: "2026-06-18",
  aircraftId: "aircraft_N41498",
  routeId: null,
  instructorName: "",
  flightType: "dual",
  hobbsStart: null,
  hobbsEnd: null,
  tachStart: null,
  tachEnd: null,
  maneuvers: [
    {
      name: "Steep Turns",
      performance: "needs-practice",
      notes: ""
    }
  ],
  strengths: [],
  improvements: [],
  homework: [],
  nextLessonFocus: [],
  costEstimate: {
    aircraftRate: null,
    instructorRate: null,
    total: null
  },
  notes: "",
  createdAt: "2026-06-18T00:00:00.000Z",
  updatedAt: "2026-06-18T00:00:00.000Z"
}
```

Recommended `flightType` values:

- `dual`
- `solo`
- `checkride-prep`
- `stage-check`
- `cross-country`
- `rental`
- `other`

### App Metadata

App metadata tracks versions, migrations, cache readiness, and data freshness.

```js
{
  id: "app_metadata",
  schemaVersion: 1,
  appVersion: "2.6",
  storageVersion: 1,
  lastMigrationAt: "2026-06-18T00:00:00.000Z",
  airportDatabase: {
    version: "v3",
    indexCachedAt: null,
    detailsCachedAt: null,
    offlineReady: false
  },
  serviceWorker: {
    cacheName: "johns-pilot-companion-v2-6",
    appShellCachedAt: null,
    lastInstallStatus: null
  },
  userData: {
    lastExportAt: null,
    lastImportAt: null
  },
  warningsAccepted: {
    referenceOnly: false
  },
  createdAt: "2026-06-18T00:00:00.000Z",
  updatedAt: "2026-06-18T00:00:00.000Z"
}
```

## Offline Caching Direction

Separate caches by purpose:

- App shell cache:
  - `index.html`
  - manifest
  - icon
  - JS modules
  - CSS, if split later

- Airport data cache:
  - airport index
  - selected/lazy-loaded airport detail shards
  - optional full offline package if user chooses to download it

- Runtime cache:
  - future API responses with explicit timestamps and expiry

Recommended behavior:

- The app shell should work offline even if airport data caching fails.
- Airport database download should not block service worker installation.
- Show offline status and data freshness when reference data is displayed.
- Prefer stale-while-revalidate for app assets and reference data where appropriate.

## Future FAA/API Integration

Future API integration should be designed around provenance, expiry, and clear UI language.

Rules:

- Do not put API keys in frontend code.
- Use a backend proxy for protected APIs.
- Store `retrievedAt`, `effectiveDate`, and `expiresAt` on all API-backed records.
- Show source and timestamp near weather/FAA-derived information.
- Keep manual override and notes available.
- Do not imply FAA/weather API data is a complete official briefing.

Potential API-backed data:

- METAR/TAF display or scratchpad prefill
- NOTAM reference links or summaries
- Airport/frequency updates
- Weather briefing timestamps

## Recommended Implementation Order

Before adding major features:

1. Fix UTF-8 encoding issues throughout the app.
2. Add a storage module that centralizes reads/writes.
3. Define and enforce schema versions.
4. Add export/import of user data.
5. Normalize frequency records.
6. Replace full airport database parsing with index plus lazy-loaded details.
7. Improve service worker caching into app-shell and airport-data layers.
8. Add basic browser smoke tests.

Then add high-value pilot features:

1. Personal Minimums Builder
2. Preflight Checklist Builder
3. Airport Briefing Page
4. Kneeboard Mode
5. Student Cross-Country Brief Pack

## Commercial Readiness Notes

If the app grows beyond a personal/static PWA, plan for:

- Cloud backup and sync
- User accounts
- School/instructor profile packs
- Backend API proxy
- Privacy policy and data export
- Error telemetry
- Subscription or one-time purchase model

The commercial product should be positioned as a student/private pilot training and briefing companion, not as a replacement for ForeFlight, FAA official sources, POH data, or instructor judgment.
