import 'package:flutter/material.dart';

abstract class AppLocalizations {
  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  // Navigation
  String get navDashboard;
  String get navMessages;
  String get navReports;
  String get navSettings;

  // Dashboard
  String get dashboardTitle;
  String welcomeBack(String name);
  String get downloadReport;
  String get timeSpent;
  String get minutes;
  String get activeDays;
  String get avgScore;
  String get subjects;
  String get recentActivity;
  String get viewAll;

  // Messages
  String get messagesTitle;
  String get newMessage;
  String get noMessages;
  String get startConversation;
  String get selectChild;
  String get selectTeacher;
  String get subject;
  String get message;
  String get send;
  String get cancel;
  String get typeMessage;
  String get reportConversation;
  String get reportConversationConfirm;
  String get reportMessage;
  String get reportMessageConfirm;
  String get report;
  String get reportSubmitted;

  // Consent
  String get consentTitle;
  String get privacyNotice;
  String get coppaFerpaCompliance;
  String get dataCollection;
  String get dataCollectionDesc;
  String get learningAnalytics;
  String get learningAnalyticsDesc;
  String get progressSharing;
  String get progressSharingDesc;
  String get communications;
  String get communicationsDesc;
  String get emailNotifications;
  String get emailNotificationsDesc;
  String get pushNotifications;
  String get pushNotificationsDesc;
  String get weeklyDigest;
  String get weeklyDigestDesc;
  String get aiFeatures;
  String get aiFeaturesDesc;
  String get aiPersonalization;
  String get aiPersonalizationDesc;
  String get voiceInput;
  String get voiceInputDesc;
  String get requestDataExport;
  String get requestDataDeletion;
  String get dataDeletionWarning;
  String get dataDeletionRequested;
  String get requestDeletion;

  // Settings
  String get settingsTitle;
  String get profile;
  String get language;
  String get appLanguage;
  String get notifications;
  String get privacy;
  String get manageConsent;
  String get changePassword;
  String get appearance;
  String get theme;
  String get themeSystem;
  String get themeLight;
  String get themeDark;
  String get about;
  String get version;
  String get termsOfService;
  String get privacyPolicy;
  String get logout;

  // Reports
  String get reportsTitle;
  String get downloadPdf;
  String get week;
  String get month;
  String get semester;
  String get progressOverTime;
  String get subjectBreakdown;
  String get teacherNotes;
}

class AppLocalizationsEn extends AppLocalizations {
  @override String get navDashboard => 'Dashboard';
  @override String get navMessages => 'Messages';
  @override String get navReports => 'Reports';
  @override String get navSettings => 'Settings';

  @override String get dashboardTitle => 'Dashboard';
  @override String welcomeBack(String name) => 'Welcome back, $name!';
  @override String get downloadReport => 'Download Report';
  @override String get timeSpent => 'Time Spent';
  @override String get minutes => 'min';
  @override String get activeDays => 'Active Days';
  @override String get avgScore => 'Avg Score';
  @override String get subjects => 'Subjects';
  @override String get recentActivity => 'Recent Activity';
  @override String get viewAll => 'View All';

  @override String get messagesTitle => 'Messages';
  @override String get newMessage => 'New Message';
  @override String get noMessages => 'No messages yet';
  @override String get startConversation => 'Start a conversation with your child\'s teacher';
  @override String get selectChild => 'Select Child';
  @override String get selectTeacher => 'Select Teacher';
  @override String get subject => 'Subject';
  @override String get message => 'Message';
  @override String get send => 'Send';
  @override String get cancel => 'Cancel';
  @override String get typeMessage => 'Type a message...';
  @override String get reportConversation => 'Report Conversation';
  @override String get reportConversationConfirm => 'Are you sure you want to report this conversation?';
  @override String get reportMessage => 'Report Message';
  @override String get reportMessageConfirm => 'Are you sure you want to report this message?';
  @override String get report => 'Report';
  @override String get reportSubmitted => 'Report submitted';

