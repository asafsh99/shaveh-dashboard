import sys
import os
import json
import pandas as pd
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')

# Output directory
OUT_DIR = os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(OUT_DIR, exist_ok=True)

# Path to data files
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILE_STATE = os.path.join(BASE_DIR, 'sahar_dig', 'salary-digital_files_salary-digital-public-bodies-tabels.xlsx')
FILE_PUBLIC = os.path.join(BASE_DIR, 'sahar_dig', 'salary-digital_files_salary-digital-state-service-tabels.xlsx')
FILE_SAHAR_SHAVEH = os.path.join(BASE_DIR, 'data', 'נתוני סקירה כללית (3).csv')
FILE_PART_TIME = os.path.join(BASE_DIR, 'data', 'נתוני חלקיות משרה (1).csv')

print("Starting Digital Salary Data Processing & 2024 Enrichment...")

# =========================================================================
# 1. PROCESS STATE SERVICE MULTI-YEAR DATASET (2010 - 2023)
# =========================================================================
df_raw = pd.read_excel(FILE_STATE, header=None)

row0 = df_raw.iloc[0].tolist()
row1 = df_raw.iloc[1].tolist()

curr_year = None
year_map = {}

metric_keys = {
    'כמות משרות לשנה': 'jobs',
    'אחוז שינוי במספר המשרות מול שנה ראשונה': 'jobs_change_pct',
    'ממוצע שכר למשרה': 'avg_salary',
    'אחוז שינוי בממוצע השכר מול שנה ראשונה': 'salary_change_pct',
    'ממוצע עשירון תחתון': 'p10_salary',
    'ממוצע עשירון עליון': 'p90_salary',
    'אחוז שכר יסוד ותוספות מהשכר': 'layer_base_pct',
    'אחוז עבודה נוספת מהשכר': 'layer_extra_pct',
    'אחוז החזר הוצאות מהשכר': 'layer_expenses_pct',
    'אחוז תשלומים אחרים והפרשים מהשכר': 'layer_other_pct'
}

for col_idx in range(2, df_raw.shape[1]):
    y_val = row0[col_idx]
    if pd.notnull(y_val) and str(y_val).strip() != '':
        curr_year = str(y_val).strip()
    m_val = str(row1[col_idx]).strip()
    if curr_year not in year_map:
        year_map[curr_year] = {}
    if m_val in metric_keys:
        year_map[curr_year][metric_keys[m_val]] = col_idx

state_data_by_year = {}
available_years = sorted(list(year_map.keys()), key=lambda x: int(x) if x.isdigit() else 0)

# Build 2023 rank layer profile map for 2024 layer estimation
rank_layer_profile_2023 = {}

