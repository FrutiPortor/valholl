// ==========================================
// Valhöll — основной скрипт
// ==========================================

// Firebase init
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyAjQJFRjl57wfnGIj4rNK_Ravw_VzGmZ24",
  authDomain: "valholl-4c99b.firebaseapp.com",
  databaseURL: "https://valholl-4c99b-default-rtdb.firebaseio.com",
  projectId: "valholl-4c99b",
  storageBucket: "valholl-4c99b.firebasestorage.app",
  messagingSenderId: "361046183170",
  appId: "1:361046183170:web:5ed6532e8296078423861b",
  measurementId: "G-J8H9WK965X"
};

firebase.initializeApp(firebaseConfig);
const fbDb = firebase.database();

// MODULE: Auth
// ==========================================

let currentUser = null;

firebase.auth().onAuthStateChanged(user => {
  currentUser = user;
  if (!user && location.pathname.includes('new-post.html')) {
    location.href = 'login.html?redirect=new-post.html';
    return;
  }
  updateUI();
});

function isLoggedIn() {
  return !!currentUser;
}

function getUserUid() {
  return currentUser ? currentUser.uid : null;
}

function toggleAuth() {
  if (isLoggedIn()) {
    firebase.auth().signOut().then(() => { location.reload(); });
  } else {
    location.href = 'login.html';
  }
}

// MODULE: Mobile menu
// ==========================================

function toggleMenu() {
  document.getElementById('nav-menu')?.classList.toggle('open');
  document.querySelector('.burger')?.classList.toggle('active');
}

document.addEventListener('click', function (e) {
  const menu = document.getElementById('nav-menu');
  const burger = document.querySelector('.burger');
  if (menu && burger && !e.target.closest('.header-nav')) {
    menu.classList.remove('open');
    burger.classList.remove('active');
  }
});

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
// MODULE: Feed / Firebase data
// ==========================================

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

