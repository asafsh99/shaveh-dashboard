import pandas as pd
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ov_path = r"c:\Users\asafs\Documents\work\sahar_shavee\data\נתוני סקירה כללית (3).csv"
df_ov = pd.read_csv(ov_path, sep='\t', encoding='utf-16le', skiprows=1)
df_ov.columns = [c.strip() for c in df_ov.columns]

for c in ['סך גברים עובדים', 'סך נשים עובדות', 'מספר עובדים ממוצע לחודש']:
    df_ov[c] = pd.to_numeric(df_ov[c].astype(str).str.replace(',', '').str.strip(), errors='coerce')

for yr in [2020, 2021, 2022, 2023, 2024]:
    sub = df_ov[df_ov['שנה'] == yr]
    m = sub['סך גברים עובדים'].sum()
    w = sub['סך נשים עובדות'].sum()
    tot = m + w
    ws = (w / tot) * 100 if tot > 0 else 0
    print(f"Year {yr}: Men={m:,.0f} | Women={w:,.0f} | Total={tot:,.0f} | WomenShare={ws:.1f}%")

