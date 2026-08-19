# -*- coding: utf-8 -*-
import pandas as pd
import json, sys

sys.stdout.reconfigure(encoding='utf-8')

# Load files
df_ov = pd.read_csv('data/נתוני סקירה כללית (3).csv', sep='\t', encoding='utf-16le', skiprows=1)
df_ov.columns = [c.strip() for c in df_ov.columns]

df_pt = pd.read_csv('data/נתוני חלקיות משרה (1).csv', sep='\t', encoding='utf-16le', skiprows=1)
df_pt.columns = [c.strip() for c in df_pt.columns]

# Numeric clean
for c in df_ov.columns:
    if c not in ['INDEX()', 'מקור התוכן', 'שנה', 'מערכת', 'תת-מערכת', 'שם גוף', 'דירוג']:
        df_ov[c] = pd.to_numeric(df_ov[c].astype(str).str.replace(',', '').str.strip(), errors='coerce')

for c in df_pt.columns:
    if c not in ['INDEX()', 'מקור התוכן', 'שנה', 'מערכת', 'תת-מערכת', 'שם גוף']:
        df_pt[c] = pd.to_numeric(df_pt[c].astype(str).str.replace(',', '').str.strip(), errors='coerce')

def compute_body_metrics(body_name, year=2024):
    sub_ov = df_ov[(df_ov['שם גוף'].astype(str).str.contains(body_name)) & (df_ov['שנה'] == year)]
    sub_pt = df_pt[(df_pt['שם גוף'].astype(str).str.contains(body_name)) & (df_pt['שנה'] == year)]
    
    # 1. Full Time
    ft_res = {}
    if not sub_pt.empty:
        r = sub_pt.iloc[0]
        ft_mc = r['כמות עובדים גברים במשרה מלאה']
        ft_wc = r['כמות עובדים נשים במשרה מלאה']
        ft_tc = r['כמות עובדים במשרה מלאה']
        ft_mw = r['ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה']
        ft_ww = r['ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה']
        ft_ow = r['ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה']
        ft_mc_cost = r['ממוצע עלות העסקה לגברים במשרה מלאה']
        ft_wc_cost = r['ממוצע עלות העסקה לנשים במשרה מלאה']
        ft_tc_cost = r['ממוצע עלות העסקה למשרה מלאה']
        
        ft_gap = ((ft_mw - ft_ww) / ft_mw * 100) if (pd.notnull(ft_mw) and pd.notnull(ft_ww) and ft_mw > 0) else None
        
        # PT counts
        pt_mc = r['כמות עובדים גברים בחלקיות משרה']
        pt_wc = r['כמות עובדים נשים בחלקיות משרה']
        pt_tc = r['כמות עובדים בחלקיות משרה']
        
        ft_res = {
            'ftMen': ft_mc, 'ftWomen': ft_wc, 'ftTotal': ft_tc,
            'ptMen': pt_mc, 'ptWomen': pt_wc, 'ptTotal': pt_tc,
            'totMenPT': (ft_mc or 0) + (pt_mc or 0),
            'totWomenPT': (ft_wc or 0) + (pt_wc or 0),
            'totEmpPT': (ft_tc or 0) + (pt_tc or 0),
            'avgMenWage': ft_mw, 'avgWomenWage': ft_ww, 'overallWage': ft_ow,
            'gap': ft_gap,
            'avgMenCost': ft_mc_cost, 'avgWomenCost': ft_wc_cost, 'overallCost': ft_tc_cost
        }
    
    # 2. All Employees (Overview)
    all_res = {}
    if not sub_ov.empty:
        tot_men = sub_ov['סך גברים עובדים'].sum()
        tot_women = sub_ov['סך נשים עובדות'].sum()
        tot_emp = tot_men + tot_women
        
        m_s = (sub_ov['סך גברים עובדים'] * sub_ov['שכר גברים ממוצע']).dropna().sum()
        m_c = sub_ov.dropna(subset=['שכר גברים ממוצע'])['סך גברים עובדים'].sum()
        mw = m_s / m_c if m_c > 0 else None
        
        w_s = (sub_ov['סך נשים עובדות'] * sub_ov['שכר נשים ממוצע']).dropna().sum()
        w_c = sub_ov.dropna(subset=['שכר נשים ממוצע'])['סך נשים עובדות'].sum()
        ww = w_s / w_c if w_c > 0 else None
        
        ow = (m_s + w_s) / (m_c + w_c) if (m_c + w_c) > 0 else None
        gap = ((mw - ww) / mw * 100) if (mw and ww and mw > 0) else None
        
        # Employer cost
        c_m_s = (sub_ov['סך גברים עובדים'] * sub_ov['ממוצע עלות העסקה לגברים']).dropna().sum()
        c_m_c = sub_ov.dropna(subset=['ממוצע עלות העסקה לגברים'])['סך גברים עובדים'].sum()
        c_mw = c_m_s / c_m_c if c_m_c > 0 else None
        
        c_w_s = (sub_ov['סך נשים עובדות'] * sub_ov['ממוצע עלות העסקה לנשים']).dropna().sum()
        c_w_c = sub_ov.dropna(subset=['ממוצע עלות העסקה לנשים'])['סך נשים עובדות'].sum()
        c_ww = c_w_s / c_w_c if c_w_c > 0 else None
        
        c_ow = (c_m_s + c_w_s) / (c_m_c + c_w_c) if (c_m_c + c_w_c) > 0 else None
        
        all_res = {
            'totMen': tot_men, 'totWomen': tot_women, 'totEmp': tot_emp,
            'avgMenWage': mw, 'avgWomenWage': ww, 'overallWage': ow, 'gap': gap,
            'avgMenCost': c_mw, 'avgWomenCost': c_ww, 'overallCost': c_ow,
            'ranksCount': len(sub_ov)
        }
        
    return {'body': body_name, 'fullTime': ft_res, 'allEmployees': all_res}

print("=== TESTING AIRPORT AUTHORITY ===")
print(json.dumps(compute_body_metrics('שדות תעופה'), ensure_ascii=False, indent=2))

print("\n=== TESTING ELECTRIC COMPANY ===")
print(json.dumps(compute_body_metrics('חברת החשמל'), ensure_ascii=False, indent=2))
