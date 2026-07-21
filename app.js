const form = document.getElementById("recommendForm");
const queryInput = document.getElementById("movieQuery");
const submitButton = document.getElementById("submitButton");
const resultsSection = document.getElementById("resultsSection");
const resultsGrid = document.getElementById("resultsGrid");
const popularGrid = document.getElementById("popularGrid");
const popularSection = document.getElementById("popularSection");
const sourceNote = document.getElementById("sourceNote");
const statusBadge = document.getElementById("statusBadge");
const charCount = document.getElementById("charCount");
const favoritesButton = document.getElementById("favoritesButton");
const favoritesDrawer = document.getElementById("favoritesDrawer");
const favoritesGrid = document.getElementById("favoritesGrid");
const favoritesCount = document.getElementById("favoritesCount");
const closeFavorites = document.getElementById("closeFavorites");
const drawerBackdrop = document.getElementById("drawerBackdrop");
const libraryButton = document.getElementById("libraryButton");
const libraryDrawer = document.getElementById("libraryDrawer");
const libraryGrid = document.getElementById("libraryGrid");
const libraryCount = document.getElementById("libraryCount");
const librarySort = document.getElementById("librarySort");
const librarySearch = document.getElementById("librarySearch");
const watchedTotal = document.getElementById("watchedTotal");
const averageRating = document.getElementById("averageRating");
const closeLibrary = document.getElementById("closeLibrary");
const libraryBackdrop = document.getElementById("libraryBackdrop");
const ratingModal = document.getElementById("ratingModal");
const ratingBackdrop = document.getElementById("ratingBackdrop");
const closeRating = document.getElementById("closeRating");
const ratingMovieTitle = document.getElementById("ratingMovieTitle");
const ratingScale = document.getElementById("ratingScale");
const toast = document.getElementById("toast");
const themeToggle = document.getElementById("themeToggle");
const themeIcon = themeToggle.querySelector(".theme-icon");

let latestMovies = [];
let favorites = loadFavorites();
let watchedMovies = loadWatchedMovies();
let currentRatingMovie = null;
const gradients = [
  ["#3c173a", "#111735"], ["#402215", "#2a123e"], ["#123b3c", "#19122f"],
  ["#3a1630", "#161d3b"], ["#263d19", "#172036"], ["#392314", "#1b1538"]
];

initialize();

async function initialize() {
  initializeTheme();
  updateFavoritesCount();
  renderFavorites();
  updateLibraryCount();
  const savedLibrarySort =
  localStorage.getItem("filmai-library-sort");

if (savedLibrarySort) {
  librarySort.value = savedLibrarySort;
}
  renderLibrary();
  await Promise.all([loadStatus(), loadPopular()]);
}
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = queryInput.value.trim();
  if (query.length < 3) {
    showToast("Опиши, что хочется посмотреть");
    queryInput.focus();
    return;
  }

  setLoading(true);
  try {
    const response = await fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Не удалось получить рекомендации");

    latestMovies = data.movies;
    renderMovies(resultsGrid, data.movies, true);
    sourceNote.textContent = data.source === "ai"
      ? "Подбор создан AI и дополнен данными о фильмах."
      : data.source === "demo-fallback"
        ? "AI временно недоступен — показан резервный подбор из встроенной коллекции."
        : "Сейчас работает демо-подбор. Подключение API-ключа включит полноценный AI.";

    resultsSection.classList.remove("hidden");
    popularSection.classList.add("hidden");
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    showToast(error.message);
  } finally {
    setLoading(false);
  }
});

queryInput.addEventListener("input", () => {
  charCount.textContent = queryInput.value.length;
});

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    queryInput.value = button.dataset.prompt;
    charCount.textContent = queryInput.value.length;
    queryInput.focus();
  });
});

document.getElementById("newSearchButton").addEventListener("click", () => {
  resultsSection.classList.add("hidden");
  popularSection.classList.remove("hidden");
  queryInput.focus();
  window.scrollTo({ top: 90, behavior: "smooth" });
});

favoritesButton.addEventListener("click", openFavorites);
closeFavorites.addEventListener("click", closeFavoritesDrawer);
drawerBackdrop.addEventListener("click", closeFavoritesDrawer);
libraryButton.addEventListener("click", openLibrary);
closeLibrary.addEventListener("click", closeLibraryDrawer);
libraryBackdrop.addEventListener("click", closeLibraryDrawer);
librarySort.addEventListener("change", () => {
  localStorage.setItem("filmai-library-sort", librarySort.value);
  renderLibrary();
});
librarySearch.addEventListener("input", renderLibrary);
closeRating.addEventListener("click", closeRatingModal);
ratingBackdrop.addEventListener("click", closeRatingModal);
ratingScale.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-rating]");

  if (!button || !currentRatingMovie) {
    return;
  }

  const rating = Number(button.dataset.rating);
  saveMovieRating(rating);
});

