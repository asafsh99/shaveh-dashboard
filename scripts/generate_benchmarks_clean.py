# -*- coding: utf-8 -*-
import json, math, sys

sys.stdout.reconfigure(encoding='utf-8')

with open('scripts/data_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Strip "window.__PRELOADED_DATA__ = " and trailing ";"
json_str = text[text.index('{'):text.rindex('}')+1]
data = json.loads(json_str)

overview = data['overview']
part_time = data['partTime']

print(f"Loaded {len(overview)} overview rows and {len(part_time)} partTime rows from data_bundle.js")

# Build map for fast lookup by (bodyName, year)
pt_map = {}
for r in part_time:
    b = (r.get('bodyName') or '').strip()
    y = int(r.get('year') or 0)
    pt_map[(b, y)] = r

ov_by_body_year = {}
for r in overview:
    b = (r.get('bodyName') or '').strip()
    y = int(r.get('year') or 0)
    if (b, y) not in ov_by_body_year:
        ov_by_body_year[(b, y)] = []
    ov_by_body_year[(b, y)].append(r)

benchmarks = {}

for (b, y), rows_ov in ov_by_body_year.items():
    if not b or y == 0:
        continue
    r_pt = pt_map.get((b, y))
    
    # 1. Overview rank totals and weighted wages
    ranks_m = sum(r.get('menCount') or 0 for r in rows_ov)
    ranks_w = sum(r.get('womenCount') or 0 for r in rows_ov)
    
    m_s = sum((r.get('menCount') or 0) * (r.get('avgMenWage') or 0) for r in rows_ov if r.get('avgMenWage') is not None)
    m_c = sum((r.get('menCount') or 0) for r in rows_ov if r.get('avgMenWage') is not None)
    ov_mw = (m_s / m_c) if m_c > 0 else None
    
    w_s = sum((r.get('womenCount') or 0) * (r.get('avgWomenWage') or 0) for r in rows_ov if r.get('avgWomenWage') is not None)
    w_c = sum((r.get('womenCount') or 0) for r in rows_ov if r.get('avgWomenWage') is not None)
    ov_ww = (w_s / w_c) if w_c > 0 else None
    
    t_s = sum((r.get('monthlyEmployeeCount') or 0) * (r.get('avgGrossRegular') or 0) for r in rows_ov if r.get('avgGrossRegular') is not None)
    t_c = sum((r.get('monthlyEmployeeCount') or 0) for r in rows_ov if r.get('avgGrossRegular') is not None)
    ov_tw = (t_s / t_c) if t_c > 0 else None
    
    # 2. PartTime values
    ft_mc = (r_pt.get('ftMenCount') or 0) if r_pt else 0
    ft_wc = (r_pt.get('ftWomenCount') or 0) if r_pt else 0
    ft_tc = (r_pt.get('ftTotalCount') or 0) if r_pt else 0
    
    pt_mc = (r_pt.get('ptMenCount') or 0) if r_pt else 0
    pt_wc = (r_pt.get('ptWomenCount') or 0) if r_pt else 0
    pt_tc = (r_pt.get('ptTotalCount') or 0) if r_pt else 0
    
    ft_mw = r_pt.get('ftMenWage') if r_pt else None
    ft_ww = r_pt.get('ftWomenWage') if r_pt else None
    ft_tw = r_pt.get('ftTotalWage') if r_pt else None
    
    pt_mw = r_pt.get('ptMenWage') if r_pt else None
    pt_ww = r_pt.get('ptWomenWage') if r_pt else None
    pt_tw = r_pt.get('ptTotalWage') if r_pt else None
    
    # 3. Headcount
    tot_m = round(ranks_m) if ranks_m > 0 else round(ft_mc + pt_mc)
    tot_w = round(ranks_w) if ranks_w > 0 else round(ft_wc + pt_wc)
    
    if (ft_mc + pt_mc) > tot_m:
        tot_m = round(ft_mc + pt_mc)
    if (ft_wc + pt_wc) > tot_w:
        tot_w = round(ft_wc + pt_wc)
        
    tot_hc = tot_m + tot_w
    if tot_hc == 0:
        continue
        
    # 4. Pure Universal Wage Weighting:
    # Men:
    if ft_mw is not None and ft_mc > 0:
        p_mc = tot_m - ft_mc
        if p_mc > 0:
            rate = pt_mw if pt_mw is not None else (ov_mw if ov_mw is not None else (ft_tw if ft_tw is not None else ft_mw))
            calc_mw = round((ft_mw * ft_mc + rate * p_mc) / tot_m)
        else:
            calc_mw = round(ft_mw)
    elif ov_mw is not None:
        calc_mw = round(ov_mw)
    else:
        calc_mw = None
        
    # Women:
    if ft_ww is not None and ft_wc > 0:
        p_wc = tot_w - ft_wc
        if p_wc > 0:
            rate = pt_ww if pt_ww is not None else (ov_ww if ov_ww is not None else (ft_tw if ft_tw is not None else ft_ww))
            calc_ww = round((ft_ww * ft_wc + rate * p_wc) / tot_w)
        else:
            calc_ww = round(ft_ww)
    elif ov_ww is not None:
        calc_ww = round(ov_ww)
    else:
        calc_ww = None
        
    # Overall:
    if ft_tw is not None and ft_tc > 0:
        p_tc = tot_hc - ft_tc
        if p_tc > 0:
            rate = pt_tw if pt_tw is not None else (ov_tw if ov_tw is not None else ((calc_mw * tot_m + calc_ww * tot_w) / tot_hc if (calc_mw and calc_ww) else ft_tw))
            calc_tw = round((ft_tw * ft_tc + rate * p_tc) / tot_hc)
        else:
            calc_tw = round(ft_tw)
    elif calc_mw and calc_ww and tot_m > 0 and tot_w > 0:
        calc_tw = round((calc_mw * tot_m + calc_ww * tot_w) / tot_hc)
    elif ov_tw is not None:
        calc_tw = round(ov_tw)
    else:
        calc_tw = None
        
    gap = round(((calc_mw - calc_ww) / calc_mw) * 100, 2) if (calc_mw and calc_ww and calc_mw > 0) else None
    
    key = f"{b}_{y}"
    benchmarks[key] = {
        'menCount': int(tot_m),
        'womenCount': int(tot_w),
        'totalEmployees': int(tot_hc),
        'avgMenWage': calc_mw,
        'avgWomenWage': calc_ww,
        'overallWage': calc_tw,
        'genderPayGapPercent': gap
    }

print(f"Generated {len(benchmarks)} benchmarks from clean Excel data.")

test_list = [
    'בנק ישראל',
    'רשות שדות תעופה',
    'המרכז הרפואי יוספטל',
    'חברת החשמל לישראל בע"מ',
    'משרד החינוך - מורים',
    'אולפנים - מורים',
    'חינוך התישבותי - מורים',
    'המועצה להסדר ההימורים בספורט',
    'מנהלת תקומה',
    'מפעל הפיס'
]

for b in test_list:
    k = f"{b}_2024"
    print(f"\n=== {k} ===")
    print(benchmarks.get(k))

with open('scripts/tableau_benchmarks.js', 'w', encoding='utf-8') as f:
    f.write('window.__TABLEAU_BODY_BENCHMARKS__ = ')
    json.dump(benchmarks, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')

print("\nSuccessfully updated scripts/tableau_benchmarks.js")
