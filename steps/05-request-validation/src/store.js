// In-memory storage for now. Lesson 7 replaces it with PostgreSQL.
const tasks = new Map();
let nextId = 1;

export function listTasks() {
  return [...tasks.values()];
}

export function getTask(id) {
  return tasks.get(id);
}

export function createTask({ title, priority }) {
  const task = { id: nextId++, title, priority, done: false, createdAt: new Date().toISOString() };
  tasks.set(task.id, task);
  return task;
}

export function updateTask(id, changes) {
  const task = tasks.get(id);
  if (!task) return undefined;
  Object.assign(task, changes);
  return task;
}

export function deleteTask(id) {
  return tasks.delete(id);
}
