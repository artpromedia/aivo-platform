// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Arabic (`ar`).
class AppLocalizationsAr extends AppLocalizations {
  AppLocalizationsAr([String locale = 'ar']) : super(locale);

  @override
  String get appTitle => 'أيفو المعلم';

  @override
  String get dashboard => 'لوحة التحكم';

  @override
  String get students => 'الطلاب';

  @override
  String get sessions => 'الجلسات';

  @override
  String get messages => 'الرسائل';

  @override
  String get reports => 'التقارير';

  @override
  String get settings => 'الإعدادات';

  @override
  String get gradebook => 'سجل الدرجات';

  @override
  String get assignments => 'الواجبات';

  @override
  String get loading => 'جارٍ التحميل...';

  @override
  String get retry => 'إعادة المحاولة';

  @override
  String get cancel => 'إلغاء';

  @override
  String get save => 'حفظ';

  @override
  String get delete => 'حذف';

  @override
  String get edit => 'تعديل';

  @override
  String get create => 'إنشاء';

  @override
  String get search => 'بحث';

  @override
  String get filter => 'تصفية';

  @override
  String get clear => 'مسح';

  @override
  String get done => 'تم';

  @override
  String get close => 'إغلاق';

  @override
  String get back => 'رجوع';

  @override
  String get next => 'التالي';

  @override
  String get submit => 'إرسال';

  @override
  String get confirm => 'تأكيد';

  @override
  String get error => 'خطأ';

  @override
  String get errorLoadingData => 'خطأ في تحميل البيانات';

  @override
  String get noDataFound => 'لم يتم العثور على بيانات';

  @override
  String get networkError => 'خطأ في الشبكة. يرجى التحقق من اتصالك.';

  @override
  String get unexpectedError => 'حدث خطأ غير متوقع';

  @override
  String get tryAgain => 'حاول مرة أخرى';

  @override
  String get searchStudents => 'البحث عن طلاب...';

  @override
  String get filterStudents => 'تصفية الطلاب';

  @override
  String get showIepOnly => 'عرض طلاب الخطة التعليمية الفردية فقط';

  @override
  String get studentStatus => 'الحالة';

  @override
  String get active => 'نشط';

  @override
  String get inactive => 'غير نشط';

  @override
  String get transferred => 'محوّل';

  @override
  String get studentDetails => 'تفاصيل الطالب';

  @override
  String get viewIep => 'عرض الخطة التعليمية الفردية';

  @override
  String gradeLevel(int level) {
    return 'الصف $level';
  }

  @override
  String get noStudents => 'لم يتم العثور على طلاب';

  @override
  String get studentsNeedingAttention => 'طلاب يحتاجون إلى اهتمام';

  @override
  String get studentsWithIep => 'طلاب لديهم خطة تعليمية فردية';

  @override
  String get searchAssignments => 'البحث عن واجبات...';

  @override
  String get filterAssignments => 'تصفية الواجبات';

  @override
  String get newAssignment => 'واجب جديد';

  @override
  String get assignmentDetails => 'تفاصيل الواجب';

  @override
  String get assignmentType => 'النوع';

  @override
  String get pointsPossible => 'الدرجة القصوى';

  @override
  String get dueDate => 'تاريخ الاستحقاق';

  @override
  String get availableFrom => 'متاح من';

  @override
  String get locksAt => 'يُقفل في';

  @override
  String get category => 'الفئة';

  @override
  String get weight => 'الوزن';

  @override
  String get lateSubmissions => 'التسليمات المتأخرة';

  @override
  String get allowed => 'مسموح';

  @override
  String get notAllowed => 'غير مسموح';

  @override
  String get latePenalty => 'خصم التأخير';

  @override
  String get description => 'الوصف';

  @override
  String get instructions => 'التعليمات';

  @override
  String get draft => 'مسودة';

  @override
  String get published => 'منشور';

  @override
  String get closed => 'مغلق';

  @override
  String get archived => 'مؤرشف';

  @override
  String get homework => 'واجب منزلي';

  @override
  String get quiz => 'اختبار قصير';

  @override
  String get test => 'اختبار';

  @override
  String get project => 'مشروع';

  @override
  String get classwork => 'عمل صفي';

  @override
  String get practice => 'تمرين';

  @override
  String get assessment => 'تقييم';

  @override
  String get pastDue => 'متأخر';

  @override
  String get noDueDate => 'بدون تاريخ استحقاق';

  @override
  String ungraded(int count) {
    return '$count بدون درجة';
  }

  @override
  String submissionProgress(int submitted, int total) {
    return '$submitted/$total تم تسليمه';
  }

  @override
  String get noAssignments => 'لا توجد واجبات بعد';

  @override
  String get noAssignmentsMatch => 'لا توجد واجبات تطابق المرشحات';

  @override
  String get clearFilters => 'مسح المرشحات';

  @override
  String get createFirstAssignment => 'أنشئ واجبك الأول';

  @override
  String get needsGradingOnly => 'يحتاج تقييم فقط';

  @override
  String get applyFilters => 'تطبيق المرشحات';

  @override
  String get publishAssignment => 'نشر الواجب';

  @override
  String get publishConfirmation =>
      'هل أنت متأكد من نشر هذا الواجب؟ سيتمكن الطلاب من رؤيته.';

  @override
  String get publish => 'نشر';

  @override
  String get closeAssignment => 'إغلاق الواجب';

