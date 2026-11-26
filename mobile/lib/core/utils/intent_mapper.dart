abstract class DomainLabels {
  static const Map<String, String> userIntents = {
    'looking_for_cofounder': 'Kofaunder qidirmoqda',
    'open_to_work': 'Ishga tayyor',
    'raising_funds': 'Investitsiya jalb qilmoqda',
    'open_to_advisory': 'Maslahatchi',
  };

  static const Map<String, String> projectStages = {
    'idea': 'G\'oya (Idea)',
    'mvp': 'MVP',
    'launched': 'Ishga tushgan',
    'scaling': 'Masshtablash',
  };

  static const Map<String, String> projectLookingFor = {
    'cofounder': 'Kofaunder (Hammuassis)',
    'feedback': 'Fikr-mulohaza',
    'investment': 'Investitsiya',
    'team': 'Jamoa a\'zolari',
  };

  static String? intentLabel(String? intent) {
    if (intent == null || intent == 'none') return null;
    return userIntents[intent];
  }

  static String stageLabel(String? stage) {
    if (stage == null) return '';
    return projectStages[stage] ?? stage.toUpperCase();
  }

  static String lookingForLabel(String? lookingFor) {
    if (lookingFor == null) return '';
    return projectLookingFor[lookingFor] ?? lookingFor;
  }
}
