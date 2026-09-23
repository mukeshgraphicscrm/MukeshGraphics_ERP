import openpyxl

def dump_table(file_path):
    wb = openpyxl.load_workbook(file_path, data_only=False)
    sheet = wb.active
    
    print("## Main Table (B21 to J41)")
    for row in range(21, 42):
        row_data = []
        for col in range(2, 11): # B to J
            cell = sheet.cell(row=row, column=col)
            val = cell.value if cell.value is not None else ""
            row_data.append(str(val))
        print(" | ".join(row_data))
        
    print("\n## Lid Size Table (L20 to X22)")
    for row in range(20, 24): # L20 to row 23
        row_data = []
        for col in range(12, 25): # L to X
            cell = sheet.cell(row=row, column=col)
            val = cell.value if cell.value is not None else ""
            row_data.append(str(val))
        print(" | ".join(row_data))

if __name__ == "__main__":
    dump_table("C:\\Internship DZ Infotech\\Mukesh Graphics Erp - Copy\\LID RATE.xlsx")
