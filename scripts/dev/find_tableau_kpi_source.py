import pandas as pd
import numpy as np
import os
import glob
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

data_dir = r"c:\Users\asafs\Documents\work\sahar_shavee\data"

print("Searching for exact matches for:")
print("2024: Men=21632, Women=16051, Overall=17833")
print("2023: Men=20834, Women=15588, Overall=17300")
print("2022: Men=19513, Women=14336, Overall=16042")
print("2021: Men=19049, Women=13992, Overall=15565")
print("2020: Men=20705, Women=15632, Overall=16912")

# Check all CSV files in data directory
for fpath in glob.glob(os.path.join(data_dir, "*.csv")):
    fname = os.path.basename(fpath)
    print(f"\n================ Checking {fname} ================")
    try:
        df = pd.read_csv(fpath, sep='\t', encoding='utf-16le', skiprows=1)
    except:
        df = pd.read_csv(fpath, encoding='utf-8', skiprows=1)
    
    df.columns = [c.strip() for c in df.columns]
    
    # Check if 'שנה' in columns
    if 'שנה' not in df.columns:
        continue
    
    # Let's inspect sources ('מקור התוכן')
    if 'מקור התוכן' in df.columns:
        print("Data sources in file:", df['מקור התוכן'].unique().tolist())
    
    # For each source and each numeric column combination
    sources = df['מקור התוכן'].unique().tolist() if 'מקור התוכן' in df.columns else [None]
    
    # Let's test filtering by source!
    for src in sources:
        df_sub = df[df['מקור התוכן'] == src] if src else df
        
        # Test all wage columns in df_sub
        numeric_cols = [c for c in df_sub.columns if any(w in c for w in ['שכר', 'ברוטו', 'ממוצע', 'עובד', 'גברים', 'נשים'])]
        
        # Check year 2024
        d24 = df_sub[df_sub['שנה'] == 2024]
        if d24.empty:
            continue
            
        # Let's test weighted averages and simple means of numeric columns
        for c in numeric_cols:
            vals = pd.to_numeric(d24[c].astype(str).str.replace(',', '').str.strip(), errors='coerce').dropna()
            if vals.empty:
                continue
            mean_val = vals.mean()
            if abs(mean_val - 21632) < 50 or abs(mean_val - 16051) < 50 or abs(mean_val - 17833) < 50:
                print(f"  MATCH MEAN: [{src}] Col '{c}' -> Mean={mean_val:.2f}")

