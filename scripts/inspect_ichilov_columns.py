# -*- coding: utf-8 -*-
import pandas as pd, sys

sys.stdout.reconfigure(encoding='utf-8')

df_ov = pd.read_excel('data/נתוני סקירה כללית.xlsx', header=1)
df_ov.columns = [c.strip() for c in df_ov.columns]

ichilov = df_ov[(df_ov['שם גוף'] == 'איכילוב') & (df_ov['שנה'] == 2024)]
print("Ichilov 2024 overview columns and values:")
for col in ichilov.columns:
    print(f"  {col}: {ichilov[col].tolist()}")
