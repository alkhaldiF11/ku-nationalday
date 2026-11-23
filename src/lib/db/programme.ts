/**
 * The National Day evening programme, modelled on the event's printed posters:
 * stage segments from sunset to the grand prize draw, plus attractions that run
 * all evening. Times are Bahrain wall-clock (HH:MM, 24h).
 */
export type ProgrammeItem = {
  start: string;
  end: string;
  category: "music" | "culture" | "games" | "ceremony" | "food";
  title: string;
  titleAr: string;
  location: string;
  locationAr: string;
  description: string;
  descriptionAr: string;
};

export const EVENING_PROGRAMME: ProgrammeItem[] = [
  {
    start: "16:00",
    end: "17:30",
    category: "music",
    title: "DJ & National Songs",
    titleAr: "ديجي وأغاني وطنية",
    location: "Main Stage",
    locationAr: "المسرح الرئيسي",
    description: "Kick off the evening with a DJ set of much-loved Bahraini national songs.",
    descriptionAr: "انطلاقة الأمسية مع الديجي وأجمل الأغاني الوطنية البحرينية.",
  },
  {
    start: "17:30",
    end: "19:00",
    category: "culture",
    title: "Liwa – Traditional Band",
    titleAr: "الليوه – الفرقة الشعبية",
    location: "Main Stage",
    locationAr: "المسرح الرئيسي",
    description: "A live performance of Liwa, the traditional Gulf folk art of drums and song.",
    descriptionAr: "عرض حي لفن الليوه الشعبي الخليجي بالطبول والأهازيج.",
  },
  {
    start: "19:30",
    end: "20:30",
    category: "games",
    title: "Quizzes & Prizes",
    titleAr: "مسابقات وجوائز",
    location: "Main Stage",
    locationAr: "المسرح الرئيسي",
    description: "On-stage questions about Bahrain's history and culture, with prizes for quick answers.",
    descriptionAr: "أسئلة على المسرح عن تاريخ البحرين وثقافتها، وجوائز لأسرع الإجابات.",
  },
  {
    start: "21:30",
    end: "22:00",
    category: "ceremony",
    title: "Grand Prize Draw",
    titleAr: "السحب على الجائزة الكبرى",
    location: "Main Stage",
    locationAr: "المسرح الرئيسي",
    description: "One registered Guest ID is drawn at random, live on screen. Every registered guest is entered — be there to claim your prize!",
    descriptionAr: "يُسحب رقم ضيف مسجّل عشوائياً مباشرة على الشاشة. كل ضيف مسجّل مشارك — احضر لتستلم جائزتك!",
  },
  {
    start: "17:00",
    end: "23:00",
    category: "food",
    title: "Food Trucks",
    titleAr: "عربات الطعام",
    location: "Food Court",
    locationAr: "ساحة المأكولات",
    description: "Local food trucks serving Bahraini favourites, karak and sweets all evening.",
    descriptionAr: "عربات طعام محلية تقدم الأطباق البحرينية والكرك والحلويات طوال الأمسية.",
  },
  {
    start: "17:00",
    end: "21:00",
    category: "games",
    title: "Carnival Games",
    titleAr: "ألعاب الكرنفال",
    location: "Games Arena",
    locationAr: "ساحة الألعاب",
    description: "Physical National Day games run by our staff. Take your results to the IT Desk — win 75% of your games for a teddy bear.",
    descriptionAr: "ألعاب حضورية لليوم الوطني يديرها فريقنا. سجّل نتائجك في مكتب تقنية المعلومات — افز في 75% من ألعابك لتحصل على دبدوب.",
  },
];
