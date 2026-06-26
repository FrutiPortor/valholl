// ==========================================
// Valhöll — основной скрипт
// Добавляй новые модули через // MODULE:
// ==========================================

// MODULE: Плавный скролл для якорных ссылок
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ==========================================
// MODULE: Feed / Лента (лайки, комментарии)
// ==========================================

const STORAGE_KEY = 'valholl_feed';

function convertVideoUrl(url) {
  if (!url) return '';
  const youtube = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
  let m = url.match(youtube);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  const rutube = /rutube\.ru\/video\/([a-zA-Z0-9_-]+)/;
  m = url.match(rutube);
  if (m) return `https://rutube.ru/play/embed/${m[1]}`;
  return url;
}

function getPosts() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return JSON.parse(stored);

  const defaults = [
    {
      id: '1', author: 'Valhöll', date: '2026-06-27',
      text: 'Добро пожаловать в чертоги! Этот пост — демонстрация ленты.',
      image: 'https://picsum.photos/seed/valholl1/700/400',
      video: '',
      likes: 3, liked: false,
      comments: [
        { author: 'Гость', text: 'Отлично! 🔥' }
      ]
    },
    {
      id: '2', author: 'Valhöll', date: '2026-06-26',
      text: 'Сила и честь — вот что движет нами.',
      image: 'https://picsum.photos/seed/valholl2/700/400',
      video: '',
      likes: 7, liked: false,
      comments: []
    },
    {
      id: '3', author: 'Valhöll', date: '2026-06-25',
      text: 'Видео-контент скоро будет доступен.',
      image: '',
      video: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      likes: 1, liked: false,
      comments: []
    }
  ];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  return defaults;
}

function savePosts(posts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

function getPostById(id) {
  return getPosts().find(p => p.id === id);
}

function toggleLike(id) {
  const posts = getPosts();
  const post = posts.find(p => p.id === id);
  if (!post) return;
  post.liked = !post.liked;
  post.likes += post.liked ? 1 : -1;
  if (post.likes < 0) post.likes = 0;
  savePosts(posts);
}

function addComment(id, text) {
  const posts = getPosts();
  const post = posts.find(p => p.id === id);
  if (!post) return;
  post.comments.push({ author: 'Гость', text });
  savePosts(posts);
}

// ---------- render card (grid preview) ----------

function renderPostCard(post) {
  const media = post.image
    ? `<img src="${post.image}" alt="" loading="lazy">`
    : post.video
      ? `<div class="post-card-preview-icon">🎬</div>`
      : '';

  const shortText = post.text.length > 100 ? post.text.slice(0, 100) + '…' : post.text;

  return `
    <a href="post.html?id=${post.id}" class="post-card post-card--preview">
      ${media ? `<div class="post-card-media">${media}</div>` : ''}
      <div class="post-card-body">
        <div class="post-header">
          <span class="post-author">${post.author}</span>
          <span>${post.date}</span>
        </div>
        <div class="post-text">${shortText}</div>
        <div class="post-card-stats">
          <span>♥ ${post.likes || 0}</span>
          <span>💬 ${post.comments.length}</span>
        </div>
      </div>
    </a>
  `;
}

// ---------- render full post page (post.html) ----------

function renderPostFull(post) {
  const videoUrl = convertVideoUrl(post.video);
  const isMp4 = videoUrl.match(/\.mp4$/i);
  const media = post.image
    ? `<div class="post-media"><img src="${post.image}" alt="" loading="lazy"></div>`
    : videoUrl && isMp4
      ? `<div class="post-media"><video src="${videoUrl}" controls style="width:100%;border-radius:4px"></video></div>`
      : videoUrl
        ? `<div class="post-media"><iframe src="${videoUrl}" allowfullscreen></iframe></div>`
        : '';

  const commentsHtml = post.comments.map(c =>
    `<div class="comment"><div class="comment-author">${c.author}</div><div class="comment-text">${c.text}</div></div>`
  ).join('');

  const likedClass = post.liked ? ' post-like-btn--liked' : '';
  const likesDisplay = post.likes || 0;

  return `
    <div class="post-card post-card--full" data-id="${post.id}">
      <div class="post-header">
        <span class="post-author">${post.author}</span>
        <span>${post.date}</span>
      </div>
      <div class="post-text">${post.text}</div>
      ${media}
      <div class="post-actions">
        <button class="post-like-btn${likedClass}" data-id="${post.id}">
          ♥ <span class="post-like-count">${likesDisplay}</span>
        </button>
        <span>💬 ${post.comments.length}</span>
      </div>
      <div class="post-comments post-comments--open">
        ${commentsHtml}
        <form class="comment-form" data-id="${post.id}">
          <input class="comment-input" type="text" placeholder="Написать комментарий..." required>
          <button class="comment-submit" type="submit">→</button>
        </form>
      </div>
    </div>
  `;
}

// ---------- feed grid (feed.html) ----------

function renderFeed() {
  const container = document.getElementById('feed-container');
  if (!container) return;

  const posts = getPosts();
  container.innerHTML = posts.map(post => renderPostCard(post)).join('');
}

// ---------- single post page (post.html) ----------

function renderPostPage() {
  const container = document.getElementById('post-container');
  if (!container) return;

  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const post = getPostById(id);

  if (!post) {
    container.innerHTML = '<p class="section-text">Пост не найден.</p>';
    return;
  }

  container.innerHTML = renderPostFull(post);

  container.querySelector('.post-like-btn')?.addEventListener('click', function () {
    toggleLike(this.dataset.id);
    renderPostPage();
  });

  container.querySelector('.comment-form')?.addEventListener('submit', function (e) {
    e.preventDefault();
    const input = this.querySelector('.comment-input');
    const text = input.value.trim();
    if (text) {
      addComment(this.dataset.id, text);
      renderPostPage();
    }
  });
}

// ---------- init ----------

if (document.getElementById('feed-container')) {
  document.addEventListener('DOMContentLoaded', renderFeed);
}

if (document.getElementById('post-container')) {
  document.addEventListener('DOMContentLoaded', renderPostPage);
}
