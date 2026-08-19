import pandas as pd
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

excel_path = r"c:\Users\asafs\Documents\work\sahar_shavee\data\נתוני סקירה כללית (3).xlsx"
df = pd.read_excel(excel_path, skiprows=1)
df.columns = [c.strip() for c in df.columns]

# Filter 2024
df24 = df[df['שנה'] == 2024]

sample_bodies = [
    'מנהלת תקומה',
    'חברת נמל אשדוד בע"מ',
    'חברת נמל אשדוד',
    'בנק ישראל',
    'הדסה',
    'עיריית תל אביב- יפו',
    'משטרת ישראל',
    'משטרה',
    'המרכז הרפואי ע"ש חיים שיבא - תל-השומר'
]

print("=== QA Check on Sample Bodies (2024) ===")
for b in sample_bodies:
    sub = df24[df24['שם גוף'].astype(str).str.contains(b.replace('בע"מ','').strip())]
    if sub.empty:
        continue
    body_name = sub['שם גוף'].iloc[0]
    total_men = sub['סך גברים עובדים'].sum()
    total_women = sub['סך נשים עובדות'].sum()
    total_hc = sub['מספר עובדים ממוצע לחודש'].sum()
    
    # Wage calculations
    # Filter rows with wage
    sub_wage = sub.dropna(subset=['שכר גברים ממוצע', 'שכר נשים ממוצע'], how='all')
    men_wage_sum = (sub['סך גברים עובדים'] * sub['שכר גברים ממוצע']).sum()
    men_wage_count = sub.dropna(subset=['שכר גברים ממוצע'])['סך גברים עובדים'].sum()
    avg_men_wage = men_wage_sum / men_wage_count if men_wage_count > 0 else 0
    
    women_wage_sum = (sub['סך נשים עובדות'] * sub['שכר נשים ממוצע']).sum()
    women_wage_count = sub.dropna(subset=['שכר נשים ממוצע'])['סך נשים עובדות'].sum()
    avg_women_wage = women_wage_sum / women_wage_count if women_wage_count > 0 else 0
    
    total_wage_sum = men_wage_sum + women_wage_sum
    total_wage_count = men_wage_count + women_wage_count
    avg_total_wage = total_wage_sum / total_wage_count if total_wage_count > 0 else 0
    
    gap = ((avg_men_wage - avg_women_wage) / avg_men_wage) * 100 if avg_men_wage > 0 else 0
    
    print(f"\n--- {body_name} ---")
    print(f"  גברים: {total_men:.2f} ({(total_men/total_hc)*100:.1f}%) | נשים: {total_women:.2f} ({(total_women/total_hc)*100:.1f}%) | סה\"כ: {total_hc:.2f}")
    print(f"  שכר גברים: ₪{avg_men_wage:,.0f} | שכר נשים: ₪{avg_women_wage:,.0f} | שכר כללי: ₪{avg_total_wage:,.0f}")
    print(f"  פער שכר: {gap:.2f}%")

