/// Student Repository
///
/// Offline-first data access for students.
library;

import 'package:flutter_common/flutter_common.dart';

import '../models/models.dart';
import '../services/database/local_database.dart';
import '../services/sync/sync_service.dart';
import '../services/sync/connectivity_monitor.dart';

/// Repository for student data access.
class StudentRepository {
  StudentRepository({
    required this.api,
    required this.db,
    required this.sync,
    required this.connectivity,
  });

  final AivoApiClient api;
  final TeacherLocalDatabase db;
  final SyncService sync;
  final ConnectivityMonitor connectivity;

  /// Get all students (offline-first).
  Future<List<Student>> getStudents() async {
    // 1. Return cached data immediately
    final cached = await db.getStudents();
    
    // 2. If online, fetch fresh data in background
    if (await connectivity.isOnline) {
      _refreshStudentsInBackground();
    }
    
    return cached;
  }

  /// Get students by class.
  Future<List<Student>> getStudentsByClass(String classId) async {
    final cached = await db.getStudentsByClass(classId);
    
    if (await connectivity.isOnline) {
      _refreshStudentsByClassInBackground(classId);
    }
    
    return cached;
  }

  /// Get a student by ID.
  Future<Student?> getStudent(String id) async {
    // Try cache first
    var student = await db.getStudent(id);
    
    // If not cached and online, fetch from server
    if (student == null && await connectivity.isOnline) {
      try {
        final response = await api.get('/students/$id');
        student = Student.fromJson(response.data as Map<String, dynamic>);
        await db.cacheStudents([student]);
      } catch (_) {
        // Return null if fetch fails
      }
    }
    
    return student;
  }

  /// Update a student (offline-capable).
  Future<Student> updateStudent(String id, UpdateStudentDto dto) async {
    // 1. Update local database immediately
    final updated = await db.updateStudent(id, dto);
    
    // 2. Queue sync operation
    await sync.queueUpdate(
      entityType: 'student',
      entityId: id,
      data: dto.toJson(),
    );
    
    return updated;
  }

  /// Force refresh from server.
  Future<List<Student>> refreshStudents() async {
    if (!await connectivity.isOnline) {
      return db.getStudents();
    }

    try {
      final response = await api.get('/students');
      final data = response.data as List;
      final students = data
          .map((json) => Student.fromJson(json as Map<String, dynamic>))
          .toList();
      
      await db.cacheStudents(students);
      return students;
    } catch (e) {
      // Return cached on error
      return db.getStudents();
    }
  }

  void _refreshStudentsInBackground() async {
    try {
      final response = await api.get('/students');
      final data = response.data as List;
      final students = data
          .map((json) => Student.fromJson(json as Map<String, dynamic>))
          .toList();
      
      await db.cacheStudents(students);
    } catch (_) {
      // Silently fail - we have cached data
    }
  }

  void _refreshStudentsByClassInBackground(String classId) async {
    try {
      final response = await api.get('/classes/$classId/students');
      final data = response.data as List;
      final students = data
          .map((json) => Student.fromJson(json as Map<String, dynamic>))
          .toList();
      
      await db.cacheStudents(students);
    } catch (_) {
      // Silently fail
    }
  }
}
