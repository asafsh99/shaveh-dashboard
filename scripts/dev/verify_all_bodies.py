import pandas as pd
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

pt_path = r"c:\Users\asafs\Documents\work\sahar_shavee\data\נתוני חלקיות משרה (1).csv"
df_pt = pd.read_csv(pt_path, sep='\t', encoding='utf-16le', skiprows=1)
df_pt.columns = [c.strip() for c in df_pt.columns]

# Numeric clean
for col in ['כמות עובדים גברים במשרה מלאה', 'כמות עובדים נשים במשרה מלאה', 'כמות עובדים במשרה מלאה',
            'ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה', 'ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה', 'ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה']:
    df_pt[col] = df_pt[col].astype(str).str.replace(',', '').str.strip()
    df_pt[col] = pd.to_numeric(df_pt[col], errors='coerce')

df24 = df_pt[df_pt['שנה'] == 2024]

# Select a representative set of 25 bodies across all systems
sample_bodies = [
    # חברות ממשלתיות
    'חברת נמל אשדוד',
    'חברת נמלי ישראל פיתוח ונכסים בע"מ',
    'חברת החשמל לישראל בע"מ',
    'רפאל - מערכות לחימה מתקדמות בע"מ',
    'דואר ישראל בע"מ',
    # משרדי ממשלה
    'מנהלת תקומה',
    'מערך הדיגיטל הלאומי',
    'משרד המשפטים',
    'משרד ראש הממשלה',
    # תאגידים
    'בנק ישראל',
    'מפעל הפיס',
    'נגה - ניהול מערכת החשמל בע"מ',
    'רשות ניירות ערך',
    'המוסד לביטוח לאומי',
    # בריאות
    'המרכז הרפואי יוספטל',
    'הדסה',
    'מרכז רפואי שיבא',
    'שירותי בריאות כללית',
    # שלטון מקומי
    'עיריית תל אביב- יפו',
    'עיריית ירושלים',
    'עיריית חיפה',
    'עיריית באר שבע',
    # חינוך והשכלה גבוהה
    'האוניברסיטה העברית',
    'אוניברסיטת תל אביב',
    'הטכניון - מכון טכנולוגי לישראל'
]

print(f"{'שם גוף':<32} | {'סה\"כ עובדים':<11} | {'גברים (שכר)':<20} | {'נשים (שכר)':<20} | {'שכר כללי':<10} | {'פער שכר':<8}")
print("-" * 115)

for b in sample_bodies:
    match = df24[df24['שם גוף'].astype(str).str.contains(b.replace('בע"מ','').strip())]
    if match.empty:
        continue
    r = match.iloc[0]
    mc = round(r['כמות עובדים גברים במשרה מלאה']) if pd.notnull(r['כמות עובדים גברים במשרה מלאה']) else 0
    wc = round(r['כמות עובדים נשים במשרה מלאה']) if pd.notnull(r['כמות עובדים נשים במשרה מלאה']) else 0
    tc = round(r['כמות עובדים במשרה מלאה']) if pd.notnull(r['כמות עובדים במשרה מלאה']) else (mc + wc)
    mw = round(r['ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה']) if pd.notnull(r['ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה']) else None
    ww = round(r['ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה']) if pd.notnull(r['ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה']) else None
    ow = round(r['ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה']) if pd.notnull(r['ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה']) else None
    
    gap = f"{((mw - ww) / mw * 100):.1f}%" if (mw and ww and mw > 0) else "—"
    mw_str = f"₪{mw:,}" if mw else "—"
    ww_str = f"₪{ww:,}" if ww else "—"
    ow_str = f"₪{ow:,}" if ow else "—"
    
    men_info = f"{mc:,} ({mw_str})"
    women_info = f"{wc:,} ({ww_str})"
    
    name = r['שם גוף'][:30]
    print(f"{name:<32} | {tc:<11,} | {men_info:<20} | {women_info:<20} | {ow_str:<10} | {gap:<8}")

