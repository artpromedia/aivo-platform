// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for French (`fr`).
class AppLocalizationsFr extends AppLocalizations {
  AppLocalizationsFr([String locale = 'fr']) : super(locale);

  @override
  String get appTitle => 'Aivo Enseignant';

  @override
  String get dashboard => 'Tableau de bord';

  @override
  String get students => 'Étudiants';

  @override
  String get sessions => 'Sessions';

  @override
  String get messages => 'Messages';

  @override
  String get reports => 'Rapports';

  @override
  String get settings => 'Paramètres';

  @override
  String get gradebook => 'Carnet de notes';

  @override
  String get assignments => 'Devoirs';

  @override
  String get loading => 'Chargement...';

  @override
  String get retry => 'Réessayer';

  @override
  String get cancel => 'Annuler';

  @override
  String get save => 'Enregistrer';

  @override
  String get delete => 'Supprimer';

  @override
  String get edit => 'Modifier';

  @override
  String get create => 'Créer';

  @override
  String get search => 'Rechercher';

  @override
  String get filter => 'Filtrer';

  @override
  String get clear => 'Effacer';

  @override
  String get done => 'Terminé';

  @override
  String get close => 'Fermer';

  @override
  String get back => 'Retour';

  @override
  String get next => 'Suivant';

  @override
  String get submit => 'Soumettre';

  @override
  String get confirm => 'Confirmer';

  @override
  String get error => 'Erreur';

  @override
  String get errorLoadingData => 'Erreur lors du chargement des données';

  @override
  String get noDataFound => 'Aucune donnée trouvée';

  @override
  String get networkError => 'Erreur réseau. Vérifiez votre connexion.';

  @override
  String get unexpectedError => 'Une erreur inattendue s\'est produite';

  @override
  String get tryAgain => 'Réessayer';

  @override
  String get searchStudents => 'Rechercher des étudiants...';

  @override
  String get filterStudents => 'Filtrer les étudiants';

  @override
  String get showIepOnly => 'Afficher uniquement les étudiants avec PEI';

  @override
  String get studentStatus => 'Statut';

  @override
  String get active => 'Actif';

  @override
  String get inactive => 'Inactif';

  @override
  String get transferred => 'Transféré';

  @override
  String get studentDetails => 'Détails de l\'étudiant';

  @override
  String get viewIep => 'Voir le PEI';

  @override
  String gradeLevel(int level) {
    return 'Niveau $level';
  }

  @override
  String get noStudents => 'Aucun étudiant trouvé';

  @override
  String get studentsNeedingAttention => 'Étudiants nécessitant une attention';

  @override
  String get studentsWithIep => 'Étudiants avec PEI';

  @override
  String get searchAssignments => 'Rechercher des devoirs...';

  @override
  String get filterAssignments => 'Filtrer les devoirs';

  @override
  String get newAssignment => 'Nouveau devoir';

  @override
  String get assignmentDetails => 'Détails du devoir';

  @override
  String get assignmentType => 'Type';

  @override
  String get pointsPossible => 'Points possibles';

  @override
  String get dueDate => 'Date limite';

  @override
  String get availableFrom => 'Disponible à partir du';

  @override
  String get locksAt => 'Verrouillé le';

  @override
  String get category => 'Catégorie';

  @override
  String get weight => 'Poids';

  @override
  String get lateSubmissions => 'Soumissions tardives';

  @override
  String get allowed => 'Autorisé';

  @override
  String get notAllowed => 'Non autorisé';

  @override
  String get latePenalty => 'Pénalité de retard';

  @override
  String get description => 'Description';

  @override
  String get instructions => 'Instructions';

  @override
  String get draft => 'Brouillon';

  @override
  String get published => 'Publié';

  @override
  String get closed => 'Fermé';

  @override
  String get archived => 'Archivé';

  @override
  String get homework => 'Devoir';

  @override
  String get quiz => 'Quiz';

  @override
  String get test => 'Test';

  @override
  String get project => 'Projet';

  @override
  String get classwork => 'Travail en classe';

  @override
  String get practice => 'Pratique';

  @override
  String get assessment => 'Évaluation';

  @override
  String get pastDue => 'En retard';

  @override
  String get noDueDate => 'Pas de date limite';

  @override
  String ungraded(int count) {
    return '$count non noté(s)';
  }

  @override
  String submissionProgress(int submitted, int total) {
    return '$submitted/$total soumis';
  }

  @override
  String get noAssignments => 'Pas encore de devoirs';

  @override
  String get noAssignmentsMatch => 'Aucun devoir ne correspond aux filtres';

  @override
  String get clearFilters => 'Effacer les filtres';

  @override
  String get createFirstAssignment => 'Créez votre premier devoir';

  @override
  String get needsGradingOnly => 'À noter uniquement';

  @override
  String get applyFilters => 'Appliquer les filtres';

  @override
  String get publishAssignment => 'Publier le devoir';

  @override
  String get publishConfirmation =>
      'Êtes-vous sûr de vouloir publier ce devoir ? Les étudiants pourront le voir.';

  @override
  String get publish => 'Publier';

