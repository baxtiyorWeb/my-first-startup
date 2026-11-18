import type { Locale } from "@/lib/i18n/config";

export interface CheatSheetSection {
  title: Record<Locale, string>;
  commands: {
    command: string;
    description: Record<Locale, string>;
    example?: string;
  }[];
}

export interface CheatSheetItem {
  slug: string;
  title: Record<Locale, string>;
  category: string;
  shortDescription: Record<Locale, string>;
  overview: Record<Locale, string>;
  sections: CheatSheetSection[];
  tips: Record<Locale, string[]>;
  relatedSlugs: string[];
}

export const CHEATSHEETS_DATA: CheatSheetItem[] = [
  {
    slug: "git",
    title: {
      uz: "Git Eng Zarur Buyruqlar Cheat Sheet",
      ru: "Шпаргалка по важнейшим командам Git",
      en: "Essential Git Commands Cheat Sheet",
    },
    category: "devops",
    shortDescription: {
      uz: "Kundalik dasturlashda eng ko'p ishlatiladigan Git buyruqlari: branch, commit, rebase, stash va reflog.",
      ru: "Самые востребованные команды Git на каждый день: ветвление, коммиты, rebase, stash и reflog.",
      en: "Most critical daily Git commands: branch management, commit hygiene, rebase, stash, and recovery.",
    },
    overview: {
      uz: "Git bilan ishlashda har bir dasturchi yodda tutishi shart bo'lgan professional buyruqlar to'plami. Bu qo'llanma sizni merge conflictlaridan qutqaradi va toza git commit tarixini saqlashga yordam beradi.",
      ru: "Полный справочник профессиональных команд Git. Помогает поддерживать чистую историю коммитов и быстро разрешать конфликты слияния.",
      en: "A comprehensive reference of production Git commands designed to eliminate merge headaches and maintain pristine commit history.",
    },
    sections: [
      {
        title: {
          uz: "Filiallar (Branching) va O'tish",
          ru: "Ветвление и переключение",
          en: "Branching & Switching",
        },
        commands: [
          {
            command: "git switch -c feature/login",
            description: {
              uz: "Yangi filial ochish va unga o'tish (zamonaviy git checkout -b o'rniga)",
              ru: "Создать новую ветку и сразу переключиться на неё",
              en: "Create and switch to a new branch (modern alternative to checkout -b)",
            },
          },
          {
            command: "git branch -d branch-name",
            description: {
              uz: "Birlashtirilgan (merged) filialni xavfsiz o'chirish",
              ru: "Безопасное удаление объединенной ветки",
              en: "Safely delete a merged branch",
            },
          },
          {
            command: "git branch -a",
            description: {
              uz: "Barcha lokal va serverdagi filiallarni ko'rish",
              ru: "Показать все локальные и удаленные ветки",
              en: "List all local and remote branches",
            },
          },
        ],
      },
      {
        title: {
          uz: "Saqlash va Orqaga Qaytarish (Stash & Undo)",
          ru: "Сохранение и отмена изменений (Stash & Undo)",
          en: "Stash & Undoing Changes",
        },
        commands: [
          {
            command: "git stash push -m 'wip-work'",
            description: {
              uz: "Tugallanmagan ishlarni vaqtinchalik xotiraga olish",
              ru: "Временно спрятать незавершенные изменения в стек",
              en: "Shelve uncommitted local changes into stash stack",
            },
          },
          {
            command: "git stash pop",
            description: {
              uz: "Xotiradagi o'zgarishlarni qaytarib olish va ro'yxatdan o'chirish",
              ru: "Восстановить последние сохраненные изменения и удалить их из стека",
              en: "Restore and pop latest stashed changes back into working tree",
            },
          },
          {
            command: "git restore --staged <file>",
            description: {
              uz: "Faylni stage (git add) holatidan chiqarish",
              ru: "Убрать файл из индекса коммита (unstage)",
              en: "Remove a file from staging without altering file contents",
            },
          },
          {
            command: "git commit --amend --no-edit",
            description: {
              uz: "Oxirgi commitga yangi o'zgarishlarni qo'shib yuborish",
              ru: "Добавить новые изменения в последний коммит без изменения сообщения",
              en: "Add recent edits to the previous commit without changing the commit message",
            },
          },
        ],
      },
      {
        title: {
          uz: "Rebase va Toza Tarix",
          ru: "Rebase и чистая история",
          en: "Interactive Rebase & Hygiene",
        },
        commands: [
          {
            command: "git rebase -i HEAD~3",
            description: {
              uz: "Oxirgi 3 ta commitni tahrirlash, birlashtirish (squash) yoki o'chirish",
              ru: "Интерактивное редактирование, объединение (squash) последних 3 коммитов",
              en: "Interactively squash, edit, or reword the last 3 commits",
            },
          },
          {
            command: "git reflog",
            description: {
              uz: "Barcha git harakatlari jurnali (tasodifan o'chirilgan commitlarni tiklash uchun)",
              ru: "Журнал всех перемещений указателя HEAD (спасает удаленные коммиты)",
              en: "Chronological log of HEAD movements to rescue lost or deleted commits",
            },
          },
        ],
      },
    ],
    tips: {
      uz: [
        "Hech qachon main yoki master filialida to'g'ridan-to'g'ri `git push --force` qilmang",
        "Har bir commit bitta aniq mantiqiy o'zgarishni o'z ichiga olishi maqsadga muvofiq",
        "Commit sarlavhasida Conventional Commits (feat:, fix:, chore:, docs:) uslubidan foydalaning",
      ],
      ru: [
        "Никогда не делайте `git push --force` в основную ветку main",
        "Один коммит должен отражать одно законченное логическое действие",
        "Используйте формат Conventional Commits (feat:, fix:, refactor:)",
      ],
      en: [
        "Never run `git push --force` directly against shared production branches",
        "Adhere to atomic commits for easier revert and review workflows",
        "Follow Conventional Commits specification (feat:, fix:, chore:)",
      ],
    },
    relatedSlugs: ["docker", "sql", "linux"],
  },
  {
    slug: "docker",
    title: {
      uz: "Docker va Docker Compose Buyruqlar Cheat Sheet",
      ru: "Шпаргалка по командам Docker и Docker Compose",
      en: "Docker & Docker Compose CLI Cheat Sheet",
    },
    category: "devops",
    shortDescription: {
      uz: "Konteynerlarni boshqarish, tozalash, loglarni ko'rish va Compose steki.",
      ru: "Управление контейнерами, очистка ресурсов, просмотр логов и запуск через Compose.",
      en: "Container lifecycle management, pruning dangling layers, live streaming logs, and Compose workflows.",
    },
    overview: {
      uz: "Docker orqali server yoki lokal kompyuterda mikroservislarni ishga tushirish, hajmini qisqartirish va monitoring qilish uchun zarur buyruqlar.",
      ru: "Команды для сборки, быстрого запуска и очистки контейнеров Docker в повседневной практике разработчика.",
      en: "A focused cheatsheet of Docker and Compose CLI commands for daily engineering and cloud operations.",
    },
    sections: [
      {
        title: {
          uz: "Konteynerlar va Obrazlar (Images & Containers)",
          ru: "Образы и контейнеры",
          en: "Images & Containers",
        },
        commands: [
          {
            command: "docker ps -a",
            description: {
              uz: "Barcha ishlayotgan va to'xtagan konteynerlar ro'yxati",
              ru: "Показать все запущенные и остановленные контейнеры",
              en: "List all running and stopped containers",
            },
          },
          {
            command: "docker build -t app-name:v1 .",
            description: {
              uz: "Joriy papkadagi Dockerfile asosida yangi obraz yig'ish",
              ru: "Собрать образ из текущей директории",
              en: "Build image from Dockerfile in current directory",
            },
          },
          {
            command: "docker run -d -p 3000:3000 --name web app-name:v1",
            description: {
              uz: "Fon rejimida (-d) 3000 port bilan konteynerni ishga tushirish",
              ru: "Запустить контейнер в фоновом режиме на порту 3000",
              en: "Run detached container with port 3000 exposed",
            },
          },
          {
            command: "docker logs -f --tail 100 <container_id>",
            description: {
              uz: "Konteynerning so'nggi 100 ta logini real-time kuzatish",
              ru: "Смотреть последние 100 строк логов в реальном времени",
              en: "Stream real-time stdout logs with 100 lines tail",
            },
          },
        ],
      },
      {
        title: {
          uz: "Diskni Tozalash va Resurslar (Cleanup)",
          ru: "Очистка диска от мусора",
          en: "System Prune & Cleanup",
        },
        commands: [
          {
            command: "docker system prune -af --volumes",
            description: {
              uz: "Ishlatilmayotgan barcha obrazlar, konteynerlar va hajmlarni tozalash (diskni bo'shatish)",
              ru: "Полная очистка диска: удалить все неиспользуемые контейнеры, образы и тома",
              en: "Nuclear prune: reclaim disk by removing all dangling containers, networks, and volumes",
            },
          },
          {
            command: "docker stats",
            description: {
              uz: "Har bir konteyner sarflayotgan RAM va CPU foizlarini ko'rsatish",
              ru: "Мониторинг потребления CPU и RAM контейнерами в реальном времени",
              en: "Live real-time stream of CPU and memory utilization per container",
            },
          },
        ],
      },
      {
        title: {
          uz: "Docker Compose",
          ru: "Docker Compose",
          en: "Docker Compose Workflows",
        },
        commands: [
          {
            command: "docker compose up -d --build",
            description: {
              uz: "Barcha servislarni qayta yig'ib fon rejimida yoqish",
              ru: "Пересобрать и запустить все сервисы в фоне",
              en: "Rebuild and start all stack services in background",
            },
          },
          {
            command: "docker compose down -v",
            description: {
              uz: "Barcha servislarni to'xtatish va ularning ma'lumotlar bazasi tomlarini o'chirish",
              ru: "Остановить весь стек и удалить привязанные тома",
              en: "Tear down stack containers and associated persistent volumes",
            },
          },
        ],
      },
    ],
    tips: {
      uz: [
        "Obraz hajmini kamaytirish uchun alpine yoki distroless bazalardan foydalaning",
        "Dockerfile ichida .dockerignore faylini albatta qo'shing (node_modules va .git serverga yuklanmasin)",
      ],
      ru: [
        "Используйте легковесные образы Alpine или Distroless",
        "Всегда добавляйте .dockerignore для исключения node_modules и .git",
      ],
      en: [
        "Use multi-stage builds and Alpine or Distroless base images",
        "Always define .dockerignore to exclude node_modules and version control directories",
      ],
    },
    relatedSlugs: ["git", "linux", "sql"],
  },
  {
    slug: "sql",
    title: {
      uz: "SQL va PostgreSQL So'rovlar Cheat Sheet",
      ru: "Шпаргалка по SQL и запросам PostgreSQL",
      en: "SQL & PostgreSQL Queries Cheat Sheet",
    },
    category: "database",
    shortDescription: {
      uz: "JOIN turlari, GROUP BY, agregatsiya funksiyalari, indekslar va tranzaksiyalar.",
      ru: "Виды JOIN, агрегатные функции, индексы, группировка и транзакции.",
      en: "JOIN strategies, GROUP BY, aggregations, window functions, indexes, and transactions.",
    },
    overview: {
      uz: "Relyatsion ma'lumotlar bazasida ma'lumotlarni tezkor olish, yangilash va optimal indekslash uchun SQL buyruqlari.",
      ru: "Руководство по написанию быстрых аналитических и транзакционных SQL-запросов.",
      en: "A reference guide to composing optimized relational SQL queries and PostgreSQL index patterns.",
    },
    sections: [
      {
        title: {
          uz: "JOIN va Agregatsiyalar",
          ru: "JOIN и агрегации",
          en: "JOINs & Aggregations",
        },
        commands: [
          {
            command: `SELECT u.name, COUNT(p.id) as total_posts
FROM users u
LEFT JOIN posts p ON p.author_id = u.id
GROUP BY u.name
ORDER BY total_posts DESC;`,
            description: {
              uz: "LEFT JOIN orqali har bir foydalanuvchining jami postlari sonini hisoblash",
              ru: "Подсчет постов каждого пользователя с помощью LEFT JOIN",
              en: "Aggregate user post counts using LEFT JOIN and GROUP BY",
            },
          },
          {
            command: `SELECT name, salary,
  DENSE_RANK() OVER (ORDER BY salary DESC) as rank
FROM employees;`,
            description: {
              uz: "Window funksiyasi (DENSE_RANK) orqali maoshlar reytingini tuzish",
              ru: "Оконная функция для ранжирования записей",
              en: "Window function ranking employees by salary without grouping rows",
            },
          },
        ],
      },
      {
        title: {
          uz: "Tranzaksiyalar (ACID)",
          ru: "Транзакции (ACID)",
          en: "ACID Transactions",
        },
        commands: [
          {
            command: `BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;`,
            description: {
              uz: "Xavfsiz pul o'tkazmasi tranzaksiyasi (agar bitta joyda xato bo'lsa ROLLBACK qilinadi)",
              ru: "Атомарный перевод средств внутри транзакции",
              en: "Atomic transfer transaction with full rollback safety",
            },
          },
        ],
      },
    ],
    tips: {
      uz: [
        "WHERE shartida tez-tez ishlatiladigan ustunlarga B-Tree indeks qo'ying",
        "Har doim so'rov tezligini EXPLAIN ANALYZE buyrug'i orqali o'lchang",
      ],
      ru: [
        "Создавайте индексы на столбцы, участвующие в WHERE и JOIN",
        "Анализируйте план выполнения запросов с помощью EXPLAIN ANALYZE",
      ],
      en: [
        "Add B-Tree indexes on columns frequently filtered in WHERE or joined in JOIN",
        "Inspect execution bottlenecks with EXPLAIN (ANALYZE, BUFFERS)",
      ],
    },
    relatedSlugs: ["git", "docker", "linux"],
  },
  {
    slug: "linux",
    title: {
      uz: "Linux Terminal va Server Boshqaruvi Cheat Sheet",
      ru: "Шпаргалка по терминалу Linux и администрированию",
      en: "Linux Terminal & Server Administration Cheat Sheet",
    },
    category: "devops",
    shortDescription: {
      uz: "Fayllar bilan ishlash, tarmoqni tekshirish (curl, netstat), protsesslar va ruxsatlar (chmod/chown).",
      ru: "Работа с файлами, сетевые утилиты (curl, lsof, ss), мониторинг процессов и права доступа.",
      en: "File navigation, network probing (curl, ss, lsof), process triage, and permission management.",
    },
    overview: {
      uz: "Production serverlar va Ubuntu/Debian muhitida tizim ma'muri kabi ishlash uchun eng zarur buyruqlar.",
      ru: "Справочник команд терминала Bash для администрирования production-серверов.",
      en: "Essential CLI utilities for DevOps, debugging production incidents, and server maintenance.",
    },
    sections: [
      {
        title: {
          uz: "Protsesslar va Tarmoq (Process & Network)",
          ru: "Процессы и порты",
          en: "Processes & Sockets",
        },
        commands: [
          {
            command: "ss -tulpn | grep :3000",
            description: {
              uz: "3000 portda qaysi dastur tinglayotganini aniqlash",
              ru: "Узнать процесс, занимающий порт 3000",
              en: "Identify PID and process listening on port 3000",
            },
          },
          {
            command: "journalctl -u nginx -f -n 50",
            description: {
              uz: "Nginx servisining oxirgi 50 ta logini real-time kuzatish",
              ru: "Смотреть последние 50 записей системного журнала сервиса",
              en: "Follow real-time systemd journal logs for service",
            },
          },
          {
            command: "df -h && free -m",
            description: {
              uz: "Bo'sh disk maydoni va mavjud operativ xotirani ko'rish",
              ru: "Проверить свободное место на диске и оперативную память",
              en: "Inspect human-readable disk space and available RAM",
            },
          },
        ],
      },
    ],
    tips: {
      uz: [
        "Hech qachon shubhali buyruqni `sudo` bilan tekshirmasdan ishga tushirmang",
        "Serverga kirishda parolli emas, faqat SSH kalitli (Ed25519) autentifikatsiyani sozlang",
      ],
      ru: [
        "Не запускайте неизвестные скрипты с правами sudo",
        "Используйте только SSH-ключи (Ed25519) для доступа к серверам вместо паролей",
      ],
      en: [
        "Never pipe untrusted curl scripts directly to sudo bash",
        "Enforce Ed25519 SSH keys and disable password authentication entirely",
      ],
    },
    relatedSlugs: ["git", "docker", "sql"],
  },
];

export function getCheatSheetBySlug(slug: string): CheatSheetItem | undefined {
  return CHEATSHEETS_DATA.find((item) => item.slug === slug);
}
