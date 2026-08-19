import re

with open('scripts/data_bundle.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract the JSON array content using a streaming approach
# Find all year:2024 with bodyName nearby
bodies_2024 = set()

# Regex: bodyName appears before year in each record object
pattern = re.compile(r'\{"index":"[^"]+","source":"[^"]+","year":2024,"system":"[^"]*","subSystem":"[^"]*","bodyName":"([^"]+)"')
matches = pattern.findall(content)
for m in matches:
    bodies_2024.add(m)

print(f'גופים ייחודיים בשנת 2024: {len(bodies_2024)}')

# Also count total records for 2024
total_records = len(re.findall(r'"year":2024,', content))
print(f'סה"כ רשומות (דירוגים) בשנת 2024: {total_records}')
