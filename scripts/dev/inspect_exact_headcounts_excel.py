# -*- coding: utf-8 -*-
import json, sys
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')

df_ov = pd.read_excel('data/נתוני סקירה כללית.xlsx', header=1)
df_ov.columns = [c.strip() for c in df_ov.columns]

df_pt = pd.read_excel('data/נתוני חלקיות משרה.xlsx', header=1)
df_pt.columns = [c.strip() for c in df_pt.columns]

sample_bodies = ['איכילוב', 'הדסה', 'רכבת ישראל בע"מ', 'המרכז הרפואי על שם חיים שיבא – תל השומר', 'בנק ישראל', 'עיריית ירושלים', 'משטרה']

print("=== Comparing Overview vs PartTime in Excel (2024) ===")
for b in sample_bodies:
    sub_ov = df_ov[(df_ov['שם גוף'] == b) & (df_ov['שנה'] == 2024)]
    sub_pt = df_pt[(df_pt['שם גוף'] == b) & (df_pt['שנה'] == 2024)]
    
    ov_m = sub_ov['גברים'].sum()
    ov_w = sub_ov['נשים'].sum()
    ov_t = sub_ov['מספר עובדים ממוצע לחודש'].sum()
    
    pt_row = sub_pt.iloc[0] if len(sub_pt) > 0 else {}
    pt_ft_m = pt_row.get('גברים במשרה מלאה')
    pt_pt_m = pt_row.get('גברים במשרה חלקית')
    pt_tot_m = pt_row.get('סה"כ גברים')
    
    pt_ft_w = pt_row.get('נשים במשרה מלאה')
    pt_pt_w = pt_row.get('נשים במשרה חלקית')
    pt_tot_w = pt_row.get('סה"כ נשים')
    
    pt_tot_all = pt_row.get('סה"כ עובדים')
    
    print(f"\n--- {b} ---")
    print(f"  Overview: Men={ov_m:.2f}, Women={ov_w:.2f}, Total={ov_t:.2f} (Sum M+W = {ov_m+ov_w:.2f})")
    print(f"  PartTime: FT_M={pt_ft_m}, PT_M={pt_pt_m}, Tot_M={pt_tot_m}")
    print(f"            FT_W={pt_ft_w}, PT_W={pt_pt_w}, Tot_W={pt_tot_w}")
    print(f"            Total All={pt_tot_all}")
