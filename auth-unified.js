import {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  ref,
  set,
  redirectIfAuth,
  redirectIfNotAuth,
  hashPassword
} from './firebase-config.js';

// Redirect if already authenticated
redirectIfAuth('/index.html');

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

loadTheme();

// DOM Elements
const loginToggle = document.getElementById('loginToggle');
const signupToggle = document.getElementById('signupToggle');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const errorEl = document.getElementById('error');

// Toggle between login and signup
loginToggle.addEventListener('click', () => {
  loginToggle.classList.add('active');
  signupToggle.classList.remove('active');
  loginForm.classList.add('active');
  signupForm.classList.remove('active');
  errorEl.textContent = '';
});

signupToggle.addEventListener('click', () => {
  signupToggle.classList.add('active');
  loginToggle.classList.remove('active');
  signupForm.classList.add('active');
  loginForm.classList.remove('active');
  errorEl.textContent = '';
});

// Login Form Handler
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const loginBtn = document.getElementById('loginBtn');

  try {
    loginBtn.disabled = true;
    errorEl.textContent = '';
    
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = '/index.html';
  } catch (err) {
    errorEl.textContent = 'Ошибка входа: ' + getErrorMessage(err);
    loginBtn.disabled = false;
  }
});

// Signup Form Handler
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('signupUsername').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const confirmPassword = document.getElementById('signupConfirmPassword').value;
  const signupBtn = document.getElementById('signupBtn');

  // Validation
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
    
    // Create user with Firebase
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    const userId = userCred.user.uid;

    // Save user profile to Realtime Database
    await set(ref(db, `users/${userId}`), {
      username,
      email,
      createdAt: Date.now(),
      bio: '',
      avatar: ''
    });

    window.location.href = '/profile.html';
  } catch (err) {
    errorEl.textContent = 'Ошибка регистрации: ' + getErrorMessage(err);
    signupBtn.disabled = false;
  }
});

// Helper function to translate Firebase error messages
function getErrorMessage(err) {
  const errorMap = {
    'auth/email-already-in-use': 'Этот email уже зарегистрирован',
    'auth/invalid-email': 'Неверный email',
    'auth/weak-password': 'Пароль слишком слабый (минимум 6 символов)',
    'auth/user-not-found': 'Пользователь не найден',
    'auth/wrong-password': 'Неверный пароль',
    'auth/too-many-requests': 'Слишком много попыток входа. Попробуйте позже',
    'auth/operation-not-allowed': 'Эта операция недоступна'
  };
  return errorMap[err.code] || err.message;
}