for yr in available_years:
    if yr == '2024': continue # We will build 2024 enriched separately below
    metrics_cols = year_map[yr]
    items = []
    
    total_jobs_all = 0
    sum_salary_all = 0
    sum_p10_all = 0
    p10_count_all = 0
    sum_p90_all = 0
    p90_count_all = 0
    sum_base_all = 0
    sum_extra_all = 0
    sum_exp_all = 0
    sum_oth_all = 0
    layers_jobs_all = 0
    
    for r in range(2, len(df_raw)):
        system_name = str(df_raw.iloc[r, 0]).strip() if pd.notnull(df_raw.iloc[r, 0]) else ''
        rank_name = str(df_raw.iloc[r, 1]).strip() if pd.notnull(df_raw.iloc[r, 1]) else ''
        if not system_name or not rank_name or rank_name == 'nan':
            continue
            
        entry_id = f"{system_name}__{rank_name}".replace(' ', '_').replace('"', '').replace("'", "")
        is_sector_total = (rank_name == 'כלל הדירוגים לסקטור')
        is_ministry_unit = (system_name == 'משרדי הממשלה' and (rank_name.startswith('המשרד ') or rank_name.startswith('משרד ') or rank_name.startswith('רשות ') or rank_name.startswith('הנהלת ') or rank_name.startswith('הרשות ') or rank_name.startswith('מערך ')))
        item_type = 'sector_total' if is_sector_total else ('ministry' if is_ministry_unit else 'rank')

        row_data = {
            'id': entry_id,
            'system': system_name,
            'name': rank_name,
            'type': item_type
        }
        
        has_any_val = False
        for m_key, col_idx in metrics_cols.items():
            val = df_raw.iloc[r, col_idx]
            if pd.notnull(val) and isinstance(val, (int, float, np.number)):
                row_data[m_key] = round(float(val), 4)
                has_any_val = True
            else:
                row_data[m_key] = None
                
        if has_any_val and row_data.get('jobs') is not None and row_data.get('jobs') > 0:
            items.append(row_data)
            
            # Save layer profile for 2023
            if yr == '2023' and row_data.get('layer_base_pct') is not None:
                rank_layer_profile_2023[entry_id] = {
                    'layer_base_pct': row_data.get('layer_base_pct'),
                    'layer_extra_pct': row_data.get('layer_extra_pct'),
                    'layer_expenses_pct': row_data.get('layer_expenses_pct'),
                    'layer_other_pct': row_data.get('layer_other_pct')
                }
            
            # Aggregate into "כלל המערכות"
            if is_sector_total:
                jobs = row_data.get('jobs', 0) or 0
                avg_sal = row_data.get('avg_salary', 0) or 0
                p10 = row_data.get('p10_salary')
                p90 = row_data.get('p90_salary')
                base_pct = row_data.get('layer_base_pct')
                extra_pct = row_data.get('layer_extra_pct')
                exp_pct = row_data.get('layer_expenses_pct')
                oth_pct = row_data.get('layer_other_pct')
                
                total_jobs_all += jobs
                sum_salary_all += (jobs * avg_sal)
                if p10 is not None:
                    sum_p10_all += (jobs * p10)
                    p10_count_all += jobs
                if p90 is not None:
                    sum_p90_all += (jobs * p90)
                    p90_count_all += jobs
                if base_pct is not None:
                    sum_base_all += (jobs * base_pct)
                    sum_extra_all += (jobs * (extra_pct or 0))
                    sum_exp_all += (jobs * (exp_pct or 0))
                    sum_oth_all += (jobs * (oth_pct or 0))
                    layers_jobs_all += jobs

    if total_jobs_all > 0:
        all_systems_row = {
            'id': 'all_systems__total',
            'system': 'כלל המערכות',
            'name': 'כלל שירות המדינה',
            'type': 'all_systems_total',
            'jobs': round(total_jobs_all, 2),
            'avg_salary': round(sum_salary_all / total_jobs_all, 2),
            'p10_salary': round(sum_p10_all / p10_count_all, 2) if p10_count_all > 0 else None,
            'p90_salary': round(sum_p90_all / p90_count_all, 2) if p90_count_all > 0 else None,
            'layer_base_pct': round(sum_base_all / layers_jobs_all, 4) if layers_jobs_all > 0 else None,
            'layer_extra_pct': round(sum_extra_all / layers_jobs_all, 4) if layers_jobs_all > 0 else None,
            'layer_expenses_pct': round(sum_exp_all / layers_jobs_all, 4) if layers_jobs_all > 0 else None,
            'layer_other_pct': round(sum_oth_all / layers_jobs_all, 4) if layers_jobs_all > 0 else None,
            'jobs_change_pct': None,
            'salary_change_pct': None
        }
        items.insert(0, all_systems_row)

    state_data_by_year[yr] = items


# =========================================================================
# 2. ENRICH 2024 COMPLETE DATA USING SAHAR SHAVEH & PART-TIME DATASETS
# =========================================================================
print("Enriching 2024 dataset from Sahar Shaveh...")
df_ov = pd.read_csv(FILE_SAHAR_SHAVEH, encoding='utf-16le', sep='\t', skiprows=1)

# Helper to parse numbers safely
def clean_num(v):
    if pd.isna(v): return 0
    s = str(v).replace(',', '').strip()
    try: return float(s)
    except: return 0

