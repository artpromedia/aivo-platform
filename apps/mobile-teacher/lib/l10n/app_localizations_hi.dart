// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Hindi (`hi`).
class AppLocalizationsHi extends AppLocalizations {
  AppLocalizationsHi([String locale = 'hi']) : super(locale);

  @override
  String get appTitle => 'Aivo शिक्षक';

  @override
  String get dashboard => 'डैशबोर्ड';

  @override
  String get students => 'छात्र';

  @override
  String get sessions => 'सत्र';

  @override
  String get messages => 'संदेश';

  @override
  String get reports => 'रिपोर्ट';

  @override
  String get settings => 'सेटिंग्स';

  @override
  String get gradebook => 'अंक पुस्तिका';

  @override
  String get assignments => 'कार्य';

  @override
  String get loading => 'लोड हो रहा है...';

  @override
  String get retry => 'पुनः प्रयास करें';

  @override
  String get cancel => 'रद्द करें';

  @override
  String get save => 'सहेजें';

  @override
  String get delete => 'हटाएं';

  @override
  String get edit => 'संपादित करें';

  @override
  String get create => 'बनाएं';

  @override
  String get search => 'खोजें';

  @override
  String get filter => 'फ़िल्टर';

  @override
  String get clear => 'साफ़ करें';

  @override
  String get done => 'पूर्ण';

  @override
  String get close => 'बंद करें';

  @override
  String get back => 'वापस';

  @override
  String get next => 'अगला';

  @override
  String get submit => 'जमा करें';

  @override
  String get confirm => 'पुष्टि करें';

  @override
  String get error => 'त्रुटि';

  @override
  String get errorLoadingData => 'डेटा लोड करने में त्रुटि';

  @override
  String get noDataFound => 'कोई डेटा नहीं मिला';

  @override
  String get networkError => 'नेटवर्क त्रुटि। कृपया अपना कनेक्शन जांचें।';

  @override
  String get unexpectedError => 'एक अनपेक्षित त्रुटि हुई';

  @override
  String get tryAgain => 'पुनः प्रयास करें';

  @override
  String get searchStudents => 'छात्र खोजें...';

  @override
  String get filterStudents => 'छात्र फ़िल्टर करें';

  @override
  String get showIepOnly => 'केवल IEP वाले छात्र दिखाएं';

  @override
  String get studentStatus => 'स्थिति';

  @override
  String get active => 'सक्रिय';

  @override
  String get inactive => 'निष्क्रिय';

  @override
  String get transferred => 'स्थानांतरित';

  @override
  String get studentDetails => 'छात्र विवरण';

  @override
  String get viewIep => 'IEP देखें';

  @override
  String gradeLevel(int level) {
    return 'कक्षा $level';
  }

  @override
  String get noStudents => 'कोई छात्र नहीं मिला';

  @override
  String get studentsNeedingAttention => 'ध्यान देने योग्य छात्र';

  @override
  String get studentsWithIep => 'IEP वाले छात्र';

  @override
  String get searchAssignments => 'कार्य खोजें...';

  @override
  String get filterAssignments => 'कार्य फ़िल्टर करें';

  @override
  String get newAssignment => 'नया कार्य';

  @override
  String get assignmentDetails => 'कार्य विवरण';

  @override
  String get assignmentType => 'प्रकार';

  @override
  String get pointsPossible => 'अधिकतम अंक';

  @override
  String get dueDate => 'नियत तिथि';

  @override
  String get availableFrom => 'उपलब्ध तिथि';

  @override
  String get locksAt => 'लॉक होने का समय';

  @override
  String get category => 'श्रेणी';

  @override
  String get weight => 'भार';

  @override
  String get lateSubmissions => 'विलंबित प्रस्तुतियाँ';

  @override
  String get allowed => 'अनुमत';

  @override
  String get notAllowed => 'अनुमत नहीं';

  @override
  String get latePenalty => 'विलंब दंड';

