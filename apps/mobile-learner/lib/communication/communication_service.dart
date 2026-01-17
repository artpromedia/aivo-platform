import 'dart:convert';
import 'package:http/http.dart' as http;
import 'models.dart';

class CommunicationService {
  static const String baseUrl = 'http://localhost:8090';
  final http.Client client;

  CommunicationService({http.Client? client}) : client = client ?? http.Client();

  // AAC Board Methods
  Future<List<AACBoard>> getAACBoards(String userId) async {
    final response = await client.get(
      Uri.parse('$baseUrl/aac-boards?userId=$userId'),
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body) as List<dynamic>;
      return data
          .map((json) => AACBoard.fromJson(json as Map<String, dynamic>))
          .toList();
    } else {
      throw Exception('Failed to load AAC boards');
    }
  }

  Future<AACBoard> getAACBoard(String boardId) async {
    final response = await client.get(
      Uri.parse('$baseUrl/aac-boards/$boardId'),
    );

    if (response.statusCode == 200) {
      return AACBoard.fromJson(
          json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to load AAC board');
    }
  }

  Future<AACBoard> createAACBoard({
    required String userId,
    required String name,
    String? description,
    required AACBoardLayout layout,
    bool enableAudio = true,
    bool enablePrediction = false,
  }) async {
    final response = await client.post(
      Uri.parse('$baseUrl/aac-boards'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'userId': userId,
        'name': name,
        if (description != null) 'description': description,
        'layout': layout.name,
        'enableAudio': enableAudio,
        'enablePrediction': enablePrediction,
      }),
    );

    if (response.statusCode == 201) {
      return AACBoard.fromJson(
          json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to create AAC board');
    }
  }

  Future<AACBoard> addSymbolToBoard(String boardId, AACSymbol symbol) async {
    final response = await client.post(
      Uri.parse('$baseUrl/aac-boards/$boardId/symbols'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(symbol.toJson()),
    );

    if (response.statusCode == 200) {
      return AACBoard.fromJson(
          json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to add symbol to board');
    }
  }

  Future<AACBoard> updateSymbol(
      String boardId, String symbolId, AACSymbol symbol) async {
    final response = await client.put(
      Uri.parse('$baseUrl/aac-boards/$boardId/symbols/$symbolId'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(symbol.toJson()),
    );

    if (response.statusCode == 200) {
      return AACBoard.fromJson(
          json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to update symbol');
    }
  }

  Future<AACBoard> deleteSymbol(String boardId, String symbolId) async {
    final response = await client.delete(
      Uri.parse('$baseUrl/aac-boards/$boardId/symbols/$symbolId'),
    );

    if (response.statusCode == 200) {
      return AACBoard.fromJson(
          json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to delete symbol');
    }
  }

  Future<void> deleteAACBoard(String boardId) async {
    final response = await client.delete(
      Uri.parse('$baseUrl/aac-boards/$boardId'),
    );

    if (response.statusCode != 204) {
      throw Exception('Failed to delete AAC board');
    }
  }

  Future<AACMessage> createMessage({
    required String userId,
    required String boardId,
    required List<String> symbolIds,
    required String text,
  }) async {
    final response = await client.post(
      Uri.parse('$baseUrl/aac-messages'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'userId': userId,
        'boardId': boardId,
        'symbolIds': symbolIds,
        'text': text,
      }),
    );

    if (response.statusCode == 201) {
      return AACMessage.fromJson(
          json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to create message');
    }
  }

  Future<List<AACMessage>> getMessages(String userId, String boardId) async {
    final response = await client.get(
      Uri.parse('$baseUrl/aac-messages?userId=$userId&boardId=$boardId'),
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body) as List<dynamic>;
      return data
          .map((json) => AACMessage.fromJson(json as Map<String, dynamic>))
          .toList();
    } else {
      throw Exception('Failed to load messages');
    }
  }

  // Visual Schedule Methods
  Future<List<VisualSchedule>> getSchedules(String userId) async {
    final response = await client.get(
      Uri.parse('$baseUrl/schedules?userId=$userId'),
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body) as List<dynamic>;
      return data
          .map((json) => VisualSchedule.fromJson(json as Map<String, dynamic>))
          .toList();
    } else {
      throw Exception('Failed to load schedules');
    }
  }

  Future<VisualSchedule> getSchedule(String scheduleId) async {
    final response = await client.get(
      Uri.parse('$baseUrl/schedules/$scheduleId'),
    );

    if (response.statusCode == 200) {
      return VisualSchedule.fromJson(
          json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to load schedule');
    }
  }

  Future<VisualSchedule> createSchedule({
    required String userId,
    required String name,
    required String date,
  }) async {
    final response = await client.post(
      Uri.parse('$baseUrl/schedules'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'userId': userId,
        'name': name,
        'date': date,
      }),
    );

    if (response.statusCode == 201) {
      return VisualSchedule.fromJson(
          json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to create schedule');
    }
  }

  Future<VisualSchedule> addActivity(
      String scheduleId, ScheduleActivity activity) async {
    final response = await client.post(
      Uri.parse('$baseUrl/schedules/$scheduleId/activities'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(activity.toJson()),
    );

    if (response.statusCode == 200) {
      return VisualSchedule.fromJson(
          json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to add activity');
    }
  }

  Future<VisualSchedule> updateActivity(
      String scheduleId, String activityId, ScheduleActivity activity) async {
    final response = await client.put(
      Uri.parse('$baseUrl/schedules/$scheduleId/activities/$activityId'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(activity.toJson()),
    );

    if (response.statusCode == 200) {
      return VisualSchedule.fromJson(
          json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to update activity');
    }
  }

  Future<VisualSchedule> completeActivity(
      String scheduleId, String activityId) async {
    final response = await client.post(
      Uri.parse(
          '$baseUrl/schedules/$scheduleId/activities/$activityId/complete'),
    );

    if (response.statusCode == 200) {
      return VisualSchedule.fromJson(
          json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to complete activity');
    }
  }

  Future<VisualSchedule> deleteActivity(
      String scheduleId, String activityId) async {
    final response = await client.delete(
      Uri.parse('$baseUrl/schedules/$scheduleId/activities/$activityId'),
    );

    if (response.statusCode == 200) {
      return VisualSchedule.fromJson(
          json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to delete activity');
    }
  }

  Future<void> deleteSchedule(String scheduleId) async {
    final response = await client.delete(
      Uri.parse('$baseUrl/schedules/$scheduleId'),
    );

    if (response.statusCode != 204) {
      throw Exception('Failed to delete schedule');
    }
  }

  // Choice Board Methods
  Future<List<ChoiceBoard>> getChoiceBoards(String userId) async {
    final response = await client.get(
      Uri.parse('$baseUrl/choice-boards?userId=$userId'),
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body) as List<dynamic>;
      return data
          .map((json) => ChoiceBoard.fromJson(json as Map<String, dynamic>))
          .toList();
    } else {
      throw Exception('Failed to load choice boards');
    }
  }

  Future<ChoiceBoard> getChoiceBoard(String boardId) async {
    final response = await client.get(
      Uri.parse('$baseUrl/choice-boards/$boardId'),
    );

    if (response.statusCode == 200) {
      return ChoiceBoard.fromJson(
          json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to load choice board');
    }
  }

  Future<ChoiceBoard> createChoiceBoard({
    required String userId,
    required String name,
    String? description,
    required ChoiceBoardType type,
    int maxSelections = 1,
    bool allowMultiple = false,
  }) async {
    final response = await client.post(
      Uri.parse('$baseUrl/choice-boards'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'userId': userId,
        'name': name,
        if (description != null) 'description': description,
        'type': type.name,
        'maxSelections': maxSelections,
        'allowMultiple': allowMultiple,
      }),
    );

    if (response.statusCode == 201) {
      return ChoiceBoard.fromJson(
          json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to create choice board');
    }
  }

  Future<ChoiceBoard> addChoice(String boardId, Choice choice) async {
    final response = await client.post(
      Uri.parse('$baseUrl/choice-boards/$boardId/choices'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(choice.toJson()),
    );

    if (response.statusCode == 200) {
      return ChoiceBoard.fromJson(
          json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to add choice');
    }
  }

  Future<ChoiceBoard> deleteChoice(String boardId, String choiceId) async {
    final response = await client.delete(
      Uri.parse('$baseUrl/choice-boards/$boardId/choices/$choiceId'),
    );

    if (response.statusCode == 200) {
      return ChoiceBoard.fromJson(
          json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to delete choice');
    }
  }

  Future<void> deleteChoiceBoard(String boardId) async {
    final response = await client.delete(
      Uri.parse('$baseUrl/choice-boards/$boardId'),
    );

    if (response.statusCode != 204) {
      throw Exception('Failed to delete choice board');
    }
  }

  Future<ChoiceSelection> recordSelection({
    required String userId,
    required String boardId,
    required List<String> choiceIds,
    String? notes,
  }) async {
    final response = await client.post(
      Uri.parse('$baseUrl/choice-selections'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'userId': userId,
        'boardId': boardId,
        'choiceIds': choiceIds,
        if (notes != null) 'notes': notes,
      }),
    );

    if (response.statusCode == 201) {
      return ChoiceSelection.fromJson(
          json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to record selection');
    }
  }

  // Communication Template Methods
  Future<List<CommunicationTemplate>> getTemplates(String userId) async {
    final response = await client.get(
      Uri.parse('$baseUrl/templates?userId=$userId'),
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body) as List<dynamic>;
      return data
          .map((json) =>
              CommunicationTemplate.fromJson(json as Map<String, dynamic>))
          .toList();
    } else {
      throw Exception('Failed to load templates');
    }
  }

  Future<CommunicationTemplate> getTemplate(String templateId) async {
    final response = await client.get(
      Uri.parse('$baseUrl/templates/$templateId'),
    );

    if (response.statusCode == 200) {
      return CommunicationTemplate.fromJson(
          json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to load template');
    }
  }

  Future<CommunicationTemplate> createTemplate({
    required String userId,
    required String name,
    String? description,
    required TemplateCategory category,
    required String template,
    required List<TemplateField> fields,
  }) async {
    final response = await client.post(
      Uri.parse('$baseUrl/templates'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'userId': userId,
        'name': name,
        if (description != null) 'description': description,
        'category': category.name,
        'template': template,
        'fields': fields.map((f) => f.toJson()).toList(),
      }),
    );

    if (response.statusCode == 201) {
      return CommunicationTemplate.fromJson(
          json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to create template');
    }
  }

  Future<void> deleteTemplate(String templateId) async {
    final response = await client.delete(
      Uri.parse('$baseUrl/templates/$templateId'),
    );

    if (response.statusCode != 204) {
      throw Exception('Failed to delete template');
    }
  }

  Future<TemplateMessage> composeMessage({
    required String userId,
    required String templateId,
    required Map<String, String> fieldValues,
  }) async {
    final response = await client.post(
      Uri.parse('$baseUrl/template-messages'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'userId': userId,
        'templateId': templateId,
        'fieldValues': fieldValues,
      }),
    );

    if (response.statusCode == 201) {
      return TemplateMessage.fromJson(
          json.decode(response.body) as Map<String, dynamic>);
    } else {
      throw Exception('Failed to compose message');
    }
  }

  Future<List<TemplateMessage>> getTemplateMessages(
      String userId, String templateId) async {
    final response = await client.get(
      Uri.parse(
          '$baseUrl/template-messages?userId=$userId&templateId=$templateId'),
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body) as List<dynamic>;
      return data
          .map((json) => TemplateMessage.fromJson(json as Map<String, dynamic>))
          .toList();
    } else {
      throw Exception('Failed to load template messages');
    }
  }
}
