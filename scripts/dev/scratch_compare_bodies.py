# -*- coding: utf-8 -*-
import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Load files
df_ov = pd.read_csv('data/נתוני סקירה כללית (3).csv', sep='\t', encoding='utf-16le', skiprows=1)
df_ov.columns = [c.strip() for c in df_ov.columns]

df_pt = pd.read_csv('data/נתוני חלקיות משרה (1).csv', sep='\t', encoding='utf-16le', skiprows=1)
df_pt.columns = [c.strip() for c in df_pt.columns]

for c in ['סך גברים עובדים', 'סך נשים עובדות', 'מספר עובדים ממוצע לחודש', 'שכר גברים ממוצע', 'שכר נשים ממוצע', 'ממוצע ברוטו שוטף והפרשים']:
    df_ov[c] = pd.to_numeric(df_ov[c].astype(str).str.replace(',', '').str.strip(), errors='coerce')

for c in ['כמות עובדים גברים במשרה מלאה', 'כמות עובדים נשים במשרה מלאה', 'כמות עובדים במשרה מלאה',
          'כמות עובדים גברים בחלקיות משרה', 'כמות עובדים נשים בחלקיות משרה', 'כמות עובדים בחלקיות משרה',
          'ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה', 'ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה', 'ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה']:
    df_pt[c] = pd.to_numeric(df_pt[c].astype(str).str.replace(',', '').str.strip(), errors='coerce')

d24_ov = df_ov[df_ov['שנה'] == 2024]
d24_pt = df_pt[df_pt['שנה'] == 2024]

# Compare 10 bodies
bodies_to_check = [
    'רשות שדות תעופה',
    'חברת החשמל לישראל בע"מ',
    'המוסד לביטוח לאומי',
    'בנק ישראל',
    'עיריית תל אביב- יפו',
    'מרכז רפואי שיבא',
    'האוניברסיטה העברית',
    'רפאל - מערכות לחימה מתקדמות בע"מ',
    'משטרת ישראל',
    'משרד החינוך'
]

print(f"{'גוף':<30} | {'גברים מלאה':<10} | {'גברים כולל':<10} | {'נשים מלאה':<10} | {'נשים כולל':<10} | {'שכר מלאה':<10} | {'שכר כולל (OV)':<12}")
print("-" * 105)

for b in bodies_to_check:
    sub_pt = d24_pt[d24_pt['שם גוף'].astype(str).str.contains(b.replace('בע"מ', '').strip())]
    sub_ov = d24_ov[d24_ov['שם גוף'].astype(str).str.contains(b.replace('בע"מ', '').strip())]
    
    if sub_pt.empty or sub_ov.empty:
        continue
    
    pt_r = sub_pt.iloc[0]
    ft_m = pt_r['כמות עובדים גברים במשרה מלאה']
    pt_m = pt_r['כמות עובדים גברים בחלקיות משרה']
    tot_m_pt = (ft_m if pd.notnull(ft_m) else 0) + (pt_m if pd.notnull(pt_m) else 0)
    
    ft_w = pt_r['כמות עובדים נשים במשרה מלאה']
    pt_w = pt_r['כמות עובדים נשים בחלקיות משרה']
    tot_w_pt = (ft_w if pd.notnull(ft_w) else 0) + (pt_w if pd.notnull(pt_w) else 0)
    
    ft_wage = pt_r['ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה']
    
    tot_m_ov = sub_ov['סך גברים עובדים'].sum()
    tot_w_ov = sub_ov['סך נשים עובדות'].sum()
    
    # Overview weighted wage:
    m_mass = (sub_ov['סך גברים עובדים'] * sub_ov['שכר גברים ממוצע']).dropna().sum()
    m_valid = sub_ov.dropna(subset=['שכר גברים ממוצע'])['סך גברים עובדים'].sum()
    w_mass = (sub_ov['סך נשים עובדות'] * sub_ov['שכר נשים ממוצע']).dropna().sum()
    w_valid = sub_ov.dropna(subset=['שכר נשים ממוצע'])['סך נשים עובדות'].sum()
    
    ov_wage = (m_mass + w_mass) / (m_valid + w_valid) if (m_valid + w_valid) > 0 else 0
    
    print(f"{b[:28]:<30} | {ft_m:<10.0f} | {tot_m_ov:<10.0f} | {ft_w:<10.0f} | {tot_w_ov:<10.0f} | {ft_wage:<10.0f} | {ov_wage:<12.0f}")
