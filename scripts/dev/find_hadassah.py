# -*- coding: utf-8 -*-
import json, sys

sys.stdout.reconfigure(encoding='utf-8')

with open('scripts/data_bundle.js', 'r', encoding='utf-8') as f:
    data = json.loads(f.read().replace('window.__PRELOADED_DATA__ = ', '').rstrip(';\n'))

all_bodies = sorted(list(set(r.get('bodyName') for r in data['overview'] if r.get('bodyName'))))

hadassah = [b for b in all_bodies if 'הדסה' in b]
print("Hadassah bodies in dataset:", hadassah)

hospitals = [b for b in all_bodies if any(k in b for k in ['רפואי', 'חולים', 'איכילוב', 'שיבא', 'רמבם', 'סורוקה', 'אסף הרופא', 'וולפסון', 'הלל יפה', 'פוריה'])]
print("\nMajor Hospital bodies in dataset:")
for h in hospitals[:15]:
    print(" -", h)
