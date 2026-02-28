// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for German (`de`).
class AppLocalizationsDe extends AppLocalizations {
  AppLocalizationsDe([String locale = 'de']) : super(locale);

  @override
  String get appTitle => 'Aivo Lehrkraft';

  @override
  String get dashboard => 'Übersicht';

  @override
  String get students => 'Schüler';

  @override
  String get sessions => 'Sitzungen';

  @override
  String get messages => 'Nachrichten';

  @override
  String get reports => 'Berichte';

  @override
  String get settings => 'Einstellungen';

  @override
  String get gradebook => 'Notenbuch';

  @override
  String get assignments => 'Aufgaben';

  @override
  String get loading => 'Laden...';

  @override
  String get retry => 'Erneut versuchen';

  @override
  String get cancel => 'Abbrechen';

  @override
  String get save => 'Speichern';

  @override
  String get delete => 'Löschen';

  @override
  String get edit => 'Bearbeiten';

  @override
  String get create => 'Erstellen';

  @override
  String get search => 'Suchen';

  @override
  String get filter => 'Filtern';

  @override
  String get clear => 'Löschen';

  @override
  String get done => 'Fertig';

  @override
  String get close => 'Schließen';

  @override
  String get back => 'Zurück';

  @override
  String get next => 'Weiter';

  @override
  String get submit => 'Einreichen';

  @override
  String get confirm => 'Bestätigen';

  @override
  String get error => 'Fehler';

  @override
  String get errorLoadingData => 'Fehler beim Laden der Daten';

  @override
  String get noDataFound => 'Keine Daten gefunden';

  @override
  String get networkError =>
      'Netzwerkfehler. Bitte überprüfen Sie Ihre Verbindung.';

  @override
  String get unexpectedError => 'Ein unerwarteter Fehler ist aufgetreten';

  @override
  String get tryAgain => 'Erneut versuchen';

  @override
  String get searchStudents => 'Schüler suchen...';

  @override
  String get filterStudents => 'Schüler filtern';

  @override
  String get showIepOnly => 'Nur Schüler mit IEP anzeigen';

  @override
  String get studentStatus => 'Status';

  @override
  String get active => 'Aktiv';

  @override
  String get inactive => 'Inaktiv';

  @override
  String get transferred => 'Versetzt';

  @override
  String get studentDetails => 'Schülerdetails';

  @override
  String get viewIep => 'IEP anzeigen';

  @override
  String gradeLevel(int level) {
    return 'Klasse $level';
  }

  @override
  String get noStudents => 'Keine Schüler gefunden';

  @override
  String get studentsNeedingAttention =>
      'Schüler, die Aufmerksamkeit benötigen';

  @override
  String get studentsWithIep => 'Schüler mit IEP';

  @override
  String get searchAssignments => 'Aufgaben suchen...';

  @override
  String get filterAssignments => 'Aufgaben filtern';

  @override
  String get newAssignment => 'Neue Aufgabe';

  @override
  String get assignmentDetails => 'Aufgabendetails';

  @override
  String get assignmentType => 'Typ';

  @override
  String get pointsPossible => 'Mögliche Punkte';

  @override
  String get dueDate => 'Fälligkeitsdatum';

  @override
  String get availableFrom => 'Verfügbar ab';

  @override
  String get locksAt => 'Gesperrt ab';

  @override
  String get category => 'Kategorie';

  @override
  String get weight => 'Gewichtung';

  @override
  String get lateSubmissions => 'Verspätete Abgaben';

  @override
  String get allowed => 'Erlaubt';

  @override
  String get notAllowed => 'Nicht erlaubt';

  @override
  String get latePenalty => 'Verspätungsabzug';

  @override
  String get description => 'Beschreibung';

  @override
  String get instructions => 'Anweisungen';

  @override
  String get draft => 'Entwurf';

  @override
  String get published => 'Veröffentlicht';

  @override
  String get closed => 'Geschlossen';

  @override
  String get archived => 'Archiviert';

  @override
  String get homework => 'Hausaufgabe';

  @override
  String get quiz => 'Quiz';

  @override
  String get test => 'Test';

  @override
  String get project => 'Projekt';

  @override
  String get classwork => 'Klassenarbeit';

  @override
  String get practice => 'Übung';

  @override
  String get assessment => 'Bewertung';

  @override
  String get pastDue => 'Überfällig';

  @override
  String get noDueDate => 'Kein Fälligkeitsdatum';

  @override
  String ungraded(int count) {
    return '$count unbenotet';
  }

  @override
  String submissionProgress(int submitted, int total) {
    return '$submitted/$total eingereicht';
  }

  @override
  String get noAssignments => 'Noch keine Aufgaben';

  @override
  String get noAssignmentsMatch => 'Keine Aufgaben entsprechen den Filtern';

  @override
  String get clearFilters => 'Filter löschen';

  @override
  String get createFirstAssignment => 'Erstellen Sie Ihre erste Aufgabe';

  @override
  String get needsGradingOnly => 'Nur zu bewertende';

  @override
  String get applyFilters => 'Filter anwenden';

  @override
  String get publishAssignment => 'Aufgabe veröffentlichen';

  @override
  String get publishConfirmation =>
      'Möchten Sie diese Aufgabe wirklich veröffentlichen? Schüler können sie dann sehen.';

  @override
  String get publish => 'Veröffentlichen';

