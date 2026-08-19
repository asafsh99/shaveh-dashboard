# -*- coding: utf-8 -*-
import pandas as pd
import numpy as np

# Let's test all possible values for women:
# FT Women Count = 467
# FT Women Wage = 32079
# PT Women Count = 7 (or 8)
# Target Women Wage = 32055

# Let's solve what wage X for PT women yields 32055:
# (32079 * 467 + X * 7) / (467 + 7) = 32055
# => 32055 * 474 - 32079 * 467 = 15194070 - 14980893 = 213177 / 7 = 30453.86
# What if PT Women count is 8 (since 475 - 467 = 8!):
# (32055 * 475 - 32079 * 467) / 8 = (15226125 - 14980893) / 8 = 245232 / 8 = 30654.0 !
# What if:
# Look at Rank ארעיים:
# ארעיים Women wage = 12221.57, ארעיים Men wage = 15122.46
# Rank מפעלי: Women wage = 37934.07, Men wage = 40981.86
# Rank חוזים: Women wage = 56594.87, Men wage = 61568.32
# What if:
# In Bank of Israel, Overview has 3 ranks:
# ארעיים: 177.25 men, 143.0 women
# מפעלי: 390.83 men, 326.08 women
# חוזים: 10.0 men, 5.0 women
# Total: Men = 578.08 (578), Women = 474.08 (in Tableau: 475)

# How does Tableau calculate 32055 for Women?
# Let's check if 32055 is in any column or derived:
# Let's test:
# What if Women wage is:
# (37934.0723 * 326.0833 + 56594.8667 * 5.0 + 12221.5675 * 143.0) / 474.0833 = 30375.10
# What if ארעיים is calculated differently?
# What if: (32079 * 467 + 13381 * 7) / 474 = (14980893 + 93667) / 474 = 15074560 / 474 = 31802.87
# What if: 32055 / 32079 = 0.99925
# What if: (32079 * 1026 - 36414 * 559) / 467 ...
# What if: Target Total Wage = 34361
# (36348 * 578 + 32055 * 475) / (578 + 475) = (21009144 + 15226125) / 1053 = 36235269 / 1053 = 34411.46
# Look at Target Total Wage: 34361:
# (36348 * 578 + 32055 * 474) / (578 + 474) = (21009144 + 15194070) / 1052 = 36203214 / 1052 = 34413.7
# What if 34361 = (34406 * 1026 + 15450 * 26) / 1052 = (35300556 + 401700) / 1052 = 35702256 / 1052 = 33937.5
# What if (34406 * 1026 + 32042 * 26) / 1052 = 34347.5

print("Target numbers:")
print("Men: 578 -> 36348")
print("Women: 475 -> 32055")
print("Total: 1053 -> 34361")
print("Gap: (36348 - 32055) / 36348 =", (36348 - 32055) / 36348 * 100)