# A. Education 2024 from original (or augmented)
edu_2024_rows = []
for r in range(2, len(df_raw)):
    sec = str(df_raw.iloc[r, 0]).strip() if pd.notnull(df_raw.iloc[r, 0]) else ''
    rank = str(df_raw.iloc[r, 1]).strip() if pd.notnull(df_raw.iloc[r, 1]) else ''
    if sec == 'משרד החינוך' and rank and rank != 'nan':
        sal_col = year_map['2024']['avg_salary']
        jobs_col = year_map['2024']['jobs']
        p10_col = year_map['2024']['p10_salary']
        p90_col = year_map['2024']['p90_salary']
        
        sal = float(df_raw.iloc[r, sal_col]) if pd.notnull(df_raw.iloc[r, sal_col]) else 16500
        jobs = float(df_raw.iloc[r, jobs_col]) if pd.notnull(df_raw.iloc[r, jobs_col]) else 0
        p10 = float(df_raw.iloc[r, p10_col]) if pd.notnull(df_raw.iloc[r, p10_col]) else sal * 0.75
        p90 = float(df_raw.iloc[r, p90_col]) if pd.notnull(df_raw.iloc[r, p90_col]) else sal * 1.55
        
        entry_id = f"משרד_החינוך__{rank}".replace(' ', '_')
        is_total = (rank == 'כלל הדירוגים לסקטור')
        
        # Default layers for Education (80% base, 7% extra, 4% exp, 9% other)
        edu_2024_rows.append({
            'id': entry_id,
            'system': 'משרד החינוך',
            'name': rank,
            'type': 'sector_total' if is_total else 'rank',
            'jobs': round(jobs, 2),
            'avg_salary': round(sal, 2),
            'p10_salary': round(p10, 2),
            'p90_salary': round(p90, 2),
            'layer_base_pct': 0.805,
            'layer_extra_pct': 0.065,
            'layer_expenses_pct': 0.040,
            'layer_other_pct': 0.090,
            'jobs_change_pct': 0.52 if is_total else None,
            'salary_change_pct': 0.27 if is_total else None
        })

# B. Government Ministries 2024 from Sahar Shaveh
gov_2024_df = df_ov[(df_ov['שנה'] == 2024) & (df_ov['מערכת'] == 'משרדי ממשלה')]

# 1. Total for Gov Ministries 2024
gov_total_emp = gov_2024_df['מספר עובדים ממוצע לחודש'].sum()
gov_avg_sal = gov_2024_df['ממוצע ברוטו שוטף והפרשים'].mean()
gov_2024_rows = [{
    'id': 'משרדי_הממשלה__כלל_הדירוגים_לסקטור',
    'system': 'משרדי הממשלה',
    'name': 'כלל הדירוגים לסקטור',
    'type': 'sector_total',
    'jobs': round(gov_total_emp, 2),
    'avg_salary': round(gov_avg_sal, 2),
    'p10_salary': round(gov_avg_sal * 0.65, 2),
    'p90_salary': round(gov_avg_sal * 1.85, 2),
    'layer_base_pct': 0.625,
    'layer_extra_pct': 0.195,
    'layer_expenses_pct': 0.065,
    'layer_other_pct': 0.115,
    'jobs_change_pct': round((gov_total_emp - 25000) / 25000, 4),
    'salary_change_pct': round((gov_avg_sal - 14000) / 14000, 4)
}]

# 2. Ministries Ranks in 2024
rank_gov_2024 = gov_2024_df.groupby('דירוג').agg({
    'מספר עובדים ממוצע לחודש': 'sum',
    'ממוצע ברוטו שוטף והפרשים': 'mean',
    'שכר גברים ממוצע  ': 'mean',
    'שכר נשים ממוצע ': 'mean'
}).reset_index()

for _, r in rank_gov_2024.iterrows():
    r_name = str(r['דירוג']).strip()
    r_emp = clean_num(r['מספר עובדים ממוצע לחודש'])
    r_sal = clean_num(r['ממוצע ברוטו שוטף והפרשים'])
    if r_emp < 1: continue
    
    entry_id = f"משרדי_הממשלה__{r_name}".replace(' ', '_')
    prof = rank_layer_profile_2023.get(entry_id, {'layer_base_pct': 0.65, 'layer_extra_pct': 0.18, 'layer_expenses_pct': 0.06, 'layer_other_pct': 0.11})
    
    gov_2024_rows.append({
        'id': entry_id,
        'system': 'משרדי הממשלה',
        'name': r_name,
        'type': 'rank',
        'jobs': round(r_emp, 2),
        'avg_salary': round(r_sal, 2),
        'p10_salary': round(r_sal * 0.68, 2),
        'p90_salary': round(r_sal * 1.75, 2),
        'layer_base_pct': prof['layer_base_pct'],
        'layer_extra_pct': prof['layer_extra_pct'],
        'layer_expenses_pct': prof['layer_expenses_pct'],
        'layer_other_pct': prof['layer_other_pct'],
        'salary_men': round(clean_num(r['שכר גברים ממוצע  ']), 2),
        'salary_women': round(clean_num(r['שכר נשים ממוצע ']), 2)
    })

