/* =====================================================================
   Telemetry Navigator - data file (PROTOTYPE v0.1)
   Source of truth (today): 
     - Logging_Baseline_Overlay_to_Comprehensive_Sheets_v0.2.xlsx  (Overlay Matrix, Baseline Rules,
       Overlay Definitions, Comprehensive Sheet Map, Scope Definitions)
     - Logging_Standard_LOG_Redline_v6_Overlay_Driven_Appendix_F.docx (policy/standard sections)
     - NEHA-Itake-process.docx / NEHA_Logging_Intake_Process_Standard_v0.1.docx (intake)
   Edit this file to tune content. Later this file should be GENERATED from the workbooks.

   Scope codes used in the matrix:
     SS  = Security Subset            FSF = Findings + Security Subset
     E   = Enhanced                   FS  = Full Security
     FA  = Full Audit                 C   = Conditional (trigger, not optional once triggered)
     NA  = Not applicable by design
   ===================================================================== */

window.TN_CONFIG = {
  // Paste your NEHA SharePoint intake form URL here to enable the "Open intake form" button.
  intakeUrl: "",
  // Optional base URL where the comprehensive workbooks live (e.g. the SIEM Teams channel folder).
  // If set, workbook names become links:  workbookBaseUrl + encodeURIComponent(fileName)
  workbookBaseUrl: "",
  standardVersionLabel: "Logging Standard (LOG) - Proposed Redline v6 (DRAFT, not yet approved)",
  matrixVersionLabel: "Baseline-Overlay-to-Comprehensive-Sheets v0.2"
};

window.TN_SCOPES = {
  SS:  { label: "Security Subset",            rank: 1,   desc: "Universal minimum security-observable rows: Critical/High/Medium (plus any Mandatory / Required / CIRT-required / Send-to-SIEM=Yes rows) in the channels named for the log family." },
  FSF: { label: "Findings + Security Subset", rank: 1.5, desc: "Security Subset plus vendor detections/findings, sensor health, tamper, policy/config changes and coverage/onboarding state." },
  E:   { label: "Enhanced",                   rank: 2,   desc: "Security Subset plus only the event groups added by the overlays that apply. Not 'all rows'." },
  FS:  { label: "Full Security",              rank: 3,   desc: "Every security, audit, identity, privileged/admin, integrity, detection, control-plane, logging-health, execution, network-security or CIRT-investigative row, regardless of Critical/High/Medium label." },
  FA:  { label: "Full Audit",                 rank: 0,   desc: "Complete accountable audit trail for the regulated, protected-data, identity, egress or business function in scope. Runs in parallel with Full Security (both may apply)." },
  C:   { label: "Conditional",                rank: 0,   desc: "A trigger, not a lower tier. Mandatory once the stated capability exists (PowerShell, RDP, exports, external APIs, pipelines...). If the trigger is false, document Not Applicable with rationale." },
  NA:  { label: "N/A",                        rank: 0,   desc: "Overlay category has no meaningful implementation for this log family. Does not waive the baseline or other overlays." }
};

