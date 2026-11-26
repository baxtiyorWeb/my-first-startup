import '../models/cheatsheet.dart';

abstract class CheatSheetsData {
  static const List<CheatSheet> list = [
    CheatSheet(
      slug: 'git',
      title: 'Git Eng Zarur Buyruqlar',
      category: 'DevOps & Tooling',
      shortDescription: 'Branch, commit, rebase, stash, cherry-pick va reflog buyruqlari.',
      icon: 'terminal',
      tips: [
        'Har doim git pull --rebase orqali o\'zgarishlarni oling.',
        'Katta o\'zgarishlardan oldin git stash create qilib oling.',
        'git reflog orqali hatto adashib o\'chirilgan commitlarni ham tiklash mumkin.',
      ],
      sections: [
        CheatSection(
          title: 'Filiallar (Branching) va O\'tish',
          commands: [
            CheatCommand(
              command: 'git switch -c feature/auth',
              description: 'Yangi filial yaratish va darhol unga o\'tish',
            ),
            CheatCommand(
              command: 'git branch -a',
              description: 'Barcha mahalliy va masofaviy (remote) filiallar ro\'yxati',
            ),
            CheatCommand(
              command: 'git branch -d feature/auth',
              description: 'Bajarilgan filialni xavfsiz o\'chirish',
            ),
          ],
        ),
        CheatSection(
          title: 'O\'zgarishlarni saqlash va Bekor qilish',
          commands: [
            CheatCommand(
              command: 'git stash push -m "temp work"',
              description: 'Tugallanmagan o\'zgarishlarni xotiraga saqlab tozalash',
            ),
            CheatCommand(
              command: 'git stash pop',
              description: 'Oxirgi saqlangan o\'zgarishlarni qaytarish',
            ),
            CheatCommand(
              command: 'git restore --staged <file>',
              description: 'Faylni staging (git add) maydonidan chiqarish',
            ),
          ],
        ),
      ],
    ),
    CheatSheet(
      slug: 'docker',
      title: 'Docker & Docker Compose',
      category: 'DevOps & Cloud',
      shortDescription: 'Konteynerlar, imagelar, volumelar va tarmoq boshqaruvi.',
      icon: 'layers',
      tips: [
        'Ishlatilmayotgan resurslarni tozalash uchun docker system prune -af ishlating.',
        'Production konteynerlarida root bo\'lmagan (non-root) user ishlating.',
      ],
      sections: [
        CheatSection(
          title: 'Konteynerlar boshqaruvi',
          commands: [
            CheatCommand(
              command: 'docker compose up -d',
              description: 'Barcha xizmatlarni fonda ishga tushirish',
            ),
            CheatCommand(
              command: 'docker ps -a',
              description: 'Barcha faol va to\'xtagan konteynerlar ro\'yxati',
            ),
            CheatCommand(
              command: 'docker logs -f <container_id>',
              description: 'Konteyner loglarini real-time rejimda kuzatish',
            ),
          ],
        ),
      ],
    ),
    CheatSheet(
      slug: 'flutter',
      title: 'Flutter & Dart CLI',
      category: 'Mobile Development',
      shortDescription: 'Mobil ilovalarni yaratish, tahlil qilish, testlash va build qilish.',
      icon: 'phone_android',
      tips: [
        'Statik tahlil uchun har doim flutter analyze buyrug\'ini ishlating.',
        'Release APK build qilishda --split-per-abi hajmni 60% gacha kamaytiradi.',
      ],
      sections: [
        CheatSection(
          title: 'Ishga tushirish va Paketlar',
          commands: [
            CheatCommand(
              command: 'flutter run -d <device_id>',
              description: 'Belgilangan qurilmada ilovani ishga tushirish',
            ),
            CheatCommand(
              command: 'flutter pub get',
              description: 'pubspec.yaml qaramliklarini o\'rnatish',
            ),
            CheatCommand(
              command: 'flutter analyze',
              description: 'Kod sifatini va linter qoidalarini tekshirish',
            ),
            CheatCommand(
              command: 'flutter build apk --release',
              description: 'Android uchun release APK fayl tayyorlash',
            ),
          ],
        ),
      ],
    ),
    CheatSheet(
      slug: 'sql',
      title: 'PostgreSQL & SQL Asoslari',
      category: 'Database & Backend',
      shortDescription: 'Indekslar, tranzaksiyalar, JOINlar va so\'rovlarni optimallashtirish.',
      icon: 'storage',
      tips: [
        'Qidiruv sekinlashganda har doim EXPLAIN ANALYZE orqali rejani tekshiring.',
        'Ko\'p filtrlanadigan ustunlarga B-Tree indekslar qo\'ying.',
      ],
      sections: [
        CheatSection(
          title: 'So\'rovlar va Indekslar',
          commands: [
            CheatCommand(
              command: 'EXPLAIN ANALYZE SELECT * FROM posts WHERE user_id = ...;',
              description: 'So\'rovning bajarilish vaqti va rejasini chuqur tahlil qilish',
            ),
            CheatCommand(
              command: 'CREATE INDEX idx_posts_user ON posts(user_id);',
              description: 'Jadval ustuniga B-tree indeks yaratish',
            ),
          ],
        ),
      ],
    ),
  ];
}
