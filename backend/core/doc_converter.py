"""Convert legacy .doc files to .docx using Windows COM automation."""

import os
import tempfile
from pathlib import Path


def doc_to_docx(doc_path: str | Path) -> Path | None:
    """Convert a .doc file to .docx using comtypes (requires MS Word installed).

    Returns the path to the converted .docx file, or None if conversion fails.
    The caller is responsible for deleting the temporary file.
    """
    doc_path = Path(doc_path).resolve()
    if not doc_path.exists():
        return None

    tmp_dir = Path(tempfile.gettempdir())
    out_path = tmp_dir / f"markitdown_{doc_path.stem}.docx"

    try:
        import comtypes.client

        word = comtypes.client.CreateObject("Word.Application")
        word.Visible = False

        try:
            doc = word.Documents.Open(str(doc_path))
            doc.SaveAs2(str(out_path), FileFormat=16)  # 16 = wdFormatXMLDocument
            doc.Close()
        finally:
            word.Quit()

        if out_path.exists():
            return out_path
        return None

    except ImportError:
        return _try_python_docx_fallback(doc_path, out_path)
    except Exception:
        return None


def _try_python_docx_fallback(doc_path: Path, out_path: Path) -> Path | None:
    """Fallback: try to open .doc with python-docx (works for some files)."""
    try:
        from docx import Document
        doc = Document(str(doc_path))
        doc.save(str(out_path))
        if out_path.exists():
            return out_path
    except Exception:
        pass
    return None


def cleanup_temp_docx(path: Path | None):
    """Delete temporary .docx file created by doc_to_docx."""
    if path and path.exists():
        try:
            path.unlink()
        except OSError:
            pass
