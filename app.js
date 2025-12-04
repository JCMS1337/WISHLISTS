const DB_URL = 'https://wishlists-web-default-rtdb.europe-west1.firebasedatabase.app';

const form = document.getElementById('wishlistForm');
const nameInput = document.getElementById('name');
const itemsInput = document.getElementById('items');
const statusEl = document.getElementById('status');
const wishlistsEl = document.getElementById('wishlists');

// Compute SHA-256 hash of an object (JSON string) and return hex
async function computeHash(obj){
  const str = JSON.stringify(obj);
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function fetchWishlists(){
  statusEl.textContent = 'Загрузка...';
  wishlistsEl.innerHTML = '';
  try{
    const res = await fetch(`${DB_URL}/wishlists.json`);
    if(!res.ok) throw new Error('Ошибка загрузки');
    const data = await res.json();
    if(!data){
      statusEl.textContent = 'Пока нет вишлистов.';
      return;
    }
    statusEl.textContent = '';
    renderWishlists(data);
  }catch(err){
    console.error(err);
    statusEl.textContent = 'Не удалось загрузить вишлисты.';
  }
}

function renderWishlists(data){
  const entries = Object.entries(data).sort((a,b)=>{
    const ta = a[1].timestamp || 0;
    const tb = b[1].timestamp || 0;
    return tb - ta;
  });

  for(const [id, item] of entries){
    const el = document.createElement('div');
    el.className = 'entry';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';

    const h = document.createElement('h3');
    h.textContent = item.name || 'Без имени';
    header.appendChild(h);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Изменить';
    editBtn.className = 'btn btn-secondary';
    editBtn.addEventListener('click', ()=> enterEditMode(el, id, item));

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Удалить';
    delBtn.className = 'btn btn-danger';
    delBtn.addEventListener('click', async ()=>{
      if(!confirm('Удалить этот вишлист?')) return;
      try{
        delBtn.disabled = true;
        const r = await fetch(`${DB_URL}/wishlists/${id}.json`, { method: 'DELETE' });
        if(!r.ok) throw new Error('Ошибка удаления');
        fetchWishlists();
      }catch(err){
        console.error(err);
        alert('Не удалось удалить.');
        delBtn.disabled = false;
      }
    });

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    header.appendChild(actions);

    el.appendChild(header);

    const meta = document.createElement('div');
    meta.className = 'muted';
    const date = item.timestamp ? new Date(item.timestamp).toLocaleString() : '';
    meta.textContent = date + (item.hash ? ` • hash: ${item.hash.slice(0,12)}...` : '');
    el.appendChild(meta);

    const list = document.createElement('ol');
    list.className = 'items';
    const items = Array.isArray(item.items) ? item.items : [];
    if(items.length===0){
      const li = document.createElement('li');
      li.textContent = '(нет пунктов)';
      list.appendChild(li);
    } else {
      items.forEach(it=>{
        const li = document.createElement('li');
        li.textContent = it;
        list.appendChild(li);
      });
    }

    el.appendChild(list);
    wishlistsEl.appendChild(el);
  }
}

function enterEditMode(containerEl, id, item){
  // Clear container and show edit form
  containerEl.innerHTML = '';

  const formEl = document.createElement('form');

  const nameLabel = document.createElement('label');
  nameLabel.textContent = 'Имя';
  const nameField = document.createElement('input');
  nameField.type = 'text';
  nameField.value = item.name || '';
  nameField.required = true;

  const itemsLabel = document.createElement('label');
  itemsLabel.textContent = 'Пункты (каждый с новой строки)';
  const itemsField = document.createElement('textarea');
  itemsField.rows = 5;
  itemsField.value = (Array.isArray(item.items) ? item.items.join('\n') : '');
  itemsField.required = true;

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.textContent = 'Сохранить';
  saveBtn.className = 'btn';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Отмена';
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.addEventListener('click', ()=> fetchWishlists());

  formEl.appendChild(nameLabel);
  formEl.appendChild(nameField);
  formEl.appendChild(itemsLabel);
  formEl.appendChild(itemsField);
  formEl.appendChild(saveBtn);
  formEl.appendChild(cancelBtn);

  formEl.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const newName = nameField.value.trim();
    const newItems = itemsField.value.split('\n').map(s=>s.trim()).filter(Boolean);
    if(!newName){ alert('Введите имя.'); return; }
    if(newItems.length===0){ alert('Добавьте хотя бы один пункт.'); return; }

    const payload = { name: newName, items: newItems, timestamp: Date.now() };
    try{
      saveBtn.disabled = true;
      const hash = await computeHash(payload);
      payload.hash = hash;
      const r = await fetch(`${DB_URL}/wishlists/${id}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if(!r.ok) throw new Error('Ошибка обновления');
      fetchWishlists();
    }catch(err){
      console.error(err);
      alert('Не удалось сохранить изменения.');
      saveBtn.disabled = false;
    }
  });

  containerEl.appendChild(formEl);
}

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const name = nameInput.value.trim();
  const raw = itemsInput.value.split('\n').map(s=>s.trim()).filter(Boolean);
  if(!name){
    alert('Введите имя.');
    return;
  }
  if(raw.length===0){
    alert('Добавьте хотя бы один пункт.');
    return;
  }

  const payload = { name, items: raw, timestamp: Date.now() };
  try{
    const hash = await computeHash(payload);
    payload.hash = hash;
    const res = await fetch(`${DB_URL}/wishlists.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if(!res.ok) throw new Error('Ошибка сохранения');
    // success
    nameInput.value = '';
    itemsInput.value = '';
    fetchWishlists();
  }catch(err){
    console.error(err);
    alert('Не удалось отправить вишлист. Проверьте подключение.');
  }
});

// initial load
fetchWishlists();
