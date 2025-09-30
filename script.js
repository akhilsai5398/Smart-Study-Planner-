/* Smart Study Planner — Interactive JS */
const taskName = document.getElementById('taskName');
const taskDate = document.getElementById('taskDate');
const taskPriority = document.getElementById('taskPriority');
const addTaskBtn = document.getElementById('addTaskBtn');

const taskContainer = document.getElementById('taskContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const noTasks = document.getElementById('noTasks');

const searchInput = document.getElementById('searchInput');
const filterStatus = document.getElementById('filterStatus');
const filterPriority = document.getElementById('filterPriority');
const clearCompletedBtn = document.getElementById('clearCompleted');

const darkToggle = document.getElementById('darkToggle');
const notifyToggle = document.getElementById('notifyToggle');
const streakDisplay = document.getElementById('streakDisplay');

const editModal = document.getElementById('editModal');
const editName = document.getElementById('editName');
const editDate = document.getElementById('editDate');
const editPriority = document.getElementById('editPriority');
const saveEdit = document.getElementById('saveEdit');
const cancelEdit = document.getElementById('cancelEdit');

let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let settings = JSON.parse(localStorage.getItem('planner_settings')) || { theme: 'light', notificationsEnabled: false };
let streak = JSON.parse(localStorage.getItem('planner_streak')) || { count: 0, lastCompletedDate: null };

let currentEditIndex = null;

/* Helpers */
const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const yesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

function saveAll() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
  localStorage.setItem('planner_settings', JSON.stringify(settings));
  localStorage.setItem('planner_streak', JSON.stringify(streak));
}

/* Normalize older tasks (add default fields if missing) */
function normalize() {
  tasks = tasks.map(t => ({
    name: t.name || 'Untitled',
    date: t.date || todayStr(),
    priority: t.priority || 'Medium',
    completed: !!t.completed,
    completedAt: t.completedAt || (t.completed ? (t.completedAt || todayStr()) : null),
    notifiedDate: t.notifiedDate || null
  }));
}

