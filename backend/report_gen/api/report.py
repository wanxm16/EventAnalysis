"""Report generation API endpoints"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from ..models import (
    GenerateReportRequest,
    GenerateReportWithTextRequest,
    GenerateReportResponse,
    ExportRequest
)
from ..services.report_generator import ReportGenerator
from ..utils import markdown_to_docx
import tempfile
import os

router = APIRouter(prefix="/api/report", tags=["report"])

@router.post("/generate", response_model=GenerateReportResponse)
async def generate_report_chapter(request: GenerateReportRequest):
    """Generate a specific chapter of the report

    Args:
        request: GenerateReportRequest containing chapter type, data file ID, and optional example file IDs

    Returns:
        GenerateReportResponse with generated markdown content
    """
    try:
        # Generate report chapter within project scope
        generator = ReportGenerator()
        content = generator.generate_chapter(
            project_id=request.project_id,
            chapter_type=request.chapter,
            data_file_id=request.data_file_id,
            example_file_ids=request.example_files if request.example_files else None
        )

        return GenerateReportResponse(
            success=True,
            chapter=request.chapter,
            content=content
        )

    except Exception as e:
        return GenerateReportResponse(
            success=False,
            chapter=request.chapter,
            content="",
            error=str(e)
        )


@router.post("/generate-with-text", response_model=GenerateReportResponse)
async def generate_report_chapter_with_text(request: GenerateReportWithTextRequest):
    """Generate a specific chapter from text data

    Args:
        request: GenerateReportWithTextRequest containing chapter type, data text, and optional example file IDs

    Returns:
        GenerateReportResponse with generated markdown content
    """
    try:
        print(f"[API] Received generate request for chapter: {request.chapter}")
        print(f"[API] Data text length: {len(request.data_text)}")
        print(f"[API] Example file IDs: {request.example_file_ids}")
        print(f"[API] Template ID: {request.template_id}")
        print(f"[API] Project ID: {request.project_id}")

        # Generate report chapter from text
        generator = ReportGenerator()
        content = generator.generate_chapter_with_text(
            project_id=request.project_id,
            chapter_type=request.chapter,
            data_text=request.data_text,
            example_file_ids=request.example_file_ids if request.example_file_ids else None,
            template_id=request.template_id
        )

        print(f"[API] Generated content length: {len(content)}")

        return GenerateReportResponse(
            success=True,
            chapter=request.chapter,
            content=content
        )

    except Exception as e:
        print(f"[API] Error generating report: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return GenerateReportResponse(
            success=False,
            chapter=request.chapter,
            content="",
            error=str(e)
        )


@router.post("/export")
async def export_to_word(request: ExportRequest):
    """Export markdown content to Word document

    Args:
        request: ExportRequest containing content and filename

    Returns:
        Word document file
    """
    try:
        # Create temporary file for the Word document
        with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as tmp_file:
            tmp_path = tmp_file.name

        # Convert markdown to Word
        markdown_to_docx(request.content, tmp_path)

        # Return file response
        return FileResponse(
            path=tmp_path,
            filename=f"{request.filename}.docx",
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            background=None  # File will be deleted after response
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export document: {str(e)}")
