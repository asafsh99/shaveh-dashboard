# -*- coding: utf-8 -*-
import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Let's inspect the math
print("Overview sum & weighted averages for רשות שדות תעופה 2024:")

# Row 1: אחר - 28.4167 men, 3.75 women -> total 32.1667. Men wage: 13755.74, Women wage: nan (suppressed).
# Row 2: מפעלי - 3039.67 men, 1186 women -> total 4225.67. Men wage: 29559.73, Women wage: 22975.73, Overall: 27828.66.
# Row 3: חוזים אישיים - 16.0833 men, 10.6667 women -> total 26.75. Men wage: 34600.09, Women wage: 22565.11, Overall: 30047.97.

# Let's check total wage in Overview if we do sum(overall_wage * total_emp) / sum(total_emp)
# Or sum(men_wage * men + women_wage * women) / total:
total_men = 28.416667 + 3039.666667 + 16.083333
total_women = 3.75 + 1186.0 + 10.666667
total_emp = total_men + total_women

print(f"Total Men (Overview): {total_men:.2f} -> round: {round(total_men)}")
print(f"Total Women (Overview): {total_women:.2f} -> round: {round(total_women)}")
print(f"Total Emp (Overview): {total_emp:.2f} -> round: {round(total_emp)}")

# If we calculate weighted wage across rows that have data:
# Row 2 (מפעלי) * 4225.6667 + Row 3 (חוזים אישיים) * 26.75 + Row 1 (אחר - only men 13755.74 * 28.4167 + ?)
# If we do total sum of wages:
# Let's see:
w_men = (28.416667 * 13755.737487 + 3039.666667 * 29559.726203 + 16.083333 * 34600.08808) / total_men
w_women = (1186.0 * 22975.731459 + 10.666667 * 22565.106178) / (1186.0 + 10.666667)
overall_wage_all = (28.416667 * 13755.737487 + 3039.666667 * 29559.726203 + 16.083333 * 34600.08808 + 1186.0 * 22975.731459 + 10.666667 * 22565.106178) / (total_men + 1186.0 + 10.666667)
print(f"Weighted Men Wage (Overview): {w_men:.2f}")
print(f"Weighted Women Wage (Overview): {w_women:.2f}")
print(f"Weighted Overall Wage (Overview): {overall_wage_all:.2f}")

# What if we compute overall wage using (total_men * w_men + total_women * w_women) / (total_men + total_women)?
overall_2 = (total_men * w_men + (1186.0 + 10.666667) * w_women) / total_emp
print(f"Overall 2: {overall_2:.2f}")

# What about Part Time file:
# Full time:
# ftMenCount = 3075, ftWomenCount = 1194, ftMenWage = 29472, ftWomenWage = 22952, ftTotalWage = 27762
# Part time:
# ptMenCount = 9, ptWomenCount = 7, ptMenWage = 14969, ptWomenWage = 16551, ptTotalWage = 15655
# All employees in Part Time file (Full + Part time combined):
all_pt_men = 3075 + 9 # 3084
all_pt_women = 1194 + 7 # 1201
all_pt_men_wage = (3075 * 29472 + 9 * 14969) / 3084
all_pt_women_wage = (1194 * 22952 + 7 * 16551) / 1201
all_pt_total_wage = (3075 * 29472 + 9 * 14969 + 1194 * 22952 + 7 * 16551) / (3084 + 1201)

print(f"Part-time file (FT+PT combined) Men Wage: {all_pt_men_wage:.2f}")
print(f"Part-time file (FT+PT combined) Women Wage: {all_pt_women_wage:.2f}")
print(f"Part-time file (FT+PT combined) Total Wage: {all_pt_total_wage:.2f}")
