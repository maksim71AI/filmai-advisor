import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = __dirname;
await loadEnvFile(path.join(__dirname, ".env"));

const PORT = Number(process.env.PORT || 3000);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim();
const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-5.6";
const TMDB_READ_TOKEN = process.env.TMDB_READ_TOKEN?.trim();
const TMDB_API_KEY = process.env.TMDB_API_KEY?.trim();

const rateBuckets = new Map();
const REQUEST_LIMIT = 30;
const WINDOW_MS = 60 * 60 * 1000;

const MOVIES = [
  {
    id: "interstellar",
    title: "Интерстеллар",
    originalTitle: "Interstellar",
    year: 2014,
    rating: 8.7,
    genres: ["Фантастика", "Драма", "Приключения"],
    duration: 169,
    tags: ["космос", "наука", "умный", "эмоциональный", "масштабный", "семья", "время"],
    description: "Команда исследователей отправляется через космический тоннель, чтобы найти новый дом для человечества."
  },
  {
    id: "inception",
    title: "Начало",
    originalTitle: "Inception",
    year: 2010,
    rating: 8.8,
    genres: ["Фантастика", "Триллер", "Боевик"],
    duration: 148,
    tags: ["умный", "головоломка", "сны", "экшен", "неожиданный", "нолан", "реальность"],
    description: "Профессионал по проникновению в сны получает задание внедрить идею в сознание человека."
  },
  {
    id: "matrix",
    title: "Матрица",
    originalTitle: "The Matrix",
    year: 1999,
    rating: 8.7,
    genres: ["Фантастика", "Боевик"],
    duration: 136,
    tags: ["киберпанк", "умный", "экшен", "философия", "реальность", "культовый"],
    description: "Хакер узнаёт, что привычный мир является цифровой иллюзией, созданной машинами."
  },
  {
    id: "arrival",
    title: "Прибытие",
    originalTitle: "Arrival",
    year: 2016,
    rating: 7.9,
    genres: ["Фантастика", "Драма", "Детектив"],
    duration: 116,
    tags: ["инопланетяне", "умный", "медленный", "эмоциональный", "язык", "время"],
    description: "Лингвист пытается установить контакт с загадочными пришельцами и понять цель их визита."
  },
  {
    id: "blade-runner-2049",
    title: "Бегущий по лезвию 2049",
    originalTitle: "Blade Runner 2049",
    year: 2017,
    rating: 8.0,
    genres: ["Фантастика", "Триллер", "Драма"],
    duration: 164,
    tags: ["киберпанк", "атмосферный", "медленный", "умный", "красивый", "будущее"],
    description: "Офицер полиции будущего раскрывает тайну, способную изменить отношения людей и андроидов."
  },
  {
    id: "dune",
    title: "Дюна",
    originalTitle: "Dune",
    year: 2021,
    rating: 8.0,
    genres: ["Фантастика", "Приключения", "Драма"],
    duration: 155,
    tags: ["эпический", "космос", "масштабный", "красивый", "политика", "будущее"],
    description: "Наследник великого дома оказывается в центре борьбы за самую ценную планету галактики."
  },
  {
    id: "martian",
    title: "Марсианин",
    originalTitle: "The Martian",
    year: 2015,
    rating: 8.0,
    genres: ["Фантастика", "Приключения", "Комедия"],
    duration: 144,
    tags: ["космос", "выживание", "наука", "добрый", "юмор", "вдохновляющий"],
    description: "Оставшийся на Марсе астронавт использует знания и юмор, чтобы дождаться спасения."
  },
  {
    id: "prestige",
    title: "Престиж",
    originalTitle: "The Prestige",
    year: 2006,
    rating: 8.5,
    genres: ["Триллер", "Драма", "Детектив"],
    duration: 130,
    tags: ["головоломка", "неожиданный", "умный", "магия", "соперничество", "нолан"],
    description: "Два иллюзиониста превращают профессиональное соперничество в опасную одержимость."
  },
  {
    id: "shutter-island",
    title: "Остров проклятых",
    originalTitle: "Shutter Island",
    year: 2010,
    rating: 8.2,
    genres: ["Триллер", "Детектив", "Драма"],
    duration: 138,
    tags: ["мрачный", "психологический", "неожиданный", "тайна", "напряженный"],
    description: "Маршал расследует исчезновение пациентки в закрытой психиатрической клинике на острове."
  },
  {
    id: "seven",
    title: "Семь",
    originalTitle: "Se7en",
    year: 1995,
    rating: 8.6,
    genres: ["Триллер", "Криминал", "Детектив"],
    duration: 127,
    tags: ["мрачный", "маньяк", "напряженный", "детектив", "неожиданный", "жесткий"],
    description: "Два детектива преследуют убийцу, строящего преступления вокруг семи смертных грехов."
  },
  {
    id: "john-wick",
    title: "Джон Уик",
    originalTitle: "John Wick",
    year: 2014,
    rating: 7.4,
    genres: ["Боевик", "Триллер", "Криминал"],
    duration: 101,
    tags: ["экшен", "драки", "месть", "стильный", "быстрый", "одиночка"],
    description: "Бывший наёмный убийца возвращается в опасный мир ради личной мести."
  },
  {
    id: "nobody",
    title: "Никто",
    originalTitle: "Nobody",
    year: 2021,
    rating: 7.4,
    genres: ["Боевик", "Триллер", "Комедия"],
    duration: 92,
    tags: ["экшен", "драки", "юмор", "месть", "быстрый", "одиночка"],
    description: "Незаметный семьянин раскрывает своё опасное прошлое после случайного конфликта."
  },
  {
    id: "raid",
    title: "Рейд",
    originalTitle: "The Raid",
    year: 2011,
    rating: 7.6,
    genres: ["Боевик", "Триллер", "Криминал"],
    duration: 101,
    tags: ["экшен", "драки", "жесткий", "быстрый", "боевые искусства", "напряженный"],
    description: "Отряд спецназа оказывается заперт в многоэтажке, контролируемой преступным кланом."
  },
  {
    id: "mad-max",
    title: "Безумный Макс: Дорога ярости",
    originalTitle: "Mad Max: Fury Road",
    year: 2015,
    rating: 8.1,
    genres: ["Боевик", "Фантастика", "Приключения"],
    duration: 120,
    tags: ["экшен", "погони", "постапокалипсис", "быстрый", "масштабный", "красивый"],
    description: "Беглецы мчатся через пустыню, спасаясь от тирана и его армии на боевых машинах."
  },
  {
    id: "knives-out",
    title: "Достать ножи",
    originalTitle: "Knives Out",
    year: 2019,
    rating: 7.9,
    genres: ["Детектив", "Комедия", "Криминал"],
    duration: 130,
    tags: ["детектив", "юмор", "тайна", "семья", "легкий", "неожиданный"],
    description: "Эксцентричный детектив расследует смерть писателя в кругу его конфликтной семьи."
  },
  {
    id: "grand-budapest",
    title: "Отель «Гранд Будапешт»",
    originalTitle: "The Grand Budapest Hotel",
    year: 2014,
    rating: 8.1,
    genres: ["Комедия", "Приключения", "Драма"],
    duration: 99,
    tags: ["красивый", "юмор", "стильный", "легкий", "приключение", "необычный"],
    description: "Консьерж роскошного отеля и его юный помощник оказываются втянуты в авантюру."
  },
  {
    id: "intouchables",
    title: "1+1",
    originalTitle: "Intouchables",
    year: 2011,
    rating: 8.5,
    genres: ["Драма", "Комедия", "Биография"],
    duration: 112,
    tags: ["добрый", "смешной", "дружба", "вдохновляющий", "эмоциональный", "легкий"],
    description: "Неожиданная дружба меняет жизнь богатого аристократа и его нового помощника."
  },
  {
    id: "green-book",
    title: "Зелёная книга",
    originalTitle: "Green Book",
    year: 2018,
    rating: 8.2,
    genres: ["Драма", "Комедия", "Биография"],
    duration: 130,
    tags: ["добрый", "дружба", "дорога", "юмор", "эмоциональный", "вдохновляющий"],
    description: "Музыкант и его водитель отправляются в турне, постепенно преодолевая взаимные предубеждения."
  },
  {
    id: "la-la-land",
    title: "Ла-Ла Ленд",
    originalTitle: "La La Land",
    year: 2016,
    rating: 8.0,
    genres: ["Мюзикл", "Мелодрама", "Драма"],
    duration: 128,
    tags: ["романтика", "музыка", "красивый", "эмоциональный", "грустный", "мечта"],
    description: "Актриса и джазовый музыкант пытаются совместить любовь с большими мечтами."
  },
  {
    id: "eternal-sunshine",
    title: "Вечное сияние чистого разума",
    originalTitle: "Eternal Sunshine of the Spotless Mind",
    year: 2004,
    rating: 8.3,
    genres: ["Мелодрама", "Фантастика", "Драма"],
    duration: 108,
    tags: ["романтика", "умный", "грустный", "необычный", "эмоциональный", "память"],
    description: "После болезненного расставания двое людей пытаются стереть воспоминания друг о друге."
  },
  {
    id: "get-out",
    title: "Прочь",
    originalTitle: "Get Out",
    year: 2017,
    rating: 7.7,
    genres: ["Ужасы", "Триллер", "Детектив"],
    duration: 104,
    tags: ["страшный", "умный", "напряженный", "неожиданный", "психологический", "тайна"],
    description: "Знакомство с семьёй девушки превращается для молодого человека в пугающую ловушку."
  },
  {
    id: "conjuring",
    title: "Заклятие",
    originalTitle: "The Conjuring",
    year: 2013,
    rating: 7.5,
    genres: ["Ужасы", "Триллер", "Детектив"],
    duration: 112,
    tags: ["страшный", "мистика", "призраки", "напряженный", "мрачный", "семья"],
    description: "Исследователи паранормального помогают семье, столкнувшейся со злом в старом доме."
  },
  {
    id: "quiet-place",
    title: "Тихое место",
    originalTitle: "A Quiet Place",
    year: 2018,
    rating: 7.5,
    genres: ["Ужасы", "Фантастика", "Драма"],
    duration: 90,
    tags: ["страшный", "напряженный", "монстры", "выживание", "семья", "атмосферный"],
    description: "Семья выживает в мире существ, реагирующих на малейший звук."
  },
  {
    id: "coco",
    title: "Тайна Коко",
    originalTitle: "Coco",
    year: 2017,
    rating: 8.4,
    genres: ["Мультфильм", "Семейный", "Приключения"],
    duration: 105,
    tags: ["семейный", "добрый", "музыка", "эмоциональный", "красивый", "дети"],
    description: "Юный музыкант попадает в мир предков и раскрывает давнюю семейную тайну."
  },
  {
    id: "spider-verse",
    title: "Человек-паук: Через вселенные",
    originalTitle: "Spider-Man: Into the Spider-Verse",
    year: 2018,
    rating: 8.4,
    genres: ["Мультфильм", "Боевик", "Фантастика"],
    duration: 117,
    tags: ["семейный", "экшен", "юмор", "красивый", "супергерои", "вдохновляющий"],
    description: "Подросток получает способности Человека-паука и встречает героев из других вселенных."
  },
  {
    id: "lotr",
    title: "Властелин колец: Братство Кольца",
    originalTitle: "The Lord of the Rings: The Fellowship of the Ring",
    year: 2001,
    rating: 8.9,
    genres: ["Фэнтези", "Приключения", "Драма"],
    duration: 178,
    tags: ["фэнтези", "эпический", "приключение", "дружба", "масштабный", "магия"],
    description: "Хоббит и его спутники начинают опасный путь, чтобы уничтожить могущественное кольцо."
  }
];

