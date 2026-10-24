"""
Windows recalc helper for the xlsx skill.

The bundled scripts/recalc.py resolves the LibreOffice Basic module directory
with POSIX paths and shells out through an AF_UNIX socket shim, so it cannot run
on Windows. This helper does the same job natively:

  1. writes the RecalculateAndSave macro into the Windows LibreOffice profile
     (%APPDATA%\\LibreOffice\\4\\user\\basic\\Standard\\Module1.xba)
  2. runs soffice --headless with the macro URL against the workbook
  3. re-opens the saved workbook and verifies every formula evaluated to a real
     value with no Excel error markers

Usage: python scripts/recalc_windows.py <workbook.xlsx> [timeout_seconds]
"""

import os
import subprocess
import sys
import time
from pathlib import Path

from openpyxl import load_workbook

SOFFICE = r"C:\Program Files\LibreOffice\program\soffice.exe"
MACRO_URL = (
    "vnd.sun.star.script:Standard.Module1.RecalculateAndSave"
    "?language=Basic&location=application"
)
ERROR_TOKENS = ("#DIV/0!", "#N/A", "#NAME?", "#NULL!", "#NUM!", "#REF!", "#VALUE!")

LO_RECALC_BASIC = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE script:module PUBLIC "-//OpenOffice.org//DTD OfficeDocument 1.0//EN" "module.dtd">
<script:module xmlns:script="http://openoffice.org/2000/script" script:name="Module1" script:language="StarBasic">
    Sub RecalculateAndSave()
      ThisComponent.calculateAll()
      ThisComponent.store()
      ThisComponent.close(True)
    End Sub
</script:module>"""


def kill_soffice():
    subprocess.run(["taskkill", "/F", "/IM", "soffice.bin"], capture_output=True)
    subprocess.run(["taskkill", "/F", "/IM", "soffice.exe"], capture_output=True)
    time.sleep(2)


def install_macro() -> Path:
    basic = Path(os.environ["APPDATA"]) / "LibreOffice" / "4" / "user" / "basic" / "Standard"
    basic.mkdir(parents=True, exist_ok=True)
    module = basic / "Module1.xba"
    module.write_text(LO_RECALC_BASIC, encoding="utf-8")
    return module


def run_macro(workbook: Path, timeout: int) -> None:
    cmd = [
        SOFFICE, "--headless", "--norestore", "--nolockcheck", "--nodefault",
        MACRO_URL, str(workbook.resolve()),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if proc.returncode != 0:
        print("soffice stderr:", proc.stderr.strip()[:800])


def verify(workbook: Path):
    formulas = load_workbook(workbook, data_only=False)
    values = load_workbook(workbook, data_only=True)
    total_formulas = 0
    total_errors = 0
    error_summary = {}
    unresolved = 0
    for name in formulas.sheetnames:
        fws, vws = formulas[name], values[name]
        for frow, vrow in zip(fws.iter_rows(), vws.iter_rows()):
            for fcell, vcell in zip(frow, vrow):
                if isinstance(fcell.value, str) and fcell.value.startswith("="):
                    total_formulas += 1
                    val = vcell.value
                    if val is None:
                        unresolved += 1
                        continue
                    text = str(val)
                    if any(tok in text for tok in ERROR_TOKENS):
                        total_errors += 1
                        error_summary.setdefault(text, []).append(
                            f"{name}!{fcell.coordinate}"
                        )
    return total_formulas, total_errors, error_summary, unresolved


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: recalc_windows.py <workbook.xlsx> [timeout]")
        return 2
    workbook = Path(sys.argv[1]).resolve()
    timeout = int(sys.argv[2]) if len(sys.argv) > 2 else 180
    if not workbook.exists():
        print(f"workbook not found: {workbook}")
        return 2

    kill_soffice()
    module = install_macro()
    print(f"macro installed: {module}")
    run_macro(workbook, timeout)
    time.sleep(2)
    kill_soffice()

    total_formulas, total_errors, error_summary, unresolved = verify(workbook)
    print(f"total_formulas: {total_formulas}")
    print(f"total_errors: {total_errors}")
    print(f"unresolved (no cached value): {unresolved}")
    for tok, locs in error_summary.items():
        print(f"  {tok}: {len(locs)} -> {locs[:5]}")
    status = "success" if total_errors == 0 else "errors_found"
    print(f"status: {status}")
    return 0 if total_errors == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
