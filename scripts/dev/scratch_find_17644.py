# -*- coding: utf-8 -*-
import pandas as pd
import numpy as np
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Load files
df_ov = pd.read_csv('data/נתוני סקירה כללית (3).csv', sep='\t', encoding='utf-16le', skiprows=1)
df_ov.columns = [c.strip() for c in df_ov.columns]
for c in df_ov.columns:
    if c not in ['INDEX()', 'מקור התוכן', 'שנה', 'מערכת', 'תת-מערכת', 'שם גוף', 'דירוג']:
        df_ov[c] = pd.to_numeric(df_ov[c].astype(str).str.replace(',', '').str.strip(), errors='coerce')
df_ov['שנה'] = pd.to_numeric(df_ov['שנה'], errors='coerce')

df_pt = pd.read_csv('data/נתוני חלקיות משרה (1).csv', sep='\t', encoding='utf-16le', skiprows=1)
df_pt.columns = [c.strip() for c in df_pt.columns]
for c in df_pt.columns:
    if c not in ['INDEX()', 'מקור התוכן', 'שנה', 'מערכת', 'תת-מערכת', 'שם גוף']:
        df_pt[c] = pd.to_numeric(df_pt[c].astype(str).str.replace(',', '').str.strip(), errors='coerce')
df_pt['שנה'] = pd.to_numeric(df_pt['שנה'], errors='coerce')

edu = df_ov[(df_ov['שם גוף'] == 'משרד החינוך - מורים') & (df_ov['שנה'] == 2024)]
edu_pt = df_pt[(df_pt['שם גוף'] == 'משרד החינוך - מורים') & (df_pt['שנה'] == 2024)].iloc[0]

print("=== EDU RANKS ===")
for idx, r in edu.iterrows():
    print(f"  {r['דירוג']} | MC: {r['סך גברים עובדים']} | WC: {r['סך נשים עובדות']} | MW: {r['שכר גברים ממוצע']} | WW: {r['שכר נשים ממוצע']}")

# Target Men Wage = 17644
# Let's find how 17644 is calculated!
# Look at ranks:
# 1. מורים תואר ראשון: 7257 men, 15004.54
# 2. מורים תואר שני: 7897.58 men, 18591.10
# 3. מורים לא אקדמאים: 833 men, 10981.36
# 4. אחר: 902.58 men, 15067.44
# 5. מורים מתמחים: 323.33 men, 11368.74
# 6. מנהלים: 817.33 men, 30851.74
# 7. סגני מנהלים: 514.08 men, 24248.51
# 8. מנהלים חט"ב: 200.5 men, 28613.76

# Test 1: What if without 'אחר' or without certain ranks?
# What if only academic teachers?
# (7257 * 15004.54 + 7897.58 * 18591.10) / (7257 + 7897.58) = (108887947 + 146824600) / 15154.58 = 255712547 / 15154.58 = 16873.6

# Test 2: What if:
# Look at 17,644:
# (18614 * 11160 + X) ...
# Notice: (18614 + 17280) / 2 = 17947
# What if:
# In PartTime file:
# ממוצע ברוטו מס לגברים במשרה מלאה = 18859
# ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה = 18614
# ממוצע ברוטו שוטף והפרשים לגברים במשרה חלקית = 15318
# What if (18614 * 77242 + 15318 * ...) ?
# What if Men wage is: (18614 * 11160 + 15004.54 * 7585) / 18745 = (207732240 + 113809436) / 18745 = 321541676 / 18745 = 17153.5
# What if: (18614 * 11160 + 16193 * 7585) / 18745 = 17634 ! (Very close to 17644!)
# What if: (18614 * 11160 + 16215 * 7585) / 18745 = 17644 !
# Where does 16,215 come from?
# 16,215 is the overall average across all teachers in PartTime / Overview!

# Test 3: What if we check other columns in PartTime file:
for k, v in edu_pt.items():
    if pd.notnull(v) and isinstance(v, (int, float)):
        print(f"PT Column: {k} -> {v}")

# Test 4: What if 17644 is:
# Look at:
# 17644 * 18745 - 18614 * 11160 = 330736780 - 207732240 = 123004540 / 7585 = 16216.81
# 16216.81 is the average gross monthly wage of all part-time teachers!

# Let's test what Women wage and Total wage would be with this:
# Women: (17673 * 66082 + 14612 * 58919) / 125001 = (1167867186 + 860924428) / 125001 = 2028791614 / 125001 = 16230.2
# Total: (17809 * 77242 + 14612 * 66505) / 143747 = (1375602778 + 971771060) / 143747 = 2347373838 / 143747 = 16329.8
print("\nIf formula is: (FT_MW * FT_MC + PT_TW * PT_MC) / Total_MC:")
calc_mw_test = (18614 * 11160 + 16216.8 * 7585) / 18745
print(f"Calculated Men Wage: {calc_mw_test:.2f} -> {round(calc_mw_test)}")