function getYouTubeId(url) {
  const m = url.match(/(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function userRef() {
  const uid = getUserUid();
  if (!uid) return null;
  return fbDb.ref('posts/' + uid);
}

async function getPosts() {
  const ref = userRef();
  if (!ref) return [];
  const snap = await ref.once('value');
  const data = snap.val();
  if (!data) return [];
  return Object.values(data).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

async function savePosts(posts) {
  const ref = userRef();
  if (!ref) return;
  const obj = {};
  posts.forEach(p => { obj[p.id] = p; });
  await ref.set(obj);
}

async function getPostById(id) {
  const posts = await getPosts();
  return posts.find(p => p.id === id);
}

async function toggleLike(id) {
  const posts = await getPosts();
  const post = posts.find(p => p.id === id);
  if (!post) return;
  post.liked = !post.liked;
  post.likes += post.liked ? 1 : -1;
  if (post.likes < 0) post.likes = 0;
  await savePosts(posts);
}

async function addComment(id, text) {
  const posts = await getPosts();
  const post = posts.find(p => p.id === id);
  if (!post) return;
  post.comments.push({ author: 'Гость', text });
  await savePosts(posts);
}

async function deletePost(id) {
  if (!confirm('Удалить пост?')) return;
  const posts = (await getPosts()).filter(p => p.id !== id);
  await savePosts(posts);
}

async function deletePostCard(id) {
  await deletePost(id);
  await renderFeed();
}

async function deletePostFull(id) {
  await deletePost(id);
  location.href = 'feed.html';
}

// ---------- render card (grid preview) ----------

function renderPostCard(post) {
  const vidId = post.video ? getYouTubeId(post.video) : null;
  const media = post.image
    ? `<img src="${post.image}" alt="" loading="lazy">`
    : vidId
      ? `<img src="https://img.youtube.com/vi/${vidId}/hqdefault.jpg" alt="" loading="lazy">`
      : post.video
        ? `<div class="post-card-preview-icon">🎬</div>`
        : '';

  const shortText = post.text?.length > 100 ? post.text.slice(0, 100) + '…' : post.text || '';

  return `
    <div class="post-card post-card--preview">
      ${isLoggedIn() ? `<div class="post-card-del" data-id="${post.id}" onclick="event.preventDefault(); deletePostCard(this.dataset.id)">✕</div>` : ''}
      <a href="post.html?id=${post.id}">
        ${media ? `<div class="post-card-media">${media}</div>` : ''}
        <div class="post-card-body">
          <div class="post-header">
            <span class="post-author">${post.author || 'Valhöll'}</span>
            <span>${post.date || ''}</span>
          </div>
          <div class="post-text">${shortText}</div>
          <div class="post-card-stats">
            <span>♥ ${post.likes || 0}</span>
            <span>💬 ${(post.comments || []).length}</span>
          </div>
        </div>
      </a>
    </div>
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

  const commentsHtml = (post.comments || []).map(c =>
    `<div class="comment"><div class="comment-author">${c.author}</div><div class="comment-text">${c.text}</div></div>`
  ).join('');

  const likedClass = post.liked ? ' post-like-btn--liked' : '';
  const likesDisplay = post.likes || 0;

  return `
    <div class="post-card post-card--full" data-id="${post.id}">
      <div class="post-header">
        <span class="post-author">${post.author || 'Valhöll'}</span>
        <span class="post-header-right">
          <span>${post.date || ''}</span>
          ${isLoggedIn() ? `<button class="post-del-btn" data-id="${post.id}" onclick="deletePostFull(this.dataset.id)">✕</button>` : ''}
        </span>
      </div>
      <div class="post-text">${post.text || ''}</div>
      ${media}
      <div class="post-actions">
        <button class="post-like-btn${likedClass}" data-id="${post.id}">
          ♥ <span class="post-like-count">${likesDisplay}</span>
        </button>
        <span>💬 ${(post.comments || []).length}</span>
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

async function renderFeed() {
  const container = document.getElementById('feed-container');
  if (!container) return;
  if (!isLoggedIn()) {
    container.innerHTML = '<p class="section-text" style="text-align:center">Войди, чтобы увидеть ленту.</p>';
    return;
  }
  const posts = await getPosts();
  container.innerHTML = posts.map(post => renderPostCard(post)).join('');
}

// ---------- single post page (post.html) ----------

async function renderPostPage() {
  const container = document.getElementById('post-container');
  if (!container) return;

  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const post = await getPostById(id);

  if (!post) {
    container.innerHTML = '<p class="section-text" style="text-align:center">Пост не найден.</p>';
    return;
  }

  container.innerHTML = renderPostFull(post);

  container.querySelector('.post-like-btn')?.addEventListener('click', async function () {
    await toggleLike(this.dataset.id);
    await renderPostPage();
  });

  container.querySelector('.comment-form')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const input = this.querySelector('.comment-input');
    const text = input.value.trim();
    if (text) {
      await addComment(this.dataset.id, text);
      await renderPostPage();
    }
  });
}

// ---------- new post ----------

window.publishNewPost = async function () {
  if (!isLoggedIn()) return;
  const text = document.getElementById('post-text')?.value.trim();
  const image = document.getElementById('post-image')?.value.trim();
  const video = convertVideoUrl(document.getElementById('post-video')?.value.trim() || '');
  if (!text) return;

  const userName = currentUser?.displayName || currentUser?.email || 'Valhöll';
  const posts = await getPosts();
  posts.unshift({
    id: Date.now().toString(),
    author: userName,
    date: new Date().toISOString().slice(0, 10),
    text,
    image,
    video,
    likes: 0,
    liked: false,
    comments: []
  });
  await savePosts(posts);
  location.href = 'feed.html';
};

// ---------- UI update on auth change ----------

function updateUI() {
  document.querySelectorAll('.auth-btn').forEach(btn => {
    btn.textContent = isLoggedIn() ? 'Выйти' : 'Войти';
  });

  const controls = document.getElementById('feed-controls');
  if (controls) {
    controls.style.display = isLoggedIn() ? 'block' : 'none';
  }

  if (document.getElementById('feed-container')) {
    renderFeed();
  }

  if (document.getElementById('post-container')) {
    renderPostPage();
  }
}

document.addEventListener('DOMContentLoaded', updateUI);
