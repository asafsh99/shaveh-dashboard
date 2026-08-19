# -*- coding: utf-8 -*-
import json, sys

sys.stdout.reconfigure(encoding='utf-8')

with open('scripts/data_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

json_str = text[text.index('{'):text.rindex('}')+1]
data = json.loads(json_str)

all_bodies = sorted(list(set(r.get('bodyName') for r in data['overview'] if r.get('bodyName'))))

print("Total unique bodies in dataset:", len(all_bodies))

health_bodies = [b for b in all_bodies if any(k in b for k in ['רפואי', 'חולים', 'בריאות', 'סוראסקי', 'איכילוב', 'תל אביב', 'ת"א'])]
print(f"\nFound {len(health_bodies)} health/hospital/Tel-Aviv bodies:")
for b in health_bodies:
    print(" -", b)
