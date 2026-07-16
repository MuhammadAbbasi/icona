import win32com.client
import os
import sys

def convert(xls_path, xlsx_path):
    abs_xls = os.path.abspath(xls_path)
    abs_xlsx = os.path.abspath(xlsx_path)
    
    excel = win32com.client.Dispatch('Excel.Application')
    excel.Visible = False
    excel.DisplayAlerts = False
    try:
        wb = excel.Workbooks.Open(abs_xls)
        # FileFormat=51 is for xlOpenXMLWorkbook (.xlsx)
        wb.SaveAs(abs_xlsx, FileFormat=51)
        wb.Close()
    finally:
        excel.Quit()

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python convert_xls.py <input_xls_path> <output_xlsx_path>", file=sys.stderr)
        sys.exit(1)
    convert(sys.argv[1], sys.argv[2])