  @override
  String get duplicate => 'تكرار';

  @override
  String get deleteAssignment => 'حذف الواجب';

  @override
  String get deleteConfirmation =>
      'هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.';

  @override
  String get details => 'التفاصيل';

  @override
  String get submissions => 'التسليمات';

  @override
  String submissionsCount(int count) {
    return 'التسليمات ($count)';
  }

  @override
  String get progress => 'التقدم';

  @override
  String get submitted => 'تم التسليم';

  @override
  String get graded => 'تم التقييم';

  @override
  String get missing => 'مفقود';

  @override
  String completionRate(String percent) {
    return 'نسبة الإنجاز $percent%';
  }

  @override
  String gradeAll(int count) {
    return 'تقييم الكل ($count)';
  }

  @override
  String get markMissingZero => 'تصفير المفقودات';

  @override
  String get markMissingZeroConfirmation =>
      'سيتم منح جميع التسليمات المفقودة درجة 0. هل تريد المتابعة؟';

  @override
  String get noSubmissionsYet => 'لا توجد تسليمات بعد';

  @override
  String get notSubmitted => 'لم يتم التسليم';

  @override
  String get submittedLate => 'تم التسليم متأخرًا';

  @override
  String get returned => 'تمت الإعادة';

  @override
  String get excused => 'معفى';

  @override
  String get late => 'متأخر';

  @override
  String get gradeSubmission => 'تقييم التسليم';

  @override
  String get points => 'النقاط';

  @override
  String pointsOutOf(String max) {
    return 'النقاط (من $max)';
  }

  @override
  String get fullCredit => 'الدرجة الكاملة';

  @override
  String get feedback => 'ملاحظات';

  @override
  String get feedbackPlaceholder => 'أدخل ملاحظات للطالب...';

  @override
  String get excuseFromAssignment => 'إعفاء من الواجب';

  @override
  String get excuseExplanation => 'لن تُحتسب الدرجة في المعدل النهائي';

  @override
  String get applyLatePenalty => 'تطبيق خصم التأخير';

  @override
  String get saveGrade => 'حفظ الدرجة';

  @override
  String get saveAndNext => 'حفظ وتقييم التالي';

  @override
  String get gradeSaved => 'تم حفظ الدرجة';

  @override
  String get errorSavingGrade => 'خطأ في حفظ الدرجة';

  @override
  String get overall => 'الإجمالي';

  @override
  String get overallGrade => 'الدرجة الإجمالية';

  @override
  String gradedCount(int graded, int total) {
    return '$graded/$total تم تقييمه';
  }

  @override
  String missingCount(int count) {
    return '$count مفقود';
  }

  @override
  String get filterOptions => 'خيارات التصفية';

  @override
  String get showAtRiskOnly => 'عرض الطلاب المعرضين للخطر فقط';

  @override
  String get atRiskDescription => 'طلاب أقل من 70%';

  @override
  String get exportGradebook => 'تصدير سجل الدرجات';

  @override
  String get recalculateGrades => 'إعادة حساب الدرجات';

  @override
  String get gradebookExported => 'تم تصدير سجل الدرجات';

  @override
  String get quickGrade => 'تقييم سريع';

  @override
  String get excuse => 'إعفاء';

  @override
  String get integrations => 'التكاملات';

  @override
  String get googleClassroom => 'Google Classroom';

  @override
  String get canvas => 'Canvas';

  @override
  String get clever => 'Clever';

  @override
  String get connected => 'متصل';

  @override
  String get disconnected => 'غير متصل';

  @override
  String get connecting => 'جارٍ الاتصال...';

  @override
  String get connect => 'اتصال';

  @override
  String get disconnect => 'قطع الاتصال';

  @override
  String lastSync(String time) {
    return 'آخر مزامنة: $time';
  }

  @override
  String get syncNow => 'مزامنة الآن';

  @override
  String get syncAll => 'مزامنة الكل';

  @override
  String get syncHistory => 'سجل المزامنة';

  @override
  String get gradePassback => 'إرجاع الدرجات';

  @override
  String get pendingGrades => 'درجات معلقة';

  @override
  String get courseMappings => 'ربط المقررات';

  @override
  String get mapCourse => 'ربط مقرر';

  @override
  String get offlineMode => 'وضع عدم الاتصال';

  @override
  String syncPending(int count) {
    return '$count تغييرات في انتظار المزامنة';
  }

  @override
  String get allChangesSynced => 'تمت مزامنة جميع التغييرات';

  @override
  String get syncingChanges => 'جارٍ مزامنة التغييرات...';

  @override
  String get notifications => 'الإشعارات';

  @override
  String get notificationSettings => 'إعدادات الإشعارات';

  @override
  String get pushNotifications => 'إشعارات الدفع';

  @override
  String get emailNotifications => 'إشعارات البريد الإلكتروني';

  @override
  String get profile => 'الملف الشخصي';

  @override
  String get logout => 'تسجيل الخروج';

  @override
  String get logoutConfirmation => 'هل أنت متأكد من تسجيل الخروج؟';

  @override
  String get about => 'حول';

  @override
  String version(String version) {
    return 'الإصدار $version';
  }

  @override
  String get privacyPolicy => 'سياسة الخصوصية';

  @override
  String get termsOfService => 'شروط الخدمة';

  @override
  String get help => 'مساعدة';

  @override
  String get support => 'الدعم';
}
