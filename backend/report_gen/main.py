"""FastAPI main application"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import projects, prompts, report, upload
from .config import get_settings

# Create upload directories
Path("uploads").mkdir(exist_ok=True)
Path("examples").mkdir(exist_ok=True)
Path("prompts").mkdir(exist_ok=True)

app = FastAPI(
    title="EventReport API",
    description="API for generating social governance event reports",
    version="1.0.0"
)


@app.on_event("startup")
async def load_settings() -> None:
    """Warm up configuration cache."""
    app.state.settings = get_settings()


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:5173"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(upload.router)
app.include_router(report.router)
app.include_router(prompts.router)
app.include_router(projects.router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "EventReport API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
