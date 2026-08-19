# -*- coding: utf-8 -*-
import pandas as pd
import numpy as np

# Let's test with the rounded counts:
# Rank 1: אחר: mc=28, mw=13755.737487, wc=4, ww=0, tc=32, tw=13755.737487 * 28 / 32
# Rank 2: מפעלי: mc=3040, mw=29559.726203, wc=1186, ww=22975.731459, tc=4226, tw=27828.660785
# Rank 3: חוזים: mc=16, mw=34600.088080, wc=11, ww=22565.106178, tc=27, tw=30047.973713

# Test 1:
m_sum = 28 * 13755.737487 + 3040 * 29559.726203 + 16 * 34600.088080
w_sum = 1186 * 22975.731459 + 11 * 22565.106178
t_sum = 4226 * 27828.660785 + 27 * 30047.973713 + 28 * 13755.737487

print("Men with rounded counts:", m_sum / 3084)
print("Women with rounded counts:", w_sum / 1197)
print("Total with rounded counts:", t_sum / 4285)

# What if:
# Look at 29455, 22936, 27744:
# If Men = 29455, Women = 22936:
# Gap = (29455 - 22936) / 29455 = 22.132% -> 22.1%
# If Total = 27744:
# Notice: (29455 * 3084 + 22936 * 1201) / 4285 = (90839220 + 27546136) / 4285 = 118385356 / 4285 = 27627.85
# But the midline in Tableau is 27,744!
# Where does 27,744 come from?
# 27,744 is: (27828.660785 * 4225.666667 + 30047.973713 * 26.75) / (4225.666667 + 26.75) = 27842.61
# What if 27,744 = 27762 - 18?
# What if 29455 = 29472 - 17?
# What if 22936 = 22952 - 16?
# Notice: 29472 is the Full-Time men wage, 22952 is the Full-Time women wage, 27762 is the Full-Time total wage!
# In Tableau's line chart (Trends/Maccabi/Airport graph):
# When drawing the points:
# In Tableau: 29455, 22936, 27744!
