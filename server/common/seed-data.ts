export interface SeedAuthor {
  id: string;
  name: string;
  handle: string;
  role: string;
  verified: boolean;
  avatarUrl?: string;
}

export interface SeedPost {
  id: string;
  author: SeedAuthor;
  title: string;
  content: string;
  topic?: string;
  category?: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  isLiked: boolean;
  isSaved: boolean;
  readingTimeMinutes?: number;
  tags?: string[];
}

export interface SeedCommentReply {
  id: string;
  postId: string;
  parentId?: string;
  author: SeedAuthor;
  content: string;
  createdAt: string;
  likesCount: number;
  isLiked: boolean;
}

export interface SeedCommentThreadItem {
  id: string;
  postId: string;
  author: SeedAuthor;
  content: string;
  createdAt: string;
  likesCount: number;
  isLiked: boolean;
  replies?: SeedCommentReply[];
}

export const SEED_POSTS: SeedPost[] = [
  {
    id: "p1",
    author: {
      id: "a1",
      name: "Botir Ziyatov",
      handle: "@bziyatov",
      role: "Senior Software Architect",
      verified: true,
    },
    title: "Murakkablikka qarshi intizom: dasturiy ta'minotda YAGNI tamoyili",
    content:
      "Katta loyihalarda eng muhim mahorat — haddan tashqari ko‘p abstraksiya qurish emas, balki ortiqcha murakkablikni (unnecessary complexity) o‘z vaqtida rad eta olishdir.\n\nKo‘pincha jamoalar 'kelajakda kerak bo‘lib qolishi mumkin' deb tizimni 5 barobar og‘irlashtirib yuboradi. Haqiqiy professional muhandislik — minimal vositalar bilan maksimal barqarorlikka erishishdir.",
    createdAt: "1 soat oldin",
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    viewsCount: 0,
    isLiked: false,
    isSaved: false,
  },
  {
    id: "p2",
    author: {
      id: "a2",
      name: "Dilnoza Karimova",
      handle: "@dilnoza_ux",
      role: "Principal Product Designer",
      verified: true,
    },
    title: "O‘zbek tilidagi microcopy va raqamli interfeyslar madaniyati",
    content:
      "Mahalliy ilovalarimizda duch kelinadigan eng og‘riqli nuqta — tarjima qilingan so‘zlarning interfeys kontekstiga mos kelmasligi.\n\nHar bir tugmaga 'Yuborish' deb yozavermasdan, amaliy kontekstga qarab 'Ulashish', 'Saqlash', 'Tasdiqlash' yoki 'Hisob yaratish' deb yozilsa, foydalanuvchining aqliy yuki (cognitive load) ancha yengillashadi. Mahsulot tili — uning hurmati.",
    createdAt: "3 soat oldin",
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    viewsCount: 0,
    isLiked: false,
    isSaved: false,
  },
  {
    id: "p3",
    author: {
      id: "a3",
      name: "Rustam Saidov",
      handle: "@rustam_tech",
      role: "Startap asoschisi & Muhandis",
      verified: false,
    },
    title: "Birinchi mijozlarni topishda 6 oylik 'yopiq eshiklar' xatosi",
    content:
      "Startap boshlayotgan yoshlarda keng tarqalgan xato: 6 oy davomida hech kimga ko‘rsatmasdan, o‘z tasavvuridagi 'mukammal' mahsulotni yaratishga berilib ketish.\n\nBozorga chiqqach esa kutilmagan haqiqat bilan yuzlashishadi — odamlar umuman boshqa muammoga yechim qidirayotgan bo‘ladi. Birinchi haftadayoq real odamlar bilan suhbatlashing.",
    createdAt: "5 soat oldin",
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    viewsCount: 0,
    isLiked: false,
    isSaved: false,
  },
  {
    id: "p4",
    author: {
      id: "a4",
      name: "Akmal Qosimov",
      handle: "@akmal_ai",
      role: "AI tadqiqotchisi",
      verified: true,
    },
    title: "O‘zbek tili uchun LLM modellari: sifatli ma'lumotlar tanqisligi",
    content:
      "Mahalliy sun'iy intellekt yechimlarini rivojlantirishdagi eng katta to‘siq hisoblash quvvati emas, balki toza, xatosiz, ilmiy va badiiy boy o‘zbekcha matnlar korpusining yetishmasligidir.\n\nFikr kabi platformalarda yuqori sifatli tahliliy yozuvlar ko‘payishi — kelajakdagi o‘zbek tili modellarining intellektual darajasini belgilab beradi.",
    createdAt: "Bugun",
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    viewsCount: 0,
    isLiked: false,
    isSaved: false,
  },
];

export const SEED_COMMENTS: Record<string, SeedCommentThreadItem[]> = {
  p1: [
    {
      id: "c_1",
      postId: "p1",
      author: {
        id: "u_bekzod",
        name: "Bekzod Ziyatov",
        handle: "@bziyatov",
        role: "Backend Architect",
        verified: true,
      },
      content:
        "Juda o‘rinli savol ko‘tarilibdi. Bizning jamoada ham xuddi shu muammo bo‘lgan: arxitekturani erta murakkablashtirish o‘rniga, avval domen modellarini toza ajratish 80% muammoni hal qiladi.",
      createdAt: "1 soat oldin",
      likesCount: 14,
      isLiked: false,
      replies: [
        {
          id: "c_1_1",
          postId: "p1",
          parentId: "c_1",
          author: {
            id: "u_dilnoza",
            name: "Dilnoza Karimova",
            handle: "@dilnoza_ux",
            role: "Product Designer",
            verified: true,
          },
          content:
            "Bekzod, aynan shu narsa UX arxitekturasida ham to‘g‘ri. Har bir tugma yoki kartochkadan oldin axborot arxitekturasini qat’iy belgilash kerak.",
          createdAt: "42 daqiqa oldin",
          likesCount: 6,
          isLiked: true,
        },
      ],
    },
    {
      id: "c_2",
      postId: "p1",
      author: {
        id: "u_jamshid",
        name: "Jamshid Rahmonov",
        handle: "@jamshid_ai",
        role: "ML Engineer",
        verified: false,
      },
      content:
        "Fikrga qo‘shilaman. Sun’iy intellekt vositalaridan foydalanishda ham inson intuitsiyasi va tanqidiy fikrlash birinchi o‘rinda qolishi lozim.",
      createdAt: "25 daqiqa oldin",
      likesCount: 9,
      isLiked: false,
    },
  ],
  p2: [
    {
      id: "c_p2_1",
      postId: "p2",
      author: {
        id: "u_alisher",
        name: "Alisher Qodirov",
        handle: "@alisher",
        role: "Senior Frontend Engineer",
        verified: true,
      },
      content:
        "Microcopy borasida juda to‘g‘ri fikr. Shuningdek xatolik xabarlarini (error messages) berishda ham 'Xatolik yuz berdi' demasdan, foydalanuvchi nima qilishi kerakligini aniq ko‘rsatish zarur.",
      createdAt: "2 soat oldin",
      likesCount: 18,
      isLiked: true,
    },
  ],
};
