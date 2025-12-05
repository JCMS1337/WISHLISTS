// Firebase REST API configuration with password hashing
// Using the provided Realtime Database URL

const DB_URL = 'https://wishlists-web-default-rtdb.europe-west1.firebasedatabase.app';

// Hash function for passwords (SHA-256)
export async function hashPassword(password) {
  const enc = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Hash function for content verification
export async function computeHash(obj) {
  const str = JSON.stringify(obj);
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Store current user in localStorage
let currentUser = null;

function loadCurrentUser() {
  const stored = localStorage.getItem('currentUser');
  currentUser = stored ? JSON.parse(stored) : null;
}

function saveCurrentUser(user) {
  currentUser = user;
  if (user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('currentUser');
  }
}

loadCurrentUser();

export const auth = {
  get currentUser() {
    loadCurrentUser();
    return currentUser;
  }
};

export const db = { url: DB_URL };

// Sign up - create new user
export async function createUserWithEmailAndPassword(auth, email, password) {
  const username = email.split('@')[0]; // Use part of email as username
  const hashedPassword = await hashPassword(password);

  const userData = {
    email,
    username,
    passwordHash: hashedPassword,
    createdAt: Date.now(),
    bio: '',
    wishlists: {}
  };

  try {
    // Generate unique user ID
    const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // Save user to database
    const response = await fetch(`${DB_URL}/users/${userId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      throw new Error('Failed to create user');
    }

    const user = {
      uid: userId,
      email,
      username
    };

    saveCurrentUser(user);

    return { user };
  } catch (err) {
    console.error('Signup error:', err);
    const error = new Error('Ошибка регистрации');
    error.code = 'auth/signup-failed';
    throw error;
  }
}

// Sign in - verify credentials
export async function signInWithEmailAndPassword(auth, email, password) {
  try {
    // Fetch all users to find matching email
    const response = await fetch(`${DB_URL}/users.json`);

    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }

    const users = await response.json();

    if (!users) {
      const error = new Error('User not found');
      error.code = 'auth/user-not-found';
      throw error;
    }

    // Find user with matching email and password
    let foundUser = null;
    let userId = null;

    for (const [uid, userData] of Object.entries(users)) {
      if (userData.email === email) {
        const hashedPassword = await hashPassword(password);
        if (userData.passwordHash === hashedPassword) {
          foundUser = userData;
          userId = uid;
          break;
        }
      }
    }

    if (!foundUser) {
      const error = new Error('Invalid credentials');
      error.code = 'auth/invalid-credentials';
      throw error;
    }

    const user = {
      uid: userId,
      email: foundUser.email,
      username: foundUser.username
    };

    saveCurrentUser(user);

    return { user };
  } catch (err) {
    console.error('Login error:', err);
    if (err.code) throw err;
    const error = new Error('Ошибка входа');
    error.code = 'auth/login-failed';
    throw error;
  }
}

// Sign out
export async function signOut(auth) {
  saveCurrentUser(null);
}

// Auth state listener
export function onAuthStateChanged(auth, callback) {
  loadCurrentUser();
  callback(currentUser);
}

// Database ref
export function ref(db, path) {
  return { path, db };
}

// Get data
export async function get(reference) {
  try {
    const response = await fetch(`${DB_URL}/${reference.path}.json`);
    if (!response.ok) throw new Error('Failed to fetch');

    const data = await response.json();

    return {
      val: () => data,
      exists: () => !!data
    };
  } catch (err) {
    console.error('Get error:', err);
    return {
      val: () => null,
      exists: () => false
    };
  }
}

// Set data
export async function set(reference, data) {
  try {
    const response = await fetch(`${DB_URL}/${reference.path}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Failed to set data');

    return response.json();
  } catch (err) {
    console.error('Set error:', err);
    throw err;
  }
}

// Update data
export async function update(reference, data) {
  try {
    const response = await fetch(`${DB_URL}/${reference.path}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Failed to update data');

    return response.json();
  } catch (err) {
    console.error('Update error:', err);
    throw err;
  }
}

// Remove data
export async function remove(reference) {
  try {
    const response = await fetch(`${DB_URL}/${reference.path}.json`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Failed to delete data');

    return response.json();
  } catch (err) {
    console.error('Delete error:', err);
    throw err;
  }
}

// Helper functions
export function getCurrentUser() {
  loadCurrentUser();
  return currentUser;
}

export function redirectIfNotAuth(path = '/auth.html') {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = path;
    }
  });
}

export function redirectIfAuth(path = '/index.html') {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.href = path;
    }
  });
}
