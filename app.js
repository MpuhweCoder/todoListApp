'use strict';

// ─── STATE ───────────────────────────────────────────────────
let tasks = JSON.parse(localStorage.getItem('taska-tasks') || '[]');
let filter = 'all';
let searchQ = '';
let sortBy = 'newest';
let theme = localStorage.getItem('taska-theme') || 'light';

// ─── DOM ─────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const taskList     = $('task-list');
const taskInput    = $('task-input');
const addBtn       = $('add-btn');
const searchInput  = $('search-input');
const sortSelect   = $('sort-select');
const emptyState   = $('empty-state');
const themeToggle  = $('theme-toggle');
const clearDoneBtn = $('clear-done-btn');

// ─── INIT ────────────────────────────────────────────────────
document.documentElement.setAttribute('data-theme', theme);
updateDate();
render();

// ─── DATE ────────────────────────────────────────────────────
function updateDate() {
  const now = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  $('page-date').textContent = now.toLocaleDateString(undefined, opts);
}

// ─── SAVE ────────────────────────────────────────────────────
function save() { localStorage.setItem('taska-tasks', JSON.stringify(tasks)); }

// ─── ADD TASK ────────────────────────────────────────────────
function addTask() {
  const text = taskInput.value.trim();
  if (!text) { taskInput.focus(); return; }

  const task = {
    id: Date.now(),
    text,
    done: false,
    priority: $('priority-select').value,
    dueDate: $('due-date').value || null,
    tag: $('tag-input').value.trim() || null,
    createdAt: Date.now(),
  };

  tasks.unshift(task);
  save();
  taskInput.value = '';
  $('tag-input').value = '';
  render();
  taskInput.focus();
}

// ─── TOGGLE DONE ─────────────────────────────────────────────
function toggleDone(id) {
  const t = tasks.find(t => t.id === id);
  if (t) { t.done = !t.done; save(); render(); }
}

// ─── DELETE ──────────────────────────────────────────────────
function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  save(); render();
}

// ─── EDIT ────────────────────────────────────────────────────
function startEdit(id, el) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  const textEl = el.querySelector('.task-text');
  const input = document.createElement('input');
  input.className = 'task-edit-input';
  input.value = t.text;
  textEl.replaceWith(input);
  input.focus();
  const finish = () => {
    const newText = input.value.trim();
    if (newText) t.text = newText;
    save(); render();
  };
  input.addEventListener('blur', finish);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') render(); });
}

// ─── FILTER / SEARCH / SORT ──────────────────────────────────
function getVisible() {
  const today = new Date().toISOString().split('T')[0];
  let list = tasks.filter(t => {
    if (filter === 'active')    return !t.done;
    if (filter === 'completed') return t.done;
    if (filter === 'today')     return t.dueDate === today;
    return true;
  });
  if (searchQ) {
    const q = searchQ.toLowerCase();
    list = list.filter(t => t.text.toLowerCase().includes(q) || (t.tag && t.tag.toLowerCase().includes(q)));
  }
  const pOrder = { high: 0, mid: 1, low: 2 };
  list.sort((a, b) => {
    if (sortBy === 'priority') return pOrder[a.priority] - pOrder[b.priority];
    if (sortBy === 'alpha')    return a.text.localeCompare(b.text);
    if (sortBy === 'oldest')   return a.createdAt - b.createdAt;
    return b.createdAt - a.createdAt;
  });
  return list;
}

// ─── RENDER ──────────────────────────────────────────────────
function render() {
  const visible = getVisible();
  taskList.innerHTML = '';

  visible.forEach(t => {
    const li = document.createElement('li');
    li.className = 'task-item' + (t.done ? ' done' : '');
    li.dataset.priority = t.priority;

    const today = new Date().toISOString().split('T')[0];
    let dueHTML = '';
    if (t.dueDate) {
      const isOver = !t.done && t.dueDate < today;
      const label = t.dueDate === today ? 'Today' : formatDate(t.dueDate);
      dueHTML = `<span class="task-due${isOver ? ' overdue' : ''}">📅 ${label}</span>`;
    }
    const tagHTML = t.tag ? `<span class="task-tag">#${t.tag}</span>` : '';

    li.innerHTML = `
      <div class="task-check">${t.done ? '✓' : ''}</div>
      <div class="task-content">
        <div class="task-text">${escHtml(t.text)}</div>
        <div class="task-meta-row">${tagHTML}${dueHTML}</div>
      </div>
      <div class="task-actions">
        <button class="task-action-btn edit-btn" title="Edit">✎</button>
        <button class="task-action-btn del-btn" title="Delete">✕</button>
      </div>`;

    li.querySelector('.task-check').addEventListener('click', () => toggleDone(t.id));
    li.querySelector('.del-btn').addEventListener('click', () => deleteTask(t.id));
    li.querySelector('.edit-btn').addEventListener('click', () => startEdit(t.id, li));

    taskList.appendChild(li);
  });

  emptyState.style.display = visible.length === 0 ? 'block' : 'none';

  // Counts
  const today2 = new Date().toISOString().split('T')[0];
  $('count-all').textContent    = tasks.length;
  $('count-today').textContent  = tasks.filter(t => t.dueDate === today2).length;
  $('count-active').textContent = tasks.filter(t => !t.done).length;
  $('count-done').textContent   = tasks.filter(t => t.done).length;

  // Progress
  const total = tasks.length, done = tasks.filter(t => t.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  $('sidebar-prog').style.width = pct + '%';
  $('prog-label').textContent = `${done} of ${total} done`;
}

// ─── HELPERS ─────────────────────────────────────────────────
function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatDate(d) {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

// ─── EVENTS ──────────────────────────────────────────────────
addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });

searchInput.addEventListener('input', e => { searchQ = e.target.value; render(); });
sortSelect.addEventListener('change', e => { sortBy = e.target.value; render(); });

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filter = btn.dataset.filter;
    const titles = { all:'All Tasks', today:'Today', active:'Active', completed:'Completed' };
    $('page-title').textContent = titles[filter];
    render();
  });
});

clearDoneBtn.addEventListener('click', () => {
  tasks = tasks.filter(t => !t.done);
  save(); render();
});

themeToggle.addEventListener('click', () => {
  theme = theme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('taska-theme', theme);
});
