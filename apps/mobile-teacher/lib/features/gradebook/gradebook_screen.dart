/// Gradebook Screen for Mobile Teacher App
///
/// Features:
/// - Mobile-optimized gradebook view
/// - Quick grade entry
/// - Student grade details
/// - Filter and search functionality

import 'package:flutter/material.dart';

class GradebookScreen extends StatefulWidget {
  final String classroomId;

  const GradebookScreen({
    Key? key,
    required this.classroomId,
  }) : super(key: key);

  @override
  State<GradebookScreen> createState() => _GradebookScreenState();
}

class _GradebookScreenState extends State<GradebookScreen> {
  List<Student> students = [];
  List<Assignment> assignments = [];
  bool isLoading = true;
  String searchQuery = '';
  String? selectedAssignmentId;

  @override
  void initState() {
    super.initState();
    _loadGradebook();
  }

  Future<void> _loadGradebook() async {
    setState(() => isLoading = true);
    try {
      // TODO: API call to fetch gradebook
      await Future.delayed(const Duration(seconds: 1));

      // Mock data
      setState(() {
        students = _getMockStudents();
        assignments = _getMockAssignments();
        isLoading = false;
      });
    } catch (e) {
      setState(() => isLoading = false);
      _showError('Failed to load gradebook');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Gradebook'),
        actions: [
          IconButton(
            icon: const Icon(Icons.download),
            onPressed: _exportGradebook,
            tooltip: 'Export',
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: _showSettings,
            tooltip: 'Settings',
          ),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                _buildSearchBar(),
                _buildAssignmentFilter(),
                Expanded(
                  child: _buildGradebookContent(),
                ),
              ],
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showQuickGradeEntry,
        icon: const Icon(Icons.add),
        label: const Text('Quick Grade'),
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: TextField(
        decoration: InputDecoration(
          hintText: 'Search students...',
          prefixIcon: const Icon(Icons.search),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          filled: true,
          fillColor: Colors.grey[100],
        ),
        onChanged: (value) {
          setState(() => searchQuery = value);
        },
      ),
    );
  }

