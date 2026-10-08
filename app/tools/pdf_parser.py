import logging
import os
import re
from pypdf import PdfReader
from pypdf.errors import PdfReadError

logger = logging.getLogger(__name__)


class ResumeParseError(Exception):
    """Raised when resume extraction fails or file is invalid/empty."""
    pass


def _clean_extracted_text(text: str) -> str:
    """Normalize extracted text whitespace while preserving structural linebreaks."""
    if not text:
        return ""
    # Normalize unicode spaces/control chars
    text = re.sub(r"[\r\t\v\f]", " ", text)
    # Collapse 3+ newlines to 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Collapse multiple horizontal spaces
    text = re.sub(r"[ ]{2,}", " ", text)
    return text.strip()


def extract_text_from_pdf(file_path: str) -> str:
    """Extract clean text from a PDF file."""
    if not os.path.exists(file_path):
        raise ResumeParseError(f"File not found: {file_path}")

    try:
        reader = PdfReader(file_path)
    except PdfReadError as e:
        raise ResumeParseError(f"Corrupted or unreadable PDF: {e}") from e
    except Exception as e:
        raise ResumeParseError(f"Failed to open PDF file: {e}") from e

    if reader.is_encrypted:
        try:
            reader.decrypt("")
        except Exception as e:
            raise ResumeParseError("PDF is password-protected.") from e

    extracted_pages = []
    for idx, page in enumerate(reader.pages):
        try:
            page_text = page.extract_text()
        except Exception as e:
            logger.warning("Failed to extract page %d: %s", idx, e)
            page_text = None
        if page_text and page_text.strip():
            extracted_pages.append(page_text.strip())

    full_text = "\n\n".join(extracted_pages)
    cleaned = _clean_extracted_text(full_text)
    if not cleaned:
        raise ResumeParseError(
            "Could not extract any readable text from the PDF. "
            "It appears to be empty or a scanned image with no text layer."
        )
    return cleaned


def extract_text_from_docx(file_path: str) -> str:
    """Extract text from a DOCX file including paragraphs and tables."""
    if not os.path.exists(file_path):
        raise ResumeParseError(f"File not found: {file_path}")

    try:
        import docx
    except ImportError as e:
        raise ResumeParseError("python-docx is not installed on the system.") from e

    try:
        doc = docx.Document(file_path)
    except Exception as e:
        raise ResumeParseError(f"Corrupted or unreadable DOCX file: {e}") from e

    lines: list[str] = []
    for para in doc.paragraphs:
        t = para.text.strip()
        if t:
            lines.append(t)

    for table in doc.tables:
        for row in table.rows:
            row_items = [cell.text.strip() for cell in row.cells if cell.text.strip()]
            if row_items:
                lines.append(" | ".join(row_items))

    full_text = "\n".join(lines)
    cleaned = _clean_extracted_text(full_text)
    if not cleaned:
        raise ResumeParseError("Could not extract any readable text from the DOCX file.")
    return cleaned


def extract_text_from_txt(file_path: str) -> str:
    """Extract text from a TXT file trying multiple common encodings."""
    if not os.path.exists(file_path):
        raise ResumeParseError(f"File not found: {file_path}")

    encodings = ["utf-8", "utf-8-sig", "latin-1", "cp1252", "iso-8859-1"]
    content: str | None = None

    with open(file_path, "rb") as f:
        raw_bytes = f.read()

    if not raw_bytes or not raw_bytes.strip():
        raise ResumeParseError("The uploaded text file is empty.")

    for enc in encodings:
        try:
            content = raw_bytes.decode(enc)
            break
        except UnicodeDecodeError:
            continue

    if content is None:
        raise ResumeParseError("Could not decode text file with standard encodings.")

    cleaned = _clean_extracted_text(content)
    if not cleaned:
        raise ResumeParseError("The uploaded text file contains no readable text.")
    return cleaned


def extract_text_from_file(file_path: str, filename: str | None = None) -> str:
    """Unified file text extractor supporting PDF, DOCX, and TXT."""
    ref_name = (filename or file_path).lower()

    if ref_name.endswith(".pdf"):
        return extract_text_from_pdf(file_path)
    elif ref_name.endswith(".docx"):
        return extract_text_from_docx(file_path)
    elif ref_name.endswith(".txt"):
        return extract_text_from_txt(file_path)
    else:
        raise ResumeParseError(
            f"Unsupported file format '{ref_name}'. Supported formats: PDF, DOCX, TXT."
        )