# Cyber Data & Detection Catalog - v0.7.2

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
| DC-00f | every 2 hours: catalog every ingested dataset whose sourcetype has a SIEM contract (own or shared) |
| DC-01/02/03 | discovery, reconciliation, shadow-data alert (uncontracted data only) |
| DC-102 | daily CIM Command Center status snapshot (progress trend) |
| DC-103 | daily Auditor rollup snapshot (progress trend, point-in-time evidence) |
| DC-104 | daily index list and retention check against the Logging Standard |
| DC-39b | CIRT coverage file pull staleness (ships disabled with the cirt_* inputs) |
| DC-38c/38d | purge the future-dated junk pairs from `dc_observed` and `dc_index_conformance` |
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
| DC-45 | daily: measure the normalization and detection gates per dataset (`dc_dataset_gates`) |
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
`dc_infrastructure` · `dc_mitre_matrix` · `dc_cim_coverage_command_center` · `dc_ingestion_quality` ·
`dc_intake_navigator` · `dc_intake_tracker` · `dc_auditor_rollup`

The nav groups them into five menus: Tenants and Catalog, Data Quality, Detections, Intake and Audit, Platform.

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

## Contract master
`lookups/dc_contracts_master.csv` is the contract lookup (`dc_contract_master`). Two separate statuses
are derived from it by the `dc_contract_state` macro. Matching is done once, by `dc_contract_match`:
this tenant's contract (sourcetype + index) first, otherwise a contract for the same sourcetype held
by another AE or Core (`contract_scope` = this tenant / another tenant or Core / none). A shared
contract counts as contracted everywhere in the app, and DC-00f catalogs the dataset.
- **SIEM status** - `SIEM complete` when the SIEM validation team has finished the contract and
  notified CDE (`notification_sent` is true); the home page reports these.
- **CDE status** - `CDE approved` when `cde_approval` is true, otherwise `pending CDE`; the
  Command Center's "SIEM contracts and CDE" tab reports these and how long each has waited.
**Keep the repo copy current.** Installing the app package can replace the file on the search head
with the packaged copy, so commit the updated CSV before every deploy. DC-37 rebuilds it from the
GitHub pull every 2 hours when that pull returns rows (it never writes an empty file).

**GitHub sync is on (resumed in v0.7.0).** The `dc_github_file_pull://contracts_master` input pulls
`Contracts/contracts_master.csv` every 2 hours, DC-37 rebuilds `dc_contracts_master.csv` from it
15 minutes later, and DC-39 alerts if the pull has not succeeded in 6 hours. The GitHub copy is now
the source of truth: hand edits to `dc_contracts_master.csv` are overwritten on the next DC-37 run.

## Changelog
### 0.7.4
- DC-103 (Auditor daily snapshot) also saves g1/g2/g3, g1_measured, g2_measured, auto_cataloged,
  shared_contract and siem_done per AE, so a later change in a percentage can be traced to real
  progress or to measurement/automation. Snapshots before 0.7.4 do not have these fields.
- Catalog Browse: the shadow pie now groups by plain-language reason; the two contract-matched
  buckets are one slice, "Contracted - waiting for next auto-catalog run".

### 0.7.3
- **Shared contracts count.** New `dc_contract_match` macro is the one contract lookup for the app:
  this tenant's own contract first, otherwise a contract for the same sourcetype held by another AE or
  Core. `dc_contract_state`, `dc_cim_recon`, DC-00f, DC-03 and DC-38 all use it.
- **DC-00f** now catalogs shared-contract datasets too, and runs every 2 hours (10 minutes before
  DC-38) instead of once a day. Notes say "(shared - contract held by <AE or Core>)" when shared.
  The seed file is still only for fields people maintain.
- **DC-03** only alerts on data with no contract anywhere; contracted data is cataloged by DC-00f,
  malformed and rejected sourcetypes are already tracked on Catalog Browse and the Command Center.
- **CIM Command Center:** "Contract extension needed" is gone. Shared contracts are in the
  Contract complete stage with `contract` = CONTRACTED - SHARED and a `contract_held_by` column.
  DC-102 snapshots taken before 0.7.3 still show the old status in Progress over time.
- **Catalog Browse:** removed the Tenant x Domain coverage table (the Auditor page covers it per AE).
  The catalog table shows 10 rows per page with a match count, and gains Health and SIEM status
  filters and a contract column (own / shared). "Uncataloged data that already has a SIEM contract"
  is replaced by "Cataloged automatically from a SIEM contract - last 30 days". The Tenant and Domain
  filters reuse the page's catalog search instead of reading the collection again.