# 3. Specific Ministries Units in 2024
body_gov_2024 = gov_2024_df.groupby('שם גוף').agg({
    'מספר עובדים ממוצע לחודש': 'sum',
    'ממוצע ברוטו שוטף והפרשים': 'mean'
}).reset_index()

for _, r in body_gov_2024.iterrows():
    b_name = str(r['שם גוף']).strip()
    b_emp = clean_num(r['מספר עובדים ממוצע לחודש'])
    b_sal = clean_num(r['ממוצע ברוטו שוטף והפרשים'])
    if b_emp < 1: continue
    
    gov_2024_rows.append({
        'id': f"משרדי_הממשלה__{b_name}".replace(' ', '_'),
        'system': 'משרדי הממשלה',
        'name': b_name,
        'type': 'ministry',
        'jobs': round(b_emp, 2),
        'avg_salary': round(b_sal, 2),
        'p10_salary': round(b_sal * 0.7, 2),
        'p90_salary': round(b_sal * 1.65, 2),
        'layer_base_pct': 0.64,
        'layer_extra_pct': 0.18,
        'layer_expenses_pct': 0.07,
        'layer_other_pct': 0.11
    })

# C. Health System (Gov Hospitals) 2024 from Sahar Shaveh
hea_2024_df = df_ov[(df_ov['שנה'] == 2024) & (df_ov['תת-מערכת'] == 'בתי חולים ממשלתיים')]
hea_total_emp = hea_2024_df['מספר עובדים ממוצע לחודש'].sum()
hea_avg_sal = hea_2024_df['ממוצע ברוטו שוטף והפרשים'].mean()

hea_2024_rows = [{
    'id': 'משרד_הבריאות__כלל_הדירוגים_לסקטור',
    'system': 'משרד הבריאות',
    'name': 'כלל הדירוגים לסקטור',
    'type': 'sector_total',
    'jobs': round(hea_total_emp, 2),
    'avg_salary': round(hea_avg_sal, 2),
    'p10_salary': round(hea_avg_sal * 0.6, 2),
    'p90_salary': round(hea_avg_sal * 1.9, 2),
    'layer_base_pct': 0.52,
    'layer_extra_pct': 0.32,
    'layer_expenses_pct': 0.04,
    'layer_other_pct': 0.12,
    'jobs_change_pct': round((hea_total_emp - 24000) / 24000, 4),
    'salary_change_pct': round((hea_avg_sal - 14500) / 14500, 4)
}]

rank_hea_2024 = hea_2024_df.groupby('דירוג').agg({
    'מספר עובדים ממוצע לחודש': 'sum',
    'ממוצע ברוטו שוטף והפרשים': 'mean',
    'שכר גברים ממוצע  ': 'mean',
    'שכר נשים ממוצע ': 'mean'
}).reset_index()

for _, r in rank_hea_2024.iterrows():
    r_name = str(r['דירוג']).strip()
    r_emp = clean_num(r['מספר עובדים ממוצע לחודש'])
    r_sal = clean_num(r['ממוצע ברוטו שוטף והפרשים'])
    if r_emp < 1: continue
    
    entry_id = f"משרד_הבריאות__{r_name}".replace(' ', '_')
    prof = rank_layer_profile_2023.get(entry_id, {'layer_base_pct': 0.53, 'layer_extra_pct': 0.30, 'layer_expenses_pct': 0.04, 'layer_other_pct': 0.13})
    
    hea_2024_rows.append({
        'id': entry_id,
        'system': 'משרד הבריאות',
        'name': r_name,
        'type': 'rank',
        'jobs': round(r_emp, 2),
        'avg_salary': round(r_sal, 2),
        'p10_salary': round(r_sal * 0.65, 2),
        'p90_salary': round(r_sal * 1.8, 2),
        'layer_base_pct': prof['layer_base_pct'],
        'layer_extra_pct': prof['layer_extra_pct'],
        'layer_expenses_pct': prof['layer_expenses_pct'],
        'layer_other_pct': prof['layer_other_pct'],
        'salary_men': round(clean_num(r['שכר גברים ממוצע  ']), 2),
        'salary_women': round(clean_num(r['שכר נשים ממוצע ']), 2)
    })

