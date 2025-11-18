"""File upload API endpoints"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List, Dict, Optional

from ..models import UploadResponse
from ..services.example_manager import ExampleManager
from ..services.project_manager import ProjectManager
from ..services.project_initializer import ProjectInitializer
from ..utils import save_upload_file

router = APIRouter(prefix="/api/upload", tags=["upload"])


@router.post("/data", response_model=UploadResponse)
async def upload_data_file(
    file: UploadFile = File(...),
    project_id: Optional[str] = Form(None)
):
    """Upload CSV data file

    Args:
        file: CSV file containing event data

    Returns:
        UploadResponse with file_id and filename
    """
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    try:
        # Read file content
        content = await file.read()

        resolved_project_id = ProjectManager.resolve_project_id(project_id)
        project_paths = ProjectManager.ensure_project_dirs(resolved_project_id)

        file_id, file_path = save_upload_file(
            content,
            file.filename,
            str(project_paths.uploads_dir)
        )

        return UploadResponse(
            success=True,
            file_id=file_id,
            filename=file.filename
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


@router.post("/example", response_model=UploadResponse)
async def upload_example_file(
    file: UploadFile = File(...),
    project_id: Optional[str] = Form(None)
):
    """Upload example file (Markdown or Word)

    Args:
        file: Markdown or Word file containing example report

    Returns:
        UploadResponse with file_id and filename
    """
    # Validate file type
    allowed_extensions = ['.md', '.markdown', '.docx', '.doc']
    if not any(file.filename.endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail="Only Markdown (.md, .markdown) and Word (.docx, .doc) files are allowed"
        )

    try:
        # Read file content
        content = await file.read()

        resolved_project_id = ProjectManager.resolve_project_id(project_id)
        ProjectManager.ensure_project_dirs(resolved_project_id)

        example_manager = ExampleManager(resolved_project_id)
        existing_chapters = ProjectManager.get_chapters(resolved_project_id)

        if not existing_chapters:
            # Initialize project with this first document
            ProjectInitializer.initialize_from_bytes(
                project_id=resolved_project_id,
                file_bytes=content,
                filename=file.filename
            )
        else:
            file_id, _ = save_upload_file(
                content,
                file.filename,
                str(example_manager.examples_dir)
            )
            example_manager.add_example(file_id, file.filename)
            return UploadResponse(
                success=True,
                file_id=file_id,
                filename=file.filename
            )

        # If initialized, return meta using generated example id from initialization
        # Since initializer saves file itself, fetch current examples
        examples = example_manager.get_all_examples()
        file_entry = next((item for item in examples if item["name"] == file.filename), None)
        return UploadResponse(
            success=True,
            file_id=file_entry["id"] if file_entry else "",
            filename=file.filename
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


@router.get("/examples")
async def get_all_examples(project_id: Optional[str] = None) -> List[Dict[str, str]]:
    """Get all uploaded example files

    Returns:
        List of example file metadata
    """
    try:
        resolved_project_id = ProjectManager.resolve_project_id(project_id)
        return ExampleManager(resolved_project_id).get_all_examples()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get examples: {str(e)}")


@router.delete("/example/{file_id}")
async def delete_example_file(file_id: str, project_id: Optional[str] = None):
    """Delete an example file

    Args:
        file_id: ID of the file to delete

    Returns:
        Success response
    """
    try:
        resolved_project_id = ProjectManager.resolve_project_id(project_id)
        ExampleManager(resolved_project_id).remove_example(file_id)
        return {"success": True, "message": "Example file deleted", "project_id": resolved_project_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")
