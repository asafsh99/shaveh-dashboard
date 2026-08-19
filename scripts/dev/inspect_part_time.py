import pandas as pd
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"c:\Users\asafs\Documents\work\sahar_shavee\data\נתוני חלקיות משרה (1).csv"
df = pd.read_csv(path, sep='\t', encoding='utf-16le', skiprows=1)
df.columns = [c.strip() for c in df.columns]
print("Columns in חלקיות משרה:")
for i, col in enumerate(df.columns):
    print(f"{i}: '{col}'")

sub = df[df['שנה'] == 2024]
print("\nSample bodies in חלקיות משרה (2024):")
sample_bodies = ['מנהלת תקומה', 'חברת נמל אשדוד בע"מ', 'בנק ישראל', 'הדסה', 'עיריית תל אביב- יפו', 'משטרת ישראל']
for b in sample_bodies:
    match = sub[sub['שם גוף'].astype(str).str.contains(b.replace('בע"מ','').strip())]
    if not match.empty:
        r = match.iloc[0]
        print(f"\n--- {r['שם גוף']} ---")
        print(f"  משרה חלקית: גברים={r['כמות עובדים גברים בחלקיות משרה']}, נשים={r['כמות עובדים נשים בחלקיות משרה']}, סה\"כ={r['כמות עובדים בחלקיות משרה']}")
        print(f"  משרה מלאה:  גברים={r['כמות עובדים גברים במשרה מלאה']}, נשים={r['כמות עובדים נשים במשרה מלאה']}, סה\"כ={r['כמות עובדים במשרה מלאה']}")
        print(f"  שכר משרה מלאה: גברים=₪{r['ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה']}, נשים=₪{r['ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה']}, כללי=₪{r['ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה']}")

