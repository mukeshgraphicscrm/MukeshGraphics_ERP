import openpyxl
import json
import sys

def extract_excel_info(file_path):
    try:
        wb = openpyxl.load_workbook(file_path, data_only=False)
        sheet = wb.active
        
        cells_info = []
        for row in sheet.iter_rows():
            for cell in row:
                if cell.value is not None:
                    # Ignore empty cells to reduce output size
                    cells_info.append({
                        "coordinate": cell.coordinate,
                        "value": str(cell.value),
                        "row": cell.row,
                        "column": cell.column_letter
                    })
                    
        # Output as JSON
        print(json.dumps(cells_info, indent=2))
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)

if __name__ == "__main__":
    extract_excel_info("C:\\Internship DZ Infotech\\Mukesh Graphics Erp - Copy\\LID RATE.xlsx")