const KEYWORDS = {
  "смеш": ["юмор", "смешной", "комедия", "легкий"],
  "весел": ["юмор", "смешной", "комедия", "легкий"],
  "груст": ["грустный", "эмоциональный", "драма"],
  "поплак": ["грустный", "эмоциональный", "драма"],
  "страш": ["страшный", "ужасы", "мистика", "мрачный"],
  "ужас": ["страшный", "ужасы", "мистика"],
  "экшен": ["экшен", "боевик", "быстрый", "драки"],
  "драк": ["драки", "экшен", "боевые искусства"],
  "фантаст": ["фантастика", "будущее", "космос"],
  "космос": ["космос", "фантастика", "наука"],
  "умн": ["умный", "головоломка", "философия"],
  "подум": ["умный", "головоломка", "философия"],
  "романт": ["романтика", "мелодрама", "эмоциональный"],
  "любов": ["романтика", "мелодрама"],
  "семейн": ["семейный", "добрый", "дети"],
  "детектив": ["детектив", "тайна", "неожиданный"],
  "триллер": ["триллер", "напряженный", "тайна"],
  "фэнтези": ["фэнтези", "магия", "эпический"],
  "коротк": ["короткий"],
  "атмосфер": ["атмосферный", "красивый", "медленный"]
};

