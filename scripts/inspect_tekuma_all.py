import pandas as pd
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

for fname in ['נתוני חלקיות משרה (1).csv', 'נתוני שכר נמוך (1).csv', 'נתוני מקבלי השלמה למינימום (2).csv']:
    path = rf"c:\Users\asafs\Documents\work\sahar_shavee\data\{fname}"
    df = pd.read_csv(path, sep='\t', encoding='utf-16le', skiprows=1)
    df.columns = [c.strip() for c in df.columns]
    sub = df[df['שם גוף'].astype(str).str.contains('תקומה')]
    print(f"\n================ {fname} ================")
    print("Columns:", df.columns.tolist())
    print(sub.to_string())