themeToggle.addEventListener("click", toggleTheme);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeFavoritesDrawer();
    closeLibraryDrawer();
    closeRatingModal();
  }
});
function initializeTheme() {
  const current = document.documentElement.dataset.theme || "light";
  applyTheme(current);
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme || "light";
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  try {
    localStorage.setItem("filmai-theme", next);
  } catch {}
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  themeIcon.textContent = isDark ? "☀" : "☾";
  themeToggle.setAttribute("aria-label", isDark ? "Включить светлую тему" : "Включить тёмную тему");
  themeToggle.title = isDark ? "Светлая тема" : "Тёмная тема";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", isDark ? "#151416" : "#f4f1f2");
}

async function loadStatus() {
  try {
    const response = await fetch("/api/status");
    const status = await response.json();
    if (status.ai) {
      statusBadge.textContent = status.tmdb ? "AI" : "AI";
      statusBadge.classList.add("ai");
    } else {
      statusBadge.textContent = "Демо";
    }
  } catch {
    statusBadge.textContent = "Локально";
  }
}

async function loadPopular() {
  try {
    const response = await fetch("/api/popular");
    const data = await response.json();
    renderMovies(popularGrid, data.movies.slice(0, 8), false);
  } catch {
    popularGrid.innerHTML = '<div class="empty-state">Не удалось загрузить подборку.</div>';
  }
}

function renderMovies(container, movies, showReason) {
  container.innerHTML = "";
  movies.forEach((movie, index) => container.appendChild(createMovieCard(movie, index, showReason)));
}

function createMovieCard(movie, index, showReason) {
  const card = document.createElement("article");
  card.className = "movie-card";
  const [a, b] = gradients[index % gradients.length];
  card.style.setProperty("--poster-a", a);
  card.style.setProperty("--poster-b", b);

  const isFavorite = favorites.some((item) => item.id === movie.id);
  const watchedMovie = watchedMovies.find((item) => item.id === movie.id);
const isWatched = Boolean(watchedMovie);
const watchedButtonText = isWatched
  ? watchedMovie.userRating
    ? `Моя оценка ${watchedMovie.userRating}/10`
    : "Оценить фильм"
  : "Просмотрено";
  const trailerUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${movie.title} ${movie.year || ""} трейлер`)}`;
  const genres = (movie.genres || []).slice(0, 3);
  const subtitle = [movie.year, movie.duration ? `${movie.duration} мин` : null].filter(Boolean).join(" · ");
  const reason = showReason ? (movie.reason || movie.description) : movie.description;
  const initial = escapeHtml((movie.title || "F").charAt(0));

  card.innerHTML = `
    <div class="poster">
      ${movie.poster ? `<img src="${escapeAttribute(movie.poster)}" alt="Постер фильма ${escapeAttribute(movie.title)}" loading="lazy" />` : `<span class="poster-placeholder">${initial}</span>`}
      ${movie.rating ? `<span class="rating">★ ${Number(movie.rating).toFixed(1)}</span>` : ""}
      <button class="favorite-icon ${isFavorite ? "active" : ""}" type="button" aria-label="Добавить в избранное">♥</button>
      <div class="poster-title">
        <h3>${escapeHtml(movie.title)}</h3>
        <span>${escapeHtml(subtitle)}</span>
      </div>
    </div>
    <div class="movie-content">
      <div class="genre-list">${genres.map((genre) => `<span>${escapeHtml(genre)}</span>`).join("")}</div>
      <p class="movie-reason">${escapeHtml(reason || "Подходящий вариант для вашего запроса.")}</p>
     <div class="card-actions">
  <a href="${trailerUrl}" target="_blank" rel="noopener noreferrer">
    Трейлер
  </a>

  <button class="similar-button" type="button">
    Похожее
  </button>

  <button
    class="watched-button ${isWatched ? "active" : ""}"
    type="button"
  >
    ${watchedButtonText}
    </button>
</div>
</div>`;

 card.querySelector(".watched-button").addEventListener("click", () => {
  if (isWatched) {
    openRatingModal(watchedMovie);
  } else {
    toggleWatched(movie);
  }
});
  card.querySelector(".similar-button").addEventListener("click", () => {
    queryInput.value = `Мне понравился фильм «${movie.title}». Подбери что-нибудь похожее, но не предлагай сам этот фильм.`;
    charCount.textContent = queryInput.value.length;
    window.scrollTo({ top: 80, behavior: "smooth" });
    queryInput.focus();
  });

  return card;
}

