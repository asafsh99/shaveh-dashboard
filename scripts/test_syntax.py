# -*- coding: utf-8 -*-
import sys, re

files_to_check = [
    'index.html',
    'scripts/app.js',
    'scripts/parser.js',
    'scripts/validator.js',
    'scripts/insights.js',
    'scripts/tabs/overview.js',
    'scripts/tabs/ranks.js',
    'scripts/tabs/quality.js',
    'scripts/tabs/trends.js',
    'scripts/tabs/directory.js'
]

for f in files_to_check:
    try:
        with open(f, 'r', encoding='utf-8') as fp:
            content = fp.read()
            print(f"[OK] {f} - {len(content)} chars")
    except Exception as e:
        print(f"[ERROR] {f}: {e}")
