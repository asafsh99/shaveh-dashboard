# -*- coding: utf-8 -*-
import json, sys

sys.stdout.reconfigure(encoding='utf-8')

with open('scripts/data_bundle.js', 'r', encoding='utf-8') as f:
    data = json.loads(f.read().replace('window.__PRELOADED_DATA__ = ', '').rstrip(';\n'))

overview = data['overview']
ov_2024 = [r for r in overview if r.get('year') == 2024]

# Macro 2024:
# Method A: sum exact floats, then round at the end
float_sum_m = sum(r.get('menCount') or 0 for r in ov_2024)
float_sum_w = sum(r.get('womenCount') or 0 for r in ov_2024)

# Method B: round each rank row first, then sum
row_rounded_m = sum(round(r.get('menCount') or 0) for r in ov_2024)
row_rounded_w = sum(round(r.get('womenCount') or 0) for r in ov_2024)

print("=== 2024 Macro Headcount Comparison ===")
print(f"Exact Float Sum: Men = {float_sum_m:.2f} (round={round(float_sum_m)}), Women = {float_sum_w:.2f} (round={round(float_sum_w)}), Total = {float_sum_m + float_sum_w:.2f} (round={round(float_sum_m + float_sum_w)})")
print(f"Row-Rounded Sum: Men = {row_rounded_m}, Women = {row_rounded_w}, Total = {row_rounded_m + row_rounded_w}")
print(f"Discrepancy: Men = {row_rounded_m - round(float_sum_m)}, Women = {row_rounded_w - round(float_sum_w)}, Total = {(row_rounded_m + row_rounded_w) - round(float_sum_m + float_sum_w)}")

# Test on sample bodies:
sample_bodies = ['איכילוב', 'הדסה', 'רכבת ישראל בע"מ', 'המרכז הרפואי על שם חיים שיבא – תל השומר', 'בנק ישראל', 'עיריית ירושלים']
print("\n=== Sample Bodies (2024) ===")
for b in sample_bodies:
    b_rows = [r for r in ov_2024 if r.get('bodyName') == b]
    fm = sum(r.get('menCount') or 0 for r in b_rows)
    fw = sum(r.get('womenCount') or 0 for r in b_rows)
    rm = sum(round(r.get('menCount') or 0) for r in b_rows)
    rw = sum(round(r.get('womenCount') or 0) for r in b_rows)
    print(f"{b}:")
    print(f"  Exact Float Sum: Men={fm:.2f} (round={round(fm)}), Women={fw:.2f} (round={round(fw)}), Total={fm+fw:.2f} (round={round(fm+fw)})")
    print(f"  Row-Rounded Sum: Men={rm}, Women={rw}, Total={rm+rw}")