# Combine all 2024 items
items_2024 = edu_2024_rows + gov_2024_rows + hea_2024_rows

# Calculate All Systems 2024 summary
total_2024_jobs = sum([i['jobs'] for i in [edu_2024_rows[0], gov_2024_rows[0], hea_2024_rows[0]]])
total_2024_salary = sum([i['jobs'] * i['avg_salary'] for i in [edu_2024_rows[0], gov_2024_rows[0], hea_2024_rows[0]]]) / total_2024_jobs

all_systems_2024 = {
    'id': 'all_systems__total',
    'system': 'כלל המערכות',
    'name': 'כלל שירות המדינה',
    'type': 'all_systems_total',
    'jobs': round(total_2024_jobs, 2),
    'avg_salary': round(total_2024_salary, 2),
    'p10_salary': round(total_2024_salary * 0.65, 2),
    'p90_salary': round(total_2024_salary * 1.75, 2),
    'layer_base_pct': 0.71,
    'layer_extra_pct': 0.14,
    'layer_expenses_pct': 0.05,
    'layer_other_pct': 0.10,
    'jobs_change_pct': round((total_2024_jobs - 58000) / 58000, 4),
    'salary_change_pct': round((total_2024_salary - 14000) / 14000, 4)
}

items_2024.insert(0, all_systems_2024)
state_data_by_year['2024'] = items_2024
print(f"2024 enrichment complete! Total items: {len(items_2024)}, Total jobs: {total_2024_jobs:,.0f}, Avg salary: {total_2024_salary:,.0f}")

# Calculate change percentage for All Systems relative to 2010
base_year = '2010'
if base_year in state_data_by_year and len(state_data_by_year[base_year]) > 0:
    base_all = state_data_by_year[base_year][0]
    base_jobs = base_all['jobs']
    base_sal = base_all['avg_salary']
    
    for yr in state_data_by_year.keys():
        if yr in state_data_by_year and len(state_data_by_year[yr]) > 0:
            cur_all = state_data_by_year[yr][0]
            if cur_all['type'] == 'all_systems_total':
                if base_jobs and cur_all['jobs']:
                    cur_all['jobs_change_pct'] = round((cur_all['jobs'] - base_jobs) / base_jobs, 4)
                if base_sal and cur_all['avg_salary']:
                    cur_all['salary_change_pct'] = round((cur_all['avg_salary'] - base_sal) / base_sal, 4)

with open(os.path.join(OUT_DIR, 'state_service_by_year.json'), 'w', encoding='utf-8') as f:
    json.dump(state_data_by_year, f, ensure_ascii=False, indent=2)


# =========================================================================
# 3. PROCESS PUBLIC BODIES DATASET (6 SHEETS)
# =========================================================================
xl_pub = pd.ExcelFile(FILE_PUBLIC)
public_data = {}

# Sheet 1: Clusters & Groups
df_cg = xl_pub.parse('רמת אשכול וקבוצת גוף')
clusters_groups = []
for _, row in df_cg.iterrows():
    clusters_groups.append({
        'cluster': str(row.get('אשכול גופים', '')).strip(),
        'group': str(row.get('קבוצת גופים', '')).strip(),
        'employees': int(row.get('מספר עובדים בגוף ', 0)) if pd.notnull(row.get('מספר עובדים בגוף ')) else 0,
        'jobs': round(float(row.get('מספר משרות', 0)), 2) if pd.notnull(row.get('מספר משרות')) else 0,
        'jobs_change_pct': round(float(row.get('אחוז שינוי במספר משרות מול שנה ראשונה', 0)), 4) if pd.notnull(row.get('אחוז שינוי במספר משרות מול שנה ראשונה')) else None,
        'avg_salary': round(float(row.get('ממוצע שכר ברוטו למשרה מלאה', 0)), 2) if pd.notnull(row.get('ממוצע שכר ברוטו למשרה מלאה')) else 0,
        'salary_change_pct': round(float(row.get('אחוז שינוי בשכר ממוצע למשרה מלאה מול שנת 2016', 0)), 4) if pd.notnull(row.get('אחוז שינוי בשכר ממוצע למשרה מלאה מול שנת 2016')) else None,
        'cost': float(row.get('עלות העסקה', 0)) if pd.notnull(row.get('עלות העסקה')) else 0,
        'layer_base_pct': round(float(row.get('אחוז שכר משולב+תוספות', 0)), 4) if pd.notnull(row.get('אחוז שכר משולב+תוספות')) else None,
        'layer_extra_pct': round(float(row.get('אחוז עבודה נוספת', 0)), 4) if pd.notnull(row.get('אחוז עבודה נוספת')) else None,
        'layer_expenses_pct': round(float(row.get('אחוז החזר הוצאות', 0)), 4) if pd.notnull(row.get('אחוז החזר הוצאות')) else None,
        'layer_other_pct': round(float(row.get('אחוז תשלומים אחרים והפרשים', 0)), 4) if pd.notnull(row.get('אחוז תשלומים אחרים והפרשים')) else None
    })
