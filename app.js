import {
  auth,
  db,
  signOut,
  onAuthStateChanged,
  ref,
  get,
  redirectIfNotAuth
} from './firebase-config.js';

redirectIfNotAuth('/auth.html');

let allUsers = {};
let currentFilter = 'all';
let currentUserId = null;

// Load theme preference
function loadTheme() {
  const darkMode = localStorage.getItem('darkMode') === 'true';
  if (darkMode) {
    document.body.classList.add('dark-theme');
    document.getElementById('themeToggle').textContent = '☀️';
  }
}

// Toggle theme
document.getElementById('themeToggle').addEventListener('click', () => {
  document.body.classList.toggle('dark-theme');
  const isDark = document.body.classList.contains('dark-theme');
  localStorage.setItem('darkMode', isDark);
  document.getElementById('themeToggle').textContent = isDark ? '☀️' : '🌙';
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '/auth.html';
    return;
  }
  
  currentUserId = user.uid;
  loadTheme();
  
  // Update profile link with username
  try {
    const snapshot = await get(ref(db, `users/${user.uid}`));
    const userData = snapshot.val();
    const username = userData?.username || user.email?.split('@')[0] || 'Профиль';
    const profileLink = document.getElementById('profileLink');
    profileLink.textContent = username;
    profileLink.href = 'profile.html';
  } catch (err) {
    console.error('Error loading username:', err);
  }
  
  await loadAllUsers();
});

async function loadAllUsers() {
  document.getElementById('status').textContent = 'Загрузка...';
  document.getElementById('wishlists').innerHTML = '';

  try {
    const snapshot = await get(ref(db, 'users'));
    if (!snapshot.exists()) {
      document.getElementById('status').textContent = 'Пока нет пользователей с вишлистами';
      setupFilterButtons([]);
      return;
    }

    allUsers = snapshot.val();
    document.getElementById('status').textContent = '';

    // Extract categories
    const categories = new Set();
    for (const userId in allUsers) {
      const user = allUsers[userId];
      if (user.wishlists) {
        for (const listId in user.wishlists) {
          const cat = user.wishlists[listId].category || 'general';
          categories.add(cat);
        }
      }
    }

    setupFilterButtons(Array.from(categories));
    renderWishlists(allUsers);
  } catch (err) {
    console.error(err);
    document.getElementById('status').textContent = 'Ошибка загрузки вишлистов';
  }
}



function setupFilterButtons(categories) {
  const container = document.getElementById('filterButtons');
  container.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.textContent = 'Все';
  allBtn.className = 'filter-btn active';
  allBtn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    allBtn.classList.add('active');
    currentFilter = 'all';
    renderWishlists(allUsers);
  });
  container.appendChild(allBtn);

  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.textContent = getCategoryLabel(cat);
    btn.className = 'filter-btn';
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = cat;
      renderWishlists(allUsers);
    });
    container.appendChild(btn);
  });
}

function getCategoryLabel(cat) {
  const labels = {
    general: 'Общее',
    tech: 'Технология',
    books: 'Книги',
    games: 'Игры',
    sports: 'Спорт',
    art: 'Искусство',
    other: 'Другое'
  };
  return labels[cat] || cat;
}

function renderWishlists(data) {
  const container = document.getElementById('wishlists');
  const searchQuery = document.getElementById('searchInput').value.toLowerCase();
  container.innerHTML = '';

  const allEntries = [];

  for (const userId in data) {
    const userInfo = data[userId];
    
    if (!userInfo.wishlists) continue;

    for (const listId in userInfo.wishlists) {
      const item = userInfo.wishlists[listId];
      
      // Apply filters
      if (currentFilter !== 'all' && item.category !== currentFilter) continue;
      
      // Search by username or hash
      if (searchQuery) {
        const username = userInfo.username?.toLowerCase() || '';
        const hash = item.hash?.toLowerCase() || '';
        if (!username.includes(searchQuery) && !hash.includes(searchQuery)) continue;
      }

      allEntries.push({
        userId,
        listId,
        item,
        userInfo,
        timestamp: item.timestamp || 0
      });
    }
  }

  // Sort by timestamp
  allEntries.sort((a, b) => b.timestamp - a.timestamp);

  if (allEntries.length === 0) {
    container.innerHTML = '<p class="muted">Вишлистов не найдено</p>';
    return;
  }

  allEntries.forEach(({ userId, listId, item, userInfo }) => {
    const el = document.createElement('div');
    el.className = 'wishlist-card';

    const avatar = (userInfo.username || '?').charAt(0).toUpperCase();
    const date = new Date(item.timestamp).toLocaleString();

    el.innerHTML = `
      <div class="card-header">
        <div class="user-info">
          <div class="avatar-small">${avatar}</div>
          <div>
            <h3>${userInfo.username || 'Неизвестный'}</h3>
            <p class="muted">${getCategoryLabel(item.category || 'general')} • ${date}</p>
          </div>
        </div>
      </div>

      <div class="card-body">
        <h4>${item.title || 'Мой вишлист'}</h4>
        <p>${item.description || ''}</p>
        <ol class="items">
          ${(item.items || []).map(it => `<li>${it}</li>`).join('')}
        </ol>
      </div>
    `;

    container.appendChild(el);
  });
}

document.getElementById('searchToggle').addEventListener('click', () => {
  const panel = document.getElementById('searchPanel');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    document.getElementById('searchInput').focus();
  }
});

document.getElementById('searchInput').addEventListener('input', () => {
  renderWishlists(allUsers);
});

document.getElementById('searchInput').addEventListener('keyup', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('searchPanel').classList.add('hidden');
  }
});