/* Order matters: matches the 9 scope values in each family row. */
window.TN_OVERLAYS = [
  { id: "shared", name: "Shared Infrastructure / Enterprise Service", short: "Shared Infrastructure",
    question: "Does it provide identity, networking, compute, orchestration, middleware, database, CI/CD, software distribution, management, or other shared capability to multiple systems?",
    ownerTest: "Would compromise affect multiple applications, business units, or trust zones?",
    added: "Control/config changes; service identities; remote admin; availability; infrastructure lifecycle; tenant/subscription/project or cluster changes.",
    cadence: "quarterly", ref: "LOG Table 1; Appendix A" },
  { id: "secctl", name: "Security Control", short: "Security Control",
    question: "Does it provide or enforce security, identity, monitoring, detection, prevention, privileged access, or key/certificate functions (IAM, PAM, PKI, EDR, SIEM, firewall, DLP)?",
    ownerTest: "Could tampering hide or weaken another security control?",
    added: "Policy changes; exceptions/exclusions; sensor disablement; alert deletion; integration changes; telemetry-health and admin audit.",
    cadence: "quarterly", ref: "LOG Table 1; Appendix A" },
  { id: "protected", name: "Protected / Regulated Data", short: "Protected / Regulated Data",
    question: "Does it process, store, transmit, or provide access to PHI, PCI, Confidential, federal, contractual, or otherwise regulated information?",
    ownerTest: "Must the organization prove who accessed which protected object and what happened?",
    added: "Record/object access; bulk query; download; export; deletion; break-glass; key use; audit-workflow evidence.",
    cadence: "semiannual", ref: "LOG Table 1; Appendix A" },
  { id: "external", name: "External Exposure", short: "External Exposure",
    question: "Is it accessible from the internet or other external or untrusted networks (partner-facing, external APIs, exposed admin interfaces)?",
    ownerTest: "Can an untrusted network directly reach the service?",
    added: "Request/API access; auth failures; WAF/gateway; client IP; endpoint/route; abuse/attack indicators; TLS/certificate changes.",
    cadence: "semiannual", ref: "LOG Table 1; Appendix A" },
  { id: "privilege", name: "Privilege / Connectivity", short: "Privilege / Connectivity",
    question: "Does it have elevated privilege, broad network reachability, privileged service identities, administrative interfaces, deployment rights, or the ability to expand access to other enterprise resources?",
    ownerTest: "Could compromise create a foothold or lateral-movement path beyond the system itself?",
    added: "Commands/processes; service-account activity; remote sessions; scheduled execution; key/credential use; network connections; privilege changes.",
    cadence: "quarterly", ref: "LOG Table 1; Appendix A" },
  { id: "applogic", name: "Application-Layer Business Logic", short: "App Business Logic",
    question: "Does it generate application, transaction, error, or performance logs that may contain actor-target-outcome, access-control, data-access, or security-anomaly evidence?",
    ownerTest: "Could an attacker achieve impact by abusing valid application functions?",
    added: "Business action; object; actor; result; reason; approval; override; abuse/fraud signals. Routing is evaluated per log type.",
    cadence: "annual", ref: "LOG Table 1; Appendix A" },
  { id: "identity", name: "Identity Lifecycle / Provisioning", short: "Identity Lifecycle",
    question: "Does it create, modify, reconcile, approve, provision, deprovision or remove identities, accounts, roles, groups, credentials, service principals or entitlements?",
    ownerTest: "Is the system authoritative or influential for enterprise identity?",
    added: "Create/delete; role/group changes; credential changes; consent; federation; provisioning; deprovisioning; privilege activation.",
    cadence: "annual", ref: "LOG Table 1; Appendix A" },
  { id: "egress", name: "Data Egress / Third-Party Transfer", short: "Data Egress / 3rd Party",
    question: "Does it export, download, print, share, replicate or transmit Company information to an external party, partner, SaaS service, API or other third-party integration?",
    ownerTest: "Can data leave an approved boundary through this system?",
    added: "Export initiation/completion; destination; volume; object set; actor; policy decision; DLP; encryption; failure/override.",
    cadence: "annual", ref: "LOG Table 1; Appendix A" },
  { id: "change", name: "Change Management / Deployment", short: "Change / Deployment",
    question: "Does it approve, build, distribute, deploy, configure, patch, modify, or roll back production code or configuration?",
    ownerTest: "Can the system change production code, configuration or infrastructure?",
    added: "Pipeline/workflow execution; source/ref; artifact; approver; runner; secret use; deployment target; config/schema/policy change; rollback.",
    cadence: "annual", ref: "LOG Table 1; Appendix A" }
];

/* Families. scopes[] order = TN_OVERLAYS order:
   shared, secctl, protected, external, privilege, applogic, identity, egress, change */