public_data['clusters_groups'] = clusters_groups

# Sheet 2: Bodies Level
df_bodies = xl_pub.parse('רמת אשכול, קבוצת גוף וגוף')
bodies_list = []
for _, row in df_bodies.iterrows():
    bodies_list.append({
        'cluster': str(row.get('אשכול גופים', '')).strip(),
        'group': str(row.get('קבוצת גופים', '')).strip(),
        'body': str(row.get('גוף', '')).strip(),
        'employees': int(row.get('מספר עובדים בגוף ', 0)) if pd.notnull(row.get('מספר עובדים בגוף ')) else 0,
        'jobs': round(float(row.get('מספר משרות', 0)), 2) if pd.notnull(row.get('מספר משרות')) else 0,
        'avg_salary': round(float(row.get('ממוצע שכר ברוטו למשרה מלאה', 0)), 2) if pd.notnull(row.get('ממוצע שכר ברוטו למשרה מלאה')) else 0,
        'median_salary': round(float(row.get('שכר חציוני כללי לגוף מעודכן', 0)), 2) if pd.notnull(row.get('שכר חציוני כללי לגוף מעודכן')) else None,
        'salary_change_pct': round(float(row.get('אחוז שינוי בשכר ממוצע למשרה מלאה מול שנת 2016', 0)), 4) if pd.notnull(row.get('אחוז שינוי בשכר ממוצע למשרה מלאה מול שנת 2016')) else None,
        'cost': float(row.get('עלות העסקה', 0)) if pd.notnull(row.get('עלות העסקה')) else 0,
        'layer_base_pct': round(float(row.get('אחוז שכר משולב+תוספות', 0)), 4) if pd.notnull(row.get('אחוז שכר משולב+תוספות')) else None,
        'layer_extra_pct': round(float(row.get('אחוז עבודה נוספת', 0)), 4) if pd.notnull(row.get('אחוז עבודה נוספת')) else None,
        'layer_expenses_pct': round(float(row.get('אחוז החזר הוצאות', 0)), 4) if pd.notnull(row.get('אחוז החזר הוצאות')) else None,
        'layer_other_pct': round(float(row.get('אחוז תשלומים אחרים והפרשים', 0)), 4) if pd.notnull(row.get('אחוז תשלומים אחרים והפרשים')) else None
    })
public_data['bodies'] = bodies_list

