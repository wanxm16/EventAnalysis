from pydantic import BaseModel
from typing import Optional, List


class GenerateReportRequest(BaseModel):
    project_id: Optional[str] = None
    chapter: str
    data_file_id: str
    example_files: Optional[List[str]] = []


class GenerateReportWithTextRequest(BaseModel):
    project_id: Optional[str] = None
    chapter: str
    data_text: str
    example_file_ids: Optional[List[str]] = []
    template_id: Optional[str] = None  # Optional template ID to use


class GenerateReportResponse(BaseModel):
    success: bool
    chapter: str
    content: str
    error: Optional[str] = None


class UploadResponse(BaseModel):
    success: bool
    file_id: str
    filename: str
    error: Optional[str] = None


class ExportRequest(BaseModel):
    content: str
    filename: str


class PromptTemplate(BaseModel):
    id: str
    name: str
    chapter: str
    system_prompt: str
    user_prompt_template: str
    is_default: bool
    created_at: str
    updated_at: str
    project_id: Optional[str] = None


class CreateTemplateRequest(BaseModel):
    project_id: Optional[str] = None
    chapter: str
    name: str
    system_prompt: str
    user_prompt_template: str
    is_default: Optional[bool] = False


class UpdateTemplateRequest(BaseModel):
    project_id: Optional[str] = None
    name: Optional[str] = None
    system_prompt: Optional[str] = None
    user_prompt_template: Optional[str] = None
    is_default: Optional[bool] = None


class Project(BaseModel):
    id: str
    name: str
    created_at: str
    updated_at: str


class CreateProjectRequest(BaseModel):
    name: str


class Chapter(BaseModel):
    id: str
    title: str
    order: int
