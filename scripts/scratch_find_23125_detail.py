# -*- coding: utf-8 -*-
import json, sys

sys.stdout.reconfigure(encoding='utf-8')

with open('scripts/data_bundle.js', 'r', encoding='utf-8') as f:
    data = json.loads(f.read().replace('window.__PRELOADED_DATA__ = ', '').rstrip(';\n'))

overview = data['overview']
part_time = data['partTime']

ichilov_pt = next((r for r in part_time if r.get('bodyName') == 'איכילוב' and r.get('year') == 2024), None)
ichilov_ov = [r for r in overview if r.get('bodyName') == 'איכילוב' and r.get('year') == 2024]

# Let's test all possible formulas that yield 23125:
# In Overview:
# Ranks:
# 1. אחים ואחיות: MC=383.83, MW=23995.64
# 2. אקדמאים: MC=29.33, MW=24906.81
# 3. הנדסאים: MC=65.0, MW=22007.70
# 4. חוזים: MC=18.33, MW=29536.40
# 5. מהנדסים: MC=27.92, MW=27886.42
# 6. מנהלי: MC=587.92, MW=16883.31
# 7. מרפאים בעיסוק: MC=2.0, MW=None
# 8. סטאזרים: MC=110.0, MW=11272.83
# 9. עובדי מעבדה: MC=39.08, MW=20897.75
# 10. עובדים סוציאלים: MC=6.83, MW=13800.64
# 11. פארה רפואיים: MC=23.5, MW=18749.85
# 12. פיזיוטרפיסטים: MC=11.33, MW=14657.28
# 13. פסיכולוגים: MC=30.33, MW=13597.85
# 14. רופאים מומחים: MC=399.67, MW=36956.89
# 15. רופאים מתמחים: MC=215.92, MW=23366.05
# 16. רוקחים: MC=0.25, MW=None
# 17. רנטגנאים: MC=53.5, MW=18591.14

# Let's test:
# What if:
# (Gross * monthly / monthly) across ranks:
# What if sum of (r['avgMenWage'] * r['menCount']) / Total Men (2004.75 or 2005):
s_mw = sum((r['menCount'] or 0) * (r['avgMenWage'] or 0) for r in ichilov_ov if r['avgMenWage'])
print("Sum of men wage in ranks:", s_mw)
print("Divided by valid men count (2002.5):", s_mw / 2002.5)
print("Divided by total headcount (2004.75):", s_mw / 2004.75) # 23243.7
print("Divided by rounded headcount (2005):", s_mw / 2005)

# What if:
# Look at 23,125:
# 23125 / 23313.35 = 0.991921
# What if:
# Look at: 23125:
# Is it: (23313.35 * 1774.25 + ...) / 2005 ?
# If Total Men = 2005, and wage = 23125:
# Total sum = 2005 * 23125 = 46,365,625
# In PartTime file:
# FT Men Wage = 23313.345706 * 1774.25 = 41,363,705.85
# Difference = 46,365,625 - 41,363,705.85 = 5,001,919.15
# PT Men count = 230.5
# 5,001,919.15 / 230.5 = 21,700.30 !
# Where does 21,700.30 come from?
# Look at `ftTotalTaxableGross` = 21774.49
# Look at `ftTotalEmployerCost` = 21464.88
# Look at `ftTotalWage` = 21350.68
# Look at `ptMenTaxableGross` = 21257.60
# Look at `ptMenEmployerCost` = 20564.51
# Look at `ptMenWage` = 20731.86

# What if Tableau does:
# (FT_Men_Wage * FT_Men_Count + PT_Men_Taxable_Gross * PT_Men_Count) / Total_Men_Count:
# (23313.3457 * 1774.25 + 21257.6006 * 230.5) / 2004.75 = (41363705 + 4899877) / 2004.75 = 46263582 / 2004.75 = 23076.98
# What if: (23313.3457 * 1774.25 + 21774.49 * 230.5) / 2004.75 = (41363705 + 5019020) / 2004.75 = 46382725 / 2004.75 = 23136.4
# What if (23313.3457 * 1774.25 + 21683.74 * 230.5) / 2004.75 = 23125.9 -> 23126

# What if:
# Look at: 23125
# What if in Tableau, the number 23125 is calculated as:
# Let's test all pairs in Python:
for c in ichilov_pt.keys():
    v = ichilov_pt[c]
    if isinstance(v, (int, float)) and v > 0:
        val = (23313.345706 * 1774.25 + v * 230.5) / 2004.75
        if abs(val - 23125) < 30:
            print(f"Match with column {c} (val={v}): result={val:.2f} -> {round(val)}")