  @override
  String get closeAssignment => 'Fermer le devoir';

  @override
  String get duplicate => 'Dupliquer';

  @override
  String get deleteAssignment => 'Supprimer le devoir';

  @override
  String get deleteConfirmation =>
      'Êtes-vous sûr ? Cette action est irréversible.';

  @override
  String get details => 'Détails';

  @override
  String get submissions => 'Soumissions';

  @override
  String submissionsCount(int count) {
    return 'Soumissions ($count)';
  }

  @override
  String get progress => 'Progression';

  @override
  String get submitted => 'Soumis';

  @override
  String get graded => 'Noté';

  @override
  String get missing => 'Manquant';

  @override
  String completionRate(String percent) {
    return '$percent% de complétion';
  }

  @override
  String gradeAll(int count) {
    return 'Tout noter ($count)';
  }

  @override
  String get markMissingZero => 'Marquer manquants à 0';

  @override
  String get markMissingZeroConfirmation =>
      'Cela attribuera 0 à toutes les soumissions manquantes. Continuer ?';

  @override
  String get noSubmissionsYet => 'Pas encore de soumissions';

  @override
  String get notSubmitted => 'Non soumis';

  @override
  String get submittedLate => 'Soumis en retard';

  @override
  String get returned => 'Retourné';

  @override
  String get excused => 'Excusé';

  @override
  String get late => 'En retard';

  @override
  String get gradeSubmission => 'Noter la soumission';

  @override
  String get points => 'Points';

  @override
  String pointsOutOf(String max) {
    return 'Points (sur $max)';
  }

  @override
  String get fullCredit => 'Complet';

  @override
  String get feedback => 'Commentaires';

  @override
  String get feedbackPlaceholder => 'Entrez un commentaire pour l\'étudiant...';

  @override
  String get excuseFromAssignment => 'Exempter du devoir';

  @override
  String get excuseExplanation => 'La note ne comptera pas dans la moyenne';

  @override
  String get applyLatePenalty => 'Appliquer la pénalité de retard';

  @override
  String get saveGrade => 'Enregistrer la note';

  @override
  String get saveAndNext => 'Enregistrer et suivant';

  @override
  String get gradeSaved => 'Note enregistrée';

  @override
  String get errorSavingGrade => 'Erreur lors de l\'enregistrement';

  @override
  String get overall => 'Général';

  @override
  String get overallGrade => 'Note générale';

  @override
  String gradedCount(int graded, int total) {
    return '$graded/$total noté(s)';
  }

  @override
  String missingCount(int count) {
    return '$count manquant(s)';
  }

  @override
  String get filterOptions => 'Options de filtre';

  @override
  String get showAtRiskOnly => 'Afficher uniquement les étudiants à risque';

  @override
  String get atRiskDescription => 'Étudiants en dessous de 70%';

  @override
  String get exportGradebook => 'Exporter le carnet de notes';

  @override
  String get recalculateGrades => 'Recalculer les notes';

  @override
  String get gradebookExported => 'Carnet de notes exporté';

  @override
  String get quickGrade => 'Note rapide';

  @override
  String get excuse => 'Exempter';

  @override
  String get integrations => 'Intégrations';

  @override
  String get googleClassroom => 'Google Classroom';

  @override
  String get canvas => 'Canvas';

  @override
  String get clever => 'Clever';

  @override
  String get connected => 'Connecté';

  @override
  String get disconnected => 'Déconnecté';

  @override
  String get connecting => 'Connexion...';

  @override
  String get connect => 'Connecter';

  @override
  String get disconnect => 'Déconnecter';

  @override
  String lastSync(String time) {
    return 'Dernière sync : $time';
  }

  @override
  String get syncNow => 'Synchroniser';

  @override
  String get syncAll => 'Tout synchroniser';

  @override
  String get syncHistory => 'Historique de sync';

  @override
  String get gradePassback => 'Envoi des notes';

  @override
  String get pendingGrades => 'Notes en attente';

  @override
  String get courseMappings => 'Correspondances de cours';

  @override
  String get mapCourse => 'Mapper un cours';

  @override
  String get offlineMode => 'Mode hors ligne';

  @override
  String syncPending(int count) {
    return '$count modification(s) en attente';
  }

  @override
  String get allChangesSynced => 'Toutes les modifications synchronisées';

  @override
  String get syncingChanges => 'Synchronisation en cours...';

  @override
  String get notifications => 'Notifications';

  @override
  String get notificationSettings => 'Paramètres de notification';

  @override
  String get pushNotifications => 'Notifications push';

  @override
  String get emailNotifications => 'Notifications par email';

  @override
  String get profile => 'Profil';

  @override
  String get logout => 'Déconnexion';

  @override
  String get logoutConfirmation =>
      'Êtes-vous sûr de vouloir vous déconnecter ?';

  @override
  String get about => 'À propos';

  @override
  String version(String version) {
    return 'Version $version';
  }

  @override
  String get privacyPolicy => 'Politique de confidentialité';

  @override
  String get termsOfService => 'Conditions d\'utilisation';

  @override
  String get help => 'Aide';

  @override
  String get support => 'Support';
}
