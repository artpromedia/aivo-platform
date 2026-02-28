// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Portuguese (`pt`).
class AppLocalizationsPt extends AppLocalizations {
  AppLocalizationsPt([String locale = 'pt']) : super(locale);

  @override
  String get appTitle => 'Aivo Professor';

  @override
  String get dashboard => 'Painel';

  @override
  String get students => 'Alunos';

  @override
  String get sessions => 'Sessões';

  @override
  String get messages => 'Mensagens';

  @override
  String get reports => 'Relatórios';

  @override
  String get settings => 'Configurações';

  @override
  String get gradebook => 'Caderno de Notas';

  @override
  String get assignments => 'Atividades';

  @override
  String get loading => 'Carregando...';

  @override
  String get retry => 'Tentar novamente';

  @override
  String get cancel => 'Cancelar';

  @override
  String get save => 'Salvar';

  @override
  String get delete => 'Excluir';

  @override
  String get edit => 'Editar';

  @override
  String get create => 'Criar';

  @override
  String get search => 'Pesquisar';

  @override
  String get filter => 'Filtrar';

  @override
  String get clear => 'Limpar';

  @override
  String get done => 'Concluído';

  @override
  String get close => 'Fechar';

  @override
  String get back => 'Voltar';

  @override
  String get next => 'Próximo';

  @override
  String get submit => 'Enviar';

  @override
  String get confirm => 'Confirmar';

  @override
  String get error => 'Erro';

  @override
  String get errorLoadingData => 'Erro ao carregar dados';

  @override
  String get noDataFound => 'Nenhum dado encontrado';

  @override
  String get networkError => 'Erro de rede. Verifique sua conexão.';

  @override
  String get unexpectedError => 'Ocorreu um erro inesperado';

  @override
  String get tryAgain => 'Tentar Novamente';

  @override
  String get searchStudents => 'Pesquisar alunos...';

  @override
  String get filterStudents => 'Filtrar Alunos';

  @override
  String get showIepOnly => 'Mostrar apenas alunos com PEI';

  @override
  String get studentStatus => 'Status';

  @override
  String get active => 'Ativo';

  @override
  String get inactive => 'Inativo';

  @override
  String get transferred => 'Transferido';

  @override
  String get studentDetails => 'Detalhes do Aluno';

  @override
  String get viewIep => 'Ver PEI';

  @override
  String gradeLevel(int level) {
    return 'Série $level';
  }

  @override
  String get noStudents => 'Nenhum aluno encontrado';

  @override
  String get studentsNeedingAttention => 'Alunos que Precisam de Atenção';

  @override
  String get studentsWithIep => 'Alunos com PEI';

  @override
  String get searchAssignments => 'Pesquisar atividades...';

  @override
  String get filterAssignments => 'Filtrar Atividades';

  @override
  String get newAssignment => 'Nova Atividade';

  @override
  String get assignmentDetails => 'Detalhes da Atividade';

  @override
  String get assignmentType => 'Tipo';

  @override
  String get pointsPossible => 'Pontuação Máxima';

  @override
  String get dueDate => 'Data de Entrega';

  @override
  String get availableFrom => 'Disponível a partir de';

  @override
  String get locksAt => 'Bloqueia em';

  @override
  String get category => 'Categoria';

  @override
  String get weight => 'Peso';

  @override
  String get lateSubmissions => 'Entregas Atrasadas';

  @override
  String get allowed => 'Permitido';

  @override
  String get notAllowed => 'Não Permitido';

  @override
  String get latePenalty => 'Penalidade por Atraso';

  @override
  String get description => 'Descrição';

  @override
  String get instructions => 'Instruções';

  @override
  String get draft => 'Rascunho';

  @override
  String get published => 'Publicado';

  @override
  String get closed => 'Fechado';

  @override
  String get archived => 'Arquivado';

  @override
  String get homework => 'Tarefa de Casa';

  @override
  String get quiz => 'Questionário';

  @override
  String get test => 'Prova';

  @override
  String get project => 'Projeto';

  @override
  String get classwork => 'Trabalho em Sala';

  @override
  String get practice => 'Exercício';

  @override
  String get assessment => 'Avaliação';

  @override
  String get pastDue => 'Atrasado';

  @override
  String get noDueDate => 'Sem data de entrega';

  @override
  String ungraded(int count) {
    return '$count sem nota';
  }

  @override
  String submissionProgress(int submitted, int total) {
    return '$submitted/$total enviados';
  }

  @override
  String get noAssignments => 'Nenhuma atividade ainda';

  @override
  String get noAssignmentsMatch => 'Nenhuma atividade corresponde aos filtros';

  @override
  String get clearFilters => 'Limpar filtros';

  @override
  String get createFirstAssignment => 'Crie sua primeira atividade';

  @override
  String get needsGradingOnly => 'Apenas pendentes de nota';

  @override
  String get applyFilters => 'Aplicar Filtros';

  @override
  String get publishAssignment => 'Publicar Atividade';

