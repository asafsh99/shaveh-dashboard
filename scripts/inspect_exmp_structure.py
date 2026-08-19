# -*- coding: utf-8 -*-
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('dashboard_exmp/dashboard_new.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines in dashboard_new.html: {len(lines)}")

# Find key sections
for idx, line in enumerate(lines):
    if any(k in line for k in ['<style', '<body', '<nav', 'class="tab', 'class="card', 'class="kpi', 'id="trends', 'id="ranks', 'id="overview', '<script']):
        if idx > 15: # skip Chart.js inline
            print(f"Line {idx+1}: {line.strip()[:100]}")