function toggleFavorite(movie) {
  const index = favorites.findIndex((item) => item.id === movie.id);
  if (index >= 0) {
    favorites.splice(index, 1);
    showToast("Удалено из избранного");
  } else {
    favorites.unshift(movie);
    favorites = favorites.slice(0, 50);
    showToast("Добавлено в избранное");
  }
  localStorage.setItem("filmai-favorites", JSON.stringify(favorites));
  updateFavoritesCount();
  renderFavorites();
  if (!resultsSection.classList.contains("hidden")) renderMovies(resultsGrid, latestMovies, true);
  loadPopular();
}

function renderFavorites() {
  favoritesGrid.innerHTML = "";
  if (!favorites.length) {
    favoritesGrid.innerHTML = '<div class="empty-state">Здесь появятся фильмы, которые ты отметишь сердцем.</div>';
    return;
  }

  favorites.forEach((movie, index) => {
    const [a, b] = gradients[index % gradients.length];
    const row = document.createElement("article");
    row.className = "favorite-row";
    row.style.setProperty("--poster-a", a);
    row.style.setProperty("--poster-b", b);
    row.innerHTML = `
      <div class="favorite-row-poster">${movie.poster ? `<img src="${escapeAttribute(movie.poster)}" alt="" />` : escapeHtml(movie.title.charAt(0))}</div>
      <div><h3>${escapeHtml(movie.title)}</h3><p>${escapeHtml([movie.year, movie.rating ? `★ ${movie.rating}` : null].filter(Boolean).join(" · "))}</p></div>
      <button type="button" aria-label="Удалить">×</button>`;
    row.querySelector("button").addEventListener("click", () => toggleFavorite(movie));
    favoritesGrid.appendChild(row);
  });
}

