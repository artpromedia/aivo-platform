// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Chinese (`zh`).
class AppLocalizationsZh extends AppLocalizations {
  AppLocalizationsZh([String locale = 'zh']) : super(locale);

  @override
  String get appTitle => 'Aivo 教师端';

  @override
  String get dashboard => '仪表盘';

  @override
  String get students => '学生';

  @override
  String get sessions => '课程';

  @override
  String get messages => '消息';

  @override
  String get reports => '报告';

  @override
  String get settings => '设置';

  @override
  String get gradebook => '成绩册';

  @override
  String get assignments => '作业';

  @override
  String get loading => '加载中...';

  @override
  String get retry => '重试';

  @override
  String get cancel => '取消';

  @override
  String get save => '保存';

  @override
  String get delete => '删除';

  @override
  String get edit => '编辑';

  @override
  String get create => '创建';

  @override
  String get search => '搜索';

  @override
  String get filter => '筛选';

  @override
  String get clear => '清除';

  @override
  String get done => '完成';

  @override
  String get close => '关闭';

  @override
  String get back => '返回';

  @override
  String get next => '下一步';

  @override
  String get submit => '提交';

  @override
  String get confirm => '确认';

  @override
  String get error => '错误';

  @override
  String get errorLoadingData => '加载数据出错';

  @override
  String get noDataFound => '未找到数据';

  @override
  String get networkError => '网络错误，请检查您的连接。';

  @override
  String get unexpectedError => '发生意外错误';

  @override
  String get tryAgain => '重试';

  @override
  String get searchStudents => '搜索学生...';

  @override
  String get filterStudents => '筛选学生';

  @override
  String get showIepOnly => '仅显示有个别化教育计划的学生';

  @override
  String get studentStatus => '状态';

  @override
  String get active => '活跃';

  @override
  String get inactive => '非活跃';

  @override
  String get transferred => '已转学';

  @override
  String get studentDetails => '学生详情';

  @override
  String get viewIep => '查看个别化教育计划';

  @override
  String gradeLevel(int level) {
    return '$level 年级';
  }

  @override
  String get noStudents => '未找到学生';

  @override
  String get studentsNeedingAttention => '需要关注的学生';

  @override
  String get studentsWithIep => '有个别化教育计划的学生';

  @override
  String get searchAssignments => '搜索作业...';

  @override
  String get filterAssignments => '筛选作业';

  @override
  String get newAssignment => '新作业';

  @override
  String get assignmentDetails => '作业详情';

  @override
  String get assignmentType => '类型';

  @override
  String get pointsPossible => '满分';

  @override
  String get dueDate => '截止日期';

  @override
  String get availableFrom => '开放时间';

  @override
  String get locksAt => '锁定时间';

  @override
  String get category => '类别';

  @override
  String get weight => '权重';

  @override
  String get lateSubmissions => '迟交';

  @override
  String get allowed => '允许';

  @override
  String get notAllowed => '不允许';

  @override
  String get latePenalty => '迟交扣分';

  @override
  String get description => '描述';

  @override
  String get instructions => '说明';

  @override
  String get draft => '草稿';

  @override
  String get published => '已发布';

  @override
  String get closed => '已关闭';

  @override
  String get archived => '已归档';

  @override
  String get homework => '家庭作业';

  @override
  String get quiz => '小测验';

  @override
  String get test => '考试';

  @override
  String get project => '项目';

  @override
  String get classwork => '课堂作业';

  @override
  String get practice => '练习';

  @override
  String get assessment => '评估';

  @override
  String get pastDue => '已过期';

  @override
  String get noDueDate => '无截止日期';

  @override
  String ungraded(int count) {
    return '$count 份未评分';
  }

  @override
  String submissionProgress(int submitted, int total) {
    return '已提交 $submitted/$total';
  }

  @override
  String get noAssignments => '暂无作业';

  @override
  String get noAssignmentsMatch => '没有符合筛选条件的作业';

  @override
  String get clearFilters => '清除筛选';

  @override
  String get createFirstAssignment => '创建您的第一个作业';

  @override
  String get needsGradingOnly => '仅待评分';

  @override
  String get applyFilters => '应用筛选';

  @override
  String get publishAssignment => '发布作业';

  @override
  String get publishConfirmation => '确定要发布此作业吗？学生将能看到它。';

  @override
  String get publish => '发布';

  @override
  String get closeAssignment => '关闭作业';