  @override String get consentTitle => 'Privacy & Consent';
  @override String get privacyNotice => 'Privacy Notice';
  @override String get coppaFerpaCompliance => 'We comply with COPPA and FERPA regulations to protect your child\'s data.';
  @override String get dataCollection => 'Data Collection';
  @override String get dataCollectionDesc => 'Control how we collect and use learning data';
  @override String get learningAnalytics => 'Learning Analytics';
  @override String get learningAnalyticsDesc => 'Track progress and personalize learning experience';
  @override String get progressSharing => 'Progress Sharing';
  @override String get progressSharingDesc => 'Share progress reports with teachers';
  @override String get communications => 'Communications';
  @override String get communicationsDesc => 'Manage notification preferences';
  @override String get emailNotifications => 'Email Notifications';
  @override String get emailNotificationsDesc => 'Receive updates via email';
  @override String get pushNotifications => 'Push Notifications';
  @override String get pushNotificationsDesc => 'Receive instant notifications';
  @override String get weeklyDigest => 'Weekly Digest';
  @override String get weeklyDigestDesc => 'Weekly summary of your child\'s progress';
  @override String get aiFeatures => 'AI Features';
  @override String get aiFeaturesDesc => 'Control AI-powered features';
  @override String get aiPersonalization => 'AI Personalization';
  @override String get aiPersonalizationDesc => 'Use AI to personalize learning path';
  @override String get voiceInput => 'Voice Input';
  @override String get voiceInputDesc => 'Allow voice commands and dictation';
  @override String get requestDataExport => 'Request Data Export';
  @override String get requestDataDeletion => 'Request Data Deletion';
  @override String get dataDeletionWarning => 'This will permanently delete all data. This action cannot be undone.';
  @override String get dataDeletionRequested => 'Deletion request submitted';
  @override String get requestDeletion => 'Request Deletion';

  @override String get settingsTitle => 'Settings';
  @override String get profile => 'Profile';
  @override String get language => 'Language';
  @override String get appLanguage => 'App Language';
  @override String get notifications => 'Notifications';
  @override String get privacy => 'Privacy';
  @override String get manageConsent => 'Manage Consent';
  @override String get changePassword => 'Change Password';
  @override String get appearance => 'Appearance';
  @override String get theme => 'Theme';
  @override String get themeSystem => 'System';
  @override String get themeLight => 'Light';
  @override String get themeDark => 'Dark';
  @override String get about => 'About';
  @override String get version => 'Version';
  @override String get termsOfService => 'Terms of Service';
  @override String get privacyPolicy => 'Privacy Policy';
  @override String get logout => 'Logout';

  @override String get reportsTitle => 'Progress Reports';
  @override String get downloadPdf => 'Download PDF';
  @override String get week => 'Week';
  @override String get month => 'Month';
  @override String get semester => 'Semester';
  @override String get progressOverTime => 'Progress Over Time';
  @override String get subjectBreakdown => 'Subject Breakdown';
  @override String get teacherNotes => 'Teacher Notes';
}

class AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => ['en', 'es', 'fr', 'de', 'pt', 'zh', 'ja', 'ko', 'ar', 'hi'].contains(locale.languageCode);

  @override
  Future<AppLocalizations> load(Locale locale) async {
    switch (locale.languageCode) {
      case 'es':
        return AppLocalizationsEs();
      case 'fr':
        return AppLocalizationsFr();
      default:
        return AppLocalizationsEn();
    }
  }

  @override
  bool shouldReload(AppLocalizationsDelegate old) => false;
}

// Spanish
class AppLocalizationsEs extends AppLocalizations {
  @override String get navDashboard => 'Panel';
  @override String get navMessages => 'Mensajes';
  @override String get navReports => 'Informes';
  @override String get navSettings => 'Ajustes';

  @override String get dashboardTitle => 'Panel';
  @override String welcomeBack(String name) => '¡Bienvenido, $name!';
  @override String get downloadReport => 'Descargar Informe';
  @override String get timeSpent => 'Tiempo';
  @override String get minutes => 'min';
  @override String get activeDays => 'Días Activos';
  @override String get avgScore => 'Promedio';
  @override String get subjects => 'Materias';
  @override String get recentActivity => 'Actividad Reciente';
  @override String get viewAll => 'Ver Todo';

