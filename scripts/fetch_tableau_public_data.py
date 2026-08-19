# -*- coding: utf-8 -*-
import urllib.request
import json, re, sys

sys.stdout.reconfigure(encoding='utf-8')

# 1. Fetch initial html to get session / sheet details
url = 'https://public.tableau.com/views/_17122173585260/sheet0?:language=en-US&publish=yes&:display_count=y&:origin=viz_share_link&:showVizHome=no'

req = urllib.request.Request(
    url,
    headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
)

print("Fetching Tableau page HTML...")
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode('utf-8')

print(f"Received {len(html)} chars.")

# Find vizql session parameters
session_match = re.search(r'data-session-id="([^"]+)"', html)
session_id = session_match.group(1) if session_match else None
print(f"Session ID: {session_id}")

# Find bootstrap url / config
config_match = re.search(r'<textarea id="tsConfigContainer">([^<]+)</textarea>', html)
if config_match:
    config_json = json.loads(config_match.group(1))
    print("Found tsConfigContainer keys:", list(config_json.keys()))
    sheet_id = config_json.get('sheetId')
    print("Sheet ID:", sheet_id)

# Try bootstrapSession request
bootstrap_url = f"https://public.tableau.com/vizql/w/_17122173585260/v/sheet0/bootstrapSession/sessions/{session_id}"
print(f"Posting to bootstrap url: {bootstrap_url}")

post_data = urllib.parse.urlencode({
    'sheet_id': sheet_id or 'sheet0',
    'showParams': json.dumps({"checkpoint": False, "refresh": False, "refreshConfig": "undecided"}),
    'stickySessionKey': json.dumps({"featureFlags": {}, "workbookId": 17122173585260})
}).encode('utf-8')

post_req = urllib.request.Request(
    bootstrap_url,
    data=post_data,
    headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/javascript, application/javascript, application/ecmascript, application/x-ecmascript, */*; q=0.01',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
    }
)

try:
    with urllib.request.urlopen(post_req) as resp:
        resp_text = resp.read().decode('utf-8')
        print(f"Received bootstrap response: {len(resp_text)} chars")
        with open('scripts/tableau_bootstrap_response.txt', 'w', encoding='utf-8') as f:
            f.write(resp_text)
        print("Saved bootstrap response to scripts/tableau_bootstrap_response.txt")
except Exception as e:
    print(f"Bootstrap request error: {e}")
