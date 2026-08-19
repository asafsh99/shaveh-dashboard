# -*- coding: utf-8 -*-
import pandas as pd
import glob, sys, os

sys.stdout.reconfigure(encoding='utf-8')

for f in glob.glob('data/*.csv'):
    print('==================================================')
    print('File:', f)
    # try utf-16le with tab separator, skipping 1st row if needed
    try:
        # Check raw lines
        with open(f, 'rb') as fp:
            sample = fp.read(1000)
            print('First 100 bytes:', sample[:100])
        
        # Read header
        df = pd.read_csv(f, sep='\t', encoding='utf-16le', skiprows=1)
        print('Shape:', df.shape)
        print('Columns:', df.columns.tolist())
        
        # Search for Airport Authority
        for col in df.columns:
            if df[col].dtype == object:
                m = df[df[col].astype(str).str.contains('שדות התעופה|תעופה', na=False)]
                if len(m) > 0:
                    print(f'Match in col "{col}" (count={len(m)}):')
                    print(m['שנה'].value_counts() if 'שנה' in m.columns else 'No year col')
                    # Print latest year or 2024
                    if 'שנה' in m.columns:
                        m_2024 = m[m['שנה'] == 2024]
                        if len(m_2024) > 0:
                            print('--- 2024 rows ---')
                            print(m_2024.to_dict(orient='records'))
                    else:
                        print(m.head(2).to_dict(orient='records'))
    except Exception as e:
        print('Error reading file:', e)
