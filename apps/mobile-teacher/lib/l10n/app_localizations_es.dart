// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Spanish Castilian (`es`).
class AppLocalizationsEs extends AppLocalizations {
  AppLocalizationsEs([String locale = 'es']) : super(locale);

  @override
  String get appTitle => 'Aivo Maestro';

  @override
  String get dashboard => 'Panel';

  @override
  String get students => 'Estudiantes';

  @override
  String get sessions => 'Sesiones';

  @override
  String get messages => 'Mensajes';

  @override
  String get reports => 'Informes';

  @override
  String get settings => 'Configuración';

  @override
  String get gradebook => 'Libro de calificaciones';

  @override
  String get assignments => 'Tareas';

  @override
  String get loading => 'Cargando...';

  @override
  String get retry => 'Reintentar';

  @override
  String get cancel => 'Cancelar';

  @override
  String get save => 'Guardar';

  @override
  String get delete => 'Eliminar';

  @override
  String get edit => 'Editar';

  @override
  String get create => 'Crear';

  @override
  String get search => 'Buscar';

  @override
  String get filter => 'Filtrar';

  @override
  String get clear => 'Limpiar';

  @override
  String get done => 'Hecho';

  @override
  String get close => 'Cerrar';

  @override
  String get back => 'Atrás';

  @override
  String get next => 'Siguiente';

  @override
  String get submit => 'Enviar';

  @override
  String get confirm => 'Confirmar';

  @override
  String get error => 'Error';

  @override
  String get errorLoadingData => 'Error al cargar los datos';

  @override
  String get noDataFound => 'No se encontraron datos';

  @override
  String get networkError => 'Error de red. Verifica tu conexión.';

  @override
  String get unexpectedError => 'Ocurrió un error inesperado';

  @override
  String get tryAgain => 'Intentar de nuevo';

  @override
  String get searchStudents => 'Buscar estudiantes...';

  @override
  String get filterStudents => 'Filtrar estudiantes';

  @override
  String get showIepOnly => 'Mostrar solo estudiantes con IEP';

  @override
  String get studentStatus => 'Estado';

  @override
  String get active => 'Activo';

  @override
  String get inactive => 'Inactivo';

  @override
  String get transferred => 'Transferido';

  @override
  String get studentDetails => 'Detalles del estudiante';

  @override
  String get viewIep => 'Ver IEP';

  @override
  String gradeLevel(int level) {
    return 'Grado $level';
  }

  @override
  String get noStudents => 'No se encontraron estudiantes';

  @override
  String get studentsNeedingAttention => 'Estudiantes que necesitan atención';

  @override
  String get studentsWithIep => 'Estudiantes con IEP';

  @override
  String get searchAssignments => 'Buscar tareas...';

  @override
  String get filterAssignments => 'Filtrar tareas';

  @override
  String get newAssignment => 'Nueva tarea';

  @override
  String get assignmentDetails => 'Detalles de la tarea';

  @override
  String get assignmentType => 'Tipo';

  @override
  String get pointsPossible => 'Puntos posibles';

  @override
  String get dueDate => 'Fecha de entrega';

  @override
  String get availableFrom => 'Disponible desde';

  @override
  String get locksAt => 'Se bloquea el';

  @override
  String get category => 'Categoría';

  @override
  String get weight => 'Peso';

  @override
  String get lateSubmissions => 'Entregas tardías';

  @override
  String get allowed => 'Permitido';

  @override
  String get notAllowed => 'No permitido';

  @override
  String get latePenalty => 'Penalización por tardanza';

  @override
  String get description => 'Descripción';

  @override
  String get instructions => 'Instrucciones';

  @override
  String get draft => 'Borrador';

  @override
  String get published => 'Publicado';

  @override
  String get closed => 'Cerrado';

  @override
  String get archived => 'Archivado';

  @override
  String get homework => 'Tarea';

  @override
  String get quiz => 'Cuestionario';

  @override
  String get test => 'Examen';

  @override
  String get project => 'Proyecto';

  @override
  String get classwork => 'Trabajo en clase';

  @override
  String get practice => 'Práctica';

  @override
  String get assessment => 'Evaluación';

  @override
  String get pastDue => 'Vencido';

  @override
  String get noDueDate => 'Sin fecha de entrega';

  @override
  String ungraded(int count) {
    return '$count sin calificar';
  }

  @override
  String submissionProgress(int submitted, int total) {
    return '$submitted/$total entregados';
  }

  @override
  String get noAssignments => 'Aún no hay tareas';

  @override
  String get noAssignmentsMatch =>
      'No hay tareas que coincidan con los filtros';

  @override
  String get clearFilters => 'Limpiar filtros';

  @override
  String get createFirstAssignment => 'Crea tu primera tarea';

  @override
  String get needsGradingOnly => 'Solo sin calificar';

  @override
  String get applyFilters => 'Aplicar filtros';

  @override
  String get publishAssignment => 'Publicar tarea';

  @override
  String get publishConfirmation =>
      '¿Estás seguro de publicar esta tarea? Los estudiantes podrán verla.';

  @override
  String get publish => 'Publicar';

