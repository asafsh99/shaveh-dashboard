import pandas as pd
import glob
import os
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("Searching across all Excel / CSV files...")

data_dir = r"c:\Users\asafs\Documents\work\sahar_shavee\data"
for f in glob.glob(os.path.join(data_dir, "*")):
    if f.endswith('.xlsx'):
        df = pd.read_excel(f)
    elif f.endswith('.csv'):
        try:
            df = pd.read_csv(f, sep='\t', encoding='utf-16le')
        except:
            try:
                df = pd.read_csv(f, encoding='utf-8')
            except:
                continue
    else:
        continue
    
    print(f"\n--- Checking file: {os.path.basename(f)} (shape={df.shape}) ---")
    match_tekuma = df[df.apply(lambda row: row.astype(str).str.contains('תקומה').any(), axis=1)]
    if not match_tekuma.empty:
        print(f"Found 'תקומה' in {os.path.basename(f)}: {len(match_tekuma)} rows")
        print(match_tekuma)