  @override
  String get description => 'विवरण';

  @override
  String get instructions => 'निर्देश';

  @override
  String get draft => 'ड्राफ़्ट';

  @override
  String get published => 'प्रकाशित';

  @override
  String get closed => 'बंद';

  @override
  String get archived => 'संग्रहीत';

  @override
  String get homework => 'गृहकार्य';

  @override
  String get quiz => 'प्रश्नोत्तरी';

  @override
  String get test => 'परीक्षा';

  @override
  String get project => 'परियोजना';

  @override
  String get classwork => 'कक्षा कार्य';

  @override
  String get practice => 'अभ्यास';

  @override
  String get assessment => 'मूल्यांकन';

  @override
  String get pastDue => 'अतिदेय';

  @override
  String get noDueDate => 'कोई नियत तिथि नहीं';

  @override
  String ungraded(int count) {
    return '$count बिना अंक';
  }

  @override
  String submissionProgress(int submitted, int total) {
    return '$submitted/$total जमा हुए';
  }

  @override
  String get noAssignments => 'अभी कोई कार्य नहीं';

  @override
  String get noAssignmentsMatch => 'कोई कार्य फ़िल्टर से मेल नहीं खाता';

  @override
  String get clearFilters => 'फ़िल्टर साफ़ करें';

  @override
  String get createFirstAssignment => 'अपना पहला कार्य बनाएं';

  @override
  String get needsGradingOnly => 'केवल अंकन आवश्यक';

  @override
  String get applyFilters => 'फ़िल्टर लागू करें';

  @override
  String get publishAssignment => 'कार्य प्रकाशित करें';

  @override
  String get publishConfirmation =>
      'क्या आप वाकई इस कार्य को प्रकाशित करना चाहते हैं? छात्र इसे देख सकेंगे।';

  @override
  String get publish => 'प्रकाशित करें';

  @override
  String get closeAssignment => 'कार्य बंद करें';

  @override
  String get duplicate => 'प्रतिलिपि बनाएं';

  @override
  String get deleteAssignment => 'कार्य हटाएं';

  @override
  String get deleteConfirmation =>
      'क्या आप निश्चित हैं? यह क्रिया पूर्ववत नहीं की जा सकती।';

  @override
  String get details => 'विवरण';

  @override
  String get submissions => 'प्रस्तुतियाँ';

  @override
  String submissionsCount(int count) {
    return 'प्रस्तुतियाँ ($count)';
  }

  @override
  String get progress => 'प्रगति';

  @override
  String get submitted => 'जमा किया गया';

  @override
  String get graded => 'अंकित';

  @override
  String get missing => 'अनुपस्थित';

  @override
  String completionRate(String percent) {
    return '$percent% पूर्णता दर';
  }

  @override
  String gradeAll(int count) {
    return 'सभी अंकित करें ($count)';
  }

  @override
  String get markMissingZero => 'अनुपस्थित को शून्य दें';

  @override
  String get markMissingZeroConfirmation =>
      'सभी अनुपस्थित प्रस्तुतियों को 0 अंक दिया जाएगा। जारी रखें?';

  @override
  String get noSubmissionsYet => 'अभी कोई प्रस्तुति नहीं';

  @override
  String get notSubmitted => 'जमा नहीं किया गया';

  @override
  String get submittedLate => 'देर से जमा किया गया';

  @override
  String get returned => 'वापस किया गया';

  @override
  String get excused => 'छूट दी गई';

  @override
  String get late => 'विलंबित';

  @override
  String get gradeSubmission => 'प्रस्तुति अंकित करें';

  @override
  String get points => 'अंक';

  @override
  String pointsOutOf(String max) {
    return 'अंक ($max में से)';
  }

  @override
  String get fullCredit => 'पूर्ण अंक';

  @override
  String get feedback => 'प्रतिक्रिया';

  @override
  String get feedbackPlaceholder => 'छात्र के लिए प्रतिक्रिया दर्ज करें...';

