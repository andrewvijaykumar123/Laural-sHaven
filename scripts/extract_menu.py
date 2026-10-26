from pathlib import Path
import re

try:
    import PyPDF2
except Exception as exc:
    raise SystemExit(f"PyPDF2 is required. Install with: py -3 -m pip install PyPDF2\n{exc}")

pdf_path = Path(r"c:\Users\sa59\PycharmProjects\Laural's Haven\Laural's Haven\Laural's Haven - Complete Cafe Menu.pdf")
if not pdf_path.exists():
    raise SystemExit(f"PDF not found: {pdf_path}")

reader = PyPDF2.PdfReader(str(pdf_path))
text = "\n".join(page.extract_text() or "" for page in reader.pages)
output_path = Path(__file__).resolve().parent.parent / "menu_extracted.txt"
output_path.write_text(text, encoding="utf-8")
print(f"Saved extracted menu to {output_path}")
