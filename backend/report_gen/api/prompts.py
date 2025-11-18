"""Prompt management API endpoints"""

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel

from ..models import (
    PromptTemplate,
    CreateTemplateRequest,
    UpdateTemplateRequest
)
from ..services.project_manager import ProjectManager
from ..services.prompt_manager import PromptManager
from ..services.prompt_generator import PromptGenerator
from ..services.example_manager import ExampleManager
from ..services.chapter_parser import ChapterParser
from ..services.data_processor import DataProcessor

router = APIRouter(prefix="/api/prompts", tags=["prompts"])


class GeneratePromptRequest(BaseModel):
    """Request model for generating prompt from examples"""
    project_id: Optional[str] = None
    chapter: str
    chapter_title: Optional[str] = None
    example_file_ids: Optional[List[str]] = None  # If None, use all available examples


class GenerateAllChaptersRequest(BaseModel):
    """Request model for generating all chapter prompts in batch"""
    project_id: Optional[str] = None
    example_file_ids: Optional[List[str]] = None


@router.get("/templates", response_model=List[PromptTemplate])
async def get_all_templates(project_id: Optional[str] = None):
    """Get all prompt templates

    Returns:
        List of all templates
    """
    try:
        resolved_project_id = ProjectManager.resolve_project_id(project_id)
        all_templates = PromptManager.load_all_templates(resolved_project_id)
        result = []
        for chapter_templates in all_templates.values():
            for template in chapter_templates:
                template_with_project = dict(template)
                template_with_project["project_id"] = resolved_project_id
                result.append(template_with_project)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load templates: {str(e)}")