- **Measured gates (DC-45, new, daily 06:30).** Normalization is Complete when the dataset's best
  CIM score is 50 or more (the Command Center rule). Detection is Covered when an enabled, healthy
  correlation search reads the dataset directly or through a CIM data model it is normalized into.
  The `dc_effective_gates` macro keeps the further-along of the measured and person-entered value,
  so a gate set by a person is never lowered; SOC stays person-entered. `enterprise_ready`, when
  blank, becomes Yes once all three gates are done. Used by the Auditor rollup, Catalog Browse and
  Dataset Detail. New KV Store collection `dc_dataset_gates`.
- **Auditor page:** data-catalog scorecard adds auto-cataloged, shared-contract, measured-gate and
  enterprise-ready counts; provenance lists DC-45 and the last auto-catalog date; definitions updated.
- **Dataset Detail:** the record panel shows SIEM contract status, contract scope and the effective
  gates with their source.

### 0.7.2
- **Cataloging is automatic.** A dataset is officially cataloged once it is ingested and the SIEM
  team gives it a contract. New DC-00f (daily, 05:20) adds every contracted, flowing, non-rejected
  (tenant, sourcetype) pair that has no catalog record yet. It only creates records, never edits
  one, so owners, tiers and gates are never overwritten. New records carry the note
  "Auto-cataloged <date> from SIEM contract <ticket>".
- **The seed file no longer has to grow.** `dc_datasets_seed.csv` is now only for fields people
  maintain (owners, tiers, gates). DC-00 still merges it as before.
- CIM Command Center: the "Not yet cataloged" status is gone; the tile now counts datasets
  cataloged automatically. DC-03's suggested action now says to contract or reject.
- Fixed a seed row whose `dataset_id` was `cisco:duo:authentication` instead of
  `uhgid-000106|cisco:asa`. That row never matched its data. After DC-00 runs, delete the old
  record with `| inputlookup dc_datasets_lookup | where _key!="cisco:duo:authentication" |
  outputlookup dc_datasets_lookup`.

### 0.7.1
- **Index list and retention on the Auditor page.** DC-104 (daily, 05:30) reads every index's
  settings: searchable days, archive provider and days, total retention, oldest event, size and
  size limit. It checks each index against its rule in the new `dc_retention_policy` lookup
  (`lookups/dc_retention_policy_seed.csv`; the first matching `index_regex` by `rule_order` wins):
  - `ES_KEY` - every non-system Enterprise Security index (`notable`, `notable_summary`, `risk`,
    `threat_activity`, `ioc`, `sequenced_events`, `cim_modactions`, `cim_summary`, `audit_summary`,
    `endpoint_summary`, `gia_summary`, `whois`, `ers`, `ueba`, `ueba_summaries`, `cms_main`, `ba_test`,
    `pci`, `pci_posture_summary`, `pci_summary`): kept in Splunk 3 years or longer.
  - `AE_TENANT` - `sec_*_uhgid-NNNNNN` and `CORE` - `sec_*_core`: 90 days hot in Splunk, no Splunk
    archive. Edge processors send the long-term copy to AWS S3.
  - Anything else shows as "No rule" until a rule is added to the CSV.
- Checks: BELOW STANDARD, AT RISK - size cap (data leaving by size before the time limit),
  REVIEW - Splunk archive (archive set on an S3-backed index), CONFIRM ARCHIVE, LONGER THAN
  STANDARD (cost), Meets standard, No rule.
- Results go to the new `dc_index_retention` collection and a daily copy to `summary_datacatalog`
  (source=`dc_index_retention`), so the page also shows retention changes in the last 90 days.
- The Auditor page's retention section opens on a summary with one row per index group (AE
  tenant per AE, Core, Splunk ES, Splunk internal, Other); clicking a row lists that group's
  indexes. Filters: index group, AE, status (default "Needs attention") and index name. The
  collection is read once per page load and filtered in the browser, 15 rows per page.
- On Splunk Cloud, searchable days and archive come from the Cloud index manager
  (`searchableDays`, Dynamic Data Active Archive); elsewhere from `frozenTimePeriodInSecs`.
  DC-104 runs as the app owner, so auditors do not need REST access.

### 0.7.0
**CIRT live coverage from GitHub**
- Two new lookups, `dc_cirt_approved_detections` (the detections CIRT has approved and monitors) and
  `dc_splunk2_allow` (tenants and sourcetypes allowed into Splunk 2.0). Both ship seeded with the
  current files and refresh from GitHub through two new `dc_github_file_pull` inputs
  (`cirt_approved_detections`, `cirt_splunk2_allow`, every 30 minutes) from
  `optum-eis/CIRT_Splunk_SIEM_project/CIRT/`. Both inputs and DC-39b ship enabled. The inputs use
  the GitHub token already stored on the Set Up page.