const server = http.createServer(async (req, res) => {
  try {   

   if (req.url === "/" || req.url === "/index.html") {
      const file = await readFile(path.join(PUBLIC_DIR, "index.html"));
      res.writeHead(200, {
        "Content-Type": "text/html"
      });

      res.end(file);
      return;
      }
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (url.pathname === "/api/popular" && req.method === "GET") {
      const popular = [...MOVIES]
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 8)
        .map(toClientMovie);
      return sendJson(res, 200, { movies: popular });
    }

    if (url.pathname === "/api/recommend" && req.method === "POST") {
      const ip = getClientIp(req);
      if (!allowRequest(ip)) {
        return sendJson(res, 429, { error: "Слишком много запросов. Попробуйте немного позже." });
      }

      const body = await readJsonBody(req, 20_000);
      const query = String(body?.query || "").trim();
      if (query.length < 3) {
        return sendJson(res, 400, { error: "Опишите, какое кино вы хотите посмотреть." });
      }
      if (query.length > 500) {
        return sendJson(res, 400, { error: "Запрос слишком длинный. Максимум — 500 символов." });
      }

      let recommendations;
      let source = "demo";

      if (OPENAI_API_KEY) {
        try {
          const aiMovies = await recommendWithOpenAI(query);
          recommendations = await enrichRecommendations(aiMovies);
          source = "ai";
        } catch (error) {
          console.error("AI recommendation failed:", error.message);
          recommendations = recommendLocally(query);
          source = "demo-fallback";
        }
      } else {
        recommendations = recommendLocally(query);
      }

      return sendJson(res, 200, {
        query,
        source,
        movies: recommendations.slice(0, 5)
      });
    }

    if (req.method === "GET") {
      return serveStatic(url.pathname, res);
    }

    return sendJson(res, 404, { error: "Страница не найдена." });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: "Внутренняя ошибка сервера." });
  }
});