@router.get("/templates/chapter/{chapter}", response_model=List[PromptTemplate])
async def get_templates_by_chapter(chapter: str, project_id: Optional[str] = None):
    """Get all templates for a specific chapter

    Args:
        chapter: Chapter identifier

    Returns:
        List of templates for the chapter
    """
    try:
        resolved_project_id = ProjectManager.resolve_project_id(project_id)
        templates = PromptManager.get_templates_by_chapter(resolved_project_id, chapter)
        return [
            {**template, "project_id": resolved_project_id}
            for template in templates
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get templates: {str(e)}")


@router.get("/templates/{template_id}", response_model=PromptTemplate)
async def get_template_by_id(template_id: str, project_id: Optional[str] = None):
    """Get a specific template by ID

    Args:
        template_id: Template ID

    Returns:
        Template details
    """
    try:
        resolved_project_id = ProjectManager.resolve_project_id(project_id)
        template = PromptManager.get_template_by_id(resolved_project_id, template_id)
        if not template:
            raise HTTPException(status_code=404, detail=f"Template not found: {template_id}")
        template_with_project = dict(template)
        template_with_project["project_id"] = resolved_project_id
        return template_with_project
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get template: {str(e)}")


@router.post("/templates", response_model=PromptTemplate)
async def create_template(request: CreateTemplateRequest):
    """Create a new template

    Args:
        request: CreateTemplateRequest with template details

    Returns:
        Created template
    """
    try:
        resolved_project_id = ProjectManager.resolve_project_id(request.project_id)
        template = PromptManager.create_template(
            project_id=resolved_project_id,
            chapter=request.chapter,
            name=request.name,
            system_prompt=request.system_prompt,
            user_prompt_template=request.user_prompt_template,
            is_default=request.is_default or False
        )
        template_with_project = dict(template)
        template_with_project["project_id"] = resolved_project_id
        return template_with_project
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create template: {str(e)}")


@router.put("/templates/{template_id}", response_model=PromptTemplate)
async def update_template(template_id: str, request: UpdateTemplateRequest):
    """Update an existing template

    Args:
        template_id: Template ID
        request: UpdateTemplateRequest with fields to update

    Returns:
        Updated template
    """
    try:
        resolved_project_id = ProjectManager.resolve_project_id(request.project_id)
        template = PromptManager.update_template(
            project_id=resolved_project_id,
            template_id=template_id,
            name=request.name,
            system_prompt=request.system_prompt,
            user_prompt_template=request.user_prompt_template,
            is_default=request.is_default
        )
        if not template:
            raise HTTPException(status_code=404, detail=f"Template not found: {template_id}")
        template_with_project = dict(template)
        template_with_project["project_id"] = resolved_project_id
        return template_with_project
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update template: {str(e)}")


@router.delete("/templates/{template_id}")
async def delete_template(template_id: str, project_id: Optional[str] = None):
    """Delete a template

    Args:
        template_id: Template ID

    Returns:
        Success response
    """
    try:
        resolved_project_id = ProjectManager.resolve_project_id(project_id)
        success = PromptManager.delete_template(resolved_project_id, template_id)
        if not success:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete template (not found or is the last template)"
            )
        return {"success": True, "message": "Template deleted", "project_id": resolved_project_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete template: {str(e)}")


@router.post("/generate-from-examples")
async def generate_prompt_from_examples(request: GeneratePromptRequest):
    """Generate prompt template by analyzing example documents

    This endpoint uses AI to analyze example documents and automatically
    generate a prompt template that matches the style and structure of
    those examples.

    Args:
        request: GeneratePromptRequest with chapter and optional example IDs

    Returns:
        Generated prompt template with system_prompt and user_prompt_template
    """
    try:
        resolved_project_id = ProjectManager.resolve_project_id(request.project_id)
        generator = PromptGenerator(resolved_project_id)

        # If no specific examples provided, use all available examples
        if not request.example_file_ids:
            print("[API] No example IDs provided, using all available examples")
            result = generator.generate_from_all_examples(
                chapter_type=request.chapter,
                chapter_title=request.chapter_title
            )
        else:
            print(f"[API] Generating prompt from {len(request.example_file_ids)} example(s)")
            result = generator.generate_from_examples(
                example_file_ids=request.example_file_ids,
                chapter_type=request.chapter,
                chapter_title=request.chapter_title
            )

        return {
            "success": True,
            "system_prompt": result["system_prompt"],
            "user_prompt_template": result["user_prompt_template"],
            "analyzed_examples": result["analyzed_examples"],
            "chapter_type": result["chapter_type"],
            "project_id": resolved_project_id
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[API] Error generating prompt: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate prompt: {str(e)}"
        )


@router.get("/debug/parse-example/{example_id}")
async def debug_parse_example(example_id: str, project_id: Optional[str] = None):
    """Debug endpoint to see how an example file is parsed into chapters

    Args:
        example_id: Example file ID to parse
        project_id: Optional project ID

    Returns:
        Parsed chapters with titles and content previews
    """
    try:
        resolved_project_id = ProjectManager.resolve_project_id(project_id)
        example_manager = ExampleManager(resolved_project_id)
        chapter_parser = ChapterParser()
        data_processor = DataProcessor()

        # Get example file
        example = example_manager.get_example_by_id(example_id)
        if not example:
            raise HTTPException(status_code=404, detail=f"Example not found: {example_id}")

        file_path = example_manager.get_example_file_path(example_id)
        if not file_path:
            raise HTTPException(status_code=404, detail=f"File not found for example: {example_id}")

        # Read and parse the file
        content = data_processor.read_example_file(str(file_path))
        parsed_chapters = chapter_parser.parse(content)

        # Get project chapters for comparison
        project_chapters = ProjectManager.get_chapters(resolved_project_id)

        return {
            "success": True,
            "example_id": example_id,
            "example_name": example["name"],
            "project_chapters": [{"id": ch["id"], "title": ch.get("title", ch["id"])} for ch in project_chapters],
            "parsed_chapters": [
                {
                    "index": i,
                    "title": ch.title,
                    "content_length": len(ch.content),
                    "content_preview": ch.content[:500] + "..." if len(ch.content) > 500 else ch.content
                }
                for i, ch in enumerate(parsed_chapters)
            ],
            "total_parsed": len(parsed_chapters)
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API] Error parsing example: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to parse example: {str(e)}")


@router.post("/generate-all-chapters")
async def generate_all_chapters_prompts(request: Optional[GenerateAllChaptersRequest] = None):
    """Generate prompt templates for all chapters sequentially

    This endpoint analyzes example documents and generates prompts for all chapters
    in sequence (chapter_1, chapter_2, etc.). Each chapter is processed one at a time.

    Args:
        example_file_ids: Optional list of example file IDs to use

    Returns:
        Results for each chapter generation
    """
    try:
        resolved_project_id = ProjectManager.resolve_project_id(
            request.project_id if request else None
        )
        generator = PromptGenerator(resolved_project_id)

        # Load chapters from project configuration
        project_chapters = ProjectManager.get_chapters(resolved_project_id)
        if not project_chapters:
            raise HTTPException(status_code=400, detail="Project has no chapters configured")

        results = []

        print(f"[API] Starting batch generation for {len(project_chapters)} chapters")

        example_file_ids = request.example_file_ids if request and request.example_file_ids else None

        for chapter in project_chapters:
            chapter_id = chapter["id"]
            chapter_title = chapter.get("title", chapter_id)
            print(f"[API] Generating prompt for {chapter_id} - {chapter_title}...")

            try:
                # Generate prompt for this chapter
                if not example_file_ids:
                    result = generator.generate_from_all_examples(
                        chapter_type=chapter_id,
                        chapter_title=chapter_title
                    )
                else:
                    result = generator.generate_from_examples(
                        example_file_ids=example_file_ids,
                        chapter_type=chapter_id,
                        chapter_title=chapter_title
                    )

                # Save the generated template
                template = PromptManager.create_template(
                    project_id=resolved_project_id,
                    chapter=chapter_id,
                    name=f"AI 批量生成 - {chapter_title}",
                    system_prompt=result["system_prompt"],
                    user_prompt_template=result["user_prompt_template"],
                    is_default=False
                )

                results.append({
                    "chapter": chapter_id,
                    "chapter_name": chapter_title,
                    "success": True,
                    "template_id": template["id"],
                    "analyzed_examples": result["analyzed_examples"]
                })

                print(f"[API] Successfully generated and saved template for {chapter_id}")

            except Exception as e:
                print(f"[API] Error generating {chapter_id}: {type(e).__name__}: {str(e)}")
                results.append({
                    "chapter": chapter_id,
                    "chapter_name": chapter_title,
                    "success": False,
                    "error": str(e)
                })

        # Count successes
        success_count = sum(1 for r in results if r["success"])

        return {
            "success": True,
            "total_chapters": len(project_chapters),
            "successful": success_count,
            "failed": len(project_chapters) - success_count,
            "results": results,
            "project_id": resolved_project_id
        }

    except Exception as e:
        print(f"[API] Error in batch generation: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Batch generation failed: {str(e)}"
        )
