"""
Curriculum Python Service - Main Application
Part of AIVO Platform Migration - Educational Standards & Brain Training Data
"""

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import engine, get_db, Base
from app.models import Standard, District, DistrictCurriculum


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Application lifespan manager."""
    print(f"Starting {settings.PROJECT_NAME} {settings.VERSION}")
    
    # Create tables if they don't exist (development only)
    if settings.DEBUG:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    
    yield
    print("Shutting down Curriculum Service")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Educational Standards & Brain Training Data Management",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }


# Standards endpoints
@app.get("/api/v1/standards")
async def list_standards(
    domain: str | None = None,
    grade_band: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List educational standards."""
    query = select(Standard)
    
    if domain:
        query = query.where(Standard.domain == domain)
    if grade_band:
        query = query.where(Standard.grade_band == grade_band)
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    standards = result.scalars().all()
    
    return {
        "items": [s.to_dict() for s in standards],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@app.get("/api/v1/standards/{standard_id}")
async def get_standard(standard_id: str, db: AsyncSession = Depends(get_db)):
    """Get a specific standard."""
    result = await db.execute(select(Standard).where(Standard.id == standard_id))
    standard = result.scalar_one_or_none()
    
    if not standard:
        raise HTTPException(status_code=404, detail="Standard not found")
    
    return standard.to_dict()


# District endpoints
@app.get("/api/v1/districts")
async def list_districts(db: AsyncSession = Depends(get_db)):
    """List districts."""
    result = await db.execute(select(District))
    districts = result.scalars().all()
    
    return {
        "items": [d.to_dict() for d in districts],
        "total": len(districts),
    }


@app.get("/api/v1/districts/{district_id}/curriculum")
async def get_district_curriculum(district_id: str, db: AsyncSession = Depends(get_db)):
    """Get district curriculum."""
    # Verify district exists
    district_result = await db.execute(select(District).where(District.id == district_id))
    district = district_result.scalar_one_or_none()
    
    if not district:
        raise HTTPException(status_code=404, detail="District not found")
    
    # Get curriculum entries
    query = (
        select(DistrictCurriculum)
        .where(DistrictCurriculum.district_id == district_id)
        .where(DistrictCurriculum.active == True)
        .order_by(DistrictCurriculum.sequence)
    )
    result = await db.execute(query)
    curricula = result.scalars().all()
    
    return {
        "district_id": district_id,
        "district_name": district.name,
        "curriculum": [c.to_dict() for c in curricula],
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
