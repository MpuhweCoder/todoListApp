'use strict';

/* ═══════════════════════════════════════════
   DOABLE — app.js
═══════════════════════════════════════════ */

// ── State ─────────────────────────────────
let tasks  = JSON.parse(localStorage.getItem('doable-tasks') || '[]');
let theme  = localStorage.getItem('doable-theme') || 'light';
let filter = 'all';
let search = '';
let sortBy = 'newest';
let selPriority = 'mid';

// ── DOM helpers ───────────────────────────
const $ = id => document.getElementById(id);
const taskList   = $('task-list');
const emptyState = $('empty-state');
const taskInput  = $('task-input');
const addBtn     = $('add-btn');

// ── Boot ──────────────────────────────────
applyTheme();
setDate();
render();

// ── Date ──────────────────────────────────
function setDate() {
  $('header-date').textContent = new Date().toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

// ── Theme ─────────────────────────────────
function applyTheme() {
  document.documentElement.setAttribute('data-theme', theme);
  $('theme-icon').textContent = theme === 'dark' ? '☀' : '☾';
}
$('theme-btn').addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('doable-theme', theme);
  applyTheme();
});

// ── Priority picker ───────────────────────
document.querySelectorAll('.p-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.p-tab').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selPriority = btn.dataset.p;
  });
});

// ── Add task ──────────────────────────────
function addTask() {
  const text = taskInput.value.trim();
  if (!text) { taskInput.classList.add('shake'); setTimeout(() => taskInput.classList.remove('shake'), 400); taskInput.focus(); return; }

  const task = {
    id:        Date.now(),
    text,
    done:      false,
    priority:  selPriority,
    dueDate:   $('due-input').value   || null,
    tag:       $('tag-input').value.trim() || null,
    createdAt: Date.now(),
    order:     tasks.length,
  };
  tasks.unshift(task);
  save();

  // Reset
  taskInput.value = '';
  $('due-input').value = '';
  $('tag-input').value = '';
  document.querySelectorAll('.p-tab').forEach(b => b.classList.remove('selected'));
  document.querySelector('.p-tab[data-p="mid"]').classList.add('selected');
  selPriority = 'mid';

  render();
  taskInput.focus();
}

addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });

// ── Toggle done ───────────────────────────
function toggleDone(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  t.done = !t.done;
  save(); render();
}

// ── Delete ────────────────────────────────
function deleteTask(id, liEl) {
  liEl.classList.add('removing');
  liEl.addEventListener('animationend', () => {
    tasks = tasks.filter(t => t.id !== id);
    save(); render();
  }, { once: true });
}

// ── Edit ──────────────────────────────────
function startEdit(id, liEl) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  const textEl = liEl.querySelector('.task-text');
  const inp = document.createElement('input');
  inp.className = 'task-edit-input';
  inp.value = t.text;
  textEl.replaceWith(inp);
  inp.focus(); inp.select();
  const save_ = () => {
    const v = inp.value.trim();
    if (v) t.text = v;
    save(); render();
  };
  inp.addEventListener('blur', save_);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') inp.blur();
    if (e.key === 'Escape') render();
  });
}

// ── Filters / search / sort ───────────────
document.querySelectorAll('.ftab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.ftab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filter = btn.dataset.filter;
    render();
  });
});
$('search-input').addEventListener('input', e => { search = e.target.value; render(); });
$('sort-select').addEventListener('change', e => { sortBy = e.target.value; render(); });
$('clear-btn').addEventListener('click', () => {
  tasks = tasks.filter(t => !t.done);
  save(); render();
});

// ── Derived list ──────────────────────────
function getVisible() {
  const today = new Date().toISOString().split('T')[0];
  let list = tasks.filter(t => {
    if (filter === 'pending')   return !t.done;
    if (filter === 'completed') return t.done;
    return true;
  });
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(t => t.text.toLowerCase().includes(q) || (t.tag && t.tag.toLowerCase().includes(q)));
  }
  const pOrd = { high: 0, mid: 1, low: 2 };
  list.sort((a, b) => {
    if (sortBy === 'priority') return pOrd[a.priority] - pOrd[b.priority];
    if (sortBy === 'alpha')    return a.text.localeCompare(b.text);
    if (sortBy === 'oldest')   return a.createdAt - b.createdAt;
    if (sortBy === 'due') {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }
    return b.createdAt - a.createdAt;
  });
  return list;
}

// ── Render ────────────────────────────────
function render() {
  const visible = getVisible();
  taskList.innerHTML = '';

  visible.forEach(t => {
    const li = createTaskEl(t);
    taskList.appendChild(li);
  });

  // Empty state
  const isEmpty = visible.length === 0;
  emptyState.style.display = isEmpty ? 'flex' : 'none';
  if (isEmpty) {
    if (filter === 'completed') {
      $('empty-h').textContent = 'No completed tasks';
      $('empty-p').textContent = 'Complete some tasks to see them here.';
    } else if (filter === 'pending') {
      $('empty-h').textContent = 'All caught up!';
      $('empty-p').textContent = 'No pending tasks — great work! 🎉';
    } else if (search) {
      $('empty-h').textContent = 'No results';
      $('empty-p').textContent = `Nothing matched "${search}".`;
    } else {
      $('empty-h').textContent = 'No tasks yet';
      $('empty-p').textContent = 'Add your first task above to get started.';
    }
  }

  updateStats();
  setupDrag();
}

