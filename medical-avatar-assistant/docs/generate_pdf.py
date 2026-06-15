"""Generate PDF from submission markdown using Python markdown + Edge headless."""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

DOCS = Path(__file__).resolve().parent
MD_FILE = DOCS / "CURSOR_TECHTALK360_Project_Submission.md"
HTML_FILE = DOCS / "CURSOR_TECHTALK360_Project_Submission.html"
PDF_FILE = DOCS / "CURSOR_TECHTALK360_Project_Submission.pdf"
EDGE = Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>MediCare AI — Cursor × TechTalk360 Submission</title>
  <style>
    body {{ font-family: "Segoe UI", system-ui, sans-serif; font-size: 11pt; line-height: 1.55;
           color: #1a1a1a; max-width: 7.5in; margin: 0 auto; padding: 0.4in 0.5in; }}
    h1 {{ font-size: 22pt; color: #0d47a1; border-bottom: 2px solid #0d47a1; padding-bottom: 0.2em; }}
    h2 {{ font-size: 14pt; color: #1565c0; margin-top: 1.4em; }}
    h2.section-start {{
      page-break-before: always;
      break-before: page;
      margin-top: 0;
      padding-top: 0.15in;
    }}
    h3 {{ font-size: 12pt; color: #1976d2; page-break-after: avoid; break-after: avoid-page; }}
    table {{ width: 100%; border-collapse: collapse; font-size: 10pt; margin: 1em 0; }}
    th, td {{ border: 1px solid #bbb; padding: 6px 8px; text-align: left; }}
    th {{ background: #e3f2fd; }}
    code {{ background: #f0f0f0; padding: 1px 4px; font-size: 9pt; }}
    pre {{ background: #f5f5f5; padding: 12px; font-size: 9pt; overflow-x: auto; white-space: pre-wrap; }}
    hr {{ border: none; border-top: 1px solid #ccc; margin: 2em 0; }}
    @media print {{ body {{ padding: 0; }} }}
  </style>
</head>
<body>
{body}
</body>
</html>
"""


def main() -> int:
    try:
        import markdown
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "markdown", "-q"])
        import markdown

    md_text = MD_FILE.read_text(encoding="utf-8")
    body = markdown.markdown(
        md_text,
        extensions=["tables", "fenced_code", "nl2br", "sane_lists"],
    )
    # Main sections (01–12) and Appendix each start on a new printed page.
    body = re.sub(
        r"<h2>(\d{2} — |Appendix — )",
        r'<h2 class="section-start">\1',
        body,
    )
    HTML_FILE.write_text(HTML_TEMPLATE.format(body=body), encoding="utf-8")

    if not EDGE.is_file():
        print(f"Edge not found at {EDGE}", file=sys.stderr)
        return 1

    if PDF_FILE.exists():
        PDF_FILE.unlink()

    html_uri = HTML_FILE.as_uri()
    cmd = [
        str(EDGE),
        "--headless",
        "--disable-gpu",
        f"--print-to-pdf={PDF_FILE}",
        html_uri,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stderr or result.stdout, file=sys.stderr)
        return result.returncode

    if not PDF_FILE.is_file():
        print("PDF was not created.", file=sys.stderr)
        return 1

    print(f"Created: {PDF_FILE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