  Widget _buildAssignmentFilter() {
    return Container(
      height: 50,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: assignments.length + 1,
        itemBuilder: (context, index) {
          if (index == 0) {
            return _buildFilterChip('All Assignments', null);
          }
          final assignment = assignments[index - 1];
          return _buildFilterChip(assignment.title, assignment.id);
        },
      ),
    );
  }

  Widget _buildFilterChip(String label, String? assignmentId) {
    final isSelected = selectedAssignmentId == assignmentId;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (selected) {
          setState(() {
            selectedAssignmentId = selected ? assignmentId : null;
          });
        },
      ),
    );
  }

  Widget _buildGradebookContent() {
    final filteredStudents = students.where((student) {
      if (searchQuery.isNotEmpty &&
          !student.name.toLowerCase().contains(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    }).toList();

    return RefreshIndicator(
      onRefresh: _loadGradebook,
      child: ListView.builder(
        itemCount: filteredStudents.length,
        itemBuilder: (context, index) {
          final student = filteredStudents[index];
          return _buildStudentCard(student);
        },
      ),
    );
  }

  Widget _buildStudentCard(Student student) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: InkWell(
        onTap: () => _showStudentDetails(student),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    child: Text(student.initials),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          student.name,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (student.missingCount > 0)
                          Text(
                            '${student.missingCount} missing',
                            style: const TextStyle(
                              color: Colors.red,
                              fontSize: 12,
                            ),
                          ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      _buildGradeBadge(student.overallGrade),
                      const SizedBox(height: 4),
                      Text(
                        '${student.overallGrade.toStringAsFixed(1)}%',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              if (selectedAssignmentId != null) ...[
                const Divider(height: 24),
                _buildAssignmentGrade(student, selectedAssignmentId!),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGradeBadge(double grade) {
    Color color;
    String letter;

    if (grade >= 90) {
      color = Colors.green;
      letter = 'A';
    } else if (grade >= 80) {
      color = Colors.blue;
      letter = 'B';
    } else if (grade >= 70) {
      color = Colors.orange;
      letter = 'C';
    } else if (grade >= 60) {
      color = Colors.deepOrange;
      letter = 'D';
    } else {
      color = Colors.red;
      letter = 'F';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        letter,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.bold,
          fontSize: 16,
        ),
      ),
    );
  }

  Widget _buildAssignmentGrade(Student student, String assignmentId) {
    final grade = student.grades[assignmentId];
    final assignment = assignments.firstWhere((a) => a.id == assignmentId);

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                assignment.title,
                style: const TextStyle(fontWeight: FontWeight.w500),
              ),
              if (grade?.feedback != null)
                Text(
                  grade!.feedback!,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Colors.grey,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
            ],
          ),
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              grade?.score != null
                  ? '${grade!.score}/${assignment.totalPoints}'
                  : '—',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            if (grade?.status == GradeStatus.late)
              const Text(
                'Late',
                style: TextStyle(
                  color: Colors.orange,
                  fontSize: 11,
                ),
              ),
            if (grade?.status == GradeStatus.missing)
              const Text(
                'Missing',
                style: TextStyle(
                  color: Colors.red,
                  fontSize: 11,
                ),
              ),
          ],
        ),
        IconButton(
          icon: const Icon(Icons.edit, size: 20),
          onPressed: () => _quickEditGrade(student, assignment),
        ),
      ],
    );
  }

  void _showStudentDetails(Student student) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => StudentGradeDetailScreen(student: student),
      ),
    );
  }

  void _quickEditGrade(Student student, Assignment assignment) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => QuickGradeEntry(
        student: student,
        assignment: assignment,
        onSave: (score, feedback) async {
          // TODO: API call to save grade
          Navigator.pop(context);
          _loadGradebook();
        },
      ),
    );
  }

  void _showQuickGradeEntry() {
    showDialog(
      context: context,
      builder: (context) => QuickGradeDialog(
        students: students,
        assignments: assignments,
        onSave: (studentId, assignmentId, score) async {
          // TODO: API call to save grade
          Navigator.pop(context);
          _loadGradebook();
        },
      ),
    );
  }

  void _exportGradebook() {
    // TODO: Export gradebook
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Exporting gradebook...')),
    );
  }

  void _showSettings() {
    // TODO: Show gradebook settings
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }

  // Mock data
  List<Student> _getMockStudents() {
    return [
      Student(
        id: '1',
        name: 'Alice Johnson',
        initials: 'AJ',
        overallGrade: 92.5,
        missingCount: 0,
        grades: {
          '1': Grade(score: 95, status: GradeStatus.graded),
          '2': Grade(score: 88, status: GradeStatus.graded),
        },
      ),
      Student(
        id: '2',
        name: 'Bob Smith',
        initials: 'BS',
        overallGrade: 78.3,
        missingCount: 2,
        grades: {
          '1': Grade(score: 72, status: GradeStatus.late),
          '2': Grade(score: null, status: GradeStatus.missing),
        },
      ),
    ];
  }

  List<Assignment> _getMockAssignments() {
    return [
      Assignment(id: '1', title: 'Quiz 1', totalPoints: 100),
      Assignment(id: '2', title: 'Homework 1', totalPoints: 50),
    ];
  }
}

// Quick Grade Entry Widget
class QuickGradeEntry extends StatefulWidget {
  final Student student;
  final Assignment assignment;
  final Future<void> Function(double?, String?) onSave;

  const QuickGradeEntry({
    Key? key,
    required this.student,
    required this.assignment,
    required this.onSave,
  }) : super(key: key);

  @override
  State<QuickGradeEntry> createState() => _QuickGradeEntryState();
}

class _QuickGradeEntryState extends State<QuickGradeEntry> {
  final _scoreController = TextEditingController();
  final _feedbackController = TextEditingController();
  bool isSaving = false;

