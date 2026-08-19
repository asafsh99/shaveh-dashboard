# -*- coding: utf-8 -*-
import pandas as pd
import numpy as np

# Let's test combinations of numbers in overview for airport:
# Ranks:
# 1. אחר: M_c = 28.416667, M_w = 13755.737487, W_c = 3.75
# 2. מפעלי: M_c = 3039.666667, M_w = 29559.726203, W_c = 1186.0, W_w = 22975.731459, Tot_w = 27828.660785
# 3. חוזים: M_c = 16.083333, M_w = 34600.088080, W_c = 10.666667, W_w = 22565.106178, Tot_w = 30047.973713

# Total Men in Overview = 3084.166667
# Total Women in Overview = 1200.416667
# Total Emp in Overview = 4284.583333

# What if:
# In Tableau, for this graph:
# Look at the numbers: 29,455 and 22,936 and 27,744
# Gap = (29455 - 22936) / 29455 = 6519 / 29455 = 22.132% -> 22.1%
# Notice: (29455 * 3084.167 + 22936 * 1200.417) / (3084.167 + 1200.417) = (90844140 + 27532764) / 4284.583 = 118376904 / 4284.583 = 27628
# What if weighted by: 3075 and 1194?
# (29455 * 3075 + 22936 * 1194) / (3075 + 1194) = (90574125 + 27385584) / 4269 = 117959709 / 4269 = 27631.7
# What about (29455 + 22936) / 2 = 26195.5
# What about: 27744 = (27828.66 * 4225.667 + 30047.97 * 26.75) / (4225.667 + 26.75 + 32.167 * (13755.74 / 27828.66))

# Let's check:
# 29455 is the weighted average men wage:
# If row 1 (אחר) men wage was 15,000 or different, or if:
# 29559.726 * 3039.667 + 34600.088 * 16.083 + 14681.456 * 28.4167 (Gross tax instead of regular!)
# Let's check with Gross Tax ('ממוצע ברוטו מס לגברים'):
# (29559.73 * 3039.667 + 34600.09 * 16.083 + 14681.46 * 28.4167) / 3084.167 = 29448.9
# What if:
# Look at 29,455:
# 29455 vs 29472 (diff of only 17 shekels!)
# 22936 vs 22952 (diff of only 16 shekels!)
# 27744 vs 27762 (diff of only 18 shekels!)
print("Differences between Image 1 (FT dataset) and Image 3 (Graph):")
print("Men:", 29472 - 29455, "= 17")
print("Women:", 22952 - 22936, "= 16")
print("Overall:", 27762 - 27744, "= 18")
