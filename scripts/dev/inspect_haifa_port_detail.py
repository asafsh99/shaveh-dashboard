# -*- coding: utf-8 -*-
import json, sys

sys.stdout.reconfigure(encoding='utf-8')

with open('scripts/data_bundle.js', 'r', encoding='utf-8') as f:
    data = json.loads(f.read().replace('window.__PRELOADED_DATA__ = ', '').rstrip(';\n'))

haifa_port = [r for r in data['overview'] if r.get('bodyName') == 'חברת נמל חיפה']
print(f"Total rows for חברת נמל חיפה: {len(haifa_port)}")
for r in haifa_port:
    print(f"  {r.get('year')} | {r.get('rank')} | Men: {r.get('menCount')}, Women: {r.get('womenCount')}, Avg Men Wage: {r.get('avgMenWage')}, Avg Women Wage: {r.get('avgWomenWage')}")
