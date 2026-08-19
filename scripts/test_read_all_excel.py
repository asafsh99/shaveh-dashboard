# -*- coding: utf-8 -*-
import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')

files = {
    'overview': 'data/נתוני סקירה כללית.xlsx',
    'partTime': 'data/נתוני חלקיות משרה.xlsx',
    'lowWage': 'data/נתוני שכר נמוך.xlsx',
    'minWage': 'data/נתוני מקבלי השלמה למינימום.xlsx'
}

for name, path in files.items():
    df = pd.read_excel(path, header=1)
    df.columns = [c.strip() for c in df.columns]
    print(f"\n=== {name} ({df.shape}) ===")
    print("Columns:", list(df.columns))
    print("Sample row:")
    print(df.iloc[0].to_dict())
