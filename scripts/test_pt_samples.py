import pandas as pd
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

pt_path = r"c:\Users\asafs\Documents\work\sahar_shavee\data\נתוני חלקיות משרה (1).csv"
df_pt = pd.read_csv(pt_path, sep='\t', encoding='utf-16le', skiprows=1)
df_pt.columns = [c.strip() for c in df_pt.columns]

df24 = df_pt[df_pt['שנה'] == 2024]

sample_bodies = [
    'מנהלת תקומה',
    'חברת נמל אשדוד',
    'בנק ישראל',
    'הדסה',
    'עיריית תל אביב- יפו',
    'משטרת ישראל',
    'משרד החינוך - מורים'
]

print("=== Part Time (Full-Time Official Table) for 2024 ===")
for b in sample_bodies:
    match = df24[df24['שם גוף'].astype(str).str.contains(b.replace('בע"מ','').strip())]
    if not match.empty:
        r = match.iloc[0]
        mc = r['כמות עובדים גברים במשרה מלאה']
        wc = r['כמות עובדים נשים במשרה מלאה']
        tc = r['כמות עובדים במשרה מלאה']
        mw = r['ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה']
        ww = r['ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה']
        tw = r['ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה']
        print(f"\n--- {r['שם גוף']} ---")
        print(f"  גברים: {mc} | נשים: {wc} | סה\"כ: {tc}")
        print(f"  שכר גברים: ₪{mw} | שכר נשים: ₪{ww} | שכר כללי: ₪{tw}")