function openFavorites() {
  favoritesDrawer.classList.add("open");
  favoritesDrawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeFavoritesDrawer() {
  favoritesDrawer.classList.remove("open");
  favoritesDrawer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}
function openLibrary() {
  libraryDrawer.classList.add("open");
  libraryDrawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeLibraryDrawer() {
  libraryDrawer.classList.remove("open");
  libraryDrawer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}
function openRatingModal(movie) {
  currentRatingMovie = movie;
  ratingMovieTitle.textContent = movie.title || "Фильм";
const savedMovie = watchedMovies.find((item) => item.id === movie.id);
const savedRating = savedMovie?.userRating;

ratingScale.querySelectorAll("button").forEach((button) => {
  const buttonRating = Number(button.dataset.rating);

  button.classList.toggle(
    "active",
    buttonRating === savedRating
  );
});


  ratingModal.classList.add("open");
  ratingModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeRatingModal() {
  ratingModal.classList.remove("open");
  ratingModal.setAttribute("aria-hidden", "true");
  currentRatingMovie = null;
  document.body.style.overflow = "";
}

function saveMovieRating(rating) {
  if (!currentRatingMovie) {
    return;
  }

  const watchedMovie = watchedMovies.find(
    (movie) => movie.id === currentRatingMovie.id
  );

  if (!watchedMovie) {
    closeRatingModal();
    return;
  }

  watchedMovie.userRating = rating;

  localStorage.setItem(
    "filmai-watched",
    JSON.stringify(watchedMovies)
  );

  updateLibraryCount();
  renderLibrary();
if (!resultsSection.classList.contains("hidden")) {
  renderMovies(resultsGrid, latestMovies, true);
}

loadPopular();
  showToast(`Оценка ${rating}/10 сохранена`);
  closeRatingModal();
}

function setLoading(loading) {
  submitButton.disabled = loading;
  submitButton.querySelector(".button-icon").textContent = loading ? "◌" : "✦";
  submitButton.querySelector(".button-text").textContent = loading ? "Ищем…" : "Найти";
}

function updateFavoritesCount() {
  favoritesCount.textContent = favorites.length;
}

function loadFavorites() {
  try {
    const stored = JSON.parse(localStorage.getItem("filmai-favorites") || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}
function updateLibraryCount() {
  libraryCount.textContent = watchedMovies.length;
}
  function updateLibraryStats() {
  watchedTotal.textContent = watchedMovies.length;

  const ratings = watchedMovies
    .map((movie) => Number(movie.userRating))
    .filter(
      (rating) =>
        Number.isFinite(rating) &&
        rating >= 1 &&
        rating <= 10
    );

  if (!ratings.length) {
    averageRating.textContent = "—";
    return;
  }

  const ratingSum = ratings.reduce(
    (sum, rating) => sum + rating,
    0
  );

  const average = ratingSum / ratings.length;

  averageRating.textContent = `${average.toFixed(1)}/10`;
}

function loadWatchedMovies() {
  try {
    const stored = JSON.parse(localStorage.getItem("filmai-watched") || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function renderLibrary() {
  libraryGrid.innerHTML = "";
  updateLibraryStats();
  
  if (!watchedMovies.length) {
    libraryGrid.innerHTML =
      '<div class="empty-state">История просмотров пока пуста</div>';
    return;
  }
const searchQuery = librarySearch.value
  .trim()
  .toLocaleLowerCase("ru-RU");

const sortedMovies = watchedMovies.filter((movie) => {
  const title = String(movie.title || "")
    .toLocaleLowerCase("ru-RU");

  return title.includes(searchQuery);
});

if (!sortedMovies.length) {
  libraryGrid.innerHTML =
    '<div class="empty-state">Фильмы с таким названием не найдены</div>';
  return;
}
switch (librarySort.value) {
  case "oldest":
    sortedMovies.sort(
      (a, b) =>
        new Date(a.watchedAt || 0) - new Date(b.watchedAt || 0)
    );
    break;

  case "rating-high":
    sortedMovies.sort((a, b) => {
      const ratingA = Number(a.userRating);
      const ratingB = Number(b.userRating);

      if (!ratingA && !ratingB) return 0;
      if (!ratingA) return 1;
      if (!ratingB) return -1;

      return ratingB - ratingA;
    });
    break;

  case "rating-low":
    sortedMovies.sort((a, b) => {
      const ratingA = Number(a.userRating);
      const ratingB = Number(b.userRating);

      if (!ratingA && !ratingB) return 0;
      if (!ratingA) return 1;
      if (!ratingB) return -1;

      return ratingA - ratingB;
    });
    break;

  case "newest":
  default:
    sortedMovies.sort(
      (a, b) =>
        new Date(b.watchedAt || 0) - new Date(a.watchedAt || 0)
    );
}
  sortedMovies.forEach((movie, index) => {
    const [a, b] = gradients[index % gradients.length];
    const row = document.createElement("article");

    const watchedDate = movie.watchedAt
      ? new Date(movie.watchedAt).toLocaleDateString("ru-RU")
      : "";

    row.className = "favorite-row";
    row.style.setProperty("--poster-a", a);
    row.style.setProperty("--poster-b", b);

    row.innerHTML = `
      <div class="favorite-row-poster">
        ${
          movie.poster
            ? `<img src="${escapeAttribute(movie.poster)}" alt="" />`
            : escapeHtml((movie.title || "F").charAt(0))
        }
      </div>

      <div>
        <h3>${escapeHtml(movie.title)}</h3>

        <p>
          ${escapeHtml(
            [
              
  movie.year,
  movie.userRating
    ? `Моя оценка ${movie.userRating}/10`
    : null,
  watchedDate
    ? `Просмотрено ${watchedDate}`
    : null
            ]
              .filter(Boolean)
              .join(" · ")
          )}
        </p>
      </div>

      <button type="button" aria-label="Удалить из истории">×</button>
    `;

    row.querySelector("button").addEventListener("click", () => {
      toggleWatched(movie);
    });

    libraryGrid.appendChild(row);
  });
}
function toggleWatched(movie) {
  const index = watchedMovies.findIndex((item) => item.id === movie.id);

  if (index >= 0) {
    watchedMovies.splice(index, 1);
    showToast("Удалено из истории просмотров");
  } else {
    watchedMovies.unshift({
      ...movie,
      watchedAt: new Date().toISOString()
    });

    watchedMovies = watchedMovies.slice(0, 100);
    showToast("Добавлено в библиотеку");
    openRatingModal(movie);
  }

  localStorage.setItem("filmai-watched", JSON.stringify(watchedMovies));

  updateLibraryCount();
  renderLibrary();

  if (!resultsSection.classList.contains("hidden")) {
    renderMovies(resultsGrid, latestMovies, true);
  }

  loadPopular();
}
let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