- The pull now refuses a file that is missing its `required_columns` or has no data rows, strips a
  UTF-8 byte-order mark, and compares content with the file on disk instead of a remembered sha.
  An app reinstall that puts the packaged seed back is therefore corrected on the next run.
- DC-39 (and the new DC-39b) count only `ok` and `unchanged` runs as successful. Before, any
  logged run, including errors, reset the staleness clock.

**Detection Health and ATT&CK**
- New CIRT row: approved detections, how many are enabled, mapped to ATT&CK and healthy, a
  per-detection live status ("Not found in Splunk", "Enabled - no ATT&CK annotation", ...), and the
  Splunk 2.0 monitoring scope by tenant.
- New "How coverage_state is decided" panel. The techniques table now shows, for each technique,
  `failing_checks` (detections whose data is fine but which fail other health checks),
  CIRT-approved counts, `blockers` (each unhealthy detection and the check it failed) and `next_step`.
- DC-43 writes `health_reason`, the checks a detection failed. DC-63 carries it, flags CIRT-approved
  detections, fixes the sub-technique ID (was written as `T1078\.001`), and keeps one row per
  technique and detection. DC-62 and DC-63 now rewrite their collections each run
  (`override_if_empty=false`), so disabled or deleted detections stop counting as coverage.
- Technique detail adds `cirt_approved`, `healthy` and `health_reason`, and a CIRT-approved-only filter.

**Auditor rollup (`dc_auditor_rollup`)**
- One row per acquired entity: Splunk-measured % complete for Discovery, Ingest, Splunk 2.0
  scope, Normalize, Detection, SOC, SIEM contract, CDE and CIM onboarding, with plan status from
  the auditor workbook timeline. Also a workbook-vs-Splunk reconciliation, tracker consistency
  findings, a scorecard of what each team tracks, and a source freshness table.
- New lookup `dc_ae_program` (`lookups/dc_ae_program_seed.csv`), built from the lead auditor's
  `AE_Log_Source_Matrix_v1.xlsx`: wave, LOB, planned phase end dates and the workbook's own %
  per phase. The workbook has 9 AEs whose wave differs between its Dashboard and Timeline sheets;
  both values are kept and the dashboard lists them as findings.
- DC-103 saves the rollup daily to `summary_datacatalog` (source=`dc_auditor_rollup`).

**Telemetry intake into Splunk**
- The Telemetry Navigator (`appserver/static/telemetry_navigator/`) now runs inside the app
  (`dc_intake_navigator`). Opened there, it shows **Save to Splunk**, which writes the request to the
  new `dc_intake_requests` KV collection using the user's own Splunk session (no tokens in the page).
  Saving again updates the same request and keeps its intake status.
- The same two files still work standalone (for example on SharePoint) for AEs without Splunk
  access: they download or copy the request as JSON for the intake ticket.
- New `dc_intake_tracker`: every request with its NEHA status, a form to move it to the next status,
  a paste-JSON import, and a "requested vs arriving" check of each requested technology against
  what Splunk sees for that AE (via the new `indexFamilies` mapping in `data.js`).
- Navigator changes: AE UHGID field (suggests AEs from the catalog when in Splunk), a request ID,
  Import JSON, and the technology-to-index-family mapping.
- `dc_intake_requests` is writable by azu_splunk_esro_siem, azu_splunk_esro_creu,
  azu_splunk_esro_cde and sc_admin; everyone can read it.

**Contract master GitHub sync resumed**
- The `contracts_master` input, DC-37 and DC-39 are enabled again (paused since v0.5.5). The
  input now rejects a contract file missing `sourcetype`, `index`, `contract_issue`,
  `notification_sent` or `cde_approval`, so a bad commit cannot replace the lookup.

**Export CSV on every table**
- `dc_table_export.js` now fetches a table's rows when you click Export instead of relying on
  rows it caught at page load, and attaches to tables that appear later (behind tabs or token
  conditions). Fixes tables on the CIM Command Center that showed the button but never exported.

