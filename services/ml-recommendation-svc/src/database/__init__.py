"""
Database module for ML Recommendation Service.
Provides SQLAlchemy async database connections and session management.
"""

from .connection import (
    get_database,
    Database,
    get_session,
    init_database,
)
from .models import (
    Base,
    Tenant,
    Student,
    RiskPrediction,
    Intervention,
    ModelMetric,
    MonitoringAlert as MonitoringAlertModel,
    JobExecution,
    DriftReport as DriftReportModel,
    BiasReport,
    StaffAssignment,
    User,
)

__all__ = [
    "get_database",
    "Database",
    "get_session",
    "init_database",
    "Base",
    "Tenant",
    "Student",
    "RiskPrediction",
    "Intervention",
    "ModelMetric",
    "MonitoringAlertModel",
    "JobExecution",
    "DriftReportModel",
    "BiasReport",
    "StaffAssignment",
    "User",
]
