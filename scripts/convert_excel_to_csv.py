import pandas as pd
import openpyxl

excel_path = r"c:\Users\asafs\Documents\work\sahar_shavee\data\נתוני סקירה כללית (3).xlsx"
csv_path = r"c:\Users\asafs\Documents\work\sahar_shavee\data\נתוני סקירה כללית (3).csv"

# Load workbook to read exactly as is
wb = openpyxl.load_workbook(excel_path, data_only=True)
ws = wb.active

with open(csv_path, 'w', encoding='utf-16le', newline='') as f:
    for row in ws.iter_rows(values_only=True):
        # Convert each cell to string, None -> empty string
        row_str = ['' if cell is None else str(cell) for cell in row]
        f.write('\t'.join(row_str) + '\r\n')

print(f"Successfully converted {excel_path} to {csv_path}")

