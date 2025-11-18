"""Project management API endpoints"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List, Dict, Any

from ..models import Project, CreateProjectRequest, Chapter
from ..services.project_manager import ProjectManager
from ..services.project_initializer import ProjectInitializer
from ..services.example_manager import ExampleManager
from ..services.project_storage import ProjectStorage

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=List[Project])
async def list_projects():
    """List all projects"""
    try:
        projects = ProjectManager.list_projects()
        return projects
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load projects: {exc}")


@router.get("/{project_id}", response_model=Project)
async def get_project(project_id: str):
    """Get project details"""
    try:
        project = ProjectManager.get_project(project_id)
        return project
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to get project: {exc}")


@router.post("", response_model=Project)
async def create_project(request: CreateProjectRequest):
    """Create a new project"""
    try:
        project = ProjectManager.create_project(request.name)
        return project
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create project: {exc}")


@router.delete("/{project_id}")
async def delete_project(project_id: str):
    """Delete a project"""
    try:
        result = ProjectManager.delete_project(project_id)
        return {"success": True, **result}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete project: {exc}")


@router.get("/{project_id}/chapters", response_model=List[Chapter])
async def get_project_chapters(project_id: str):
    """Return ordered chapter definitions for a project"""
    try:
        ProjectManager.get_project(project_id)
        chapters = ProjectManager.get_chapters(project_id)
        # Ensure sorted by order
        chapters_sorted = sorted(chapters, key=lambda item: item.get("order", 0))
        return chapters_sorted
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load chapters: {exc}")


@router.get("/{project_id}/chapters/{chapter_id}/data")
async def get_chapter_saved_data(project_id: str, chapter_id: str):
    try:
        ProjectManager.get_project(project_id)
        storage = ProjectStorage(project_id)
        return storage.get_chapter_data(chapter_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load chapter data: {exc}")


@router.post("/{project_id}/chapters/{chapter_id}/data")
async def save_chapter_data(project_id: str, chapter_id: str, payload: Dict[str, Any]):
    try:
        ProjectManager.get_project(project_id)
        storage = ProjectStorage(project_id)
        input_data = payload.get("input_data", "")
        generated_content = payload.get("generated_content")
        return storage.set_chapter_data(chapter_id, input_data, generated_content)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save chapter data: {exc}")


@router.post("/{project_id}/clear-generated")
async def clear_generated_chapters(project_id: str):
    """Clear all generated report content for a project while preserving input data."""
    try:
        ProjectManager.get_project(project_id)
        storage = ProjectStorage(project_id)
        result = storage.clear_generated_content()
        return {"success": True, **result}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to clear generated content: {exc}")


@router.post("/{project_id}/seed")
async def seed_project_from_document(project_id: str, file: UploadFile = File(...)):
    """Seed a project by uploading a reference document for automatic prompt generation."""
    allowed_extensions = ExampleManager.SUPPORTED_EXTENSIONS

    if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}")

    try:
        ProjectManager.get_project(project_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    try:
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="上传的文件为空")

        result = ProjectInitializer.initialize_from_bytes(project_id, file_bytes, file.filename)
        project = ProjectManager.get_project(project_id)
        return {**result, "project": project}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to initialize project: {exc}")