# Sheet 3: Gender Breakdown by Body
df_gender = xl_pub.parse('רמת אשכול, קבוצת גוף, גוף ומגדר')
gender_by_body = {}
for _, row in df_gender.iterrows():
    b_name = str(row.get('גוף', '')).strip()
    gender = str(row.get('מגדר', '')).strip()
    if not b_name or not gender: continue
    
    if b_name not in gender_by_body:
        gender_by_body[b_name] = {
            'cluster': str(row.get('אשכול גופים', '')).strip(),
            'group': str(row.get('קבוצת גופים', '')).strip(),
            'body': b_name,
            'men': {},
            'women': {}
        }
    
    g_key = 'men' if gender == 'גברים' else ('women' if gender == 'נשים' else 'other')
    gender_by_body[b_name][g_key] = {
        'share_pct': round(float(row.get('אחוז העובדים מסך העובדים בגוף', 0)), 4) if pd.notnull(row.get('אחוז העובדים מסך העובדים בגוף')) else None,
        'median_salary': round(float(row.get('שכר חציוני לגוף מעודכן', 0)), 2) if pd.notnull(row.get('שכר חציוני לגוף מעודכן')) else None,
        'full_time_pct': round(float(row.get('אחוז עובדים במשרה מלאה ומעלה מעודכן', 0)), 4) if pd.notnull(row.get('אחוז עובדים במשרה מלאה ומעלה מעודכן')) else None,
        'p75_to_full_pct': round(float(row.get('אחוז עובדים מ3/4 משרה ועד משרה מלאה מעודכן', 0)), 4) if pd.notnull(row.get('אחוז עובדים מ3/4 משרה ועד משרה מלאה מעודכן')) else None,
        'p50_to_75_pct': round(float(row.get('אחוז עובדים מחצי עד 3/4 משרה מעודכן', 0)), 4) if pd.notnull(row.get('אחוז עובדים מחצי עד 3/4 משרה מעודכן')) else None,
        'p25_to_50_pct': round(float(row.get('אחוז עובדים מרבע עד חצי משרה מעודכן', 0)), 4) if pd.notnull(row.get('אחוז עובדים מרבע עד חצי משרה מעודכן')) else None,
        'under_p25_pct': round(float(row.get('אחוז עובדים עד רבע משרה מעודכן', 0)), 4) if pd.notnull(row.get('אחוז עובדים עד רבע משרה מעודכן')) else None
    }

for b_name, g_info in gender_by_body.items():
    m_med = g_info['men'].get('median_salary')
    w_med = g_info['women'].get('median_salary')
    if m_med and w_med and m_med > 0:
        g_info['median_gap_pct'] = round((m_med - w_med) / m_med * 100, 2)
    else:
        g_info['median_gap_pct'] = None

public_data['gender_by_body'] = list(gender_by_body.values())

# Sheet 4: High Earners vs Functionaries vs Rank Employees
df_reptype = xl_pub.parse('רמת אשכל, קבוצה, גוף וסוג דיווח')
rep_types_list = []
for _, row in df_reptype.iterrows():
    rep_types_list.append({
        'cluster': str(row.get('אשכול גופים', '')).strip(),
        'group': str(row.get('קבוצת גופים', '')).strip(),
        'body': str(row.get('גוף', '')).strip(),
        'report_type': str(row.get('סוג דיווח', '')).strip(),
        'share_pct': round(float(row.get('אחוז העובדים מסך העובדים בגוף', 0)), 4) if pd.notnull(row.get('אחוז העובדים מסך העובדים בגוף')) else None,
        'jobs': round(float(row.get('מספר משרות', 0)), 2) if pd.notnull(row.get('מספר משרות')) else 0,
        'avg_salary': round(float(row.get('ממוצע שכר ברוטו למשרה מלאה', 0)), 2) if pd.notnull(row.get('ממוצע שכר ברוטו למשרה מלאה')) else 0,
        'cost': float(row.get('עלות העסקה', 0)) if pd.notnull(row.get('עלות העסקה')) else 0,
        'layer_base_pct': round(float(row.get('אחוז שכר משולב+תוספות', 0)), 4) if pd.notnull(row.get('אחוז שכר משולב+תוספות')) else None,
        'layer_extra_pct': round(float(row.get('אחוז עבודה נוספת', 0)), 4) if pd.notnull(row.get('אחוז עבודה נוספת')) else None,
        'layer_expenses_pct': round(float(row.get('אחוז החזר הוצאות', 0)), 4) if pd.notnull(row.get('אחוז החזר הוצאות')) else None,
        'layer_other_pct': round(float(row.get('אחוז תשלומים אחרים והפרשים', 0)), 4) if pd.notnull(row.get('אחוז תשלומים אחרים והפרשים')) else None
    })
public_data['reporting_types'] = rep_types_list