server.listen(PORT, () => {
  console.log(`FilmAI запущен: http://localhost:${PORT}`);
  console.log(`Режим AI: ${OPENAI_API_KEY ? "включён" : "демо"}`);
  console.log(`TMDB: ${TMDB_READ_TOKEN || TMDB_API_KEY ? "подключён" : "не подключён"}`);
});

async function recommendWithOpenAI(query) {
  const prompt = `Ты — точный русскоязычный киносоветчик. Подбери ровно 5 реально существующих полнометражных фильмов под запрос пользователя. Не предлагай сериалы и не повторяй фильмы, прямо названные пользователем. Выбирай разнообразные, но максимально релевантные варианты. Причина должна быть конкретной и без спойлеров, 1–2 предложения. Верни ТОЛЬКО валидный JSON без markdown в формате:\n{"recommendations":[{"title":"русское или международное название","originalTitle":"оригинальное английское название","year":2014,"reason":"почему подходит","genres":["жанр","жанр"]}]}\n\nЗапрос пользователя: ${query}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: prompt,
      max_output_tokens: 1400
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `OpenAI HTTP ${response.status}`);
  }

  const outputText = extractOpenAIText(data);
  const parsed = parseJsonFromText(outputText);
  if (!Array.isArray(parsed?.recommendations) || parsed.recommendations.length === 0) {
    throw new Error("AI вернул неожиданный формат");
  }

  return parsed.recommendations.slice(0, 5).map((movie, index) => ({
    id: `ai-${index}-${slugify(movie.originalTitle || movie.title || "movie")}`,
    title: cleanText(movie.title, 120) || "Без названия",
    originalTitle: cleanText(movie.originalTitle, 120),
    year: Number(movie.year) || null,
    rating: null,
    genres: Array.isArray(movie.genres) ? movie.genres.slice(0, 4).map((g) => cleanText(g, 30)) : [],
    duration: null,
    description: "",
    reason: cleanText(movie.reason, 360) || "Этот фильм соответствует вашему запросу.",
    poster: null,
    tmdbId: null
  }));
}

async function enrichRecommendations(movies) {
  if (!TMDB_READ_TOKEN && !TMDB_API_KEY) return movies;

  const enriched = await Promise.all(movies.map(async (movie) => {
    try {
      const searchTerm = movie.originalTitle || movie.title;
      const result = await searchTmdbMovie(searchTerm, movie.year);
      if (!result) return movie;

      return {
        ...movie,
        title: result.title || movie.title,
        originalTitle: result.original_title || movie.originalTitle,
        year: parseYear(result.release_date) || movie.year,
        rating: result.vote_average ? Number(result.vote_average.toFixed(1)) : movie.rating,
        description: result.overview || movie.description,
        poster: result.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : null,
        tmdbId: result.id || null
      };
    } catch (error) {
      console.error("TMDB enrichment failed:", error.message);
      return movie;
    }
  }));

  return enriched;
}

async function searchTmdbMovie(query, year) {
  const params = new URLSearchParams({
    query,
    include_adult: "false",
    language: "ru-RU",
    page: "1"
  });
  if (year) params.set("primary_release_year", String(year));
  if (TMDB_API_KEY) params.set("api_key", TMDB_API_KEY);

  const headers = { accept: "application/json" };
  if (TMDB_READ_TOKEN) headers.Authorization = `Bearer ${TMDB_READ_TOKEN}`;

  let response = await fetch(`https://api.themoviedb.org/3/search/movie?${params}`, { headers });
  let data = await response.json();

  if ((!response.ok || !data.results?.length) && year) {
    params.delete("primary_release_year");
    response = await fetch(`https://api.themoviedb.org/3/search/movie?${params}`, { headers });
    data = await response.json();
  }

  if (!response.ok) throw new Error(data?.status_message || `TMDB HTTP ${response.status}`);
  return data.results?.[0] || null;
}

