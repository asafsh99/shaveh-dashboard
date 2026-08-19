import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

csv_path = r"c:\Users\asafs\Documents\work\sahar_shavee\data\נתוני סקירה כללית (3).csv"

with open(csv_path, 'r', encoding='utf-16le') as f:
    lines = [f.readline() for _ in range(10)]

print("Line 0 (Metadata):", lines[0].strip().split('\t'))
print("Line 1 (Headers):", lines[1].strip().split('\t'))
for i in range(2, 6):
    print(f"Line {i}:", lines[i].strip().split('\t')[:10])

