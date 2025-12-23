/**
 * Type Exports for Teacher Portal
 */

// Class types
export type {
  Class,
  ClassSchedule,
  GradingPeriod,
  GradeScale as ClassGradeScale,
  GradeLevel as ClassGradeLevel,
  AssignmentCategory,
  ClassSettings,
  ClassSummary,
  ClassAnalytics,
  StandardMastery,
  EngagementMetrics,
  GradeTrend,
  CreateClassDto,
  UpdateClassDto,
} from './class';

// Student types
export type {
  Student,
  ParentContact,
  Accommodation,
  AccommodationType,
  StudentDetail,
  StudentClass,
  StudentActivity,
  StudentNote,
  StudentProgress,
  AcademicProgress,
  SubjectProgress,
  BehavioralProgress,
  AttendanceProgress,
  SkillProgress,
  IEPProgressSummary,
  StudentRosterEntry,
  StudentAlert,
  AddStudentNoteDto,
  UpdateAccommodationDto,
} from './student';

// Assignment types
export type {
  Assignment,
  SubmissionType,
  AssignmentAssignee,
  AssignmentAccommodations,
  Attachment,
  Rubric,
  RubricCriterion,
  RubricLevel,
  SubmissionStats,
  Submission,
  SubmissionStatus,
  SubmissionContent,
  SubmissionGrade,
  RubricScore,
  Grade,
  GradeStatus,
  Gradebook,
  GradebookStudent,
  GradebookAssignment,
  GradebookCategory,
  CreateAssignmentDto,
  UpdateAssignmentDto,
  UpdateGradeDto,
  BulkGradeDto,
} from './assignment';

// IEP types
export type {
  IEPGoal,
  IEPGoalCategory,
  IEPGoalStatus,
  IEPProgressEntry,
  IEPObjective,
  IEPService,
  ServiceType,
  IEPDocument,
  IEPAccommodation,
  AccommodationCategory,
  IEPParticipant,
  IEPProgressReport,
  IEPGoalReport,
  CreateIEPGoalDto,
  UpdateIEPGoalDto,
  AddIEPProgressDto,
  GenerateIEPReportDto,
} from './iep';

// Grade types
export type {
  GradeScale,
  GradeLevel,
  GradeCalculationResult,
  CategoryGrade,
  GradeEntry,
  GradeHistoryEntry,
  GradeReport,
  AssignmentGradeSummary,
  StandardsGrade,
  GradeCalculationConfig,
  BulkGradeOperation,
  GradeImportRow,
  GradeExportOptions,
} from './grade';

// Report types
export type {
  ReportType,
  ReportParams,
  ReportResult,
  ProgressReportData,
  ClassReportData,
  IEPReportData,
} from './report';

// Message types
export type {
  Message,
  Conversation,
  MessageRecipient,
  MessageAttachment,
  MessageTemplate,
  SendMessageDto,
} from './message';

// Calendar types
export type { CalendarEvent, EventType, RecurrenceRule, CreateEventDto } from './calendar';