**Refreshing the auditor lookup from the workbook**
Save this as `build_ae_program_seed.py` outside the app folder, run it against the workbook (needs
`openpyxl`) and commit the result. Or keep the CSV in Git and enable the `auditor_program` pull.
```
python3 build_ae_program_seed.py AE_Log_Source_Matrix_v1.xlsx lookups/dc_ae_program_seed.csv
```
```python
import openpyxl, csv, datetime, sys
wb=openpyxl.load_workbook(sys.argv[1],data_only=True)
def d(v):
    return v.strftime('%Y-%m-%d') if isinstance(v,datetime.datetime) else ('' if v in (None,'N/A') else str(v))
def p(v):
    return '' if v is None or isinstance(v,str) else round(v*100,1)
tl={}
for r in wb['On-Prem vs Cloud Timeline'].iter_rows(min_row=6,values_only=True):
    if r[1] and str(r[1]).upper().startswith('UHGID'):
        tl[r[1].lower()]=r
rows=[]
for r in wb['Dashboard'].iter_rows(min_row=5,max_row=40,max_col=25,values_only=True):
    if not r[1] or not str(r[1]).upper().startswith('UHGID'): continue
    u=r[1].lower(); t=tl.get(u,[None]*30)
    rows.append(dict(ae_name=r[0],uhgid=u,wave=r[2] or '',timeline_wave=t[3] or '',lob=r[3] or t[2] or '',
      wb_discovery_pct=p(r[4]),wb_ingest_saas2_pct=p(r[5]),wb_normalize_pct=p(r[6]),wb_detection_pct=p(r[7]),
      wb_monitoring_pct=p(r[8]),wb_soc_pct=p(r[9]),wb_overall_pct=p(r[10]),wb_onprem_overall_pct=p(r[17]),wb_cloud_overall_pct=p(r[24]),
      plan_discovery_end=d(t[5]),plan_ingest_end=d(t[7]),plan_normalize_end=d(t[9]),plan_detect_soc_end=d(t[11]),
      plan_monitoring_end=d(t[13]),plan_signoff_end=d(t[15]),plan_cloud_migration_end=d(t[19]),plan_overall_complete=d(t[27]),
      workbook_as_of=wb.properties.modified.strftime('%Y-%m-%d'),workbook_source='AE_Log_Source_Matrix_v1.xlsx'))
w=csv.DictWriter(open(sys.argv[2],'w',newline=''),fieldnames=list(rows[0]))
w.writeheader(); w.writerows(rows); print(len(rows))
```

### 0.6.2
- CIM Command Center: **Complete now means a SIEM contract exists for the tenant + sourcetype**,
  so it matches the contract master. Two stages, each with status tiles that add up to it:
  - Needs contract: Malformed or rejected, Ingested - no contract, Contract extension needed.
  - Contracts complete: Contracted - no data seen, Not yet cataloged, CIM normalization gap,
    Awaiting CDE approval, Fully onboarded.
- New Stage filter. The status summary and reconciliation table show the stage.
- Status names no longer contain commas, which kept chart colors from matching the tiles.
- Progress over time now shows Contracts complete vs Needs contract. DC-102 saves the stage.
  Snapshots taken before 0.6.2 have no stage and are skipped.
- Removed the evidence and scratch files from the repo root. The app reads only `lookups/`, and
  every root copy of a seed file was an older version of the one in `lookups/`.

### 0.6.1
- Fixed "tstats must be the first command" on DC-102 and the CIM Command Center summary.
  `dc_cim_recon` no longer starts with a pipe; callers use `` | `dc_cim_recon(...)` ``.

### 0.6.0
- **CIM Coverage Command Center executive summary.** Every tracked sourcetype (one per tenant
  index, last 7 days plus the contract master) now has exactly one status. The status is the first
  step it has not passed: Malformed or rejected, Ingested no contract, Contract extension needed,
  Contracted no data seen, Not yet cataloged, Awaiting CDE approval, CIM normalization gap, or Complete.
  The tiles add up: Complete + Remaining = Sourcetypes tracked, plus a % complete tile.
- New panels: a status summary with the owner of each next step, progress by tenant, and progress
  over time. Clicking a tile or a summary row filters the reconciliation table to that status.
  New Status filter. The reconciliation table gains status and owner columns.
- The reconciliation logic moved into the `dc_cim_recon(index_filter, sourcetype_filter)` macro.
  The dashboard and the new DC-102 daily snapshot share it, so the trend matches the tiles.
- DC-102 writes to `summary_datacatalog` (`source=dc_cim_progress`). The trend starts empty.
- "Gaps by tenant" was replaced by "Progress by tenant" in the summary.