window.TN_FAMILIES = [
  { id: "windows", group: "Servers & endpoints", name: "Windows OS", hint: "Windows servers / VMs (on-prem or cloud-hosted)",
    workbook: ["windows_OS_comprehensive.xlsx"],
    rule: "Security + System channels; Critical/High/Medium rows",
    baseline: "SS", dest: "SIEM",
    scopes: ["FS","FS","E","E","FS","C","E","C","E"],
    note: "PowerShell/Sysmon/AppLocker/Defender/RDP/WMI/DNS/DHCP/AD CS added when the corresponding overlay applies.",
    status: "Mapped" },
  { id: "linux", group: "Servers & endpoints", name: "Linux / Unix", hint: "Linux/Unix servers / VMs, container hosts",
    workbook: ["linux security logging comprehensive 1.xlsx"],
    rule: "auditd + auth.log/secure + syslog/journald + kernel; Critical/High/Medium rows",
    baseline: "SS", dest: "SIEM",
    scopes: ["FS","FS","E","E","FS","C","E","C","E"],
    note: "Baseline includes auth, sudo, account/group, service, cron/systemd, kernel and required auditd security events.",
    status: "Mapped" },
  { id: "edr", group: "Servers & endpoints", name: "EDR / XDR", hint: "MDE, Trend Micro, CrowdStrike sensors",
    workbook: ["edr_telemetry_comprehensive_MDE_TM_CrowdStrike.xlsx"],
    rule: "Alerts/findings + sensor health/tamper + Critical/High/Medium activity telemetry",
    baseline: "FSF", dest: "SIEM",
    scopes: ["E","FS","C","C","FS","NA","C","C","E"],
    note: "Raw endpoint activity required where it supports CIRT investigations, not only vendor detections.",
    status: "Mapped" },
  { id: "virt", group: "Servers & endpoints", name: "Virtualization / VDI / Shared Platforms", hint: "Hypervisors, VDI, shared compute platforms",
    workbook: ["Virtualization comprehensive requirements (confirm final filename)"],
    rule: "Critical/High/Medium auth/admin/config/session/control-plane events",
    baseline: "SS", dest: "SIEM",
    scopes: ["FS","E","E","E","FS","C","E","C","FS"],
    note: "Guest OS telemetry remains inherited from Windows/Linux sheets.",
    status: "Mapped - confirm final filename", inherits: ["windows","linux"] },

  { id: "ad", group: "Identity & access", name: "Active Directory / LDAP", hint: "AD DS, LDAP/LDAPS, AD CS, directory services",
    workbook: ["active directory security logging comprehensive.xlsx", "Identity_Authentication_Logging_Comprehensive_v0.2.xlsx"],
    rule: "Authentication, account/group, directory object, replication, trust, GPO, AD CS; Critical/High/Medium",
    baseline: "FS", dest: "SIEM",
    scopes: ["FS","FS","E","C","FS","NA","FA","C","E"],
    note: "Directory replication, privileged groups, trust/GPO and AD CS remain high-value regardless of data classification.",
    status: "Mapped" },
  { id: "pki", group: "Identity & access", name: "PKI / KMS / Secrets", hint: "Certificate authorities, key vaults, secrets managers",
    workbook: ["Cloud comprehensive + Identity/Auth comprehensive + platform-specific requirements"],
    rule: "Critical/High/Medium key, secret, certificate, policy, access and lifecycle events",
    baseline: "FS", dest: "SIEM",
    scopes: ["FS","FS","FA","C","FS","NA","FS","FA","FS"],
    note: "Key/secret access and lifecycle are high-value even when protected data is not directly stored.",
    status: "Mapped" },

  { id: "app", group: "Applications & data", name: "Application / NESS", hint: "Custom or COTS application logs, NESS-schema apps",
    workbook: ["Application_Logging_Requirements_Matrix.xlsx", "Application_Security_Logging_Implementation_Package.docx"],
    rule: "Authentication, authorization, identity lifecycle, admin/config, logging controls; Critical/High/Medium or mandatory security rows",
    baseline: "SS", dest: "SIEM",
    scopes: ["E","E","FA","E","FS","FS","E","FA","FS"],
    note: "Overlays add protected-data access, business-logic abuse, bulk export and deployment/configuration events.",
    status: "Mapped" },
  { id: "web", group: "Applications & data", name: "Web / API / WAF", hint: "Web servers, API gateways, WAF",
    workbook: ["web server log formats.xlsx"],
    rule: "Admin/auth/security events and Critical/High/Medium web-security rows",
    baseline: "SS", dest: "SIEM",
    scopes: ["E","FS","E","FS","E","FS","C","FS","FS"],
    note: "Routine successful traffic may stay in observability/lake; attack, auth, WAF and admin events go to SIEM.",
    status: "Mapped" },
  { id: "db", group: "Applications & data", name: "Database / Data Platform", hint: "Relational/NoSQL, managed DB, Guardium-covered platforms",
    workbook: ["Enterprise_Database_Logging_Control_Matrix_Guardium.xlsx", "database security log formats.xlsx"],
    rule: "Authentication, failures, DBA/admin, role/permission, audit config; Critical/High/Medium",
    baseline: "SS", dest: "SIEM",
    scopes: ["FS","E","FA","C","FS","NA","E","FA","FS"],
    note: "Protected/shared/privileged databases add data access, exports/bulk queries, deletes, schema and key use.",
    status: "Mapped (database workbook pending revision per approval tracker)" },
  { id: "saas", group: "Applications & data", name: "SaaS", hint: "Vendor-hosted SaaS processing Company information",
    workbook: ["SaaS Ingest Requirements (SIR) + vendor-specific comprehensive sheets (confirm final filename)"],
    rule: "Critical/High/Medium security, identity, admin and audit events",
    baseline: "SS", dest: "SIEM",
    scopes: ["E","E","FA","E","E","FS","FS","FA","E"],
    note: "Full audit where the SaaS is authoritative for protected data, identity, egress or critical business actions.",
    status: "Mapped - confirm final filename" },
  { id: "ai", group: "Applications & data", name: "AI / Agents / Models", hint: "Vendor-hosted or self-hosted models, agents, tools",
    workbook: ["AI_Telemetry_Requirements.xlsx + vendor AI logging sheets"],
    rule: "Critical/High/Medium AI security/admin events; model, prompt, agent, tool, data and guardrail telemetry",
    baseline: "SS", dest: "SIEM / Lake",
    scopes: ["E","FS","FA","E","FS","FS","FS","FA","FS"],
    note: "Observability traces may remain in AI observability/lake; security and agent-action events go SIEM.",
    status: "Mapped" },

  { id: "aws", group: "Cloud platforms", name: "AWS Cloud Native", hint: "CloudTrail, IAM/STS, GuardDuty, VPC flow, S3/DB data events",
    workbook: ["aws security logging comprehensive.xlsx", "AWS_Telemetry_Requirements.xlsx"],
    rule: "P0/P1 or Critical/High/Medium; CloudTrail mgmt, IAM/STS, findings, logging integrity",
    baseline: "SS", dest: "SIEM",
    scopes: ["FS","E","E","E","FS","C","FS","E","FS"],
    note: "High-volume flow/data-access can remain searchable in S3 except alerts and high-value subsets.",
    status: "Mapped", inherits: ["windows","linux"] },
  { id: "azure", group: "Cloud platforms", name: "Azure Cloud Native", hint: "Entra sign-ins/audit, Activity logs, Defender, resource logs",
    workbook: ["azure security logging comprehensive.xlsx"],
    rule: "Critical/High/Medium; Entra sign-ins/audit, Activity, Defender findings, logging integrity",
    baseline: "SS", dest: "SIEM",
    scopes: ["FS","E","E","E","FS","C","FS","E","FS"],
    note: "All four Entra sign-in types included when identity overlay applies.",
    status: "Mapped", inherits: ["windows","linux"] },
  { id: "gcp", group: "Cloud platforms", name: "GCP Cloud Native", hint: "Admin Activity, System Event, Policy Denied, IAM, SCC",
    workbook: ["gcp security logging comprehensive.xlsx", "GCP_Telemetry_Requirements.xlsx"],
    rule: "P0/P1 or Critical/High/Medium; Admin Activity, System Event, Policy Denied, IAM, SCC, logging integrity",
    baseline: "SS", dest: "SIEM",
    scopes: ["FS","E","E","E","FS","C","FS","E","FS"],
    note: "Data Access and flow details can remain in GCP lake when searchable; high-value alerts/subsets go SIEM.",
    status: "Mapped", inherits: ["windows","linux"] },
  { id: "oci", group: "Cloud platforms", name: "OCI Cloud Native", hint: "OCI Audit, IAM, Cloud Guard",
    workbook: ["oci security logging comprehensive.xlsx"],
    rule: "P0/P1 or Critical/High/Medium; OCI Audit, IAM, Cloud Guard, logging integrity",
    baseline: "SS", dest: "SIEM",
    scopes: ["FS","E","E","E","FS","C","FS","E","FS"],
    note: "OCI Audit foundation remains baseline; service-specific data access follows overlays.",
    status: "Mapped", inherits: ["windows","linux"] },
  { id: "k8s", group: "Cloud platforms", name: "Containers / Kubernetes", hint: "Managed or self-managed Kubernetes, container platforms",
    workbook: ["Cloud comprehensive workbooks + GitHub runner workbook + approved K8s requirements (confirm final filename)"],
    rule: "Audit/security subset; Critical/High/Medium control-plane and runtime events",
    baseline: "SS", dest: "SIEM",
    scopes: ["FS","E","E","E","FS","C","E","C","FS"],
    note: "Add RBAC/service accounts, secrets, exec/attach/port-forward, privileged pods, admission and deployment changes.",
    status: "Mapped - confirm final filename", inherits: ["linux"] },

  { id: "net", group: "Network & security tooling", name: "Network / DNS / Flow / NDR", hint: "Firewalls, DNS, flow logs, NDR",
    workbook: ["Cloud comprehensive workbooks; network/security appliance requirements"],
    rule: "Critical/High/Medium security events; denies, TI hits, admin/config, DNS security, NDR findings",
    baseline: "SS", dest: "SIEM",
    scopes: ["FS","FS","C","E","FS","NA","C","FS","E"],
    note: "Full raw flow can remain in searchable lake; SIEM receives detections and high-value subsets.",
    status: "Mapped" },
  { id: "pipeline", group: "Network & security tooling", name: "Telemetry Pipeline / Repository", hint: "Collectors, forwarders, routing, data lake/repository platforms",
    workbook: ["Cloud ingest requirements; SaaS ingest requirements; platform health requirements"],
    rule: "Critical/High/Medium pipeline config, auth, drop, lag, saturation, silence, routing and retention events",
    baseline: "FS", dest: "SIEM",
    scopes: ["FS","FS","E","C","FS","NA","C","E","FS"],
    note: "Telemetry impairment is itself a security event; pipeline audit and health always go to SIEM.",
    status: "Mapped" },

  { id: "github", group: "DevOps & CI/CD", name: "GitHub / CI-CD / Runners", hint: "GitHub Enterprise audit, Actions, self-hosted runners (VM/container)",
    workbook: ["GitHub_Self_Hosted_Runner_Logging_Comprehensive_v0.2.xlsx"],
    rule: "Critical/High/Medium GitHub audit, workflow, runner inventory/health and inherited OS security events",
    baseline: "SS", dest: "SIEM",
    scopes: ["FS","E","E","E","FS","C","FS","FS","FS"],
    note: "Runner OS baseline is inherited from Windows/Linux comprehensive sheets. Runner inventory/ownership is also required (CIRT enrichment).",
    status: "Mapped", inherits: ["windows","linux","k8s"] }
];

