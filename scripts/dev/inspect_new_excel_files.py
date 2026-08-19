# -*- coding: utf-8 -*-
import pandas as pd
import os, sys

sys.stdout.reconfigure(encoding='utf-8')

data_files = {
    'overview': 'data/נתוני סקירה כללית.xlsx',
    'partTime': 'data/נתוני חלקיות משרה.xlsx',
    'lowWage': 'data/נתוני שכר נמוך.xlsx',
    'minWage': 'data/נתוני מקבלי השלמה למינימום.xlsx'
}

for name, path in data_files.items():
    print(f"\n=================== {name}: {path} ===================")
    if not os.path.exists(path):
        print(f"File not found: {path}")
        continue
    xl = pd.ExcelFile(path)
    print(f"Sheets: {xl.sheet_names}")
    df = pd.read_excel(path, sheet_name=0)
    print(f"Shape: {df.shape}")
    print(f"Columns: {list(df.columns)}")
    print(f"First 2 rows:")
    print(df.head(2).to_dict(orient='records'))