### 0.5.9
- **Future-dated logs no longer count as shadow data.** The resolved uhgid-000024 DQ issue left
  ~650M events with 2026-2027 timestamps (syslog with no year, and ~9,700 junk sourcetypes built
  from raw log content). Core Splunk will not delete them, so they age out on their own; their
  latest timestamp is June 2027. Until then they roll into every `earliest=-24h` window as their
  timestamps come due.
- New `dc_future_logs_ignore_seed.csv` (lookup `dc_future_logs_ignore`), built from the
  Future_Logs_in_Splunk export: 10,000 index + sourcetype pairs. 9,993 are `ignore_scope=pair`
  (junk, dropped entirely). 7 are `future_events_only`: real cataloged sourcetypes (`syslog`,
  `linux:syslog`, `linux_secure`, `mcds_soap`, `appsense`, `meraki`) whose current data still counts.
- New macro `dc_indexed_within(window)` in the tstats WHERE clause keeps only events indexed inside
  the search window, so any future-dated event is ignored, listed or not. New macro
  `dc_drop_future_log_pairs` drops the listed junk pairs.
- Applied to DC-01, DC-03, DC-07, DC-36 and DC-38, and to both live panels on Index Standard.
- **CIM Coverage Command Center:** the reconciliation search gets both filters. The scorecard
  panel, all 11 live data-model panels, DC-101a-k and DC-101z drop the junk pairs. DC-101z also
  removes their existing scorecard rows. Data-model `tstats` cannot filter on index time
  (`_indextime` is not in accelerated summaries), so future-dated events on the 7 real
  sourcetypes can still count toward their CIM totals until they age out.
- New DC-38c and DC-38d (daily) remove the junk pairs' leftover rows from `dc_observed`, so DC-02
  stops reporting them as OBSERVED_NOT_DECLARED, and from `dc_index_conformance`.
- Not changed: DC-02 history already written to `summary_datacatalog`, and the 30-day trend on
  Dataset Detail.

### 0.5.8
- DC-101 split into DC-101a-k, one search per CIM data model, staggered 3 minutes apart every
  4 hours, each upserting into `dc_cim_coverage_scorecard_lookup`. A slow or failed data model no
  longer stalls or truncates the whole scorecard. DC-101 is retired (disabled).
- Fixed: a field never populated in the window made the whole coverage score null, so the row was
  flagged NO CIM COVERAGE even when other fields were populated. Missing field counts are now 0.
- The scorecard keeps each sourcetype's latest score; DC-101z drops rows not refreshed in 7 days.

### 0.5.7
- Every table on every dashboard (except Setup) has an **Export CSV** button. It downloads all rows
  of the table's current results, with the current filters applied, named after the panel title.
  It works on panels that post-process a shared base search, where Splunk's own Export is
  unavailable, and reruns nothing. Code: `appserver/static/dc_table_export.js`, loaded through
  `script="dc_table_export.js"` on each dashboard's root tag.

### 0.5.6
- SIEM contract completion and CDE approval are reported separately. Catalog Browse shows the SIEM
  team's numbers (contracts completed, last 30 days, dataset coverage, per month, per tenant);
  the Command Center has a new "SIEM contracts and CDE" tab with every contract, its CDE status
  and days waiting. DC-50 adds `siem_contract_coverage_pct`.
- Contract dates are parsed in both formats found in the file (ISO 8601 and MM/DD/YYYY HH:MM:SS).

### 0.5.5
- GitHub contract sync paused (input, DC-37, DC-39) while the runners are disabled; the contract
  master is maintained by hand.

### 0.5.4
- Contract status now comes from the contract master (`dc_contract_state` macro) on Catalog Browse,
  Impact Analysis and DC-50; the catalog's own `contract_status` field was never populated, so
  the approved-contract tile always read 0%.
- `dc_contract_master` now reads `dc_contracts_master.csv` (it pointed at `contracts_master.csv`).
- DC-37 uses `override_if_empty=false`, so an empty GitHub pull cannot wipe the contract lookup.

### 0.5.3
- DC-29, DC-30, DC-33: blank `schema_version` is treated as 1.0 and blank `cim_datamodel` as "none"
  before `map` ("Did not find value for required attribute"); sourcetypes are quoted so names
  with spaces work. DC-30 now checks only sourcetypes with a contracted schema, once per
  sourcetype, and its coverage_pct is no longer always 100.
- DC-35: one row per index+sourcetype, so the KV `_key` is a single value (the save failed when it
  was a list of feed_ids); latency from a 1-in-100 sample of the last 15 minutes; adds
  line-breaking errors.
- DC-97: rewritten. `tstats` cannot aggregate `index`; a node's datasets now come from the
  forwarders that connect to it plus events carrying its own hostname.

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