function recommendLocally(query) {
  const normalized = normalize(query);
  const requestedTags = new Set();
  const mentionedIds = new Set();

  for (const movie of MOVIES) {
    const titleForms = [movie.title, movie.originalTitle].map(normalize);
    if (titleForms.some((title) => title && normalized.includes(title))) {
      mentionedIds.add(movie.id);
      movie.tags.forEach((tag) => requestedTags.add(tag));
      movie.genres.forEach((genre) => requestedTags.add(normalize(genre)));
    }
  }

  for (const [needle, tags] of Object.entries(KEYWORDS)) {
    if (normalized.includes(needle)) tags.forEach((tag) => requestedTags.add(tag));
  }

  const wantsShort = normalized.includes("коротк") || normalized.includes("до 2 час") || normalized.includes("не длин");
  const wantsLong = normalized.includes("длин") || normalized.includes("эпическ");
  const wantsRecent = normalized.includes("нов") || normalized.includes("свеж") || normalized.includes("последн");
  const wantsClassic = normalized.includes("стар") || normalized.includes("классик");

  const scored = MOVIES.map((movie) => {
    let score = movie.rating * 0.4;
    const matched = [];
    const haystack = [...movie.tags, ...movie.genres.map(normalize)];

    for (const tag of requestedTags) {
      if (haystack.some((value) => normalize(value).includes(normalize(tag)) || normalize(tag).includes(normalize(value)))) {
        score += 3.2;
        matched.push(tag);
      }
    }

    for (const word of normalized.split(/\s+/).filter((word) => word.length > 3)) {
      if ([movie.title, movie.originalTitle, movie.description, ...movie.tags, ...movie.genres]
        .map(normalize)
        .some((field) => field.includes(word))) {
        score += 1.2;
      }
    }

    if (wantsShort && movie.duration <= 115) score += 2;
    if (wantsLong && movie.duration >= 145) score += 1.5;
    if (wantsRecent && movie.year >= 2018) score += 1.5;
    if (wantsClassic && movie.year <= 2005) score += 1.5;
    if (mentionedIds.has(movie.id)) score -= 50;

    return { movie, score, matched };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ movie, matched }) => ({
      ...toClientMovie(movie),
      reason: buildLocalReason(movie, matched, mentionedIds.size > 0)
    }));
}