  @override
  String get closeAssignment => 'Aufgabe schließen';

  @override
  String get duplicate => 'Duplizieren';

  @override
  String get deleteAssignment => 'Aufgabe löschen';

  @override
  String get deleteConfirmation =>
      'Sind Sie sicher? Diese Aktion kann nicht rückgängig gemacht werden.';

  @override
  String get details => 'Details';

  @override
  String get submissions => 'Abgaben';

  @override
  String submissionsCount(int count) {
    return 'Abgaben ($count)';
  }

  @override
  String get progress => 'Fortschritt';

  @override
  String get submitted => 'Eingereicht';

  @override
  String get graded => 'Benotet';

  @override
  String get missing => 'Fehlend';

  @override
  String completionRate(String percent) {
    return '$percent% Abschlussrate';
  }

  @override
  String gradeAll(int count) {
    return 'Alle benoten ($count)';
  }

  @override
  String get markMissingZero => 'Fehlende mit 0 bewerten';

  @override
  String get markMissingZeroConfirmation =>
      'Alle fehlenden Abgaben erhalten die Note 0. Fortfahren?';

  @override
  String get noSubmissionsYet => 'Noch keine Abgaben';

  @override
  String get notSubmitted => 'Nicht eingereicht';

  @override
  String get submittedLate => 'Verspätet eingereicht';

  @override
  String get returned => 'Zurückgegeben';

  @override
  String get excused => 'Entschuldigt';

  @override
  String get late => 'Verspätet';

  @override
  String get gradeSubmission => 'Abgabe benoten';

  @override
  String get points => 'Punkte';

  @override
  String pointsOutOf(String max) {
    return 'Punkte (von $max)';
  }

  @override
  String get fullCredit => 'Volle Punktzahl';

  @override
  String get feedback => 'Feedback';

  @override
  String get feedbackPlaceholder => 'Feedback für den Schüler eingeben...';

  @override
  String get excuseFromAssignment => 'Von Aufgabe befreien';

  @override
  String get excuseExplanation => 'Note wird nicht in die Endnote einberechnet';

  @override
  String get applyLatePenalty => 'Verspätungsabzug anwenden';

  @override
  String get saveGrade => 'Note speichern';

  @override
  String get saveAndNext => 'Speichern & Nächste benoten';

  @override
  String get gradeSaved => 'Note gespeichert';

  @override
  String get errorSavingGrade => 'Fehler beim Speichern der Note';

  @override
  String get overall => 'Gesamt';

  @override
  String get overallGrade => 'Gesamtnote';

  @override
  String gradedCount(int graded, int total) {
    return '$graded/$total benotet';
  }

  @override
  String missingCount(int count) {
    return '$count fehlend';
  }

  @override
  String get filterOptions => 'Filteroptionen';

  @override
  String get showAtRiskOnly => 'Nur gefährdete Schüler anzeigen';

  @override
  String get atRiskDescription => 'Schüler unter 70%';

  @override
  String get exportGradebook => 'Notenbuch exportieren';

  @override
  String get recalculateGrades => 'Noten neu berechnen';

  @override
  String get gradebookExported => 'Notenbuch exportiert';

  @override
  String get quickGrade => 'Schnellbewertung';

  @override
  String get excuse => 'Entschuldigen';

  @override
  String get integrations => 'Integrationen';

  @override
  String get googleClassroom => 'Google Classroom';

  @override
  String get canvas => 'Canvas';

  @override
  String get clever => 'Clever';

  @override
  String get connected => 'Verbunden';

  @override
  String get disconnected => 'Getrennt';

  @override
  String get connecting => 'Verbinden...';

  @override
  String get connect => 'Verbinden';

  @override
  String get disconnect => 'Trennen';

  @override
  String lastSync(String time) {
    return 'Letzte Synchronisierung: $time';
  }

  @override
  String get syncNow => 'Jetzt synchronisieren';

  @override
  String get syncAll => 'Alle synchronisieren';

  @override
  String get syncHistory => 'Synchronisierungsverlauf';

  @override
  String get gradePassback => 'Notenrückgabe';

  @override
  String get pendingGrades => 'Ausstehende Noten';

  @override
  String get courseMappings => 'Kurszuordnungen';

  @override
  String get mapCourse => 'Kurs zuordnen';

  @override
  String get offlineMode => 'Offlinemodus';

  @override
  String syncPending(int count) {
    return '$count Änderungen warten auf Synchronisierung';
  }

  @override
  String get allChangesSynced => 'Alle Änderungen synchronisiert';

  @override
  String get syncingChanges => 'Änderungen werden synchronisiert...';

  @override
  String get notifications => 'Benachrichtigungen';

  @override
  String get notificationSettings => 'Benachrichtigungseinstellungen';

  @override
  String get pushNotifications => 'Push-Benachrichtigungen';

  @override
  String get emailNotifications => 'E-Mail-Benachrichtigungen';

  @override
  String get profile => 'Profil';

  @override
  String get logout => 'Abmelden';

  @override
  String get logoutConfirmation => 'Möchten Sie sich wirklich abmelden?';

  @override
  String get about => 'Über';

  @override
  String version(String version) {
    return 'Version $version';
  }

  @override
  String get privacyPolicy => 'Datenschutzrichtlinie';

  @override
  String get termsOfService => 'Nutzungsbedingungen';

  @override
  String get help => 'Hilfe';

  @override
  String get support => 'Support';
}
