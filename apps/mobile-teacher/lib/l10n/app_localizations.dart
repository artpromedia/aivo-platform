import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_es.dart';
import 'app_localizations_fr.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
      : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('es'),
    Locale('fr')
  ];

  /// The application title
  ///
  /// In en, this message translates to:
  /// **'Aivo Teacher'**
  String get appTitle;

  /// No description provided for @dashboard.
  ///
  /// In en, this message translates to:
  /// **'Dashboard'**
  String get dashboard;

  /// No description provided for @students.
  ///
  /// In en, this message translates to:
  /// **'Students'**
  String get students;

  /// No description provided for @sessions.
  ///
  /// In en, this message translates to:
  /// **'Sessions'**
  String get sessions;

  /// No description provided for @messages.
  ///
  /// In en, this message translates to:
  /// **'Messages'**
  String get messages;

  /// No description provided for @reports.
  ///
  /// In en, this message translates to:
  /// **'Reports'**
  String get reports;

  /// No description provided for @settings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settings;

  /// No description provided for @gradebook.
  ///
  /// In en, this message translates to:
  /// **'Gradebook'**
  String get gradebook;

  /// No description provided for @assignments.
  ///
  /// In en, this message translates to:
  /// **'Assignments'**
  String get assignments;

  /// No description provided for @loading.
  ///
  /// In en, this message translates to:
  /// **'Loading...'**
  String get loading;

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get retry;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// No description provided for @delete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get delete;

  /// No description provided for @edit.
  ///
  /// In en, this message translates to:
  /// **'Edit'**
  String get edit;

  /// No description provided for @create.
  ///
  /// In en, this message translates to:
  /// **'Create'**
  String get create;

  /// No description provided for @search.
  ///
  /// In en, this message translates to:
  /// **'Search'**
  String get search;

  /// No description provided for @filter.
  ///
  /// In en, this message translates to:
  /// **'Filter'**
  String get filter;

  /// No description provided for @clear.
  ///
  /// In en, this message translates to:
  /// **'Clear'**
  String get clear;

  /// No description provided for @done.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get done;

  /// No description provided for @close.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get close;

  /// No description provided for @back.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get back;

  /// No description provided for @next.
  ///
  /// In en, this message translates to:
  /// **'Next'**
  String get next;

  /// No description provided for @submit.
  ///
  /// In en, this message translates to:
  /// **'Submit'**
  String get submit;

  /// No description provided for @confirm.
  ///
  /// In en, this message translates to:
  /// **'Confirm'**
  String get confirm;

  /// No description provided for @error.
  ///
  /// In en, this message translates to:
  /// **'Error'**
  String get error;

  /// No description provided for @errorLoadingData.
  ///
  /// In en, this message translates to:
  /// **'Error loading data'**
  String get errorLoadingData;

  /// No description provided for @noDataFound.
  ///
  /// In en, this message translates to:
  /// **'No data found'**
  String get noDataFound;

  /// No description provided for @networkError.
  ///
  /// In en, this message translates to:
  /// **'Network error. Please check your connection.'**
  String get networkError;

  /// No description provided for @unexpectedError.
  ///
  /// In en, this message translates to:
  /// **'An unexpected error occurred'**
  String get unexpectedError;

  /// No description provided for @tryAgain.
  ///
  /// In en, this message translates to:
  /// **'Try Again'**
  String get tryAgain;

  /// No description provided for @searchStudents.
  ///
  /// In en, this message translates to:
  /// **'Search students...'**
  String get searchStudents;

  /// No description provided for @filterStudents.
  ///
  /// In en, this message translates to:
  /// **'Filter Students'**
  String get filterStudents;

  /// No description provided for @showIepOnly.
  ///
  /// In en, this message translates to:
  /// **'Show IEP students only'**
  String get showIepOnly;

  /// No description provided for @studentStatus.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get studentStatus;

  /// No description provided for @active.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get active;

  /// No description provided for @inactive.
  ///
  /// In en, this message translates to:
  /// **'Inactive'**
  String get inactive;

  /// No description provided for @transferred.
  ///
  /// In en, this message translates to:
  /// **'Transferred'**
  String get transferred;

  /// No description provided for @studentDetails.
  ///
  /// In en, this message translates to:
  /// **'Student Details'**
  String get studentDetails;

  /// No description provided for @viewIep.
  ///
  /// In en, this message translates to:
  /// **'View IEP'**
  String get viewIep;

  /// No description provided for @gradeLevel.
  ///
  /// In en, this message translates to:
  /// **'Grade {level}'**
  String gradeLevel(int level);

  /// No description provided for @noStudents.
  ///
  /// In en, this message translates to:
  /// **'No students found'**
  String get noStudents;

  /// No description provided for @studentsNeedingAttention.
  ///
  /// In en, this message translates to:
  /// **'Students Needing Attention'**
  String get studentsNeedingAttention;

  /// No description provided for @studentsWithIep.
  ///
  /// In en, this message translates to:
  /// **'Students with IEP'**
  String get studentsWithIep;

  /// No description provided for @searchAssignments.
  ///
  /// In en, this message translates to:
  /// **'Search assignments...'**
  String get searchAssignments;

  /// No description provided for @filterAssignments.
  ///
  /// In en, this message translates to:
  /// **'Filter Assignments'**
  String get filterAssignments;

  /// No description provided for @newAssignment.
  ///
  /// In en, this message translates to:
  /// **'New Assignment'**
  String get newAssignment;

  /// No description provided for @assignmentDetails.
  ///
  /// In en, this message translates to:
  /// **'Assignment Details'**
  String get assignmentDetails;

  /// No description provided for @assignmentType.
  ///
  /// In en, this message translates to:
  /// **'Type'**
  String get assignmentType;

  /// No description provided for @pointsPossible.
  ///
  /// In en, this message translates to:
  /// **'Points Possible'**
  String get pointsPossible;

  /// No description provided for @dueDate.
  ///
  /// In en, this message translates to:
  /// **'Due Date'**
  String get dueDate;

  /// No description provided for @availableFrom.
  ///
  /// In en, this message translates to:
  /// **'Available From'**
  String get availableFrom;

  /// No description provided for @locksAt.
  ///
  /// In en, this message translates to:
  /// **'Locks At'**
  String get locksAt;

  /// No description provided for @category.
  ///
  /// In en, this message translates to:
  /// **'Category'**
  String get category;

  /// No description provided for @weight.
  ///
  /// In en, this message translates to:
  /// **'Weight'**
  String get weight;

  /// No description provided for @lateSubmissions.
  ///
  /// In en, this message translates to:
  /// **'Late Submissions'**
  String get lateSubmissions;

  /// No description provided for @allowed.
  ///
  /// In en, this message translates to:
  /// **'Allowed'**
  String get allowed;

  /// No description provided for @notAllowed.
  ///
  /// In en, this message translates to:
  /// **'Not Allowed'**
  String get notAllowed;

  /// No description provided for @latePenalty.
  ///
  /// In en, this message translates to:
  /// **'Late Penalty'**
  String get latePenalty;

  /// No description provided for @description.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get description;

  /// No description provided for @instructions.
  ///
  /// In en, this message translates to:
  /// **'Instructions'**
  String get instructions;

  /// No description provided for @draft.
  ///
  /// In en, this message translates to:
  /// **'Draft'**
  String get draft;

  /// No description provided for @published.
  ///
  /// In en, this message translates to:
  /// **'Published'**
  String get published;

  /// No description provided for @closed.
  ///
  /// In en, this message translates to:
  /// **'Closed'**
  String get closed;

  /// No description provided for @archived.
  ///
  /// In en, this message translates to:
  /// **'Archived'**
  String get archived;

  /// No description provided for @homework.
  ///
  /// In en, this message translates to:
  /// **'Homework'**
  String get homework;

  /// No description provided for @quiz.
  ///
  /// In en, this message translates to:
  /// **'Quiz'**
  String get quiz;

  /// No description provided for @test.
  ///
  /// In en, this message translates to:
  /// **'Test'**
  String get test;

  /// No description provided for @project.
  ///
  /// In en, this message translates to:
  /// **'Project'**
  String get project;

  /// No description provided for @classwork.
  ///
  /// In en, this message translates to:
  /// **'Classwork'**
  String get classwork;

  /// No description provided for @practice.
  ///
  /// In en, this message translates to:
  /// **'Practice'**
  String get practice;

  /// No description provided for @assessment.
  ///
  /// In en, this message translates to:
  /// **'Assessment'**
  String get assessment;

  /// No description provided for @pastDue.
  ///
  /// In en, this message translates to:
  /// **'Past Due'**
  String get pastDue;

  /// No description provided for @noDueDate.
  ///
  /// In en, this message translates to:
  /// **'No due date'**
  String get noDueDate;

  /// No description provided for @ungraded.
  ///
  /// In en, this message translates to:
  /// **'{count} ungraded'**
  String ungraded(int count);

  /// No description provided for @submissionProgress.
  ///
  /// In en, this message translates to:
  /// **'{submitted}/{total} submitted'**
  String submissionProgress(int submitted, int total);

  /// No description provided for @noAssignments.
  ///
  /// In en, this message translates to:
  /// **'No assignments yet'**
  String get noAssignments;

  /// No description provided for @noAssignmentsMatch.
  ///
  /// In en, this message translates to:
  /// **'No assignments match filters'**
  String get noAssignmentsMatch;

  /// No description provided for @clearFilters.
  ///
  /// In en, this message translates to:
  /// **'Clear filters'**
  String get clearFilters;

  /// No description provided for @createFirstAssignment.
  ///
  /// In en, this message translates to:
  /// **'Create your first assignment'**
  String get createFirstAssignment;

  /// No description provided for @needsGradingOnly.
  ///
  /// In en, this message translates to:
  /// **'Needs grading only'**
  String get needsGradingOnly;

  /// No description provided for @applyFilters.
  ///
  /// In en, this message translates to:
  /// **'Apply Filters'**
  String get applyFilters;

  /// No description provided for @publishAssignment.
  ///
  /// In en, this message translates to:
  /// **'Publish Assignment'**
  String get publishAssignment;

  /// No description provided for @publishConfirmation.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to publish this assignment? Students will be able to see it.'**
  String get publishConfirmation;

  /// No description provided for @publish.
  ///
  /// In en, this message translates to:
  /// **'Publish'**
  String get publish;

  /// No description provided for @closeAssignment.
  ///
  /// In en, this message translates to:
  /// **'Close Assignment'**
  String get closeAssignment;

  /// No description provided for @duplicate.
  ///
  /// In en, this message translates to:
  /// **'Duplicate'**
  String get duplicate;

  /// No description provided for @deleteAssignment.
  ///
  /// In en, this message translates to:
  /// **'Delete Assignment'**
  String get deleteAssignment;

  /// No description provided for @deleteConfirmation.
  ///
  /// In en, this message translates to:
  /// **'Are you sure? This action cannot be undone.'**
  String get deleteConfirmation;

  /// No description provided for @details.
  ///
  /// In en, this message translates to:
  /// **'Details'**
  String get details;

  /// No description provided for @submissions.
  ///
  /// In en, this message translates to:
  /// **'Submissions'**
  String get submissions;

  /// No description provided for @submissionsCount.
  ///
  /// In en, this message translates to:
  /// **'Submissions ({count})'**
  String submissionsCount(int count);

  /// No description provided for @progress.
  ///
  /// In en, this message translates to:
  /// **'Progress'**
  String get progress;

  /// No description provided for @submitted.
  ///
  /// In en, this message translates to:
  /// **'Submitted'**
  String get submitted;

  /// No description provided for @graded.
  ///
  /// In en, this message translates to:
  /// **'Graded'**
  String get graded;

  /// No description provided for @missing.
  ///
  /// In en, this message translates to:
  /// **'Missing'**
  String get missing;

  /// No description provided for @completionRate.
  ///
  /// In en, this message translates to:
  /// **'{percent}% completion rate'**
  String completionRate(String percent);

  /// No description provided for @gradeAll.
  ///
  /// In en, this message translates to:
  /// **'Grade All ({count})'**
  String gradeAll(int count);

  /// No description provided for @markMissingZero.
  ///
  /// In en, this message translates to:
  /// **'Mark Missing 0'**
  String get markMissingZero;

  /// No description provided for @markMissingZeroConfirmation.
  ///
  /// In en, this message translates to:
  /// **'This will give all missing submissions a grade of 0. Continue?'**
  String get markMissingZeroConfirmation;

  /// No description provided for @noSubmissionsYet.
  ///
  /// In en, this message translates to:
  /// **'No submissions yet'**
  String get noSubmissionsYet;

  /// No description provided for @notSubmitted.
  ///
  /// In en, this message translates to:
  /// **'Not submitted'**
  String get notSubmitted;

  /// No description provided for @submittedLate.
  ///
  /// In en, this message translates to:
  /// **'Submitted late'**
  String get submittedLate;

  /// No description provided for @returned.
  ///
  /// In en, this message translates to:
  /// **'Returned'**
  String get returned;

  /// No description provided for @excused.
  ///
  /// In en, this message translates to:
  /// **'Excused'**
  String get excused;

  /// No description provided for @late.
  ///
  /// In en, this message translates to:
  /// **'Late'**
  String get late;

  /// No description provided for @gradeSubmission.
  ///
  /// In en, this message translates to:
  /// **'Grade Submission'**
  String get gradeSubmission;

  /// No description provided for @points.
  ///
  /// In en, this message translates to:
  /// **'Points'**
  String get points;

  /// No description provided for @pointsOutOf.
  ///
  /// In en, this message translates to:
  /// **'Points (out of {max})'**
  String pointsOutOf(String max);

  /// No description provided for @fullCredit.
  ///
  /// In en, this message translates to:
  /// **'Full'**
  String get fullCredit;

  /// No description provided for @feedback.
  ///
  /// In en, this message translates to:
  /// **'Feedback'**
  String get feedback;

  /// No description provided for @feedbackPlaceholder.
  ///
  /// In en, this message translates to:
  /// **'Enter feedback for the student...'**
  String get feedbackPlaceholder;

  /// No description provided for @excuseFromAssignment.
  ///
  /// In en, this message translates to:
  /// **'Excuse from assignment'**
  String get excuseFromAssignment;

  /// No description provided for @excuseExplanation.
  ///
  /// In en, this message translates to:
  /// **'Grade will not count toward final grade'**
  String get excuseExplanation;

  /// No description provided for @applyLatePenalty.
  ///
  /// In en, this message translates to:
  /// **'Apply late penalty'**
  String get applyLatePenalty;

  /// No description provided for @saveGrade.
  ///
  /// In en, this message translates to:
  /// **'Save Grade'**
  String get saveGrade;

  /// No description provided for @saveAndNext.
  ///
  /// In en, this message translates to:
  /// **'Save & Grade Next'**
  String get saveAndNext;

  /// No description provided for @gradeSaved.
  ///
  /// In en, this message translates to:
  /// **'Grade saved'**
  String get gradeSaved;

  /// No description provided for @errorSavingGrade.
  ///
  /// In en, this message translates to:
  /// **'Error saving grade'**
  String get errorSavingGrade;

  /// No description provided for @overall.
  ///
  /// In en, this message translates to:
  /// **'Overall'**
  String get overall;

  /// No description provided for @overallGrade.
  ///
  /// In en, this message translates to:
  /// **'Overall Grade'**
  String get overallGrade;

  /// No description provided for @gradedCount.
  ///
  /// In en, this message translates to:
  /// **'{graded}/{total} graded'**
  String gradedCount(int graded, int total);

  /// No description provided for @missingCount.
  ///
  /// In en, this message translates to:
  /// **'{count} missing'**
  String missingCount(int count);

  /// No description provided for @filterOptions.
  ///
  /// In en, this message translates to:
  /// **'Filter Options'**
  String get filterOptions;

  /// No description provided for @showAtRiskOnly.
  ///
  /// In en, this message translates to:
  /// **'Show at-risk students only'**
  String get showAtRiskOnly;

  /// No description provided for @atRiskDescription.
  ///
  /// In en, this message translates to:
  /// **'Students below 70%'**
  String get atRiskDescription;

  /// No description provided for @exportGradebook.
  ///
  /// In en, this message translates to:
  /// **'Export Gradebook'**
  String get exportGradebook;

  /// No description provided for @recalculateGrades.
  ///
  /// In en, this message translates to:
  /// **'Recalculate Grades'**
  String get recalculateGrades;

  /// No description provided for @gradebookExported.
  ///
  /// In en, this message translates to:
  /// **'Gradebook exported'**
  String get gradebookExported;

  /// No description provided for @quickGrade.
  ///
  /// In en, this message translates to:
  /// **'Quick Grade'**
  String get quickGrade;

  /// No description provided for @excuse.
  ///
  /// In en, this message translates to:
  /// **'Excuse'**
  String get excuse;

  /// No description provided for @integrations.
  ///
  /// In en, this message translates to:
  /// **'Integrations'**
  String get integrations;

  /// No description provided for @googleClassroom.
  ///
  /// In en, this message translates to:
  /// **'Google Classroom'**
  String get googleClassroom;

  /// No description provided for @canvas.
  ///
  /// In en, this message translates to:
  /// **'Canvas'**
  String get canvas;

  /// No description provided for @clever.
  ///
  /// In en, this message translates to:
  /// **'Clever'**
  String get clever;

  /// No description provided for @connected.
  ///
  /// In en, this message translates to:
  /// **'Connected'**
  String get connected;

  /// No description provided for @disconnected.
  ///
  /// In en, this message translates to:
  /// **'Disconnected'**
  String get disconnected;

  /// No description provided for @connecting.
  ///
  /// In en, this message translates to:
  /// **'Connecting...'**
  String get connecting;

  /// No description provided for @connect.
  ///
  /// In en, this message translates to:
  /// **'Connect'**
  String get connect;

  /// No description provided for @disconnect.
  ///
  /// In en, this message translates to:
  /// **'Disconnect'**
  String get disconnect;

  /// No description provided for @lastSync.
  ///
  /// In en, this message translates to:
  /// **'Last sync: {time}'**
  String lastSync(String time);

  /// No description provided for @syncNow.
  ///
  /// In en, this message translates to:
  /// **'Sync Now'**
  String get syncNow;

  /// No description provided for @syncAll.
  ///
  /// In en, this message translates to:
  /// **'Sync All'**
  String get syncAll;

  /// No description provided for @syncHistory.
  ///
  /// In en, this message translates to:
  /// **'Sync History'**
  String get syncHistory;

  /// No description provided for @gradePassback.
  ///
  /// In en, this message translates to:
  /// **'Grade Passback'**
  String get gradePassback;

  /// No description provided for @pendingGrades.
  ///
  /// In en, this message translates to:
  /// **'Pending Grades'**
  String get pendingGrades;

  /// No description provided for @courseMappings.
  ///
  /// In en, this message translates to:
  /// **'Course Mappings'**
  String get courseMappings;

  /// No description provided for @mapCourse.
  ///
  /// In en, this message translates to:
  /// **'Map Course'**
  String get mapCourse;

  /// No description provided for @offlineMode.
  ///
  /// In en, this message translates to:
  /// **'Offline Mode'**
  String get offlineMode;

  /// No description provided for @syncPending.
  ///
  /// In en, this message translates to:
  /// **'{count} changes pending sync'**
  String syncPending(int count);

  /// No description provided for @allChangesSynced.
  ///
  /// In en, this message translates to:
  /// **'All changes synced'**
  String get allChangesSynced;

  /// No description provided for @syncingChanges.
  ///
  /// In en, this message translates to:
  /// **'Syncing changes...'**
  String get syncingChanges;

  /// No description provided for @notifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notifications;

  /// No description provided for @notificationSettings.
  ///
  /// In en, this message translates to:
  /// **'Notification Settings'**
  String get notificationSettings;

  /// No description provided for @pushNotifications.
  ///
  /// In en, this message translates to:
  /// **'Push Notifications'**
  String get pushNotifications;

  /// No description provided for @emailNotifications.
  ///
  /// In en, this message translates to:
  /// **'Email Notifications'**
  String get emailNotifications;

  /// No description provided for @profile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profile;

  /// No description provided for @logout.
  ///
  /// In en, this message translates to:
  /// **'Logout'**
  String get logout;

  /// No description provided for @logoutConfirmation.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to logout?'**
  String get logoutConfirmation;

  /// No description provided for @about.
  ///
  /// In en, this message translates to:
  /// **'About'**
  String get about;

  /// No description provided for @version.
  ///
  /// In en, this message translates to:
  /// **'Version {version}'**
  String version(String version);

  /// No description provided for @privacyPolicy.
  ///
  /// In en, this message translates to:
  /// **'Privacy Policy'**
  String get privacyPolicy;

  /// No description provided for @termsOfService.
  ///
  /// In en, this message translates to:
  /// **'Terms of Service'**
  String get termsOfService;

  /// No description provided for @help.
  ///
  /// In en, this message translates to:
  /// **'Help'**
  String get help;

  /// No description provided for @support.
  ///
  /// In en, this message translates to:
  /// **'Support'**
  String get support;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'es', 'fr'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'es':
      return AppLocalizationsEs();
    case 'fr':
      return AppLocalizationsFr();
  }

  throw FlutterError(
      'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
      'an issue with the localizations generation tool. Please file an issue '
      'on GitHub with a reproducible sample app and the gen-l10n configuration '
      'that was used.');
}
