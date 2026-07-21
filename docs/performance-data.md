# Performance data workflow

Performance data is keyed to an exact manufacturer, model/model code, year, serial-number applicability, engine and propeller. A model-code-only match is intentionally insufficient.

## Files

- `data/performance/performance-dataset.schema.json` is the normative JSON schema.
- `data/performance/pa-28-161.template.json` is an intentionally empty template. Blank and `null` fields are not performance values.
- `data/performance/catalog.json` lists only developer-approved datasets consumed by the public app.
- `tools/import-performance.mjs` validates and, only with explicit approval arguments, publishes a dataset into `data/performance/approved/`.

Do not derive numbers directly from an uploaded chart image or PDF. A developer must manually transcribe structured points from the applicable POH/AFM, record document revision and page for each chart, and have a second person verify the transcription against the exact source.

## JSON import

Copy the template, complete every identity/source/configuration/limitation field, and add at least one takeoff, landing and climb chart. Every chart needs its POH page, applicable configuration, named input/output axes, and at least two numeric points. Run:

```text
node tools/import-performance.mjs path/to/dataset.json
```

Validation alone never makes data public. After independent verification, populate the approval metadata and run:

```text
node tools/import-performance.mjs path/to/dataset.json --approve --approved-by "Developer name"
```

## CSV point import

CSV imports require a same-name `.meta.json` file containing every JSON field except `charts`. Required CSV columns are:

```text
chartType,chartId,chartTitle,page,configurationId,inputs,outputs,<input/output numeric columns...>
```

`chartType` must be `takeoff`, `landing`, or `climb`. Separate multiple names in `inputs` and `outputs` with semicolons. Each following column is a named numeric input or output stored in the point. CSV is a transcription convenience, not an approval shortcut.

The importer is a developer CLI, not a public upload screen. The PWA does not accept, approve, or execute user-uploaded performance data.