  @override
  String get excuseFromAssignment => 'कार्य से छूट दें';

  @override
  String get excuseExplanation => 'अंक अंतिम ग्रेड में नहीं गिना जाएगा';

  @override
  String get applyLatePenalty => 'विलंब दंड लागू करें';

  @override
  String get saveGrade => 'अंक सहेजें';

  @override
  String get saveAndNext => 'सहेजें और अगला अंकित करें';

  @override
  String get gradeSaved => 'अंक सहेजा गया';

  @override
  String get errorSavingGrade => 'अंक सहेजने में त्रुटि';

  @override
  String get overall => 'समग्र';

  @override
  String get overallGrade => 'समग्र अंक';

  @override
  String gradedCount(int graded, int total) {
    return '$graded/$total अंकित';
  }

  @override
  String missingCount(int count) {
    return '$count अनुपस्थित';
  }

  @override
  String get filterOptions => 'फ़िल्टर विकल्प';

  @override
  String get showAtRiskOnly => 'केवल जोखिम वाले छात्र दिखाएं';

  @override
  String get atRiskDescription => '70% से नीचे के छात्र';

  @override
  String get exportGradebook => 'अंक पुस्तिका निर्यात करें';

  @override
  String get recalculateGrades => 'अंकों की पुनर्गणना करें';

  @override
  String get gradebookExported => 'अंक पुस्तिका निर्यात हो गई';

  @override
  String get quickGrade => 'त्वरित अंकन';

  @override
  String get excuse => 'छूट दें';

  @override
  String get integrations => 'एकीकरण';

  @override
  String get googleClassroom => 'Google Classroom';

  @override
  String get canvas => 'Canvas';

  @override
  String get clever => 'Clever';

  @override
  String get connected => 'कनेक्टेड';

  @override
  String get disconnected => 'डिस्कनेक्टेड';

  @override
  String get connecting => 'कनेक्ट हो रहा है...';

  @override
  String get connect => 'कनेक्ट करें';

  @override
  String get disconnect => 'डिस्कनेक्ट करें';

  @override
  String lastSync(String time) {
    return 'अंतिम सिंक: $time';
  }

  @override
  String get syncNow => 'अभी सिंक करें';

  @override
  String get syncAll => 'सभी सिंक करें';

  @override
  String get syncHistory => 'सिंक इतिहास';

  @override
  String get gradePassback => 'अंक वापसी';

  @override
  String get pendingGrades => 'लंबित अंक';

  @override
  String get courseMappings => 'कोर्स मैपिंग';

  @override
  String get mapCourse => 'कोर्स मैप करें';

  @override
  String get offlineMode => 'ऑफ़लाइन मोड';

  @override
  String syncPending(int count) {
    return '$count परिवर्तन सिंक की प्रतीक्षा में';
  }

  @override
  String get allChangesSynced => 'सभी परिवर्तन सिंक हो गए';

  @override
  String get syncingChanges => 'परिवर्तन सिंक हो रहे हैं...';

  @override
  String get notifications => 'सूचनाएं';

  @override
  String get notificationSettings => 'सूचना सेटिंग्स';

  @override
  String get pushNotifications => 'पुश सूचनाएं';

  @override
  String get emailNotifications => 'ईमेल सूचनाएं';

  @override
  String get profile => 'प्रोफ़ाइल';

  @override
  String get logout => 'लॉग आउट';

  @override
  String get logoutConfirmation => 'क्या आप वाकई लॉग आउट करना चाहते हैं?';

  @override
  String get about => 'बारे में';

  @override
  String version(String version) {
    return 'संस्करण $version';
  }

  @override
  String get privacyPolicy => 'गोपनीयता नीति';

  @override
  String get termsOfService => 'सेवा की शर्तें';

  @override
  String get help => 'सहायता';

  @override
  String get support => 'सहायता केंद्र';
}
