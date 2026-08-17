"""
Automated Data Integrity & Sanity Verification Suite
Runs automated sanity checks, boundary invariants, and benchmark assertions
across all datasets to prevent regressions and catch mapping/calculation errors.
"""

import os
import glob
import pandas as pd
import numpy as np
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def run_suite():
    data_dir = r"c:\Users\asafs\Documents\work\sahar_shavee\data"
    print("=" * 70)
    print("🔍 RUNNING AUTOMATED DATA INTEGRITY & SANITY TEST SUITE")
    print("=" * 70)

    # 1. Check file existence
    expected_files = [
        "נתוני סקירה כללית (3).csv",
        "נתוני חלקיות משרה (1).csv",
        "נתוני שכר נמוך (1).csv",
        "נתוני מקבלי השלמה למינימום (2).csv"
    ]
    
    all_passed = True
    
    for f in expected_files:
        full_path = os.path.join(data_dir, f)
        if not os.path.exists(full_path):
            print(f"❌ FAIL: Missing required file: {f}")
            all_passed = False
        else:
            size_mb = os.path.getsize(full_path) / (1024 * 1024)
            print(f"✅ PASS: Found {f} ({size_mb:.2f} MB)")

    # 2. Test PartTime (Body & System level source of truth)
    pt_path = os.path.join(data_dir, "נתוני חלקיות משרה (1).csv")
    df_pt = pd.read_csv(pt_path, sep='\t', encoding='utf-16le', skiprows=1)
    df_pt.columns = [c.strip() for c in df_pt.columns]
    
    # Check crucial column existence
    crucial_pt_cols = [
        'שנה', 'מערכת', 'שם גוף',
        'כמות עובדים גברים במשרה מלאה', 'כמות עובדים נשים במשרה מלאה', 'כמות עובדים במשרה מלאה',
        'ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה', 'ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה', 'ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה'
    ]
    
    for col in crucial_pt_cols:
        if col not in df_pt.columns:
            print(f"❌ FAIL: Missing column '{col}' in PartTime dataset")
            all_passed = False
        else:
            print(f"✅ PASS: Column verified: '{col}'")

    # Clean numeric
    for col in crucial_pt_cols[3:]:
        df_pt[col] = df_pt[col].astype(str).str.replace(',', '').str.strip()
        df_pt[col] = pd.to_numeric(df_pt[col], errors='coerce')

    # Invariant Check 1: Men/Women Counts are NOT percentages (must not be all <= 1)
    max_men_count = df_pt['כמות עובדים גברים במשרה מלאה'].max()
    max_women_count = df_pt['כמות עובדים נשים במשרה מלאה'].max()
    if max_men_count < 100 or max_women_count < 100:
        print(f"❌ FAIL: Employee counts appear to be percentages! (max_men={max_men_count}, max_women={max_women_count})")
        all_passed = False
    else:
        print(f"✅ PASS: Count Invariant verified (Max Men: {max_men_count:,}, Max Women: {max_women_count:,})")

    # Invariant Check 2: Overall Wage must be strictly between Min(Men, Women) and Max(Men, Women)
    valid_wage_rows = df_pt.dropna(subset=[
        'ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה',
        'ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה',
        'ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה'
    ])
    
    bad_overall_wages = 0
    for _, r in valid_wage_rows.iterrows():
        mw = r['ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה']
        ww = r['ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה']
        ow = r['ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה']
        # Allow tiny rounding delta of 5 ILS
        if ow < min(mw, ww) - 5 or ow > max(mw, ww) + 5:
            bad_overall_wages += 1
            
    if bad_overall_wages > 0:
        print(f"❌ FAIL: Found {bad_overall_wages} rows where overall wage is outside [min(men,women), max(men,women)]")
        all_passed = False
    else:
        print(f"✅ PASS: Mathematical Boundary Invariant verified on {len(valid_wage_rows)} bodies")

    # Invariant Check 3: Benchmark Assertions on Gold-Standard Bodies (2024)
    df24 = df_pt[df_pt['שנה'] == 2024]
    
    benchmarks = {
        'מנהלת תקומה': {'men': 15, 'women': 34, 'total': 49, 'men_wage': 32389, 'women_wage': 28672, 'overall_wage': 29833},
        'חברת נמל אשדוד': {'men': 1008, 'women': 147, 'total': 1155, 'men_wage': 36967, 'women_wage': 23706, 'overall_wage': 35275},
        'בנק ישראל': {'men': 559, 'women': 467, 'total': 1026, 'men_wage': 36414, 'women_wage': 32079, 'overall_wage': 34406},
    }
    
    for body_name, exp in benchmarks.items():
        match = df24[df24['שם גוף'].astype(str).str.contains(body_name)]
        if match.empty:
            print(f"❌ FAIL: Gold-standard body '{body_name}' not found!")
            all_passed = False
            continue
        r = match.iloc[0]
        mc = round(r['כמות עובדים גברים במשרה מלאה'])
        wc = round(r['כמות עובדים נשים במשרה מלאה'])
        tc = round(r['כמות עובדים במשרה מלאה'])
        mw = round(r['ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה'])
        ww = round(r['ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה'])
        ow = round(r['ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה'])
        
        c_ok = (mc == exp['men'] and wc == exp['women'] and tc == exp['total'])
        w_ok = (mw == exp['men_wage'] and ww == exp['women_wage'] and ow == exp['overall_wage'])
        
        if c_ok and w_ok:
            print(f"✅ PASS: Benchmark verified for '{body_name}': Men={mc} (₪{mw:,}), Women={wc} (₪{ww:,}), Overall=₪{ow:,}")
        else:
            print(f"❌ FAIL: Benchmark mismatch for '{body_name}'!")
            print(f"   Expected: {exp}")
            print(f"   Got: men={mc}, women={wc}, total={tc}, men_wage={mw}, women_wage={ww}, overall_wage={ow}")
            all_passed = False

    print("=" * 70)
    if all_passed:
        print("🎉 ALL TESTS PASSED! Dataset integrity and calculations are 100% verified.")
    else:
        print("⚠️ SOME TESTS FAILED! Please inspect data mappings before deploying.")
    print("=" * 70)

if __name__ == '__main__':
    run_suite()
