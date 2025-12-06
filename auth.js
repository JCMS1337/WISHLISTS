import {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  ref,
  set,
  update,
  get,
  redirectIfAuth,
  redirectIfNotAuth
} from './firebase-config.js';

// Determine current page
const currentPage = window.location.pathname.split('/').pop() || 'login.html';

if (currentPage === 'login.html') {
  setupLoginPage();
} else if (currentPage === 'signup.html') {
  setupSignupPage();
}

function setupLoginPage() {
  redirectIfAuth('/index.html');
  
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('loginBtn');
  const errorEl = document.getElementById('error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
      loginBtn.disabled = true;
      errorEl.textContent = '';
      
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = '/index.html';
    } catch (err) {
      errorEl.textContent = 'Ошибка входа: ' + err.message;
      loginBtn.disabled = false;
    }
  });
}

function setupSignupPage() {
  redirectIfAuth('/index.html');
  
  const form = document.getElementById('signupForm');
  const usernameInput = document.getElementById('username');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const signupBtn = document.getElementById('signupBtn');
  const errorEl = document.getElementById('error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (password !== confirmPassword) {
      errorEl.textContent = 'Пароли не совпадают';
      return;
    }

    if (username.length < 3) {
      errorEl.textContent = 'Никнейм должен быть минимум 3 символа';
      return;
    }

    try {
      signupBtn.disabled = true;
      errorEl.textContent = '';
      
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCred.user.uid;

      // Save user profile to DB without removing passwordHash
      await update(ref(db, `users/${userId}`), {
        username,
        email,
        createdAt: Date.now(),
        bio: '',
        avatar: ''
      });

      window.location.href = '/profile.html';
    } catch (err) {
      errorEl.textContent = 'Ошибка регистрации: ' + err.message;
      signupBtn.disabled = false;
    }
  });
}
