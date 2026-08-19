import pandas as pd
import numpy as np
import os
import glob
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

data_dir = r"c:\Users\asafs\Documents\work\sahar_shavee\data"

print("Searching for exact numbers across all files:")
targets = [21632, 16051, 17833, 20834, 15588, 17300, 19513, 14336, 16042, 19049, 13992, 15565, 20705, 15632, 16912]

for fpath in glob.glob(os.path.join(data_dir, "*")):
    fname = os.path.basename(fpath)
    if fname.endswith('.xlsx'):
        df = pd.read_excel(fpath)
    elif fname.endswith('.csv'):
        try:
            df = pd.read_csv(fpath, sep='\t', encoding='utf-16le', skiprows=1)
        except:
            df = pd.read_csv(fpath, encoding='utf-8', skiprows=1)
    else:
        continue
        
    df.columns = [str(c).strip() for c in df.columns]
    
    # Check each column
    for col in df.columns:
        # Convert to string and search
        col_str = df[col].astype(str)
        for t in targets:
            matches = df[col_str.str.contains(str(t))]
            if not matches.empty:
                print(f"File '{fname}' | Col '{col}' | Matched target {t}: {len(matches)} rows")
                print(matches.iloc[:3, :8])