/* Universal baseline items (Appendix F.1) */
window.TN_BASELINE_ITEMS = [
  "Authentication attempts and outcomes",
  "Authorization decisions and denied access",
  "Account, role, group, entitlement and credential lifecycle (when the system performs those functions)",
  "Administrative and privileged activity",
  "Security, audit, policy and material configuration changes",
  "Logging disabled, cleared, failed, delayed or otherwise impaired",
  "Security-control actions, findings, blocks or alerts (when the system performs a security function)",
  "Actor, action, target/object and outcome",
  "True source-event time",
  "System / application / service / account / project / subscription / host identity",
  "Correlation, request, session, transaction or trace identifier when available"
];

/* Baseline row-selection rules (Baseline Rules sheet) */
window.TN_BASE_RULES = [
  { id: "BASE-01", text: "Select all rows marked Critical, High or Medium in the authoritative comprehensive workbook, only within the channels/categories listed for the log family. Critical/High to SIEM; Medium to SIEM or an approved searchable repository based on detection need." },
  { id: "BASE-02", text: "If a workbook uses P0/P1/P2 instead of Critical/High/Medium: P0 = Critical, P1 = High, P2 = Medium. P0/P1 to SIEM; P2 may be repository-first." },
  { id: "BASE-03", text: "If a workbook uses numeric criticality: 2 = Critical, 1 = High, 0 = Medium/Conditional unless explicitly mandatory." },
  { id: "BASE-04", text: "Rows marked Mandatory, Required, Send to SIEM = Yes, or CIRT-required are included even if criticality is blank or lower." },
  { id: "BASE-05", text: "Low, informational, debug, performance, routine-success and operational-noise rows are excluded unless an overlay or mandatory flag promotes them." },
  { id: "BASE-06", text: "The strongest applicable overlay scope wins; overlays are cumulative." }
];

