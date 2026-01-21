"""
District and Curriculum models.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class District(Base):
    """District model."""

    __tablename__ = "districts"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=True)
    region: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    settings: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    curricula: Mapped[list["DistrictCurriculum"]] = relationship(
        "DistrictCurriculum", back_populates="district"
    )

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "state": self.state,
            "region": self.region,
            "settings": self.settings,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class DistrictCurriculum(Base):
    """District curriculum mapping model."""

    __tablename__ = "district_curricula"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    district_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("districts.id"), nullable=False, index=True
    )
    standard_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("standards.id"), nullable=False
    )
    subject: Mapped[str] = mapped_column(String(100), nullable=False)
    grade_level: Mapped[str] = mapped_column(String(50), nullable=False)
    sequence: Mapped[Optional[int]] = mapped_column(nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Relationships
    district: Mapped["District"] = relationship("District", back_populates="curricula")

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "district_id": self.district_id,
            "standard_id": self.standard_id,
            "subject": self.subject,
            "grade_level": self.grade_level,
            "sequence": self.sequence,
            "notes": self.notes,
            "active": self.active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