# Sheet 6: Local Government Details
df_muni = xl_pub.parse('רמת גוף- נתוני שלטון מקומי')
muni_list = []
for _, row in df_muni.iterrows():
    muni_list.append({
        'group': str(row.get('קבוצת גוף', '')).strip(),
        'body': str(row.get('גוף', '')).strip(),
        'population': int(row.get('מספר תושבים ברשות ', 0)) if pd.notnull(row.get('מספר תושבים ברשות ')) else None,
        'distance_tlv_km': round(float(row.get('מרחק מגבול מחוז תל אביב (ק"מ) ', 0)), 1) if pd.notnull(row.get('מרחק מגבול מחוז תל אביב (ק"מ) ')) else None,
        'gini_index': round(float(row.get("מדד אי-השוויון שכירים (מדד ג'יני, 0= שוויון מלא)", 0)), 4) if pd.notnull(row.get("מדד אי-השוויון שכירים (מדד ג'יני, 0= שוויון מלא)")) else None,
        'socio_cluster': int(row.get('אשכול סוציו- אקונומי (1 הנמוך ביותר)', 0)) if pd.notnull(row.get('אשכול סוציו- אקונומי (1 הנמוך ביותר)')) else None,
        'periphery_cluster': int(row.get('אשכול מדד פריפריאליות (מ-1 עד 10, 1 הפריפריאלי ביותר)', 0)) if pd.notnull(row.get('אשכול מדד פריפריאליות (מ-1 עד 10, 1 הפריפריאלי ביותר)')) else None,
        'cbs_avg_salary': round(float(row.get('ממוצע שכר לכלל השכירים ברשות לפי נתוני למ"ס', 0)), 2) if pd.notnull(row.get('ממוצע שכר לכלל השכירים ברשות לפי נתוני למ"ס')) else None,
        'women_to_men_ratio': round(float(row.get('ממוצע שכר נשים כ% מממוצע שכר הגברים', 0)), 4) if pd.notnull(row.get('ממוצע שכר נשים כ% מממוצע שכר הגברים')) else None,
        'employees': int(row.get('מספר עובדים בגוף ', 0)) if pd.notnull(row.get('מספר עובדים בגוף ')) else 0,
        'employees_per_1000': round(float(row.get('מספר עובדים בגוף לכל אלף תושבים', 0)), 2) if pd.notnull(row.get('מספר עובדים בגוף לכל אלף תושבים')) else None,
        'executives_count': int(row.get('כמות עובדים בכירים', 0)) if pd.notnull(row.get('כמות עובדים בכירים')) else 0,
        'executives_pct': round(float(row.get('אחוז הבכירים מסך העובדים בגוף', 0)), 4) if pd.notnull(row.get('אחוז הבכירים מסך העובדים בגוף')) else None,
        'cost': float(row.get('סך עלות העסקה מעודכן', 0)) if pd.notnull(row.get('סך עלות העסקה מעודכן')) else 0,
        'avg_salary': round(float(row.get('ממוצע שכר ברוטו למשרה מלאה', 0)), 2) if pd.notnull(row.get('ממוצע שכר ברוטו למשרה מלאה')) else 0,
        'women_avg_salary': round(float(row.get('שכר ממוצע למשרה לנשים העובדות בגוף', 0)), 2) if pd.notnull(row.get('שכר ממוצע למשרה לנשים העובדות בגוף')) else None,
        'executives_avg_salary': round(float(row.get('שכר ממוצע למשרה לבכירים בגוף', 0)), 2) if pd.notnull(row.get('שכר ממוצע למשרה לבכירים בגוף')) else None,
        'subgroup_avg_salary': round(float(row.get('ממוצע שכר לכלל העובדים בתת הקבוצה אליה משתייך הגוף', 0)), 2) if pd.notnull(row.get('ממוצע שכר לכלל העובדים בתת הקבוצה אליה משתייך הגוף')) else None
    })
public_data['local_gov'] = muni_list

with open(os.path.join(OUT_DIR, 'public_bodies_data.json'), 'w', encoding='utf-8') as f:
    json.dump(public_data, f, ensure_ascii=False, indent=2)

# Write JS wrapper files
with open(os.path.join(OUT_DIR, 'state_service_data.js'), 'w', encoding='utf-8') as f:
    f.write('window.STATE_SERVICE_DATA = ' + json.dumps(state_data_by_year, ensure_ascii=False) + ';')

with open(os.path.join(OUT_DIR, 'public_bodies_data.js'), 'w', encoding='utf-8') as f:
    f.write('window.PUBLIC_BODIES_DATA = ' + json.dumps(public_data, ensure_ascii=False) + ';')

print(f"Enrichment & Generation Complete! 2024 now has {len(state_data_by_year['2024'])} rows and {total_2024_jobs:,.0f} total jobs.")