/* Render tasks according to filters/search */
function renderTasks() {
  taskContainer.innerHTML = '';
  normalize();

  const q = searchInput.value.trim().toLowerCase();
  const status = filterStatus.value;
  const priorityFilter = filterPriority.value;

  const filtered = tasks
    .map((t, i) => ({ ...t, index: i }))
    .filter(t => (q ? t.name.toLowerCase().includes(q) : true))
    .filter(t => (status === 'all' ? true : status === 'completed' ? t.completed : !t.completed))
    .filter(t => (priorityFilter === 'all' ? true : t.priority === priorityFilter));

  if (filtered.length === 0) {
    noTasks.style.display = 'block';
  } else noTasks.style.display = 'none';

  filtered.forEach(({ name, date, priority, completed, index }) => {
    const li = document.createElement('li');
    if (completed) li.classList.add('completed');
    li.classList.add('fade-in');

    const info = document.createElement('div');
    info.className = 'task-info';

    const badge = document.createElement('span');
    badge.className = 'badge ' + (priority.toLowerCase() === 'high' ? 'priority-high' : priority.toLowerCase() === 'medium' ? 'priority-medium' : 'priority-low');
    badge.textContent = priority;

    const text = document.createElement('div');
    text.className = 'task-text';
    text.innerHTML = `<strong>${escapeHtml(name)}</strong><span class="task-meta"> — ${date}</span>`;

    info.appendChild(badge);
    info.appendChild(text);

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const completeBtn = document.createElement('button');
    completeBtn.innerText = '✔';
    completeBtn.title = 'Toggle complete';
    completeBtn.addEventListener('click', () => toggleTask(index));

    const editBtn = document.createElement('button');
    editBtn.innerText = '✏️';
    editBtn.title = 'Edit task';
    editBtn.addEventListener('click', () => openEditModal(index));

    const deleteBtn = document.createElement('button');
    deleteBtn.innerText = '❌';
    deleteBtn.title = 'Delete task';
    deleteBtn.addEventListener('click', () => removeTaskAnimated(index, li));

    actions.appendChild(completeBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(info);
    li.appendChild(actions);

    taskContainer.appendChild(li);
  });

  updateProgress();
  saveAll();
}

/* Add Task */
addTaskBtn.addEventListener('click', () => {
  const name = taskName.value.trim();
  const date = taskDate.value;
  const priority = taskPriority.value;

  if (!name || !date) {
    alert('Please enter a task name and date.');
    return;
  }

  tasks.push({ name, date, priority, completed: false, completedAt: null, notifiedDate: null });
  taskName.value = '';
  taskDate.value = '';
  taskPriority.value = 'Medium';
  renderTasks();
});

/* Toggle complete + update streak */
function toggleTask(idx) {
  const task = tasks[idx];
  task.completed = !task.completed;
  if (task.completed) {
    // set completion timestamp
    task.completedAt = todayStr();
    // update streak only if completion is for today (we count daily completions)
    updateStreakOnComplete();
  } else {
    // unmark completedAt (we won't decrease streak retroactively)
    task.completedAt = null;
  }
  renderTasks();
}

/* Update streak logic */
function updateStreakOnComplete() {
  const today = todayStr();
  const yesterday = yesterdayStr();

  // if already recorded a completion for today, do nothing
  if (streak.lastCompletedDate === today) return;

  if (streak.lastCompletedDate === yesterday) {
    streak.count = (streak.count || 0) + 1;
  } else {
    streak.count = 1;
  }
  streak.lastCompletedDate = today;
  streakDisplay.textContent = `🔥 Streak: ${streak.count} day${streak.count === 1 ? '' : 's'}`;
  saveAll();
}

/* Animated remove */
function removeTaskAnimated(idx, liElement) {
  liElement.classList.add('removing');
  liElement.addEventListener('animationend', () => {
    tasks.splice(idx, 1);
    renderTasks();
  }, { once: true });
}

/* Clear completed */
clearCompletedBtn.addEventListener('click', () => {
  if (!confirm('Remove all completed tasks?')) return;
  tasks = tasks.filter(t => !t.completed);
  renderTasks();
});

/* Progress bar */
function updateProgress() {
  if (!tasks.length) {
    progressFill.style.width = '0%';
    progressText.innerText = '0% Completed';
    return;
  }
  const completed = tasks.filter(t => t.completed).length;
  const percent = Math.round((completed / tasks.length) * 100);
  progressFill.style.width = percent + '%';
  progressText.innerText = `${percent}% Completed`;

  // streak display set on load
  streakDisplay.textContent = `🔥 Streak: ${streak.count || 0} day${(streak.count || 0) === 1 ? '' : 's'}`;
}

/* Search & Filter */
[searchInput, filterStatus, filterPriority].forEach(el => el.addEventListener('input', renderTasks));

/* Edit modal */
function openEditModal(idx) {
  currentEditIndex = idx;
  const t = tasks[idx];
  editName.value = t.name;
  editDate.value = t.date;
  editPriority.value = t.priority;
  editModal.classList.add('show');
  editModal.setAttribute('aria-hidden', 'false');
}

cancelEdit.addEventListener('click', () => closeEditModal());
function closeEditModal() {
  editModal.classList.remove('show');
  editModal.setAttribute('aria-hidden', 'true');
  currentEditIndex = null;
}

saveEdit.addEventListener('click', () => {
  if (currentEditIndex === null) return closeEditModal();
  const name = editName.value.trim();
  const date = editDate.value;
  const p = editPriority.value;
  if (!name || !date) { alert('Please fill name and date'); return; }
  tasks[currentEditIndex].name = name;
  tasks[currentEditIndex].date = date;
  tasks[currentEditIndex].priority = p;
  closeEditModal();
  renderTasks();
});

/* Notifications */
notifyToggle.addEventListener('click', async () => {
  if (settings.notificationsEnabled && Notification.permission === 'granted') {
    settings.notificationsEnabled = false;
    notifyToggle.textContent = '🔔 Enable Reminders';
    saveAll();
    return alert('Reminders turned off.');
  }

  if (Notification.permission === 'default') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { alert('Notifications blocked. You can enable them from the browser settings.'); return; }
  }

  if (Notification.permission === 'granted') {
    settings.notificationsEnabled = true;
    notifyToggle.textContent = '🔕 Disable Reminders';
    saveAll();
    checkDueTasksAndNotify(); // immediate check
    alert('Reminders enabled — you will be notified for tasks due today while this page is open.');
  } else {
    alert('Notifications permission not granted.');
  }
});

/* Check due tasks and send notifications (only while page is open) */
function checkDueTasksAndNotify() {
  if (!settings.notificationsEnabled) return;
  if (Notification.permission !== 'granted') return;
  const today = todayStr();
  tasks.forEach((t, i) => {
    if (t.date === today && t.notifiedDate !== today) {
      const title = 'Task due today';
      const body = `${t.name} — priority: ${t.priority}`;
      try {
        const n = new Notification(title, { body });
        // optional click opens the page
        n.onclick = () => window.focus();
      } catch (e) {
        console.warn('Notification failed', e);
      }
      tasks[i].notifiedDate = today;
    }
  });
  saveAll();
}

/* Dark mode */
darkToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  settings.theme = document.body.classList.contains('dark') ? 'dark' : 'light';
  darkToggle.textContent = settings.theme === 'dark' ? '☀️' : '🌙';
  saveAll();
});

/* Utility to escape HTML (prevent injection) */
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, s => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[s]);
}

/* Initial load - apply saved settings */
function applySettings() {
  if (settings.theme === 'dark') {
    document.body.classList.add('dark');
    darkToggle.textContent = '☀️';
  } else {
    document.body.classList.remove('dark');
    darkToggle.textContent = '🌙';
  }
  notifyToggle.textContent = settings.notificationsEnabled && Notification.permission === 'granted' ? '🔕 Disable Reminders' : '🔔 Enable Reminders';
}

/* Periodic check for due tasks while page is open */
setInterval(checkDueTasksAndNotify, 60 * 60 * 1000); // every hour

/* initial render */
normalize();
applySettings();
renderTasks();
checkDueTasksAndNotify();