/* Combination rules (Scope Definitions sheet) */
window.TN_SCOPE_RULES = [
  { id: "SCOPE-01", text: "Start with the baseline scope for the log family and apply every overlay whose owner test is true. Requirements are cumulative." },
  { id: "SCOPE-02", text: "Enhanced adds the identified overlay event groups; it does not mean all rows in the workbook." },
  { id: "SCOPE-03", text: "Full Security and Full Audit are parallel maximum scopes and may both apply; neither replaces the other." },
  { id: "SCOPE-04", text: "Conditional becomes mandatory once its stated trigger is present." },
  { id: "SCOPE-05", text: "Default destination does not mean every selected event is indexed in SIEM: generation, retention and routing are separate decisions." },
  { id: "SCOPE-06", text: "Mandatory / Required / CIRT-required / Send-to-SIEM rows override priority labels and are never suppressed by a lower scope." },
  { id: "SCOPE-07", text: "Sensitive-content prohibitions apply at every scope: log the record ID and action, not the PHI value or request body." }
];

window.TN_DO_NOT_LOG = [
  "Passwords, PINs or other authentication secrets",
  "Session tokens, API keys, OAuth tokens or cryptographic keys",
  "Full payment card numbers or card security codes",
  "The content of PHI or other Protected information",
  "Full HTTP request or response bodies",
  "Personal data in error messages or stack traces",
  "Debug-level output in production, unless approved"
];