// ── Create task element ───────────────────
function createTaskEl(t) {
  const today = new Date().toISOString().split('T')[0];
  const li = document.createElement('li');
  li.className = 'task-item' + (t.done ? ' is-done' : '');
  li.dataset.id = t.id;
  li.dataset.priority = t.priority;
  li.draggable = true;

  // Badges
  let badgeHTML = '';
  const pLabels = { high: '● High', mid: '● Med', low: '● Low' };
  badgeHTML += `<span class="badge badge-priority-${t.priority}">${pLabels[t.priority]}</span>`;
  if (t.dueDate) {
    const overdue = !t.done && t.dueDate < today;
    const label = t.dueDate === today ? '📅 Today' : `📅 ${fmtDate(t.dueDate)}`;
    badgeHTML += `<span class="badge badge-due${overdue ? ' overdue' : ''}">${label}${overdue ? ' ⚠' : ''}</span>`;
  }
  if (t.tag) badgeHTML += `<span class="badge badge-tag">#${esc(t.tag)}</span>`;

  li.innerHTML = `
    <span class="drag-handle" title="Drag to reorder">⠿</span>
    <div class="task-check" role="checkbox" aria-checked="${t.done}" tabindex="0" title="${t.done ? 'Mark pending' : 'Mark complete'}">
      ${t.done ? '✓' : ''}
    </div>
    <div class="task-content">
      <div class="task-text">${esc(t.text)}</div>
      <div class="task-badges">${badgeHTML}</div>
    </div>
    <div class="task-actions">
      <button class="task-action edit" title="Edit task">✎</button>
      <button class="task-action del" title="Delete task">✕</button>
    </div>`;

  li.querySelector('.task-check').addEventListener('click', () => toggleDone(t.id));
  li.querySelector('.task-check').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDone(t.id); } });
  li.querySelector('.edit').addEventListener('click', () => startEdit(t.id, li));
  li.querySelector('.del').addEventListener('click',  () => deleteTask(t.id, li));

  return li;
}

// ── Stats ─────────────────────────────────
function updateStats() {
  const total   = tasks.length;
  const done    = tasks.filter(t => t.done).length;
  const pending = total - done;
  const pct     = total ? Math.round((done / total) * 100) : 0;

  $('stat-total').textContent   = total;
  $('stat-done').textContent    = done;
  $('stat-pending').textContent = pending;
  $('progress-fill').style.width = pct + '%';
  $('progress-pct').textContent  = pct + '%';
}

// ── Drag-and-drop ─────────────────────────
let dragSrc = null;

function setupDrag() {
  const items = taskList.querySelectorAll('.task-item');
  items.forEach(el => {
    el.addEventListener('dragstart', onDragStart);
    el.addEventListener('dragover',  onDragOver);
    el.addEventListener('dragleave', onDragLeave);
    el.addEventListener('drop',      onDrop);
    el.addEventListener('dragend',   onDragEnd);
  });
}

function onDragStart(e) {
  dragSrc = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.dataset.id);
}
function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  if (this !== dragSrc) this.classList.add('drag-over');
}
function onDragLeave() { this.classList.remove('drag-over'); }
function onDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');
  if (this === dragSrc || !dragSrc) return;

  const srcId   = parseInt(dragSrc.dataset.id);
  const tgtId   = parseInt(this.dataset.id);
  const srcIdx  = tasks.findIndex(t => t.id === srcId);
  const tgtIdx  = tasks.findIndex(t => t.id === tgtId);
  if (srcIdx === -1 || tgtIdx === -1) return;

  const [moved] = tasks.splice(srcIdx, 1);
  tasks.splice(tgtIdx, 0, moved);
  save();
  render();
}
function onDragEnd() {
  taskList.querySelectorAll('.task-item').forEach(el => {
    el.classList.remove('dragging', 'drag-over');
  });
  dragSrc = null;
}

// ── Helpers ───────────────────────────────
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function fmtDate(d) {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${String(y).slice(2)}`;
}
function save() { localStorage.setItem('doable-tasks', JSON.stringify(tasks)); }

/* ── Shake animation (input validation) ── */
const style = document.createElement('style');
style.textContent = `
@keyframes shake {
  0%,100%{transform:translateX(0)}
  20%{transform:translateX(-6px)}
  40%{transform:translateX(6px)}
  60%{transform:translateX(-4px)}
  80%{transform:translateX(4px)}
}
.shake { animation: shake 0.35s ease; border-color: var(--red) !important; }
`;
document.head.appendChild(style);