  @override
  String get publishConfirmation =>
      'Tem certeza de que deseja publicar esta atividade? Os alunos poderão vê-la.';

  @override
  String get publish => 'Publicar';

  @override
  String get closeAssignment => 'Fechar Atividade';

  @override
  String get duplicate => 'Duplicar';

  @override
  String get deleteAssignment => 'Excluir Atividade';

  @override
  String get deleteConfirmation =>
      'Tem certeza? Esta ação não pode ser desfeita.';

  @override
  String get details => 'Detalhes';

  @override
  String get submissions => 'Entregas';

  @override
  String submissionsCount(int count) {
    return 'Entregas ($count)';
  }

  @override
  String get progress => 'Progresso';

  @override
  String get submitted => 'Enviado';

  @override
  String get graded => 'Avaliado';

  @override
  String get missing => 'Pendente';

  @override
  String completionRate(String percent) {
    return '$percent% de conclusão';
  }

  @override
  String gradeAll(int count) {
    return 'Avaliar Todos ($count)';
  }

  @override
  String get markMissingZero => 'Atribuir 0 aos Pendentes';

  @override
  String get markMissingZeroConfirmation =>
      'Isso atribuirá nota 0 a todas as entregas pendentes. Continuar?';

  @override
  String get noSubmissionsYet => 'Nenhuma entrega ainda';

  @override
  String get notSubmitted => 'Não enviado';

  @override
  String get submittedLate => 'Enviado com atraso';

  @override
  String get returned => 'Devolvido';

  @override
  String get excused => 'Dispensado';

  @override
  String get late => 'Atrasado';

  @override
  String get gradeSubmission => 'Avaliar Entrega';

  @override
  String get points => 'Pontos';

  @override
  String pointsOutOf(String max) {
    return 'Pontos (de $max)';
  }

  @override
  String get fullCredit => 'Nota Máxima';

  @override
  String get feedback => 'Comentário';

  @override
  String get feedbackPlaceholder => 'Escreva um comentário para o aluno...';

  @override
  String get excuseFromAssignment => 'Dispensar da atividade';

  @override
  String get excuseExplanation =>
      'A nota não será contabilizada na média final';

  @override
  String get applyLatePenalty => 'Aplicar penalidade por atraso';

  @override
  String get saveGrade => 'Salvar Nota';

  @override
  String get saveAndNext => 'Salvar e Avaliar Próximo';

  @override
  String get gradeSaved => 'Nota salva';

  @override
  String get errorSavingGrade => 'Erro ao salvar nota';

  @override
  String get overall => 'Geral';

  @override
  String get overallGrade => 'Nota Geral';

  @override
  String gradedCount(int graded, int total) {
    return '$graded/$total avaliados';
  }

  @override
  String missingCount(int count) {
    return '$count pendentes';
  }

  @override
  String get filterOptions => 'Opções de Filtro';

  @override
  String get showAtRiskOnly => 'Mostrar apenas alunos em risco';

  @override
  String get atRiskDescription => 'Alunos abaixo de 70%';

  @override
  String get exportGradebook => 'Exportar Caderno de Notas';

  @override
  String get recalculateGrades => 'Recalcular Notas';

  @override
  String get gradebookExported => 'Caderno de notas exportado';

  @override
  String get quickGrade => 'Avaliação Rápida';

  @override
  String get excuse => 'Dispensar';

  @override
  String get integrations => 'Integrações';

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
    return 'Última sincronização: $time';
  }

  @override
  String get syncNow => 'Sincronizar Agora';

  @override
  String get syncAll => 'Sincronizar Tudo';

  @override
  String get syncHistory => 'Histórico de Sincronização';

  @override
  String get gradePassback => 'Retorno de Notas';

  @override
  String get pendingGrades => 'Notas Pendentes';

  @override
  String get courseMappings => 'Mapeamento de Turmas';

  @override
  String get mapCourse => 'Mapear Turma';

  @override
  String get offlineMode => 'Modo Offline';

  @override
  String syncPending(int count) {
    return '$count alterações pendentes de sincronização';
  }

  @override
  String get allChangesSynced => 'Todas as alterações sincronizadas';

  @override
  String get syncingChanges => 'Sincronizando alterações...';

  @override
  String get notifications => 'Notificações';

  @override
  String get notificationSettings => 'Configurações de Notificação';

  @override
  String get pushNotifications => 'Notificações Push';

  @override
  String get emailNotifications => 'Notificações por E-mail';

  @override
  String get profile => 'Perfil';

  @override
  String get logout => 'Sair';

  @override
  String get logoutConfirmation => 'Tem certeza de que deseja sair?';

  @override
  String get about => 'Sobre';

  @override
  String version(String version) {
    return 'Versão $version';
  }

  @override
  String get privacyPolicy => 'Política de Privacidade';

  @override
  String get termsOfService => 'Termos de Serviço';

  @override
  String get help => 'Ajuda';

  @override
  String get support => 'Suporte';
}
