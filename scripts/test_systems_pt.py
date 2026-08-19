import pandas as pd
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

pt_path = r"c:\Users\asafs\Documents\work\sahar_shavee\data\נתוני חלקיות משרה (1).csv"
df_pt = pd.read_csv(pt_path, sep='\t', encoding='utf-16le', skiprows=1)
df_pt.columns = [c.strip() for c in df_pt.columns]

# Convert numeric
for col in ['כמות עובדים גברים במשרה מלאה', 'כמות עובדים נשים במשרה מלאה', 'כמות עובדים במשרה מלאה',
            'ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה', 'ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה', 'ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה']:
    df_pt[col] = df_pt[col].astype(str).str.replace(',', '').str.strip()
    df_pt[col] = pd.to_numeric(df_pt[col], errors='coerce')

df24 = df_pt[df_pt['שנה'] == 2024]

print("=== Systems Breakdown from partTime (2024) ===")
sys_grp = df24.groupby('מערכת').apply(lambda g: pd.Series({
    'menCount': round(g['כמות עובדים גברים במשרה מלאה'].sum()),
    'womenCount': round(g['כמות עובדים נשים במשרה מלאה'].sum()),
    'totalHC': round(g['כמות עובדים במשרה מלאה'].sum()),
    'menWage': round((g['ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה'] * g['כמות עובדים גברים במשרה מלאה']).sum() / g.dropna(subset=['ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה'])['כמות עובדים גברים במשרה מלאה'].sum()),
    'womenWage': round((g['ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה'] * g['כמות עובדים נשים במשרה מלאה']).sum() / g.dropna(subset=['ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה'])['כמות עובדים נשים במשרה מלאה'].sum()),
    'overallWage': round((g['ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה'] * g['כמות עובדים במשרה מלאה']).sum() / g.dropna(subset=['ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה'])['כמות עובדים במשרה מלאה'].sum()),
}))
print(sys_grp)