  @override String get messagesTitle => 'Mensajes';
  @override String get newMessage => 'Nuevo Mensaje';
  @override String get noMessages => 'No hay mensajes';
  @override String get startConversation => 'Inicia una conversación con el maestro';
  @override String get selectChild => 'Seleccionar Hijo';
  @override String get selectTeacher => 'Seleccionar Maestro';
  @override String get subject => 'Asunto';
  @override String get message => 'Mensaje';
  @override String get send => 'Enviar';
  @override String get cancel => 'Cancelar';
  @override String get typeMessage => 'Escribe un mensaje...';
  @override String get reportConversation => 'Reportar Conversación';
  @override String get reportConversationConfirm => '¿Estás seguro de reportar esta conversación?';
  @override String get reportMessage => 'Reportar Mensaje';
  @override String get reportMessageConfirm => '¿Estás seguro de reportar este mensaje?';
  @override String get report => 'Reportar';
  @override String get reportSubmitted => 'Reporte enviado';

  @override String get consentTitle => 'Privacidad y Consentimiento';
  @override String get privacyNotice => 'Aviso de Privacidad';
  @override String get coppaFerpaCompliance => 'Cumplimos con COPPA y FERPA para proteger los datos de su hijo.';
  @override String get dataCollection => 'Recopilación de Datos';
  @override String get dataCollectionDesc => 'Controla cómo recopilamos datos';
  @override String get learningAnalytics => 'Análisis de Aprendizaje';
  @override String get learningAnalyticsDesc => 'Seguimiento del progreso';
  @override String get progressSharing => 'Compartir Progreso';
  @override String get progressSharingDesc => 'Compartir informes con maestros';
  @override String get communications => 'Comunicaciones';
  @override String get communicationsDesc => 'Gestionar preferencias de notificación';
  @override String get emailNotifications => 'Notificaciones por Email';
  @override String get emailNotificationsDesc => 'Recibir actualizaciones por email';
  @override String get pushNotifications => 'Notificaciones Push';
  @override String get pushNotificationsDesc => 'Recibir notificaciones instantáneas';
  @override String get weeklyDigest => 'Resumen Semanal';
  @override String get weeklyDigestDesc => 'Resumen semanal del progreso';
  @override String get aiFeatures => 'Funciones de IA';
  @override String get aiFeaturesDesc => 'Controlar funciones de IA';
  @override String get aiPersonalization => 'Personalización IA';
  @override String get aiPersonalizationDesc => 'Usar IA para personalizar el aprendizaje';
  @override String get voiceInput => 'Entrada de Voz';
  @override String get voiceInputDesc => 'Permitir comandos de voz';
  @override String get requestDataExport => 'Solicitar Exportación';
  @override String get requestDataDeletion => 'Solicitar Eliminación';
  @override String get dataDeletionWarning => 'Esto eliminará todos los datos permanentemente.';
  @override String get dataDeletionRequested => 'Solicitud de eliminación enviada';
  @override String get requestDeletion => 'Solicitar Eliminación';

  @override String get settingsTitle => 'Ajustes';
  @override String get profile => 'Perfil';
  @override String get language => 'Idioma';
  @override String get appLanguage => 'Idioma de la App';
  @override String get notifications => 'Notificaciones';
  @override String get privacy => 'Privacidad';
  @override String get manageConsent => 'Gestionar Consentimiento';
  @override String get changePassword => 'Cambiar Contraseña';
  @override String get appearance => 'Apariencia';
  @override String get theme => 'Tema';
  @override String get themeSystem => 'Sistema';
  @override String get themeLight => 'Claro';
  @override String get themeDark => 'Oscuro';
  @override String get about => 'Acerca de';
  @override String get version => 'Versión';
  @override String get termsOfService => 'Términos de Servicio';
  @override String get privacyPolicy => 'Política de Privacidad';
  @override String get logout => 'Cerrar Sesión';

  @override String get reportsTitle => 'Informes de Progreso';
  @override String get downloadPdf => 'Descargar PDF';
  @override String get week => 'Semana';
  @override String get month => 'Mes';
  @override String get semester => 'Semestre';
  @override String get progressOverTime => 'Progreso en el Tiempo';
  @override String get subjectBreakdown => 'Desglose por Materia';
  @override String get teacherNotes => 'Notas del Maestro';
}

// French
class AppLocalizationsFr extends AppLocalizations {
  @override String get navDashboard => 'Tableau de bord';
  @override String get navMessages => 'Messages';
  @override String get navReports => 'Rapports';
  @override String get navSettings => 'Paramètres';

