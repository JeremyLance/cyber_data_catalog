# Cyber Data & Detection Catalog - v0.5.2

Install: copy `cyber_data_catalog/` to `$SPLUNK_HOME/etc/apps/` and restart, or
upload the tarball via Apps -> Manage Apps -> Install app from file.

**Saved searches ship enabled and scheduled** (`disabled = 0`), except DC-70, which v0.5.1 retired into DC-72.
On a fresh install, review the macros below before the first scheduled run.

## Edit these before enabling anything
| Macro | Why |
|---|---|
| `dc_scope_indexes` | Which indexes are in scope. Default `index=sec_*`. |
| `dc_key` | Encodes the `sec_<domain>_uhgid-NNNNNN` naming convention. |
| `dc_local_environment` | **Per Splunk instance.** Set to `legacy_<site>` on old sites, `saas2` on the target. |
| `dc_cost_per_gb` | Your contracted $/GB/year. Ships as 0.08, a placeholder - confirm before sharing cost figures. |
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
| DC-21 | raise proposed tier to the floor in `dc_tier_floor_seed.csv` (Tier 0 candidates) |
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
`dc_migration_pipeline` · `dc_cim_normalization` · `dc_detection_health` · `dc_index_standard` · `dc_coverage_cost_lifecycle` ·
`dc_infrastructure` · `dc_mitre_matrix` · `dc_cim_coverage_command_center` · `dc_ingestion_quality`

The nav groups them into four menus: Tenants and Catalog, Data Quality, Detections, Platform.

Drilldown and form pages (not in the nav): `dc_sourcetype_reject` · `dc_infra_promote` · `dc_setup`

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

## Tiers
CDE assigns Tier 1-4. **Tier 5 means "no CDE response yet"** and is treated as unknown
(`dc_tier_num` maps it to 9, the same as unassigned). There are no Tier 0 datasets yet;
`lookups/dc_tier_floor_seed.csv` lists the domain controller, EDR, NDR and privileged-access
sourcetypes proposed for Tier 0. DC-21 only changes `proposed_tier`, so each shows
`tier_delta=REVIEW` until someone ratifies it into `declared_tier`.
`XmlWinEventLog:Security` is deliberately not in the floor file: it covers every Windows host,
and Tier 0 should apply to domain controllers only.

## Changelog
### 0.5.2 (continued)
- AE names normalized in the dataset, infra node and contract master seeds (e.g. CORE -> Core,
  Atrius -> Atrius Health, Vpay -> VPay). `lookups/dc_ae_name_aliases_seed.csv` maps each old
  spelling to its canonical name, and DC-37 applies it to the GitHub-synced contract master so
  upstream spellings are normalized too. Re-run DC-00 and DC-00d to push the names into the KV Store.
- `python.required = 3.9,3.13` on the GitHub-pull modular input and the setup REST handler.

### 0.5.2
- CIM Coverage Command Center: new default tab reconciles every discovered sourcetype against
  the contract master, catalog and rejections (malformed, no contract, contracted with no data,
  CIM gaps), with a tenant picker and a "How to read this" tab explaining the score and flags.
- DC-101 and the Command Center now score Email (All_Email) and Network_Resolution (DNS), and use
  real CIM fields for Network_Sessions (src_ip/dest_ip/user/signature) and Intrusion_Detection
  (vendor_product instead of the non-existent app).
- Catalog Browse, Data Health and Impact Analysis load their data once per page and post-process
  it per panel. Catalog Browse filters now apply to every panel.
- Ingestion Quality rebuilt: it used macros from another app and was truncated.
- Nav grouped into menus.
- Promote Candidate updates only the promoted candidate (it rewrote the whole collection),
  quotes form tokens, and writes only once node type, tier and name are set.
- DC-30 runs daily instead of hourly; DC-35 computes latency from the last hour, not a 24h raw scan.
- Seeds: sourcetype registry merged from the search head export (55 -> 141 rows, covers every
  cataloged sourcetype); two form-entered rejections backported.

### 0.5.1
- Multi-line searches (DC-00d, 00e, 01, 07, 101) now carry `\` line continuations; without them
  Splunk read only the first line. DC-31 rewritten (its SPL had CSV-doubled quotes).
- DC-13, DC-15, DC-60: joins now fan out (`max=0`); previously each kept only its first match.
- DC-60 rewritten to match on the new `index_family` column in the requirement map seed.
- DC-41 reads back BAS and health fields before writing; DC-43 scores BAS as "not measured"
  until a BAS result exists, and now computes `data_available`.
- DC-70 retired; DC-72 is the single writer to `dc_cost` and keeps the DUPLICATE SPEND disposition.
  `dc_cost` now stores index_family, domain_group, uhgid, ae_name, pipeline, environment, feed_status.
- DC-101 uses the correct CIM root datasets (`IDS_Attacks`, `Malware_Attacks`, `All_Sessions`,
  `All_Changes`); added the missing `dc_cim_coverage_scorecard_lookup` definition.
- DC-73 joins daily bytes to daily events on `_time`; DC-00d merges instead of replacing the
  infra collection; DC-99 and the promote form use the registry's node type names.
- DC-37 reads and writes the lookup definitions DC-38 uses, and lowercases `cde_approval`.
- `dc_split_cim` accepts `|` as well as `/`. Reject form only writes once reason and name are set.
- New DC-21 and `dc_tier_floor_seed.csv` (see Tiers).

