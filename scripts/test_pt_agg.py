import pandas as pd
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

pt_path = r"c:\Users\asafs\Documents\work\sahar_shavee\data\נתוני חלקיות משרה (1).csv"
df_pt = pd.read_csv(pt_path, sep='\t', encoding='utf-16le', skiprows=1)
df_pt.columns = [c.strip() for c in df_pt.columns]

# Check 2024
df24 = df_pt[df_pt['שנה'] == 2024]
print("Shape 2024 in partTime:", df24.shape)

# Let's inspect Tekuma
tek = df24[df24['שם גוף'].astype(str).str.contains('תקומה')]
print("\nTekuma 2024 in partTime:")
print(tek[['שנה', 'מערכת', 'שם גוף', 'כמות עובדים גברים במשרה מלאה', 'כמות עובדים נשים במשרה מלאה', 'כמות עובדים במשרה מלאה', 'ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה', 'ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה', 'ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה']])

# Let's check all bodies
print("\nTop 10 bodies by FT employees in 2024:")
print(df24.sort_values(by='כמות עובדים במשרה מלאה', ascending=False)[['שם גוף', 'כמות עובדים במשרה מלאה', 'ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה']].head(10))

