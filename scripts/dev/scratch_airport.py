# -*- coding: utf-8 -*-
import pandas as pd
import glob, sys, json

sys.stdout.reconfigure(encoding='utf-8')

for f in sorted(glob.glob('data/*.csv')):
    print('==================================================')
    print('FILE:', f)
    try:
        df = pd.read_csv(f, sep='\t', encoding='utf-16le', skiprows=1)
    except Exception as e:
        print('Error reading:', e)
        continue
    
    # Clean headers
    df.columns = [c.strip() for c in df.columns]
    
    # Filter for "רשות שדות תעופה"
    if 'שם גוף' in df.columns:
        sub = df[df['שם גוף'].astype(str).str.contains('שדות תעופה|שדות התעופה', na=False)]
        print(f'Found {len(sub)} rows.')
        for y, group in sub.groupby('שנה'):
            print(f'--- Year {y} ({len(group)} rows) ---')
            for col in group.columns:
                print(f'  {col}: {group[col].tolist()}')