  @override String get dashboardTitle => 'Tableau de bord';
  @override String welcomeBack(String name) => 'Bienvenue, $name!';
  @override String get downloadReport => 'Télécharger';
  @override String get timeSpent => 'Temps passé';
  @override String get minutes => 'min';
  @override String get activeDays => 'Jours actifs';
  @override String get avgScore => 'Score moyen';
  @override String get subjects => 'Matières';
  @override String get recentActivity => 'Activité récente';
  @override String get viewAll => 'Voir tout';

  @override String get messagesTitle => 'Messages';
  @override String get newMessage => 'Nouveau message';
  @override String get noMessages => 'Aucun message';
  @override String get startConversation => 'Démarrer une conversation';
  @override String get selectChild => 'Sélectionner enfant';
  @override String get selectTeacher => 'Sélectionner enseignant';
  @override String get subject => 'Sujet';
  @override String get message => 'Message';
  @override String get send => 'Envoyer';
  @override String get cancel => 'Annuler';
  @override String get typeMessage => 'Écrire un message...';
  @override String get reportConversation => 'Signaler';
  @override String get reportConversationConfirm => 'Voulez-vous signaler cette conversation?';
  @override String get reportMessage => 'Signaler message';
  @override String get reportMessageConfirm => 'Voulez-vous signaler ce message?';
  @override String get report => 'Signaler';
  @override String get reportSubmitted => 'Signalement envoyé';

  @override String get consentTitle => 'Confidentialité';
  @override String get privacyNotice => 'Avis de confidentialité';
  @override String get coppaFerpaCompliance => 'Nous respectons COPPA et FERPA.';
  @override String get dataCollection => 'Collecte de données';
  @override String get dataCollectionDesc => 'Contrôlez la collecte de données';
  @override String get learningAnalytics => 'Analyses d\'apprentissage';
  @override String get learningAnalyticsDesc => 'Suivi des progrès';
  @override String get progressSharing => 'Partage des progrès';
  @override String get progressSharingDesc => 'Partager avec les enseignants';
  @override String get communications => 'Communications';
  @override String get communicationsDesc => 'Gérer les notifications';
  @override String get emailNotifications => 'Notifications email';
  @override String get emailNotificationsDesc => 'Recevoir des mises à jour';
  @override String get pushNotifications => 'Notifications push';
  @override String get pushNotificationsDesc => 'Notifications instantanées';
  @override String get weeklyDigest => 'Résumé hebdomadaire';
  @override String get weeklyDigestDesc => 'Résumé des progrès';
  @override String get aiFeatures => 'Fonctionnalités IA';
  @override String get aiFeaturesDesc => 'Contrôler les fonctions IA';
  @override String get aiPersonalization => 'Personnalisation IA';
  @override String get aiPersonalizationDesc => 'Utiliser l\'IA pour personnaliser';
  @override String get voiceInput => 'Saisie vocale';
  @override String get voiceInputDesc => 'Autoriser les commandes vocales';
  @override String get requestDataExport => 'Exporter les données';
  @override String get requestDataDeletion => 'Supprimer les données';
  @override String get dataDeletionWarning => 'Ceci supprimera toutes les données.';
  @override String get dataDeletionRequested => 'Demande de suppression envoyée';
  @override String get requestDeletion => 'Supprimer';

  @override String get settingsTitle => 'Paramètres';
  @override String get profile => 'Profil';
  @override String get language => 'Langue';
  @override String get appLanguage => 'Langue de l\'app';
  @override String get notifications => 'Notifications';
  @override String get privacy => 'Confidentialité';
  @override String get manageConsent => 'Gérer le consentement';
  @override String get changePassword => 'Changer le mot de passe';
  @override String get appearance => 'Apparence';
  @override String get theme => 'Thème';
  @override String get themeSystem => 'Système';
  @override String get themeLight => 'Clair';
  @override String get themeDark => 'Sombre';
  @override String get about => 'À propos';
  @override String get version => 'Version';
  @override String get termsOfService => 'Conditions d\'utilisation';
  @override String get privacyPolicy => 'Politique de confidentialité';
  @override String get logout => 'Déconnexion';

  @override String get reportsTitle => 'Rapports de progrès';
  @override String get downloadPdf => 'Télécharger PDF';
  @override String get week => 'Semaine';
  @override String get month => 'Mois';
  @override String get semester => 'Semestre';
  @override String get progressOverTime => 'Progrès dans le temps';
  @override String get subjectBreakdown => 'Par matière';
  @override String get teacherNotes => 'Notes de l\'enseignant';
}