function buildLocalReason(movie, matched, basedOnFavorite) {
  const readable = matched
    .map((tag) => String(tag).toLowerCase())
    .filter((tag, index, arr) => tag && arr.indexOf(tag) === index)
    .slice(0, 3);

  if (readable.length) {
    return `${basedOnFavorite ? "Похож по атмосфере и впечатлению: " : "Подходит под запрос благодаря сочетанию: "}${readable.join(", ")}. ${movie.description}`;
  }
  return `Сильный и высоко оценённый вариант для вечера. ${movie.description}`;
}

function toClientMovie(movie) {
  return {
    id: movie.id,
    title: movie.title,
    originalTitle: movie.originalTitle,
    year: movie.year,
    rating: movie.rating,
    genres: movie.genres,
    duration: movie.duration,
    description: movie.description,
    reason: movie.reason || "",
    poster: movie.poster || null,
    tmdbId: movie.tmdbId || null
  };
}

function extractOpenAIText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  const pieces = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") pieces.push(content.text);
    }
  }
  return pieces.join("\n");
}

function parseJsonFromText(text) {
  const cleaned = String(text || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("Не удалось разобрать JSON от AI");
  }
}

async function serveStatic(urlPath, res) {
  const requested = urlPath === "/" ? "/index.html" : urlPath;
  const decoded = decodeURIComponent(requested);
  const safePath = path.normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) return sendText(res, 403, "Forbidden");

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error("Not a file");
    const data = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": getContentType(filePath),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Content-Security-Policy": "default-src 'self'; img-src 'self' https://image.tmdb.org data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    });
    res.end(data);
  } catch {
    if (!path.extname(decoded)) {
      const index = await readFile(path.join(PUBLIC_DIR, "index.html"));
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
      return res.end(index);
    }
    return sendText(res, 404, "Not found");
  }
}

function allowRequest(ip) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.startedAt > WINDOW_MS) {
    rateBuckets.set(ip, { startedAt: now, count: 1 });
    return true;
  }
  if (bucket.count >= REQUEST_LIMIT) return false;
  bucket.count += 1;
  return true;
}

function getClientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim();
}

async function readJsonBody(req, maxBytes) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > maxBytes) throw new Error("Request body is too large");
  }
  if (!body) return {};
  return JSON.parse(body);
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(body);
}

function sendText(res, status, text) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".ico": "image/x-icon"
  }[ext] || "application/octet-stream";
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9+\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(value, maxLength) {
  return String(value || "").replace(/[<>]/g, "").trim().slice(0, maxLength);
}

function slugify(value) {
  return normalize(value).replace(/\s+/g, "-").slice(0, 60);
}

function parseYear(date) {
  const match = String(date || "").match(/^\d{4}/);
  return match ? Number(match[0]) : null;
}

async function loadEnvFile(filePath) {
  try {
    const content = await readFile(filePath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      let value = trimmed.slice(index + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch (error) {
    if (error.code !== "ENOENT") console.warn("Не удалось прочитать .env:", error.message);
  }
}