  @override
  String get duplicate => '复制';

  @override
  String get deleteAssignment => '删除作业';

  @override
  String get deleteConfirmation => '确定吗？此操作无法撤消。';

  @override
  String get details => '详情';

  @override
  String get submissions => '提交';

  @override
  String submissionsCount(int count) {
    return '提交 ($count)';
  }

  @override
  String get progress => '进度';

  @override
  String get submitted => '已提交';

  @override
  String get graded => '已评分';

  @override
  String get missing => '缺交';

  @override
  String completionRate(String percent) {
    return '完成率 $percent%';
  }

  @override
  String gradeAll(int count) {
    return '全部评分 ($count)';
  }

  @override
  String get markMissingZero => '缺交记零分';

  @override
  String get markMissingZeroConfirmation => '所有缺交的作业将被记为 0 分。是否继续？';

  @override
  String get noSubmissionsYet => '暂无提交';

  @override
  String get notSubmitted => '未提交';

  @override
  String get submittedLate => '迟交';

  @override
  String get returned => '已退回';

  @override
  String get excused => '已豁免';

  @override
  String get late => '迟交';

  @override
  String get gradeSubmission => '评分';

  @override
  String get points => '分数';

  @override
  String pointsOutOf(String max) {
    return '分数（满分 $max）';
  }

  @override
  String get fullCredit => '满分';

  @override
  String get feedback => '反馈';

  @override
  String get feedbackPlaceholder => '输入给学生的反馈...';

  @override
  String get excuseFromAssignment => '豁免此作业';

  @override
  String get excuseExplanation => '此成绩不计入最终成绩';

  @override
  String get applyLatePenalty => '应用迟交扣分';

  @override
  String get saveGrade => '保存成绩';

  @override
  String get saveAndNext => '保存并评下一个';

  @override
  String get gradeSaved => '成绩已保存';

  @override
  String get errorSavingGrade => '保存成绩出错';

  @override
  String get overall => '总体';

  @override
  String get overallGrade => '总成绩';

  @override
  String gradedCount(int graded, int total) {
    return '已评分 $graded/$total';
  }

  @override
  String missingCount(int count) {
    return '$count 份缺交';
  }

  @override
  String get filterOptions => '筛选选项';

  @override
  String get showAtRiskOnly => '仅显示有风险的学生';

  @override
  String get atRiskDescription => '低于 70% 的学生';

  @override
  String get exportGradebook => '导出成绩册';

  @override
  String get recalculateGrades => '重新计算成绩';

  @override
  String get gradebookExported => '成绩册已导出';

  @override
  String get quickGrade => '快速评分';

  @override
  String get excuse => '豁免';

  @override
  String get integrations => '集成';

  @override
  String get googleClassroom => 'Google Classroom';

  @override
  String get canvas => 'Canvas';

  @override
  String get clever => 'Clever';

  @override
  String get connected => '已连接';

  @override
  String get disconnected => '已断开';

  @override
  String get connecting => '连接中...';

  @override
  String get connect => '连接';

  @override
  String get disconnect => '断开连接';

  @override
  String lastSync(String time) {
    return '上次同步：$time';
  }

  @override
  String get syncNow => '立即同步';

  @override
  String get syncAll => '全部同步';

  @override
  String get syncHistory => '同步历史';

  @override
  String get gradePassback => '成绩回传';

  @override
  String get pendingGrades => '待处理成绩';

  @override
  String get courseMappings => '课程映射';

  @override
  String get mapCourse => '映射课程';

  @override
  String get offlineMode => '离线模式';

  @override
  String syncPending(int count) {
    return '$count 项更改待同步';
  }

  @override
  String get allChangesSynced => '所有更改已同步';

  @override
  String get syncingChanges => '正在同步更改...';

  @override
  String get notifications => '通知';

  @override
  String get notificationSettings => '通知设置';

  @override
  String get pushNotifications => '推送通知';

  @override
  String get emailNotifications => '邮件通知';

  @override
  String get profile => '个人资料';

  @override
  String get logout => '退出登录';

  @override
  String get logoutConfirmation => '确定要退出登录吗？';

  @override
  String get about => '关于';

  @override
  String version(String version) {
    return '版本 $version';
  }

  @override
  String get privacyPolicy => '隐私政策';

  @override
  String get termsOfService => '服务条款';

  @override
  String get help => '帮助';

  @override
  String get support => '支持';
}
