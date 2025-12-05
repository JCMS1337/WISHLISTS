import {
  auth,
  db,
  signOut,
  onAuthStateChanged,
  ref,
  set,
  get,
  update,
  remove,
  computeHash,
  redirectIfNotAuth
} from './firebase-config.js';

redirectIfNotAuth('/auth.html');

let currentUser = null;

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

  currentUser = user;
  loadTheme();
  await loadProfile();
  await loadUserWishlists();
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    await signOut(auth);
    window.location.href = '/auth.html';
  } catch (err) {
    console.error(err);
    alert('Ошибка выхода');
  }
});

async function loadProfile() {
  try {
    const snapshot = await get(ref(db, `users/${currentUser.uid}`));
    const data = snapshot.val() || {};

    document.getElementById('username').textContent = data.username || currentUser.username || 'Неизвестный';
    document.getElementById('email').textContent = currentUser.email;
    document.getElementById('bio').value = data.bio || '';
    document.getElementById('avatar').textContent = (data.username || currentUser.username || '?').charAt(0).toUpperCase();
  } catch (err) {
    console.error('Ошибка загрузки профиля:', err);
  }
}

document.getElementById('profileForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const bio = document.getElementById('bio').value.trim();

  try {
    await update(ref(db, `users/${currentUser.uid}`), { bio });
    alert('Профиль обновлен');
  } catch (err) {
    console.error(err);
    alert('Ошибка обновления профиля');
  }
});

async function loadUserWishlists() {
  try {
    const snapshot = await get(ref(db, `users/${currentUser.uid}/wishlists`));
    const data = snapshot.val();

    const container = document.getElementById('userWishlistsList');
    container.innerHTML = '';

    if (!data) {
      container.innerHTML = '<p class="muted">У вас еще нет вишлистов</p>';
      return;
    }

    const entries = Object.entries(data).sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0));

    for (const [id, item] of entries) {
      const el = document.createElement('div');
      el.className = 'wishlist-entry';

      el.innerHTML = `
        <div class="entry-header">
          <div>
            <h3>${item.title || 'Без названия'}</h3>
            <p class="muted">${item.category || 'general'} • ${new Date(item.timestamp).toLocaleString()}</p>
          </div>
          <div class="actions">
            <button class="btn btn-secondary edit-btn" data-id="${id}">Изменить</button>
            <button class="btn btn-danger delete-btn" data-id="${id}">Удалить</button>
          </div>
        </div>
        <p>${item.description || ''}</p>
        <ol class="items">
          ${(item.items || []).map(it => `<li>${it}</li>`).join('')}
        </ol>
        <small class="muted">hash: ${item.hash?.slice(0, 12)}...</small>
      `;

      el.querySelector('.edit-btn').addEventListener('click', () => editWishlist(id, item));
      el.querySelector('.delete-btn').addEventListener('click', () => deleteWishlist(id));

      container.appendChild(el);
    }
  } catch (err) {
    console.error('Ошибка загрузки вишлистов:', err);
  }
}

let currentEditId = null; // Track current edit mode

const form = document.getElementById('wishlistForm');

async function handleWishlistSubmit(e) {
  e.preventDefault();

  const title = document.getElementById('wishlistTitle').value.trim();
  const description = document.getElementById('wishlistDescription').value.trim();
  const category = document.getElementById('wishlistCategory').value;
  const raw = document.getElementById('items').value.split('\n').map(s => s.trim()).filter(Boolean);

  if (raw.length === 0) {
    alert('Добавьте хотя бы один товар');
    return;
  }

  const payload = {
    title: title || 'Мой вишлист',
    description,
    category,
    items: raw,
    timestamp: Date.now()
  };

  try {
    const hash = await computeHash(payload);
    payload.hash = hash;

    if (currentEditId) {
      // Update existing wishlist
      await update(ref(db, `users/${currentUser.uid}/wishlists/${currentEditId}`), payload);
      alert('Вишлист обновлен!');
    } else {
      // Create new wishlist
      const listId = Date.now().toString();
      await set(ref(db, `users/${currentUser.uid}/wishlists/${listId}`), payload);
      alert('Вишлист добавлен!');
    }

    // Reset form
    currentEditId = null;
    document.getElementById('addItemBtn').textContent = 'Добавить/Обновить вишлист';
    document.getElementById('wishlistTitle').value = '';
    document.getElementById('wishlistDescription').value = '';
    document.getElementById('wishlistCategory').value = 'general';
    document.getElementById('items').value = '';

    await loadUserWishlists();
  } catch (err) {
    console.error(err);
    alert('Ошибка сохранения вишлиста');
  }
}

form.addEventListener('submit', handleWishlistSubmit);

function editWishlist(id, item) {
  currentEditId = id;
  
  document.getElementById('wishlistTitle').value = item.title || '';
  document.getElementById('wishlistDescription').value = item.description || '';
  document.getElementById('wishlistCategory').value = item.category || 'general';
  document.getElementById('items').value = (item.items || []).join('\n');

  document.getElementById('addItemBtn').textContent = 'Обновить вишлист';

  window.scrollTo({ top: form.offsetTop, behavior: 'smooth' });
}

async function deleteWishlist(id) {
  if (!confirm('Удалить этот вишлист?')) return;

  try {
    await remove(ref(db, `users/${currentUser.uid}/wishlists/${id}`));
    alert('Вишлист удален');
    await loadUserWishlists();
  } catch (err) {
    console.error(err);
    alert('Ошибка удаления вишлиста');
  }
}
