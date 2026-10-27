#!/usr/bin/env python3
"""
DC - GitHub file pull (modular input)

Reusable: create one instance per file you want synced out of Git - not just
contracts_master.csv. Each instance has its own github_repo/branch/file_path/
target_filename, so adding a second CSV later is a new input instance, not a
new script.

Credential handling: this is a proper Splunk *modular* input (not a plain
scripted input), so splunkd hands it a <session_key> on stdin at every run.
The script uses that session key to call this app's storage/passwords entry
(set once via the app's Set Up page / dc_setup_handler.py) to retrieve the
GitHub token at runtime. The token is never stored in inputs.conf, in an
environment variable, or in this file.
"""
import base64
import csv
import io
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.dom.minidom

APP_NAME = "cyber_data_catalog"
SCHEME_NAME = "dc_github_file_pull"
REALM = "dc_github"
CRED_USERNAME = "github_pat"

APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOOKUPS_DIR = os.path.join(APP_DIR, "lookups")
LOG_PATH = os.path.join(APP_DIR, "logs", "dc_github_file_pull.log")


def log(msg):
    os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
    with open(LOG_PATH, "a") as f:
        f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} {msg}\n")


# --------------------------------------------------------------------------
# Splunkd introspection protocol: --scheme / --validate-arguments
# --------------------------------------------------------------------------

SCHEME_XML = f"""<scheme>
  <title>GitHub File Pull</title>
  <description>Pulls one file from a private GitHub repo into a lookups/ CSV on a schedule. Create one instance per file (e.g. contracts_master.csv today; add another instance later for any other CSV the SIEM/CDE team manages in Git).</description>
  <use_external_validation>true</use_external_validation>
  <streaming_mode>simple</streaming_mode>
  <endpoint>
    <args>
      <arg name="github_repo">
        <title>GitHub org/repo</title>
        <description>e.g. optum-eis/CIRT_Splunk_SIEM_project</description>
        <data_type>string</data_type>
        <required_on_create>true</required_on_create>
      </arg>
      <arg name="branch">
        <title>Branch</title>
        <description>e.g. main</description>
        <data_type>string</data_type>
        <required_on_create>false</required_on_create>
      </arg>
      <arg name="file_path">
        <title>File path in repo</title>
        <description>e.g. Contracts/contracts_master.csv</description>
        <data_type>string</data_type>
        <required_on_create>true</required_on_create>
      </arg>
      <arg name="target_filename">
        <title>Target lookup filename</title>
        <description>Filename under lookups/ to write the raw pulled file to, e.g. contracts_master_raw.csv</description>
        <data_type>string</data_type>
        <required_on_create>true</required_on_create>
      </arg>
    </args>
  </endpoint>
</scheme>"""


def do_scheme():
    print(SCHEME_XML)


def validate_arguments():
    # Minimal validation. Real auth/reachability is checked on first run,
    # surfaced via DC-39's staleness alert rather than blocking here.
    doc = xml.dom.minidom.parse(sys.stdin)
    items = doc.getElementsByTagName("param")
    values = {i.getAttribute("name"): i.firstChild.nodeValue if i.firstChild else "" for i in items}
    for required in ("github_repo", "file_path", "target_filename"):
        if not values.get(required):
            print(f"<error><message>{required} is required</message></error>")
            sys.exit(1)


# --------------------------------------------------------------------------
# Normal run: splunkd passes full config (incl. session_key) on stdin
# --------------------------------------------------------------------------

def read_input_config():
    doc = xml.dom.minidom.parse(sys.stdin)
    session_key = doc.getElementsByTagName("session_key")[0].firstChild.nodeValue

    stanza = doc.getElementsByTagName("stanza")[0]
    input_name = stanza.getAttribute("name")
    params = {}
    for param in stanza.getElementsByTagName("param"):
        name = param.getAttribute("name")
        params[name] = param.firstChild.nodeValue if param.firstChild else ""

    server_host = doc.getElementsByTagName("server_host")
    server_host = server_host[0].firstChild.nodeValue if server_host and server_host[0].firstChild else "127.0.0.1"
    server_uri_el = doc.getElementsByTagName("server_uri")
    server_uri = server_uri_el[0].firstChild.nodeValue if server_uri_el and server_uri_el[0].firstChild else "https://127.0.0.1:8089"

    return session_key, input_name, params, server_uri


