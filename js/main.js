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

function convertYouTubeUrl(url) {
  if (!url) return '';
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
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

function renderFeed() {
  const container = document.getElementById('feed-container');
  if (!container) return;

  const posts = getPosts();
  container.innerHTML = posts.map(post => renderPost(post)).join('');

  document.querySelectorAll('.post-like-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const id = this.dataset.id;
      toggleLike(id);
    });
  });

  document.querySelectorAll('.post-comments-toggle').forEach(btn => {
    btn.addEventListener('click', function () {
      const id = this.dataset.id;
      toggleComments(id);
    });
  });

  document.querySelectorAll('.comment-form').forEach(form => {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const id = this.dataset.id;
      const input = this.querySelector('.comment-input');
      const text = input.value.trim();
      if (text) {
        addComment(id, text);
        input.value = '';
      }
    });
  });
}

function renderPost(post) {
  const videoUrl = convertYouTubeUrl(post.video);
  const media = post.image
    ? `<div class="post-media"><img src="${post.image}" alt="" loading="lazy"></div>`
    : videoUrl
      ? `<div class="post-media"><iframe src="${videoUrl}" allowfullscreen></iframe></div>`
      : '';

  const commentsHtml = post.comments.map(c =>
    `<div class="comment"><div class="comment-author">${c.author}</div><div class="comment-text">${c.text}</div></div>`
  ).join('');

  const likedClass = post.liked ? ' post-like-btn--liked' : '';
  const likesDisplay = post.likes || 0;

  return `
    <div class="post-card" data-id="${post.id}">
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
        <button class="post-comments-toggle" data-id="${post.id}">
          💬 ${post.comments.length}
        </button>
      </div>
      <div class="post-comments" id="comments-${post.id}">
        ${commentsHtml}
        <form class="comment-form" data-id="${post.id}">
          <input class="comment-input" type="text" placeholder="Написать комментарий..." required>
          <button class="comment-submit" type="submit">→</button>
        </form>
      </div>
    </div>
  `;
}

function toggleLike(id) {
  const posts = getPosts();
  const post = posts.find(p => p.id === id);
  if (!post) return;
  post.liked = !post.liked;
  post.likes += post.liked ? 1 : -1;
  if (post.likes < 0) post.likes = 0;
  savePosts(posts);
  renderFeed();
}

function toggleComments(id) {
  const el = document.getElementById(`comments-${id}`);
  if (el) {
    el.classList.toggle('post-comments--open');
  }
}

function addComment(id, text) {
  const posts = getPosts();
  const post = posts.find(p => p.id === id);
  if (!post) return;
  post.comments.push({ author: 'Гость', text });
  savePosts(posts);
  renderFeed();
  setTimeout(() => {
    const el = document.getElementById(`comments-${id}`);
    if (el) el.classList.add('post-comments--open');
  }, 0);
}

function showNewPostForm() {
  document.getElementById('new-post-form').style.display = 'flex';
}

function hideNewPostForm() {
  document.getElementById('new-post-form').style.display = 'none';
  document.getElementById('post-text').value = '';
  document.getElementById('post-image').value = '';
  document.getElementById('post-video').value = '';
}

function addNewPost() {
  const text = document.getElementById('post-text').value.trim();
  const image = document.getElementById('post-image').value.trim();
  const video = document.getElementById('post-video').value.trim();
  if (!text) return;

  const posts = getPosts();
  const newPost = {
    id: Date.now().toString(),
    author: 'Valhöll',
    date: new Date().toISOString().slice(0, 10),
    text,
    image,
    video,
    likes: 0,
    liked: false,
    comments: []
  };
  posts.unshift(newPost);
  savePosts(posts);
  hideNewPostForm();
  renderFeed();
}

document.addEventListener('DOMContentLoaded', renderFeed);
