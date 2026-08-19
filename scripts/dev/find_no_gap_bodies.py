"""
Parse data_bundle.js to find 2024 bodies without gender wage gap.
Uses two separate simple regexes instead of one greedy combined regex.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

print("Reading file...", flush=True)
with open('scripts/data_bundle.js', 'r', encoding='utf-8') as f:
    content = f.read()

print(f"File size: {len(content):,} chars", flush=True)

# Strategy: find each JSON object boundary (separated by },{ or },[
# Each record is: {...,"year":2024,"system":"X","subSystem":"Y","bodyName":"Z",...,"avgMenWage":A,"avgWomenWage":B,...}
# Since the file is one big array, split on record boundaries

print("Splitting records...", flush=True)

# Find the data array content
start = content.index('[')
# Split by record separators - each record starts with {"index":
records_raw = re.split(r'\},\s*\{', content[start:])
print(f"Total records found: {len(records_raw):,}", flush=True)

body_info = {}

# Simple non-greedy patterns for individual fields
p_year    = re.compile(r'"year":(\d+)')
p_system  = re.compile(r'"system":"([^"]*)"')
p_sub     = re.compile(r'"subSystem":"([^"]*)"')
p_body    = re.compile(r'"bodyName":"([^"]+)"')
p_men_w   = re.compile(r'"avgMenWage":([^,}]+)')
p_women_w = re.compile(r'"avgWomenWage":([^,}]+)')

for rec in records_raw:
    ym = p_year.search(rec)
    if not ym or ym.group(1) != '2024':
        continue
    
    bm = p_body.search(rec)
    if not bm:
        continue
    
    body     = bm.group(1)
    system   = (p_system.search(rec) or ['',''])[1] if p_system.search(rec) else ''
    subsystem= (p_sub.search(rec) or ['',''])[1] if p_sub.search(rec) else ''
    sm = p_system.search(rec)
    ssm = p_sub.search(rec)
    system = sm.group(1) if sm else ''
    subsystem = ssm.group(1) if ssm else ''
    
    mwm  = p_men_w.search(rec)
    wwm  = p_women_w.search(rec)
    men_w   = mwm.group(1).strip()   if mwm  else 'null'
    women_w = wwm.group(1).strip()   if wwm  else 'null'
    has_both = (men_w != 'null' and women_w != 'null')
    
    if body not in body_info:
        body_info[body] = {"system": system, "subsystem": subsystem, "has_gap": False}
    if has_both:
        body_info[body]["has_gap"] = True

print(f"Total bodies 2024: {len(body_info)}", flush=True)

no_gap_list = [(b, v["system"], v["subsystem"]) 
               for b, v in body_info.items() if not v["has_gap"]]
no_gap_list.sort(key=lambda x: (x[1], x[2], x[0]))
with_gap = len(body_info) - len(no_gap_list)

print(f"Bodies WITH gap: {with_gap}", flush=True)
print(f"Bodies WITHOUT gap: {len(no_gap_list)}", flush=True)

out = 'scripts/dev/no_gap_bodies_2024.csv'
with open(out, 'w', encoding='utf-8-sig') as f:
    f.write("גוף,מערכת,תת-מערכת\n")
    for body, system, subsystem in no_gap_list:
        f.write(f'"{body}","{system}","{subsystem}"\n')

print(f"Saved: {out}", flush=True)