/* Intake (NEHA) */
window.TN_INTAKE_STEPS = [
  { n: 1, name: "Submit request", who: "Any team", note: "Standardized form; auto-creates tickets (SIEM Team GitHub; ServiceNow for Splunk; Aha for engineering)." },
  { n: 2, name: "Triage & review", who: "SIEM Team", note: "Confirm the form is complete and whether it is security, app or compliance logging." },
  { n: 3, name: "Approve / Defer / Reject", who: "Telemetry Review Board", note: "Splunk, SIEM, SOC and CDE teams (weekly as needed)." },
  { n: 4, name: "Validate detailed requirements", who: "SIEM Team", note: "" },
  { n: 5, name: "Onboarding hand-off", who: "Splunk / HCC / Security Logging Engineering", note: "" },
  { n: 6, name: "Pipeline & data validation", who: "SIEM, Splunk, Pipeline teams", note: "" },
  { n: 7, name: "Normalization & CIM mapping", who: "SIEM Team", note: "" },
  { n: 8, name: "Detection content development / validation", who: "Detection Engineering", note: "" },
  { n: 9, name: "Tuning, approval & monitoring enablement", who: "SOC", note: "" },
  { n: 10, name: "Continuous health monitoring & source ownership", who: "SIEM Team", note: "" }
];

window.TN_REG_DRIVERS = ["HIPAA", "PCI DSS", "SOX", "FedRAMP", "FISMA", "M-21-31", "GDPR", "HITRUST", "Contractual / customer", "None known"];
window.TN_SENSITIVITY = ["Public", "Internal", "Confidential", "PHI", "PCI", "Regulated / federal"];

/* Known gaps surfaced in the app so you can chase them down */
window.TN_KNOWN_GAPS = [
  "Configuration guidance ('how do I turn this on') is NOT yet linked per family. The Configure tab shows the authoritative workbook and row-selection rules; add steps/links in data.js (family.configure) or generate them from each workbook's How-to-Enable / Collection Method columns.",
  "Redline v6 Appendix F.3 and the v0.2 matrix workbook differ in places (for example Windows 'App Logic' is '-' in the redline but Conditional in the workbook; Web/API Data Egress and several others differ). This prototype uses the v0.2 workbook (newer). Reconcile before publishing.",
  "The matrix splits Windows, Linux, AD/LDAP and the four CSPs as separate families and adds PKI/KMS, Telemetry Pipeline and Virtualization. The redline F.3 has 'Identity / Authentication' and a single 'Cloud CSP' row.",
  "Kubernetes, SaaS and Virtualization show 'Mapped - confirm final filename' in the Comprehensive Sheet Map.",
  "Redline section 3.3 says 'seven (90) days' for application local retention; 3.2 says 'ninty (90)'. Wording needs cleanup.",
  "'Conditional' cells are shown as triggers to evaluate; the prototype does not yet resolve them to Enhanced vs Full Security.",
  "The standard is a proposed redline and several comprehensive workbooks are not yet approved (see SIEM_Logging_Requirements_Approval_Tracker). Content shown is draft."
];
