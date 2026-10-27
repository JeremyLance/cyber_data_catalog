# Cyber Data & Detection Catalog (starter app) - v0.3

Install: copy `cyber_data_catalog/` to `$SPLUNK_HOME/etc/apps/` and restart, or
upload the tarball via Apps -> Manage Apps -> Install app from file.

**ALL saved searches ship `disabled = 1`. Enable them one at a time.**

## Edit these before enabling anything
| Macro | Why |
|---|---|
| `dc_scope_indexes` | Which indexes are in scope. Default `index=sec_*`. |
| `dc_key` | Encodes the `sec_<domain>_uhgid-NNNNNN` naming convention. |
| `dc_local_environment` | **Per Splunk instance.** Set to `legacy_<site>` on old sites, `saas2` on the target. |
| `dc_cost_per_gb` | Your contracted $/GB/year. Default 150 is a placeholder. |
| `dc_index_family` | Derives index family + scope from the ESRO naming standard. |

## Load order
1. **Enable and run `DC - 00`.** This is the search that creates and populates `dc_datasets`.
   Nothing else works until it has run — 20+ searches read `dc_datasets_lookup`.
   Safe to re-run: it merges, preserving any owner/tier/contract a person has already set.
2. **Enable and run `DC - 00b`** for `dc_feeds`. Same merge behaviour.
2b. **Enable `DC - 00c`** (integrity check) *before* enabling any other writer search.
3. Create index `summary_datacatalog` (Cloud admin UI on Splunk Cloud).
3b. Review `dc_index_registry_seed.csv` and `dc_index_placement_rules_seed.csv` — these encode
   the ESRO index naming standard. Ratify the flagged issues before enabling DC-15/16.
4. Enable DC-01/02/03 (or DC-07 instead of DC-01 if already dual-homing). Verify.
5. Then DC-10..14, then 20, then 30..35, then 41..43, then 60..62, then 70/71, then 80/81.

## Grain
- **dataset** = `uhgid|sourcetype` — the logical thing detections consume. Tier, owner, contract.
- **feed** = `uhgid|sourcetype|environment` — the physical arrival path. Index, pipeline, cutover state.
  One dataset has several feeds while dual-homed. That is the migration model.

## Searches
| ID | Purpose |
|---|---|
| **DC-00 / 00b / 00c** | **seed loaders and integrity check — run these first** |
| DC-01/02/03 | discovery, reconciliation, shadow-data alert |
| DC-04/05/06 | volume baselines, Tier 0 outage, tiered digest |
| DC-07/08/09 | environment-aware discovery, dual-home divergence, change-window audit |
| DC-10..13 | knowledge object harvest, dependency graph |
| DC-14 | pipeline-correlated outage (one page instead of thirty) |
| DC-20 | propose dataset tier from consumer tiers |
| DC-30/31 | schema drift (field level, fingerprint) — EXPENSIVE |
| DC-32/33/34 | CIM capture rate, required field coverage, tag coverage |
| DC-35 | pipeline hygiene: latency p95, timestamp errors, truncation |
| DC-40 | KO usage from `index=_audit` |
| DC-41/42/43 | detection execution health, silent detections, confidence rollup |
| DC-50 | weekly governance scorecard |
| DC-60/61 | federated requirement gap register |
| DC-62 | ATT&CK technique coverage and exposure |
| DC-70/71 | ingest cost attribution, consolidation savings model |
| DC-15/16/17 | index placement conformance, naming conformance, standard coverage |
| DC-72/73/74 | cost by index family, byte baselines, silent payload-shape change |
| DC-80/81 | orphan/offboarding gap detection, tenant offboarding readiness |

## Dashboards
`dc_catalog_home` · `dc_dataset_detail` · `dc_data_health` · `dc_impact_analysis` ·
`dc_migration_pipeline` · `dc_cim_normalization` · `dc_detection_health` · `dc_index_standard` · `dc_coverage_cost_lifecycle`

## Requirements
KV Store enabled. Role capability for `| rest` against `saved/searches` and `data/ui/views`.
Access to `index=_internal` (scheduler, DateParserVerbose, AggregatorMiningProcessor, license_usage)
and `index=_audit`. Data models must exist for DC-32 to return anything.

## KV Store write pattern — read this before adding searches
`| outputlookup append=t` against a KV Store collection **replaces the whole record** whose
`_key` matches. Fields absent from the output are dropped, not left alone. Any search that
updates a subset of fields must read the rest back first:

```
... new values ...
| eval _key=dataset_id
| lookup dc_datasets_lookup dataset_id OUTPUT <every other field>
| table _key <every field in the collection>
| outputlookup append=t dc_datasets_lookup
```

DC-00c alerts if this is ever violated (records present but missing identity fields).

## Known limitations
- Macro references in SPL are recorded as `confidence=low` edges and are NOT resolved.
  Write the recursive expander (see build guide §4.3) before trusting impact analysis.
- DC-30/31/32/33 use `map`. Scope them; raise `maxsearches` deliberately.
- `license_usage.log` may not be reachable on a Splunk Cloud search head. See build guide §8.
- Legacy Splunk sites are separate instances: deploy DC-07 there and ship results in.


## Current-state notes (as of hand-off)
- **Nothing is dual-homed yet.** All feeds seeded as `sole_source` / `environment=saas2`.
  Enable DC-07 now (it is environment-aware and works fine single-stream).
  **Leave DC-08 disabled** until SBL pipelines integrate and something is genuinely dual-homed.
- **license_usage.log is available**, so DC-70/72/73/74 can be enabled now.
  Set `dc_cost_per_gb` to the contracted rate first.
- **CMC is available** — use it to cross-check DC-72 totals in the first week.
