class CheatCommand {
  final String command;
  final String description;
  final String? example;

  const CheatCommand({
    required this.command,
    required this.description,
    this.example,
  });
}

class CheatSection {
  final String title;
  final List<CheatCommand> commands;

  const CheatSection({
    required this.title,
    required this.commands,
  });
}

class CheatSheet {
  final String slug;
  final String title;
  final String category;
  final String shortDescription;
  final String icon;
  final List<CheatSection> sections;
  final List<String> tips;

  const CheatSheet({
    required this.slug,
    required this.title,
    required this.category,
    required this.shortDescription,
    required this.icon,
    required this.sections,
    required this.tips,
  });
}