  @override
  String get closeAssignment => 'Cerrar tarea';

  @override
  String get duplicate => 'Duplicar';

  @override
  String get deleteAssignment => 'Eliminar tarea';

  @override
  String get deleteConfirmation =>
      '¿Estás seguro? Esta acción no se puede deshacer.';

  @override
  String get details => 'Detalles';

  @override
  String get submissions => 'Entregas';

  @override
  String submissionsCount(int count) {
    return 'Entregas ($count)';
  }

  @override
  String get progress => 'Progreso';

  @override
  String get submitted => 'Entregado';

  @override
  String get graded => 'Calificado';

  @override
  String get missing => 'Faltante';

  @override
  String completionRate(String percent) {
    return '$percent% de completado';
  }

  @override
  String gradeAll(int count) {
    return 'Calificar todo ($count)';
  }

  @override
  String get markMissingZero => 'Marcar faltantes como 0';

  @override
  String get markMissingZeroConfirmation =>
      'Esto asignará 0 a todas las entregas faltantes. ¿Continuar?';

  @override
  String get noSubmissionsYet => 'Aún no hay entregas';

  @override
  String get notSubmitted => 'No entregado';

  @override
  String get submittedLate => 'Entregado tarde';

  @override
  String get returned => 'Devuelto';

  @override
  String get excused => 'Excusado';

  @override
  String get late => 'Tarde';

  @override
  String get gradeSubmission => 'Calificar entrega';

  @override
  String get points => 'Puntos';

  @override
  String pointsOutOf(String max) {
    return 'Puntos (de $max)';
  }

  @override
  String get fullCredit => 'Completo';

  @override
  String get feedback => 'Comentarios';

  @override
  String get feedbackPlaceholder => 'Escribe comentarios para el estudiante...';

  @override
  String get excuseFromAssignment => 'Excusar de la tarea';

  @override
  String get excuseExplanation =>
      'La calificación no contará para la nota final';

  @override
  String get applyLatePenalty => 'Aplicar penalización por tardanza';

  @override
  String get saveGrade => 'Guardar calificación';

  @override
  String get saveAndNext => 'Guardar y siguiente';

  @override
  String get gradeSaved => 'Calificación guardada';

  @override
  String get errorSavingGrade => 'Error al guardar la calificación';

  @override
  String get overall => 'General';

  @override
  String get overallGrade => 'Calificación general';

  @override
  String gradedCount(int graded, int total) {
    return '$graded/$total calificados';
  }

  @override
  String missingCount(int count) {
    return '$count faltantes';
  }

  @override
  String get filterOptions => 'Opciones de filtro';

  @override
  String get showAtRiskOnly => 'Mostrar solo estudiantes en riesgo';

  @override
  String get atRiskDescription => 'Estudiantes por debajo del 70%';

  @override
  String get exportGradebook => 'Exportar libro de calificaciones';

  @override
  String get recalculateGrades => 'Recalcular calificaciones';

  @override
  String get gradebookExported => 'Libro de calificaciones exportado';

  @override
  String get quickGrade => 'Calificación rápida';

  @override
  String get excuse => 'Excusar';

  @override
  String get integrations => 'Integraciones';

  @override
  String get googleClassroom => 'Google Classroom';

  @override
  String get canvas => 'Canvas';

  @override
  String get clever => 'Clever';

  @override
  String get connected => 'Conectado';

  @override
  String get disconnected => 'Desconectado';

  @override
  String get connecting => 'Conectando...';

  @override
  String get connect => 'Conectar';

  @override
  String get disconnect => 'Desconectar';

  @override
  String lastSync(String time) {
    return 'Última sincronización: $time';
  }

  @override
  String get syncNow => 'Sincronizar ahora';

  @override
  String get syncAll => 'Sincronizar todo';

  @override
  String get syncHistory => 'Historial de sincronización';

  @override
  String get gradePassback => 'Envío de calificaciones';

  @override
  String get pendingGrades => 'Calificaciones pendientes';

  @override
  String get courseMappings => 'Mapeo de cursos';

  @override
  String get mapCourse => 'Mapear curso';

  @override
  String get offlineMode => 'Modo sin conexión';

  @override
  String syncPending(int count) {
    return '$count cambios pendientes';
  }

  @override
  String get allChangesSynced => 'Todos los cambios sincronizados';

  @override
  String get syncingChanges => 'Sincronizando cambios...';

  @override
  String get notifications => 'Notificaciones';

  @override
  String get notificationSettings => 'Configuración de notificaciones';

  @override
  String get pushNotifications => 'Notificaciones push';

  @override
  String get emailNotifications => 'Notificaciones por correo';

  @override
  String get profile => 'Perfil';

  @override
  String get logout => 'Cerrar sesión';

  @override
  String get logoutConfirmation => '¿Estás seguro de cerrar sesión?';

  @override
  String get about => 'Acerca de';

  @override
  String version(String version) {
    return 'Versión $version';
  }

  @override
  String get privacyPolicy => 'Política de privacidad';

  @override
  String get termsOfService => 'Términos de servicio';

  @override
  String get help => 'Ayuda';

  @override
  String get support => 'Soporte';
}
