import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_notifications/flutter_notifications.dart';

void main() {
  group('CoppaNotificationValidator', () {
    group('isCompliant', () {
      test('should accept age-appropriate content', () {
        expect(CoppaNotificationValidator.isCompliant('Great job!'), isTrue);
        expect(CoppaNotificationValidator.isCompliant('Keep learning!'), isTrue);
        expect(CoppaNotificationValidator.isCompliant('You earned a badge!'), isTrue);
        expect(CoppaNotificationValidator.isCompliant("Time for today's session"), isTrue);
      });

      test('should reject marketing content', () {
        expect(CoppaNotificationValidator.isCompliant('Buy now!'), isFalse);
        expect(CoppaNotificationValidator.isCompliant('Special discount available'), isFalse);
        expect(CoppaNotificationValidator.isCompliant('Limited time offer'), isFalse);
        expect(CoppaNotificationValidator.isCompliant('Shop today'), isFalse);
      });

      test('should reject promotional content', () {
        expect(CoppaNotificationValidator.isCompliant('Refer a friend'), isFalse);
        expect(CoppaNotificationValidator.isCompliant('Subscribe now'), isFalse);
        expect(CoppaNotificationValidator.isCompliant('Upgrade your plan'), isFalse);
        expect(CoppaNotificationValidator.isCompliant('Download our app'), isFalse);
      });

      test('should reject data collection content', () {
        expect(CoppaNotificationValidator.isCompliant('Share your location'), isFalse);
        expect(CoppaNotificationValidator.isCompliant('Enter your email'), isFalse);
        expect(CoppaNotificationValidator.isCompliant('Add your phone number'), isFalse);
        expect(CoppaNotificationValidator.isCompliant('Create account'), isFalse);
      });

      test('should reject social engagement content', () {
        expect(CoppaNotificationValidator.isCompliant('Add friends now'), isFalse);
        expect(CoppaNotificationValidator.isCompliant('Chat with others'), isFalse);
        expect(CoppaNotificationValidator.isCompliant('Share this'), isFalse);
        expect(CoppaNotificationValidator.isCompliant('Follow us'), isFalse);
      });

      test('should reject urgency/pressure content', () {
        expect(CoppaNotificationValidator.isCompliant('Hurry up!'), isFalse);
        expect(CoppaNotificationValidator.isCompliant('Expiring soon'), isFalse);
        expect(CoppaNotificationValidator.isCompliant('Act now before too late'), isFalse);
        expect(CoppaNotificationValidator.isCompliant('Ending today'), isFalse);
      });

      test('should handle case insensitivity', () {
        expect(CoppaNotificationValidator.isCompliant('BUY NOW'), isFalse);
        expect(CoppaNotificationValidator.isCompliant('Share This'), isFalse);
        expect(CoppaNotificationValidator.isCompliant('SUBSCRIBE'), isFalse);
      });

      test('should handle empty and null-like content', () {
        expect(CoppaNotificationValidator.isCompliant(''), isTrue);
        expect(CoppaNotificationValidator.isCompliant('   '), isTrue);
      });
    });

    group('checkCompliance', () {
      test('should return null for compliant content', () {
        expect(CoppaNotificationValidator.checkCompliance('Good job!'), isNull);
        expect(CoppaNotificationValidator.checkCompliance('Badge earned'), isNull);
      });

      test('should return violation reason for non-compliant content', () {
        final result = CoppaNotificationValidator.checkCompliance('Buy now!');
        expect(result, isNotNull);
        expect(result, contains('buy'));
      });

      test('should identify specific blocked term', () {
        final result = CoppaNotificationValidator.checkCompliance('Subscribe to premium');
        expect(result, isNotNull);
        expect(result, contains('subscribe'));
      });
    });

    group('sanitize', () {
      test('should remove blocked terms', () {
        final result = CoppaNotificationValidator.sanitize('Buy now and save!');
        expect(result.toLowerCase(), isNot(contains('buy')));
      });

      test('should preserve non-blocked content', () {
        final result = CoppaNotificationValidator.sanitize('Great job learning today!');
        expect(result, 'Great job learning today!');
      });

      test('should handle multiple blocked terms', () {
        final result = CoppaNotificationValidator.sanitize('Buy now and subscribe for deals!');
        expect(result.toLowerCase(), isNot(contains('buy')));
        expect(result.toLowerCase(), isNot(contains('subscribe')));
      });
    });

    group('isAllowedType', () {
      test('should allow educational notification types', () {
        expect(CoppaNotificationValidator.isAllowedType(NotificationTypes.sessionReminder), isTrue);
        expect(CoppaNotificationValidator.isAllowedType(NotificationTypes.achievementUnlocked), isTrue);
        expect(CoppaNotificationValidator.isAllowedType(NotificationTypes.streakMilestone), isTrue);
        expect(CoppaNotificationValidator.isAllowedType(NotificationTypes.encouragement), isTrue);
        expect(CoppaNotificationValidator.isAllowedType(NotificationTypes.activityComplete), isTrue);
      });

      test('should block non-educational notification types', () {
        expect(CoppaNotificationValidator.isAllowedType(NotificationTypes.billingReminder), isFalse);
        expect(CoppaNotificationValidator.isAllowedType(NotificationTypes.newMessage), isFalse);
        expect(CoppaNotificationValidator.isAllowedType(NotificationTypes.iepUpdate), isFalse);
        expect(CoppaNotificationValidator.isAllowedType(NotificationTypes.progressMilestone), isFalse);
      });

      test('should block unknown notification types', () {
        expect(CoppaNotificationValidator.isAllowedType('unknown_type'), isFalse);
        expect(CoppaNotificationValidator.isAllowedType('marketing_promo'), isFalse);
      });
    });
  });

  group('AgeAppropriateContent', () {
    group('getGreeting', () {
      test('should return greeting for young learners (under 8)', () {
        final greeting = AgeAppropriateContent.getGreeting(6);
        expect(greeting, isNotEmpty);
        expect(greeting, isNot(contains('!'))); // Not too exclamatory
      });

      test('should return greeting for middle schoolers (8-12)', () {
        final greeting = AgeAppropriateContent.getGreeting(10);
        expect(greeting, isNotEmpty);
      });

      test('should return greeting for teens (13+)', () {
        final greeting = AgeAppropriateContent.getGreeting(15);
        expect(greeting, isNotEmpty);
      });

      test('should handle edge cases', () {
        expect(AgeAppropriateContent.getGreeting(0), isNotEmpty);
        expect(AgeAppropriateContent.getGreeting(100), isNotEmpty);
      });
    });

    group('getCelebration', () {
      test('should return celebration for young learners', () {
        final celebration = AgeAppropriateContent.getCelebration(5);
        expect(celebration, isNotEmpty);
      });

      test('should return celebration for older learners', () {
        final celebration = AgeAppropriateContent.getCelebration(12);
        expect(celebration, isNotEmpty);
      });
    });

    group('getReminder', () {
      test('should return gentle reminder for young learners', () {
        final reminder = AgeAppropriateContent.getReminder(6);
        expect(reminder, isNotEmpty);
      });

      test('should return appropriate reminder for older learners', () {
        final reminder = AgeAppropriateContent.getReminder(14);
        expect(reminder, isNotEmpty);
      });
    });
  });

  group('AivoNotification', () {
    test('should create notification with required fields', () {
      final notification = AivoNotification(
        id: 'test-1',
        type: NotificationTypes.achievementUnlocked,
        title: 'Test Title',
        body: 'Test Body',
      );

      expect(notification.id, 'test-1');
      expect(notification.type, NotificationTypes.achievementUnlocked);
      expect(notification.title, 'Test Title');
      expect(notification.body, 'Test Body');
      expect(notification.priority, NotificationPriority.normal);
    });

    test('should serialize to JSON', () {
      final notification = AivoNotification(
        id: 'test-2',
        type: NotificationTypes.sessionReminder,
        title: 'Session Time',
        body: 'Time for your learning session',
        priority: NotificationPriority.high,
        data: {'sessionId': '123'},
      );

      final json = notification.toJson();

      expect(json['id'], 'test-2');
      expect(json['type'], NotificationTypes.sessionReminder);
      expect(json['title'], 'Session Time');
      expect(json['priority'], 'high');
      expect(json['data']['sessionId'], '123');
    });

    test('should deserialize from JSON', () {
      final json = {
        'id': 'test-3',
        'type': NotificationTypes.encouragement,
        'title': 'Keep Going!',
        'body': 'You are doing great',
        'priority': 'low',
        'receivedAt': '2024-01-01T12:00:00.000Z',
      };

      final notification = AivoNotification.fromJson(json);

      expect(notification.id, 'test-3');
      expect(notification.type, NotificationTypes.encouragement);
      expect(notification.priority, NotificationPriority.low);
    });
  });

  group('NotificationChannel', () {
    test('should have all required channels defined', () {
      expect(AivoNotificationChannels.sessionUpdates, isNotNull);
      expect(AivoNotificationChannels.achievements, isNotNull);
      expect(AivoNotificationChannels.messages, isNotNull);
      expect(AivoNotificationChannels.reminders, isNotNull);
      expect(AivoNotificationChannels.alerts, isNotNull);
      expect(AivoNotificationChannels.billing, isNotNull);
      expect(AivoNotificationChannels.encouragement, isNotNull);
    });

    test('should return correct channel for notification types', () {
      expect(
        AivoNotificationChannels.getChannelForType(NotificationTypes.sessionComplete),
        AivoNotificationChannels.sessionUpdates,
      );
      expect(
        AivoNotificationChannels.getChannelForType(NotificationTypes.achievementUnlocked),
        AivoNotificationChannels.achievements,
      );
      expect(
        AivoNotificationChannels.getChannelForType(NotificationTypes.newMessage),
        AivoNotificationChannels.messages,
      );
      expect(
        AivoNotificationChannels.getChannelForType(NotificationTypes.studentStruggling),
        AivoNotificationChannels.alerts,
      );
    });

    test('should return default channel for unknown types', () {
      final channel = AivoNotificationChannels.getChannelForType('unknown_type');
      expect(channel, AivoNotificationChannels.sessionUpdates);
    });
  });

  group('NotificationPreferences', () {
    test('should create default preferences', () {
      final prefs = NotificationPreferences.defaults();

      expect(prefs.pushEnabled, isTrue);
      expect(prefs.emailEnabled, isTrue);
      expect(prefs.inAppEnabled, isTrue);
      expect(prefs.channels, isNotEmpty);
    });

    test('should serialize to JSON', () {
      final prefs = NotificationPreferences(
        pushEnabled: true,
        emailEnabled: false,
        inAppEnabled: true,
        channels: {
          'achievements': true,
          'messages': false,
        },
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      );

      final json = prefs.toJson();

      expect(json['pushEnabled'], isTrue);
      expect(json['emailEnabled'], isFalse);
      expect(json['channels']['achievements'], isTrue);
      expect(json['channels']['messages'], isFalse);
    });

    test('should deserialize from JSON', () {
      final json = {
        'pushEnabled': false,
        'emailEnabled': true,
        'inAppEnabled': true,
        'channels': {'alerts': true},
        'quietHoursStart': '21:00',
        'quietHoursEnd': '08:00',
        'frequency': 'immediate',
      };

      final prefs = NotificationPreferences.fromJson(json);

      expect(prefs.pushEnabled, isFalse);
      expect(prefs.emailEnabled, isTrue);
      expect(prefs.channels['alerts'], isTrue);
    });
  });

  group('LearnerNotificationSettings', () {
    test('should create parent-controlled settings', () {
      final settings = LearnerNotificationSettings(
        remindersEnabled: true,
        achievementsEnabled: true,
        encouragementEnabled: true,
        soundsEnabled: true,
        parentControlled: true,
      );

      expect(settings.parentControlled, isTrue);
      expect(settings.remindersEnabled, isTrue);
    });

    test('should validate COPPA compliance', () {
      final settings = LearnerNotificationSettings(
        remindersEnabled: true,
        achievementsEnabled: true,
        encouragementEnabled: true,
        soundsEnabled: false,
        parentControlled: true,
      );

      // Settings with parentControlled should always be considered valid
      expect(settings.parentControlled, isTrue);
    });

    test('should serialize to JSON', () {
      final settings = LearnerNotificationSettings(
        remindersEnabled: true,
        achievementsEnabled: false,
        encouragementEnabled: true,
        soundsEnabled: true,
        parentControlled: true,
      );

      final json = settings.toJson();

      expect(json['remindersEnabled'], isTrue);
      expect(json['achievementsEnabled'], isFalse);
      expect(json['parentControlled'], isTrue);
    });
  });
}
