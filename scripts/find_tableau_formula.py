import pandas as pd
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

excel_path = r"c:\Users\asafs\Documents\work\sahar_shavee\data\נתוני סקירה כללית (3).xlsx"
df = pd.read_excel(excel_path, skiprows=1)
df.columns = [c.strip() for c in df.columns]

tekuma = df[df['שם גוף'].astype(str).str.contains('תקומה')]
print("=== Tekuma All Columns ===")
for idx, r in tekuma.iterrows():
    print(dict(r))

print("\nLet's test combinations to reach:")
print("Target Men Wage: 32389")
print("Target Women Wage: 28672")
print("Target Overall Wage: 29833")

# Let's test combinations across years or columns:
# Notice tekuma has 2023 (rows 6695, 6696) and 2024 (rows 7926-7934)!
# Or maybe gross tax? Or employer cost? Or simple average? Or all years combined? Or dividing by total headcount instead of valid headcount?
# Let's test!

tekuma_2024 = tekuma[tekuma['שנה'] == 2024]
tekuma_all = tekuma

print("\n--- Test 1: Simple average of wage columns in 2024 ---")
print("Men:", tekuma_2024['שכר גברים ממוצע'].mean())
print("Women:", tekuma_2024['שכר נשים ממוצע'].mean())
print("Overall:", tekuma_2024['ממוצע ברוטו שוטף והפרשים'].mean())

print("\n--- Test 2: Sum of (Wage * Count) / Total Count (including rows with NaN wage) ---")
men_wage_sum = (tekuma_2024['סך גברים עובדים'] * tekuma_2024['שכר גברים ממוצע']).dropna().sum()
total_men_count = tekuma_2024['סך גברים עובדים'].sum()
print("Men (sum(w*c)/total_count):", men_wage_sum / total_men_count)

women_wage_sum = (tekuma_2024['סך נשים עובדות'] * tekuma_2024['שכר נשים ממוצע']).dropna().sum()
total_women_count = tekuma_2024['סך נשים עובדות'].sum()
print("Women (sum(w*c)/total_count):", women_wage_sum / total_women_count)

print("Overall ((men_sum+women_sum)/(total_men+total_women)):", (men_wage_sum + women_wage_sum) / (total_men_count + total_women_count))

print("\n--- Test 3: What about other wage columns? (e.g. ברוטו מס, עלות העסקה) ---")
for col_men, col_women, col_tot in [
    ('ממוצע ברוטו מס לגברים', 'ממוצע ברוטו מס לנשים', 'ממוצע ברוטו למס'),
    ('ממוצע עלות העסקה לגברים', 'ממוצע עלות העסקה לנשים', 'ממוצע עלות העסקה')
]:
    mw_s = (tekuma_2024['סך גברים עובדים'] * tekuma_2024[col_men]).dropna().sum()
    mw_c = tekuma_2024.dropna(subset=[col_men])['סך גברים עובדים'].sum()
    ww_s = (tekuma_2024['סך נשים עובדות'] * tekuma_2024[col_women]).dropna().sum()
    ww_c = tekuma_2024.dropna(subset=[col_women])['סך נשים עובדות'].sum()
    print(f"{col_men}: {mw_s/mw_c:.2f} | {col_women}: {ww_s/ww_c:.2f} | Overall: {(mw_s+ww_s)/(mw_c+ww_c):.2f}")
    print(f"  Divided by total hc: Men: {mw_s/total_men_count:.2f} | Women: {ww_s/total_women_count:.2f} | Overall: {(mw_s+ww_s)/(total_men_count+total_women_count):.2f}")

print("\n--- Test 4: What if 2023 and 2024 are combined? (All years selected) ---")
# If all years (2018-2024 or 2023-2024) are selected without year filter:
mw_all_s = (tekuma['סך גברים עובדים'] * tekuma['שכר גברים ממוצע']).dropna().sum()
mw_all_c = tekuma.dropna(subset=['שכר גברים ממוצע'])['סך גברים עובדים'].sum()
ww_all_s = (tekuma['סך נשים עובדות'] * tekuma['שכר נשים ממוצע']).dropna().sum()
ww_all_c = tekuma.dropna(subset=['שכר נשים ממוצע'])['סך נשים עובדות'].sum()
tot_men_all = tekuma['סך גברים עובדים'].sum()
tot_women_all = tekuma['סך נשים עובדות'].sum()
print("All years valid count weighted: Men:", mw_all_s / mw_all_c, "Women:", ww_all_s / ww_all_c, "Overall:", (mw_all_s + ww_all_s) / (mw_all_c + ww_all_c))
print("All years total count weighted: Men:", mw_all_s / tot_men_all, "Women:", ww_all_s / tot_women_all, "Overall:", (mw_all_s + ww_all_s) / (tot_men_all + tot_women_all))

print("\n--- Test 5: What if using 'ממוצע ברוטו למס' combined across years? ---")
for col_men, col_women, col_tot in [
    ('ממוצע ברוטו מס לגברים', 'ממוצע ברוטו מס לנשים', 'ממוצע ברוטו למס'),
]:
    mw_s = (tekuma['סך גברים עובדים'] * tekuma[col_men]).dropna().sum()
    mw_c = tekuma.dropna(subset=[col_men])['סך גברים עובדים'].sum()
    ww_s = (tekuma['סך נשים עובדות'] * tekuma[col_women]).dropna().sum()
    ww_c = tekuma.dropna(subset=[col_women])['סך נשים עובדות'].sum()
    print(f"All years {col_men}: {mw_s/mw_c:.2f} | {col_women}: {ww_s/ww_c:.2f} | Overall: {(mw_s+ww_s)/(mw_c+ww_c):.2f}")
    print(f"All years {col_men} (div total): {mw_s/tot_men_all:.2f} | {ww_s/tot_women_all:.2f} | Overall: {(mw_s+ww_s)/(tot_men_all+tot_women_all):.2f}")

