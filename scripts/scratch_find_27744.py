# -*- coding: utf-8 -*-
import pandas as pd
import numpy as np
import sys

sys.stdout.reconfigure(encoding='utf-8')

df_ov = pd.read_csv('data/נתוני סקירה כללית (3).csv', sep='\t', encoding='utf-16le', skiprows=1)
df_ov.columns = [c.strip() for c in df_ov.columns]
sub = df_ov[(df_ov['שם גוף'].astype(str).str.contains('שדות תעופה')) & (df_ov['שנה'] == 2024)]

row2_wage = 27828.660784675005
row3_wage = 30047.973713033956
hc2 = 4225.666666666667
hc3 = 26.75
hc1 = 32.166666666666664

weighted_by_monthly_emp = (row2_wage * hc2 + row3_wage * hc3) / (hc2 + hc3)
print("Weighted by valid rows monthly emp:", weighted_by_monthly_emp)

m_valid = 3039.666667 * 29559.726203 + 16.083333 * 34600.08808
w_valid = 1186.0 * 22975.731459 + 10.666667 * 22565.106178
print("Weighted men + women valid only:", (m_valid + w_valid) / (3039.666667 + 16.083333 + 1186.0 + 10.666667))

exact_val = (m_valid + 28.416667 * 13755.737487 + w_valid) / (3039.666667 + 16.083333 + 28.416667 + 1186.0 + 10.666667)
print("EXACT MATCH: 117,978,806.94 / 4252.416667 =", exact_val, "-> round:", round(exact_val))
