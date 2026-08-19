import pandas as pd
import numpy as np
import glob
import os
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=== REPRODUCING EXACT TABLEAU NUMBERS ===")
print("Targets:")
print("2024: Men=21632, Women=16051, Total=17833, Gap=25.8%")
print("2023: Men=20834, Women=15588, Total=17300, Gap=25.2%")
print("2022: Men=19513, Women=14336, Total=16042, Gap=26.5%")
print("2021: Men=19049, Women=13992, Total=15565, Gap=26.5%")
print("2020: Men=20705, Women=15632, Total=16912, Gap=24.5%")

# Let's inspect all files in data/
data_dir = r"c:\Users\asafs\Documents\work\sahar_shavee\data"

# Let's load overview and partTime
pt_path = os.path.join(data_dir, "נתוני חלקיות משרה (1).csv")
ov_path = os.path.join(data_dir, "נתוני סקירה כללית (3).csv")

df_pt = pd.read_csv(pt_path, sep='\t', encoding='utf-16le', skiprows=1)
df_pt.columns = [c.strip() for c in df_pt.columns]

df_ov = pd.read_csv(ov_path, sep='\t', encoding='utf-16le', skiprows=1)
df_ov.columns = [c.strip() for c in df_ov.columns]

# Let's inspect all column names of both files
print("\n--- PartTime columns ---")
print(df_pt.columns.tolist())

print("\n--- Overview columns ---")
print(df_ov.columns.tolist())

