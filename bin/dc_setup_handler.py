#!/usr/bin/env python3
"""
DC - Setup page backend.

Backs the "Set Up" page shown after installing/updating this app (triggered
by app.conf's is_configured=0 + the presence of setup.xml). Lets an admin
paste the GitHub token once, in Splunk Web, and stores it encrypted via
Splunk's built-in storage/passwords.conf - never in a plain-text conf file,
never in inputs.conf, never echoed back to the UI on subsequent loads.

The dc_github_file_pull modular input (bin/dc_github_file_pull.py) reads
this same credential at runtime using its own session key.
"""
import urllib.parse

import splunk.admin as admin
import splunk.rest as rest

APP_NAME = "cyber_data_catalog"
REALM = "dc_github"
CRED_USERNAME = "github_pat"


class DCGithubSettings(admin.MConfigHandler):
    def setup(self):
        if self.requestedAction == admin.ACTION_EDIT:
            self.supportedArgs.addOptArg("token")

    def handleList(self, confInfo):
        has_token = "false"
        try:
            key = urllib.parse.quote(f"{REALM}:{CRED_USERNAME}:", safe="")
            r, _content = rest.simpleRequest(
                f"/servicesNS/nobody/{APP_NAME}/storage/passwords/{key}",
                sessionKey=self.getSessionKey(),
                method="GET",
                raiseAllErrors=False,
            )
            has_token = "true" if r.status == 200 else "false"
        except Exception:
            has_token = "false"
        confInfo["github"].append("has_token", has_token)
        # Never reflect the actual token back to the UI.
        confInfo["github"].append("token", "")

    def handleEdit(self, confInfo):
        token = None
        if "token" in self.callerArgs.data:
            token = self.callerArgs.data["token"][0]
        if not token:
            # Blank submit = "leave existing token alone", not "clear it".
            return

        session_key = self.getSessionKey()
        key = urllib.parse.quote(f"{REALM}:{CRED_USERNAME}:", safe="")
        uri = f"/servicesNS/nobody/{APP_NAME}/storage/passwords"

        # Remove any existing credential under this realm/username first -
        # storage/passwords POST creates, it does not update in place.
        try:
            rest.simpleRequest(f"{uri}/{key}", sessionKey=session_key, method="DELETE", raiseAllErrors=False)
        except Exception:
            pass

        rest.simpleRequest(
            uri,
            sessionKey=session_key,
            method="POST",
            postargs={"name": CRED_USERNAME, "password": token, "realm": REALM},
            raiseAllErrors=True,
        )


admin.init(DCGithubSettings, admin.CONTEXT_NONE)
