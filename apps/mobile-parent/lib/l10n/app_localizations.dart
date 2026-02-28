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
  bool isSupported(Locale locale) => ['en', 'es', 'fr', 'de', 'pt', 'zh', 'ja', 'ko', 'ar', 'hi', 'id', 'vi', 'ru', 'tr', 'it'].contains(locale.languageCode);

  @override
  Future<AppLocalizations> load(Locale locale) async {
    switch (locale.languageCode) {
      case 'es':
        return AppLocalizationsEs();
      case 'fr':
        return AppLocalizationsFr();
      case 'id':
        return AppLocalizationsId();
      case 'vi':
        return AppLocalizationsVi();
      case 'ru':
        return AppLocalizationsRu();
      case 'tr':
        return AppLocalizationsTr();
      case 'it':
        return AppLocalizationsIt();
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

// Indonesian
class AppLocalizationsId extends AppLocalizations {
  @override String get navDashboard => 'Dasbor';
  @override String get navMessages => 'Pesan';
  @override String get navReports => 'Laporan';
  @override String get navSettings => 'Pengaturan';

  @override String get dashboardTitle => 'Dasbor';
  @override String welcomeBack(String name) => 'Selamat datang kembali, $name!';
  @override String get downloadReport => 'Unduh Laporan';
  @override String get timeSpent => 'Waktu Belajar';
  @override String get minutes => 'mnt';
  @override String get activeDays => 'Hari Aktif';
  @override String get avgScore => 'Skor Rata-rata';
  @override String get subjects => 'Mata Pelajaran';
  @override String get recentActivity => 'Aktivitas Terbaru';
  @override String get viewAll => 'Lihat Semua';

  @override String get messagesTitle => 'Pesan';
  @override String get newMessage => 'Pesan Baru';
  @override String get noMessages => 'Belum ada pesan';
  @override String get startConversation => 'Mulai percakapan dengan guru anak Anda';
  @override String get selectChild => 'Pilih Anak';
  @override String get selectTeacher => 'Pilih Guru';
  @override String get subject => 'Subjek';
  @override String get message => 'Pesan';
  @override String get send => 'Kirim';
  @override String get cancel => 'Batal';
  @override String get typeMessage => 'Ketik pesan...';
  @override String get reportConversation => 'Laporkan Percakapan';
  @override String get reportConversationConfirm => 'Apakah Anda yakin ingin melaporkan percakapan ini?';
  @override String get reportMessage => 'Laporkan Pesan';
  @override String get reportMessageConfirm => 'Apakah Anda yakin ingin melaporkan pesan ini?';
  @override String get report => 'Laporkan';
  @override String get reportSubmitted => 'Laporan terkirim';

  @override String get consentTitle => 'Privasi & Persetujuan';
  @override String get privacyNotice => 'Pemberitahuan Privasi';
  @override String get coppaFerpaCompliance => 'Kami mematuhi peraturan COPPA dan FERPA untuk melindungi data anak Anda.';
  @override String get dataCollection => 'Pengumpulan Data';
  @override String get dataCollectionDesc => 'Kontrol cara kami mengumpulkan dan menggunakan data pembelajaran';
  @override String get learningAnalytics => 'Analitik Pembelajaran';
  @override String get learningAnalyticsDesc => 'Pantau kemajuan dan personalisasi pengalaman belajar';
  @override String get progressSharing => 'Berbagi Kemajuan';
  @override String get progressSharingDesc => 'Bagikan laporan kemajuan dengan guru';
  @override String get communications => 'Komunikasi';
  @override String get communicationsDesc => 'Kelola preferensi notifikasi';
  @override String get emailNotifications => 'Notifikasi Email';
  @override String get emailNotificationsDesc => 'Terima pembaruan melalui email';
  @override String get pushNotifications => 'Notifikasi Push';
  @override String get pushNotificationsDesc => 'Terima notifikasi instan';
  @override String get weeklyDigest => 'Ringkasan Mingguan';
  @override String get weeklyDigestDesc => 'Ringkasan mingguan kemajuan anak Anda';
  @override String get aiFeatures => 'Fitur AI';
  @override String get aiFeaturesDesc => 'Kontrol fitur berbasis AI';
  @override String get aiPersonalization => 'Personalisasi AI';
  @override String get aiPersonalizationDesc => 'Gunakan AI untuk mempersonalisasi jalur pembelajaran';
  @override String get voiceInput => 'Input Suara';
  @override String get voiceInputDesc => 'Izinkan perintah suara dan dikte';
  @override String get requestDataExport => 'Minta Ekspor Data';
  @override String get requestDataDeletion => 'Minta Penghapusan Data';
  @override String get dataDeletionWarning => 'Ini akan menghapus semua data secara permanen. Tindakan ini tidak dapat dibatalkan.';
  @override String get dataDeletionRequested => 'Permintaan penghapusan terkirim';
  @override String get requestDeletion => 'Minta Penghapusan';

  @override String get settingsTitle => 'Pengaturan';
  @override String get profile => 'Profil';
  @override String get language => 'Bahasa';
  @override String get appLanguage => 'Bahasa Aplikasi';
  @override String get notifications => 'Notifikasi';
  @override String get privacy => 'Privasi';
  @override String get manageConsent => 'Kelola Persetujuan';
  @override String get changePassword => 'Ubah Kata Sandi';
  @override String get appearance => 'Tampilan';
  @override String get theme => 'Tema';
  @override String get themeSystem => 'Sistem';
  @override String get themeLight => 'Terang';
  @override String get themeDark => 'Gelap';
  @override String get about => 'Tentang';
  @override String get version => 'Versi';
  @override String get termsOfService => 'Ketentuan Layanan';
  @override String get privacyPolicy => 'Kebijakan Privasi';
  @override String get logout => 'Keluar';

  @override String get reportsTitle => 'Laporan Kemajuan';
  @override String get downloadPdf => 'Unduh PDF';
  @override String get week => 'Minggu';
  @override String get month => 'Bulan';
  @override String get semester => 'Semester';
  @override String get progressOverTime => 'Kemajuan Seiring Waktu';
  @override String get subjectBreakdown => 'Rincian Mata Pelajaran';
  @override String get teacherNotes => 'Catatan Guru';
}

// Vietnamese
class AppLocalizationsVi extends AppLocalizations {
  @override String get navDashboard => 'Bảng điều khiển';
  @override String get navMessages => 'Tin nhắn';
  @override String get navReports => 'Báo cáo';
  @override String get navSettings => 'Cài đặt';

  @override String get dashboardTitle => 'Bảng điều khiển';
  @override String welcomeBack(String name) => 'Chào mừng trở lại, $name!';
  @override String get downloadReport => 'Tải báo cáo';
  @override String get timeSpent => 'Thời gian học';
  @override String get minutes => 'phút';
  @override String get activeDays => 'Ngày hoạt động';
  @override String get avgScore => 'Điểm TB';
  @override String get subjects => 'Môn học';
  @override String get recentActivity => 'Hoạt động gần đây';
  @override String get viewAll => 'Xem tất cả';

  @override String get messagesTitle => 'Tin nhắn';
  @override String get newMessage => 'Tin nhắn mới';
  @override String get noMessages => 'Chưa có tin nhắn';
  @override String get startConversation => 'Bắt đầu cuộc trò chuyện với giáo viên của con bạn';
  @override String get selectChild => 'Chọn con';
  @override String get selectTeacher => 'Chọn giáo viên';
  @override String get subject => 'Chủ đề';
  @override String get message => 'Tin nhắn';
  @override String get send => 'Gửi';
  @override String get cancel => 'Hủy';
  @override String get typeMessage => 'Nhập tin nhắn...';
  @override String get reportConversation => 'Báo cáo cuộc trò chuyện';
  @override String get reportConversationConfirm => 'Bạn có chắc chắn muốn báo cáo cuộc trò chuyện này không?';
  @override String get reportMessage => 'Báo cáo tin nhắn';
  @override String get reportMessageConfirm => 'Bạn có chắc chắn muốn báo cáo tin nhắn này không?';
  @override String get report => 'Báo cáo';
  @override String get reportSubmitted => 'Đã gửi báo cáo';

  @override String get consentTitle => 'Quyền riêng tư & Đồng ý';
  @override String get privacyNotice => 'Thông báo quyền riêng tư';
  @override String get coppaFerpaCompliance => 'Chúng tôi tuân thủ quy định COPPA và FERPA để bảo vệ dữ liệu của con bạn.';
  @override String get dataCollection => 'Thu thập dữ liệu';
  @override String get dataCollectionDesc => 'Kiểm soát cách chúng tôi thu thập và sử dụng dữ liệu học tập';
  @override String get learningAnalytics => 'Phân tích học tập';
  @override String get learningAnalyticsDesc => 'Theo dõi tiến trình và cá nhân hóa trải nghiệm học tập';
  @override String get progressSharing => 'Chia sẻ tiến trình';
  @override String get progressSharingDesc => 'Chia sẻ báo cáo tiến trình với giáo viên';
  @override String get communications => 'Liên lạc';
  @override String get communicationsDesc => 'Quản lý tùy chọn thông báo';
  @override String get emailNotifications => 'Thông báo email';
  @override String get emailNotificationsDesc => 'Nhận cập nhật qua email';
  @override String get pushNotifications => 'Thông báo đẩy';
  @override String get pushNotificationsDesc => 'Nhận thông báo tức thì';
  @override String get weeklyDigest => 'Tóm tắt hàng tuần';
  @override String get weeklyDigestDesc => 'Tóm tắt tiến trình hàng tuần của con bạn';
  @override String get aiFeatures => 'Tính năng AI';
  @override String get aiFeaturesDesc => 'Kiểm soát các tính năng AI';
  @override String get aiPersonalization => 'Cá nhân hóa AI';
  @override String get aiPersonalizationDesc => 'Sử dụng AI để cá nhân hóa lộ trình học tập';
  @override String get voiceInput => 'Nhập giọng nói';
  @override String get voiceInputDesc => 'Cho phép lệnh giọng nói và đọc chính tả';
  @override String get requestDataExport => 'Yêu cầu xuất dữ liệu';
  @override String get requestDataDeletion => 'Yêu cầu xóa dữ liệu';
  @override String get dataDeletionWarning => 'Thao tác này sẽ xóa vĩnh viễn tất cả dữ liệu. Không thể hoàn tác.';
  @override String get dataDeletionRequested => 'Đã gửi yêu cầu xóa';
  @override String get requestDeletion => 'Yêu cầu xóa';

  @override String get settingsTitle => 'Cài đặt';
  @override String get profile => 'Hồ sơ';
  @override String get language => 'Ngôn ngữ';
  @override String get appLanguage => 'Ngôn ngữ ứng dụng';
  @override String get notifications => 'Thông báo';
  @override String get privacy => 'Quyền riêng tư';
  @override String get manageConsent => 'Quản lý đồng ý';
  @override String get changePassword => 'Đổi mật khẩu';
  @override String get appearance => 'Giao diện';
  @override String get theme => 'Chủ đề';
  @override String get themeSystem => 'Hệ thống';
  @override String get themeLight => 'Sáng';
  @override String get themeDark => 'Tối';
  @override String get about => 'Giới thiệu';
  @override String get version => 'Phiên bản';
  @override String get termsOfService => 'Điều khoản dịch vụ';
  @override String get privacyPolicy => 'Chính sách quyền riêng tư';
  @override String get logout => 'Đăng xuất';

  @override String get reportsTitle => 'Báo cáo tiến trình';
  @override String get downloadPdf => 'Tải PDF';
  @override String get week => 'Tuần';
  @override String get month => 'Tháng';
  @override String get semester => 'Học kỳ';
  @override String get progressOverTime => 'Tiến trình theo thời gian';
  @override String get subjectBreakdown => 'Phân tích theo môn học';
  @override String get teacherNotes => 'Ghi chú của giáo viên';
}

// Russian
class AppLocalizationsRu extends AppLocalizations {
  @override String get navDashboard => 'Главная';
  @override String get navMessages => 'Сообщения';
  @override String get navReports => 'Отчёты';
  @override String get navSettings => 'Настройки';

  @override String get dashboardTitle => 'Главная';
  @override String welcomeBack(String name) => 'С возвращением, $name!';
  @override String get downloadReport => 'Скачать отчёт';
  @override String get timeSpent => 'Время занятий';
  @override String get minutes => 'мин';
  @override String get activeDays => 'Активные дни';
  @override String get avgScore => 'Средний балл';
  @override String get subjects => 'Предметы';
  @override String get recentActivity => 'Последняя активность';
  @override String get viewAll => 'Смотреть все';

  @override String get messagesTitle => 'Сообщения';
  @override String get newMessage => 'Новое сообщение';
  @override String get noMessages => 'Сообщений пока нет';
  @override String get startConversation => 'Начните переписку с учителем вашего ребёнка';
  @override String get selectChild => 'Выбрать ребёнка';
  @override String get selectTeacher => 'Выбрать учителя';
  @override String get subject => 'Тема';
  @override String get message => 'Сообщение';
  @override String get send => 'Отправить';
  @override String get cancel => 'Отмена';
  @override String get typeMessage => 'Введите сообщение...';
  @override String get reportConversation => 'Пожаловаться на переписку';
  @override String get reportConversationConfirm => 'Вы уверены, что хотите пожаловаться на эту переписку?';
  @override String get reportMessage => 'Пожаловаться на сообщение';
  @override String get reportMessageConfirm => 'Вы уверены, что хотите пожаловаться на это сообщение?';
  @override String get report => 'Пожаловаться';
  @override String get reportSubmitted => 'Жалоба отправлена';

  @override String get consentTitle => 'Конфиденциальность и согласие';
  @override String get privacyNotice => 'Уведомление о конфиденциальности';
  @override String get coppaFerpaCompliance => 'Мы соблюдаем требования COPPA и FERPA для защиты данных вашего ребёнка.';
  @override String get dataCollection => 'Сбор данных';
  @override String get dataCollectionDesc => 'Управляйте сбором и использованием учебных данных';
  @override String get learningAnalytics => 'Аналитика обучения';
  @override String get learningAnalyticsDesc => 'Отслеживание прогресса и персонализация обучения';
  @override String get progressSharing => 'Обмен результатами';
  @override String get progressSharingDesc => 'Делиться отчётами о прогрессе с учителями';
  @override String get communications => 'Коммуникации';
  @override String get communicationsDesc => 'Управление настройками уведомлений';
  @override String get emailNotifications => 'Уведомления по email';
  @override String get emailNotificationsDesc => 'Получать обновления по электронной почте';
  @override String get pushNotifications => 'Push-уведомления';
  @override String get pushNotificationsDesc => 'Получать мгновенные уведомления';
  @override String get weeklyDigest => 'Еженедельный отчёт';
  @override String get weeklyDigestDesc => 'Еженедельная сводка успеваемости вашего ребёнка';
  @override String get aiFeatures => 'Функции ИИ';
  @override String get aiFeaturesDesc => 'Управление функциями на основе ИИ';
  @override String get aiPersonalization => 'Персонализация ИИ';
  @override String get aiPersonalizationDesc => 'Использовать ИИ для персонализации учебного пути';
  @override String get voiceInput => 'Голосовой ввод';
  @override String get voiceInputDesc => 'Разрешить голосовые команды и диктовку';
  @override String get requestDataExport => 'Запросить экспорт данных';
  @override String get requestDataDeletion => 'Запросить удаление данных';
  @override String get dataDeletionWarning => 'Все данные будут удалены безвозвратно. Это действие нельзя отменить.';
  @override String get dataDeletionRequested => 'Запрос на удаление отправлен';
  @override String get requestDeletion => 'Запросить удаление';

  @override String get settingsTitle => 'Настройки';
  @override String get profile => 'Профиль';
  @override String get language => 'Язык';
  @override String get appLanguage => 'Язык приложения';
  @override String get notifications => 'Уведомления';
  @override String get privacy => 'Конфиденциальность';
  @override String get manageConsent => 'Управление согласием';
  @override String get changePassword => 'Изменить пароль';
  @override String get appearance => 'Оформление';
  @override String get theme => 'Тема';
  @override String get themeSystem => 'Системная';
  @override String get themeLight => 'Светлая';
  @override String get themeDark => 'Тёмная';
  @override String get about => 'О приложении';
  @override String get version => 'Версия';
  @override String get termsOfService => 'Условия использования';
  @override String get privacyPolicy => 'Политика конфиденциальности';
  @override String get logout => 'Выйти';

  @override String get reportsTitle => 'Отчёты об успеваемости';
  @override String get downloadPdf => 'Скачать PDF';
  @override String get week => 'Неделя';
  @override String get month => 'Месяц';
  @override String get semester => 'Семестр';
  @override String get progressOverTime => 'Динамика прогресса';
  @override String get subjectBreakdown => 'По предметам';
  @override String get teacherNotes => 'Заметки учителя';
}

// Turkish
class AppLocalizationsTr extends AppLocalizations {
  @override String get navDashboard => 'Ana Sayfa';
  @override String get navMessages => 'Mesajlar';
  @override String get navReports => 'Raporlar';
  @override String get navSettings => 'Ayarlar';

  @override String get dashboardTitle => 'Ana Sayfa';
  @override String welcomeBack(String name) => 'Tekrar hoş geldiniz, $name!';
  @override String get downloadReport => 'Raporu İndir';
  @override String get timeSpent => 'Harcanan Süre';
  @override String get minutes => 'dk';
  @override String get activeDays => 'Aktif Günler';
  @override String get avgScore => 'Ort. Puan';
  @override String get subjects => 'Dersler';
  @override String get recentActivity => 'Son Etkinlik';
  @override String get viewAll => 'Tümünü Gör';

  @override String get messagesTitle => 'Mesajlar';
  @override String get newMessage => 'Yeni Mesaj';
  @override String get noMessages => 'Henüz mesaj yok';
  @override String get startConversation => 'Çocuğunuzun öğretmeniyle bir görüşme başlatın';
  @override String get selectChild => 'Çocuk Seç';
  @override String get selectTeacher => 'Öğretmen Seç';
  @override String get subject => 'Konu';
  @override String get message => 'Mesaj';
  @override String get send => 'Gönder';
  @override String get cancel => 'İptal';
  @override String get typeMessage => 'Bir mesaj yazın...';
  @override String get reportConversation => 'Görüşmeyi Bildir';
  @override String get reportConversationConfirm => 'Bu görüşmeyi bildirmek istediğinizden emin misiniz?';
  @override String get reportMessage => 'Mesajı Bildir';
  @override String get reportMessageConfirm => 'Bu mesajı bildirmek istediğinizden emin misiniz?';
  @override String get report => 'Bildir';
  @override String get reportSubmitted => 'Bildirim gönderildi';

  @override String get consentTitle => 'Gizlilik ve Onay';
  @override String get privacyNotice => 'Gizlilik Bildirimi';
  @override String get coppaFerpaCompliance => 'Çocuğunuzun verilerini korumak için COPPA ve FERPA düzenlemelerine uyuyoruz.';
  @override String get dataCollection => 'Veri Toplama';
  @override String get dataCollectionDesc => 'Öğrenme verilerinin toplanma ve kullanılma şeklini kontrol edin';
  @override String get learningAnalytics => 'Öğrenme Analitiği';
  @override String get learningAnalyticsDesc => 'İlerlemeyi takip edin ve öğrenme deneyimini kişiselleştirin';
  @override String get progressSharing => 'İlerleme Paylaşımı';
  @override String get progressSharingDesc => 'İlerleme raporlarını öğretmenlerle paylaşın';
  @override String get communications => 'İletişim';
  @override String get communicationsDesc => 'Bildirim tercihlerini yönetin';
  @override String get emailNotifications => 'E-posta Bildirimleri';
  @override String get emailNotificationsDesc => 'E-posta ile güncellemeler alın';
  @override String get pushNotifications => 'Anlık Bildirimler';
  @override String get pushNotificationsDesc => 'Anlık bildirimler alın';
  @override String get weeklyDigest => 'Haftalık Özet';
  @override String get weeklyDigestDesc => 'Çocuğunuzun haftalık ilerleme özeti';
  @override String get aiFeatures => 'Yapay Zeka Özellikleri';
  @override String get aiFeaturesDesc => 'Yapay zeka destekli özellikleri kontrol edin';
  @override String get aiPersonalization => 'Yapay Zeka Kişiselleştirme';
  @override String get aiPersonalizationDesc => 'Öğrenme yolunu kişiselleştirmek için yapay zeka kullanın';
  @override String get voiceInput => 'Sesli Giriş';
  @override String get voiceInputDesc => 'Sesli komutlara ve dikte etmeye izin verin';
  @override String get requestDataExport => 'Veri Dışa Aktarımı Talep Et';
  @override String get requestDataDeletion => 'Veri Silme Talep Et';
  @override String get dataDeletionWarning => 'Tüm veriler kalıcı olarak silinecektir. Bu işlem geri alınamaz.';
  @override String get dataDeletionRequested => 'Silme talebi gönderildi';
  @override String get requestDeletion => 'Silme Talep Et';

  @override String get settingsTitle => 'Ayarlar';
  @override String get profile => 'Profil';
  @override String get language => 'Dil';
  @override String get appLanguage => 'Uygulama Dili';
  @override String get notifications => 'Bildirimler';
  @override String get privacy => 'Gizlilik';
  @override String get manageConsent => 'Onayı Yönet';
  @override String get changePassword => 'Şifreyi Değiştir';
  @override String get appearance => 'Görünüm';
  @override String get theme => 'Tema';
  @override String get themeSystem => 'Sistem';
  @override String get themeLight => 'Açık';
  @override String get themeDark => 'Koyu';
  @override String get about => 'Hakkında';
  @override String get version => 'Sürüm';
  @override String get termsOfService => 'Hizmet Şartları';
  @override String get privacyPolicy => 'Gizlilik Politikası';
  @override String get logout => 'Çıkış Yap';

  @override String get reportsTitle => 'İlerleme Raporları';
  @override String get downloadPdf => 'PDF İndir';
  @override String get week => 'Hafta';
  @override String get month => 'Ay';
  @override String get semester => 'Dönem';
  @override String get progressOverTime => 'Zamana Göre İlerleme';
  @override String get subjectBreakdown => 'Ders Bazında Dağılım';
  @override String get teacherNotes => 'Öğretmen Notları';
}

// Italian
class AppLocalizationsIt extends AppLocalizations {
  @override String get navDashboard => 'Pannello';
  @override String get navMessages => 'Messaggi';
  @override String get navReports => 'Report';
  @override String get navSettings => 'Impostazioni';

  @override String get dashboardTitle => 'Pannello';
  @override String welcomeBack(String name) => 'Bentornato, $name!';
  @override String get downloadReport => 'Scarica Report';
  @override String get timeSpent => 'Tempo dedicato';
  @override String get minutes => 'min';
  @override String get activeDays => 'Giorni attivi';
  @override String get avgScore => 'Media voti';
  @override String get subjects => 'Materie';
  @override String get recentActivity => 'Attività recente';
  @override String get viewAll => 'Vedi tutto';

  @override String get messagesTitle => 'Messaggi';
  @override String get newMessage => 'Nuovo messaggio';
  @override String get noMessages => 'Nessun messaggio';
  @override String get startConversation => 'Inizia una conversazione con l\'insegnante di tuo figlio';
  @override String get selectChild => 'Seleziona figlio';
  @override String get selectTeacher => 'Seleziona insegnante';
  @override String get subject => 'Oggetto';
  @override String get message => 'Messaggio';
  @override String get send => 'Invia';
  @override String get cancel => 'Annulla';
  @override String get typeMessage => 'Scrivi un messaggio...';
  @override String get reportConversation => 'Segnala conversazione';
  @override String get reportConversationConfirm => 'Sei sicuro di voler segnalare questa conversazione?';
  @override String get reportMessage => 'Segnala messaggio';
  @override String get reportMessageConfirm => 'Sei sicuro di voler segnalare questo messaggio?';
  @override String get report => 'Segnala';
  @override String get reportSubmitted => 'Segnalazione inviata';

  @override String get consentTitle => 'Privacy e consenso';
  @override String get privacyNotice => 'Informativa sulla privacy';
  @override String get coppaFerpaCompliance => 'Rispettiamo le normative COPPA e FERPA per proteggere i dati di tuo figlio.';
  @override String get dataCollection => 'Raccolta dati';
  @override String get dataCollectionDesc => 'Controlla come raccogliamo e utilizziamo i dati di apprendimento';
  @override String get learningAnalytics => 'Analisi dell\'apprendimento';
  @override String get learningAnalyticsDesc => 'Monitora i progressi e personalizza l\'esperienza di apprendimento';
  @override String get progressSharing => 'Condivisione progressi';
  @override String get progressSharingDesc => 'Condividi i report sui progressi con gli insegnanti';
  @override String get communications => 'Comunicazioni';
  @override String get communicationsDesc => 'Gestisci le preferenze di notifica';
  @override String get emailNotifications => 'Notifiche email';
  @override String get emailNotificationsDesc => 'Ricevi aggiornamenti via email';
  @override String get pushNotifications => 'Notifiche push';
  @override String get pushNotificationsDesc => 'Ricevi notifiche istantanee';
  @override String get weeklyDigest => 'Riepilogo settimanale';
  @override String get weeklyDigestDesc => 'Riepilogo settimanale dei progressi di tuo figlio';
  @override String get aiFeatures => 'Funzionalità IA';
  @override String get aiFeaturesDesc => 'Controlla le funzionalità basate sull\'IA';
  @override String get aiPersonalization => 'Personalizzazione IA';
  @override String get aiPersonalizationDesc => 'Usa l\'IA per personalizzare il percorso di apprendimento';
  @override String get voiceInput => 'Input vocale';
  @override String get voiceInputDesc => 'Consenti comandi vocali e dettatura';
  @override String get requestDataExport => 'Richiedi esportazione dati';
  @override String get requestDataDeletion => 'Richiedi cancellazione dati';
  @override String get dataDeletionWarning => 'Tutti i dati verranno eliminati definitivamente. Questa azione non può essere annullata.';
  @override String get dataDeletionRequested => 'Richiesta di cancellazione inviata';
  @override String get requestDeletion => 'Richiedi cancellazione';

  @override String get settingsTitle => 'Impostazioni';
  @override String get profile => 'Profilo';
  @override String get language => 'Lingua';
  @override String get appLanguage => 'Lingua dell\'app';
  @override String get notifications => 'Notifiche';
  @override String get privacy => 'Privacy';
  @override String get manageConsent => 'Gestisci consenso';
  @override String get changePassword => 'Cambia password';
  @override String get appearance => 'Aspetto';
  @override String get theme => 'Tema';
  @override String get themeSystem => 'Sistema';
  @override String get themeLight => 'Chiaro';
  @override String get themeDark => 'Scuro';
  @override String get about => 'Informazioni';
  @override String get version => 'Versione';
  @override String get termsOfService => 'Termini di servizio';
  @override String get privacyPolicy => 'Informativa sulla privacy';
  @override String get logout => 'Esci';

  @override String get reportsTitle => 'Report sui progressi';
  @override String get downloadPdf => 'Scarica PDF';
  @override String get week => 'Settimana';
  @override String get month => 'Mese';
  @override String get semester => 'Semestre';
  @override String get progressOverTime => 'Progressi nel tempo';
  @override String get subjectBreakdown => 'Dettaglio per materia';
  @override String get teacherNotes => 'Note dell\'insegnante';
}
