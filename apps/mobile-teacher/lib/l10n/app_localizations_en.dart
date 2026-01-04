// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Aivo Teacher';

  @override
  String get dashboard => 'Dashboard';

  @override
  String get students => 'Students';

  @override
  String get sessions => 'Sessions';

  @override
  String get messages => 'Messages';

  @override
  String get reports => 'Reports';

  @override
  String get settings => 'Settings';

  @override
  String get gradebook => 'Gradebook';

  @override
  String get assignments => 'Assignments';

  @override
  String get loading => 'Loading...';

  @override
  String get retry => 'Retry';

  @override
  String get cancel => 'Cancel';

  @override
  String get save => 'Save';

  @override
  String get delete => 'Delete';

  @override
  String get edit => 'Edit';

  @override
  String get create => 'Create';

  @override
  String get search => 'Search';

  @override
  String get filter => 'Filter';

  @override
  String get clear => 'Clear';

  @override
  String get done => 'Done';

  @override
  String get close => 'Close';

  @override
  String get back => 'Back';

  @override
  String get next => 'Next';

  @override
  String get submit => 'Submit';

  @override
  String get confirm => 'Confirm';

  @override
  String get error => 'Error';

  @override
  String get errorLoadingData => 'Error loading data';

  @override
  String get noDataFound => 'No data found';

  @override
  String get networkError => 'Network error. Please check your connection.';

  @override
  String get unexpectedError => 'An unexpected error occurred';

  @override
  String get tryAgain => 'Try Again';

  @override
  String get searchStudents => 'Search students...';

  @override
  String get filterStudents => 'Filter Students';

  @override
  String get showIepOnly => 'Show IEP students only';

  @override
  String get studentStatus => 'Status';

  @override
  String get active => 'Active';

  @override
  String get inactive => 'Inactive';

  @override
  String get transferred => 'Transferred';

  @override
  String get studentDetails => 'Student Details';

  @override
  String get viewIep => 'View IEP';

  @override
  String gradeLevel(int level) {
    return 'Grade $level';
  }

  @override
  String get noStudents => 'No students found';

  @override
  String get studentsNeedingAttention => 'Students Needing Attention';

  @override
  String get studentsWithIep => 'Students with IEP';

  @override
  String get searchAssignments => 'Search assignments...';

  @override
  String get filterAssignments => 'Filter Assignments';

  @override
  String get newAssignment => 'New Assignment';

  @override
  String get assignmentDetails => 'Assignment Details';

  @override
  String get assignmentType => 'Type';

  @override
  String get pointsPossible => 'Points Possible';

  @override
  String get dueDate => 'Due Date';

  @override
  String get availableFrom => 'Available From';

  @override
  String get locksAt => 'Locks At';

  @override
  String get category => 'Category';

  @override
  String get weight => 'Weight';

  @override
  String get lateSubmissions => 'Late Submissions';

  @override
  String get allowed => 'Allowed';

  @override
  String get notAllowed => 'Not Allowed';

  @override
  String get latePenalty => 'Late Penalty';

  @override
  String get description => 'Description';

  @override
  String get instructions => 'Instructions';

  @override
  String get draft => 'Draft';

  @override
  String get published => 'Published';

  @override
  String get closed => 'Closed';

  @override
  String get archived => 'Archived';

  @override
  String get homework => 'Homework';

  @override
  String get quiz => 'Quiz';

  @override
  String get test => 'Test';

  @override
  String get project => 'Project';

  @override
  String get classwork => 'Classwork';

  @override
  String get practice => 'Practice';

  @override
  String get assessment => 'Assessment';

  @override
  String get pastDue => 'Past Due';

  @override
  String get noDueDate => 'No due date';

  @override
  String ungraded(int count) {
    return '$count ungraded';
  }

  @override
  String submissionProgress(int submitted, int total) {
    return '$submitted/$total submitted';
  }

  @override
  String get noAssignments => 'No assignments yet';

  @override
  String get noAssignmentsMatch => 'No assignments match filters';

  @override
  String get clearFilters => 'Clear filters';

  @override
  String get createFirstAssignment => 'Create your first assignment';

  @override
  String get needsGradingOnly => 'Needs grading only';

  @override
  String get applyFilters => 'Apply Filters';

  @override
  String get publishAssignment => 'Publish Assignment';

  @override
  String get publishConfirmation =>
      'Are you sure you want to publish this assignment? Students will be able to see it.';

  @override
  String get publish => 'Publish';

  @override
  String get closeAssignment => 'Close Assignment';

  @override
  String get duplicate => 'Duplicate';

  @override
  String get deleteAssignment => 'Delete Assignment';

  @override
  String get deleteConfirmation =>
      'Are you sure? This action cannot be undone.';

  @override
  String get details => 'Details';

  @override
  String get submissions => 'Submissions';

  @override
  String submissionsCount(int count) {
    return 'Submissions ($count)';
  }

  @override
  String get progress => 'Progress';

  @override
  String get submitted => 'Submitted';

  @override
  String get graded => 'Graded';

  @override
  String get missing => 'Missing';

  @override
  String completionRate(String percent) {
    return '$percent% completion rate';
  }

  @override
  String gradeAll(int count) {
    return 'Grade All ($count)';
  }

  @override
  String get markMissingZero => 'Mark Missing 0';

  @override
  String get markMissingZeroConfirmation =>
      'This will give all missing submissions a grade of 0. Continue?';

  @override
  String get noSubmissionsYet => 'No submissions yet';

  @override
  String get notSubmitted => 'Not submitted';

  @override
  String get submittedLate => 'Submitted late';

  @override
  String get returned => 'Returned';

  @override
  String get excused => 'Excused';

  @override
  String get late => 'Late';

  @override
  String get gradeSubmission => 'Grade Submission';

  @override
  String get points => 'Points';

  @override
  String pointsOutOf(String max) {
    return 'Points (out of $max)';
  }

  @override
  String get fullCredit => 'Full';

  @override
  String get feedback => 'Feedback';

  @override
  String get feedbackPlaceholder => 'Enter feedback for the student...';

  @override
  String get excuseFromAssignment => 'Excuse from assignment';

  @override
  String get excuseExplanation => 'Grade will not count toward final grade';

  @override
  String get applyLatePenalty => 'Apply late penalty';

  @override
  String get saveGrade => 'Save Grade';

  @override
  String get saveAndNext => 'Save & Grade Next';

  @override
  String get gradeSaved => 'Grade saved';

  @override
  String get errorSavingGrade => 'Error saving grade';

  @override
  String get overall => 'Overall';

  @override
  String get overallGrade => 'Overall Grade';

  @override
  String gradedCount(int graded, int total) {
    return '$graded/$total graded';
  }

  @override
  String missingCount(int count) {
    return '$count missing';
  }

  @override
  String get filterOptions => 'Filter Options';

  @override
  String get showAtRiskOnly => 'Show at-risk students only';

  @override
  String get atRiskDescription => 'Students below 70%';

  @override
  String get exportGradebook => 'Export Gradebook';

  @override
  String get recalculateGrades => 'Recalculate Grades';

  @override
  String get gradebookExported => 'Gradebook exported';

  @override
  String get quickGrade => 'Quick Grade';

  @override
  String get excuse => 'Excuse';

  @override
  String get integrations => 'Integrations';

  @override
  String get googleClassroom => 'Google Classroom';

  @override
  String get canvas => 'Canvas';

  @override
  String get clever => 'Clever';

  @override
  String get connected => 'Connected';

  @override
  String get disconnected => 'Disconnected';

  @override
  String get connecting => 'Connecting...';

  @override
  String get connect => 'Connect';

  @override
  String get disconnect => 'Disconnect';

  @override
  String lastSync(String time) {
    return 'Last sync: $time';
  }

  @override
  String get syncNow => 'Sync Now';

  @override
  String get syncAll => 'Sync All';

  @override
  String get syncHistory => 'Sync History';

  @override
  String get gradePassback => 'Grade Passback';

  @override
  String get pendingGrades => 'Pending Grades';

  @override
  String get courseMappings => 'Course Mappings';

  @override
  String get mapCourse => 'Map Course';

  @override
  String get offlineMode => 'Offline Mode';

  @override
  String syncPending(int count) {
    return '$count changes pending sync';
  }

  @override
  String get allChangesSynced => 'All changes synced';

  @override
  String get syncingChanges => 'Syncing changes...';

  @override
  String get notifications => 'Notifications';

  @override
  String get notificationSettings => 'Notification Settings';

  @override
  String get pushNotifications => 'Push Notifications';

  @override
  String get emailNotifications => 'Email Notifications';

  @override
  String get profile => 'Profile';

  @override
  String get logout => 'Logout';

  @override
  String get logoutConfirmation => 'Are you sure you want to logout?';

  @override
  String get about => 'About';

  @override
  String version(String version) {
    return 'Version $version';
  }

  @override
  String get privacyPolicy => 'Privacy Policy';

  @override
  String get termsOfService => 'Terms of Service';

  @override
  String get help => 'Help';

  @override
  String get support => 'Support';
}