def get_token(session_key, server_uri):
    """Retrieve the GitHub token from storage/passwords, set via the app's Set Up page."""
    key = urllib.parse.quote(f"{REALM}:{CRED_USERNAME}:", safe="")
    url = f"{server_uri}/servicesNS/nobody/{APP_NAME}/storage/passwords/{key}?output_mode=json"
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Splunk {session_key}")
    ctx = _unverified_ssl_context()
    with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    entry = payload["entry"][0]["content"]
    return entry["clear_password"]


def _unverified_ssl_context():
    import ssl
    ctx = ssl.create_default_context()
    # Talking to the local splunkd management port over its own cert -
    # tighten this if your deployment pins a known management cert.
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def fetch_github_file(token, repo, branch, file_path):
    api_url = f"https://api.github.com/repos/{repo}/contents/{file_path}?ref={branch}"
    req = urllib.request.Request(api_url)
    req.add_header("Authorization", f"token {token}")
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    with urllib.request.urlopen(req, timeout=30) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    content = base64.b64decode(payload["content"]).decode("utf-8")
    return content, payload["sha"]


def sha_marker_path(target_filename):
    return os.path.join(LOOKUPS_DIR, f".{target_filename}.sha")


def previous_sha(target_filename):
    p = sha_marker_path(target_filename)
    if not os.path.exists(p):
        return None
    with open(p) as f:
        return f.read().strip()


def write_sha(target_filename, sha):
    with open(sha_marker_path(target_filename), "w") as f:
        f.write(sha)


def looks_like_csv(text):
    try:
        reader = csv.reader(io.StringIO(text))
        header = next(reader, None)
        return header is not None and len(header) > 0
    except Exception:
        return False


def run():
    session_key, input_name, params, server_uri = read_input_config()
    repo = params.get("github_repo", "")
    branch = params.get("branch") or "main"
    file_path = params.get("file_path", "")
    target_filename = params.get("target_filename", "")

    target_path = os.path.join(LOOKUPS_DIR, target_filename)
    tmp_path = target_path + ".tmp"
    backup_path = target_path + ".bak"

    try:
        token = get_token(session_key, server_uri)
    except Exception as e:
        log(f"[{input_name}] TOKEN RETRIEVAL FAILED: {e}")
        _emit_event(input_name, "error", f"token retrieval failed: {e}")
        return

    try:
        text, sha = fetch_github_file(token, repo, branch, file_path)
    except urllib.error.HTTPError as e:
        log(f"[{input_name}] FETCH FAILED: HTTP {e.code} - check token/repo/path/branch and org approval status")
        _emit_event(input_name, "error", f"HTTP {e.code}")
        return
    except Exception as e:
        log(f"[{input_name}] FETCH FAILED: {e}")
        _emit_event(input_name, "error", str(e))
        return

    if sha == previous_sha(target_filename):
        log(f"[{input_name}] NO CHANGE: sha {sha} unchanged - skipping write")
        _emit_event(input_name, "unchanged", sha)
        return

    if not looks_like_csv(text):
        log(f"[{input_name}] VALIDATION FAILED: fetched content does not look like a CSV - keeping existing file")
        _emit_event(input_name, "validation_failed", "not csv-shaped")
        return

    if os.path.exists(target_path):
        import shutil
        shutil.copy2(target_path, backup_path)

    with open(tmp_path, "w", newline="") as f:
        f.write(text)
    os.replace(tmp_path, target_path)
    write_sha(target_filename, sha)

    log(f"[{input_name}] PULL OK: wrote {target_filename}, sha={sha}")
    _emit_event(input_name, "ok", sha)


def _emit_event(input_name, status, detail):
    # Written to stdout - splunkd indexes this as sourcetype=dc:github_file_pull
    # per inputs.conf, which DC-39 (staleness watchdog) alerts on.
    print(f"dc_github_file_pull input_name={input_name} status={status} detail=\"{detail}\" ts={int(time.time())}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--scheme":
        do_scheme()
    elif len(sys.argv) > 1 and sys.argv[1] == "--validate-arguments":
        validate_arguments()
    else:
        run()
