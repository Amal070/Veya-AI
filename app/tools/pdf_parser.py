from pypdf import PdfReader
from pypdf.errors import PdfReadError


class ResumeParseError(Exception):
    pass


def extract_text_from_pdf(file_path: str) -> str:
    try:
        reader = PdfReader(file_path)
    except PdfReadError as e:
        raise ResumeParseError(f"Corrupted or unreadable PDF: {e}") from e

    if reader.is_encrypted:
        try:
            reader.decrypt("")
        except Exception as e:
            raise ResumeParseError("PDF is password-protected.") from e

    text = ""
    for page in reader.pages:
        try:
            page_text = page.extract_text()
        except Exception:
            page_text = None
        if page_text:
            text += page_text + "\n"

    return text