  @override
  void initState() {
    super.initState();
    final grade = widget.student.grades[widget.assignment.id];
    if (grade?.score != null) {
      _scoreController.text = grade!.score.toString();
    }
    if (grade?.feedback != null) {
      _feedbackController.text = grade!.feedback!;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Grade Entry',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              '${widget.student.name} - ${widget.assignment.title}',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _scoreController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: 'Score (out of ${widget.assignment.totalPoints})',
                border: const OutlineInputBorder(),
              ),
              autofocus: true,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _feedbackController,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Feedback (optional)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                const SizedBox(width: 16),
                ElevatedButton(
                  onPressed: isSaving ? null : _save,
                  child: isSaving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Save'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _save() async {
    setState(() => isSaving = true);
    try {
      final score = _scoreController.text.isEmpty
          ? null
          : double.tryParse(_scoreController.text);
      final feedback = _feedbackController.text.isEmpty
          ? null
          : _feedbackController.text;

      await widget.onSave(score, feedback);
    } finally {
      if (mounted) {
        setState(() => isSaving = false);
      }
    }
  }

  @override
  void dispose() {
    _scoreController.dispose();
    _feedbackController.dispose();
    super.dispose();
  }
}

// Quick Grade Dialog (for bulk grading)
class QuickGradeDialog extends StatefulWidget {
  final List<Student> students;
  final List<Assignment> assignments;
  final Future<void> Function(String studentId, String assignmentId, double score) onSave;

  const QuickGradeDialog({
    Key? key,
    required this.students,
    required this.assignments,
    required this.onSave,
  }) : super(key: key);

  @override
  State<QuickGradeDialog> createState() => _QuickGradeDialogState();
}

class _QuickGradeDialogState extends State<QuickGradeDialog> {
  String? selectedStudentId;
  String? selectedAssignmentId;
  final _scoreController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Quick Grade'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          DropdownButtonFormField<String>(
            initialValue: selectedStudentId,
            decoration: const InputDecoration(labelText: 'Student'),
            items: widget.students.map((student) {
              return DropdownMenuItem(
                value: student.id,
                child: Text(student.name),
              );
            }).toList(),
            onChanged: (value) => setState(() => selectedStudentId = value),
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            initialValue: selectedAssignmentId,
            decoration: const InputDecoration(labelText: 'Assignment'),
            items: widget.assignments.map((assignment) {
              return DropdownMenuItem(
                value: assignment.id,
                child: Text(assignment.title),
              );
            }).toList(),
            onChanged: (value) => setState(() => selectedAssignmentId = value),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _scoreController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Score',
              border: OutlineInputBorder(),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _canSave ? _save : null,
          child: const Text('Save'),
        ),
      ],
    );
  }

  bool get _canSave {
    return selectedStudentId != null &&
        selectedAssignmentId != null &&
        _scoreController.text.isNotEmpty;
  }

  Future<void> _save() async {
    final score = double.parse(_scoreController.text);
    await widget.onSave(selectedStudentId!, selectedAssignmentId!, score);
  }

  @override
  void dispose() {
    _scoreController.dispose();
    super.dispose();
  }
}

// Student Grade Detail Screen
class StudentGradeDetailScreen extends StatelessWidget {
  final Student student;

  const StudentGradeDetailScreen({
    Key? key,
    required this.student,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(student.name),
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            color: Colors.grey[100],
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatCard('Overall', '${student.overallGrade.toFixed(1)}%'),
                _buildStatCard('Missing', '${student.missingCount}'),
                _buildStatCard('Assignments', '${student.grades.length}'),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              children: [
                // TODO: List all assignments and grades
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, String value) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: Colors.grey,
          ),
        ),
      ],
    );
  }
}

// Models
class Student {
  final String id;
  final String name;
  final String initials;
  final double overallGrade;
  final int missingCount;
  final Map<String, Grade?> grades;

  Student({
    required this.id,
    required this.name,
    required this.initials,
    required this.overallGrade,
    required this.missingCount,
    required this.grades,
  });
}

class Assignment {
  final String id;
  final String title;
  final int totalPoints;

  Assignment({
    required this.id,
    required this.title,
    required this.totalPoints,
  });
}

class Grade {
  final double? score;
  final GradeStatus status;
  final String? feedback;

  Grade({
    this.score,
    required this.status,
    this.feedback,
  });
}

enum GradeStatus {
  graded,
  missing,
  late,
  exempt,
  pending,
}

extension DoubleExtension on double {
  String toFixed(int decimals) => toStringAsFixed(decimals);
}
