# -*- coding: utf-8 -*-
import urllib.request
import re, sys

sys.stdout.reconfigure(encoding='utf-8')

url = 'https://public.tableau.com/views/_17122173585260/sheet0?:language=en-US&publish=yes&:display_count=y&:origin=viz_share_link&:showVizHome=no'

req = urllib.request.Request(
    url,
    headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
)

with urllib.request.urlopen(req) as resp:
    html = resp.read().decode('utf-8')

print(html[2000:6000])
