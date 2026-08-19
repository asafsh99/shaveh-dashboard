# -*- coding: utf-8 -*-
import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')

df = pd.read_excel('data/נתוני סקירה כללית.xlsx', header=1)
print("Columns for Overview:")
print(list(df.columns))
print(f"Shape: {df.shape}")
print("First row:")
print(df.iloc[0].to_dict())
