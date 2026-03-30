"use strict";

const APP_CONFIG = {
  authTabs: {
    login: { heading: "Authenticate to continue" },
    signup: { heading: "Authenticate to continue" },
  },
  demoAdmin: {
    name: "Admin User",
    email: "admin@todoapp.com",
    password: "Admin@123",
    role: "admin",
  },
  validation: {
    name: { minLength: 2, maxLength: 50 },
    taskTitle: { minLength: 3, maxLength: 120 },
    password: {
      minLength: 8,
      maxLength: 64,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
    },
  },
};

const state = {
  authTab: "login",
  currentFilter: "all",
  sessionUserId: null,
  users: [],
  tasks: [],
};

const elements = {
  authView: document.getElementById("authView"),
  dashboardView: document.getElementById("dashboardView"),
  appMessage: document.getElementById("appMessage"),
  authHeading: document.getElementById("authHeading"),
  loginForm: document.getElementById("loginForm"),
  signupForm: document.getElementById("signupForm"),
  taskForm: document.getElementById("taskForm"),
  loginEmail: document.getElementById("loginEmail"),
  loginPassword: document.getElementById("loginPassword"),
  signupName: document.getElementById("signupName"),
  signupEmail: document.getElementById("signupEmail"),
  signupPassword: document.getElementById("signupPassword"),
  signupConfirmPassword: document.getElementById("signupConfirmPassword"),
  taskInput: document.getElementById("taskInput"),
  taskPriority: document.getElementById("taskPriority"),
  demoAdminBtn: document.getElementById("demoAdminBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  footerCopy: document.getElementById("footerCopy"),
  welcomeText: document.getElementById("welcomeText"),
  roleText: document.getElementById("roleText"),
  totalCount: document.getElementById("totalCount"),
  pendingCount: document.getElementById("pendingCount"),
  completedCount: document.getElementById("completedCount"),
  taskList: document.getElementById("taskList"),
  emptyState: document.getElementById("emptyState"),
  boardDescription: document.getElementById("boardDescription"),
  authTabs: document.querySelectorAll("[data-auth-tab]"),
  filterButtons: document.querySelectorAll("[data-filter]"),
};

function createId() {
  return crypto.randomUUID();
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function trimAndCollapseSpaces(value) {
  return value.trim().replace(/\s+/g, " ");
}

async function hashText(value) {
  const data = new TextEncoder().encode(value);
  const buffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function getCurrentUser() {
  return state.users.find((user) => user.id === state.sessionUserId) || null;
}

function getScopedTasks(user = getCurrentUser()) {
  if (!user) {
    return [];
  }

  return user.role === "admin"
    ? [...state.tasks]
    : state.tasks.filter((task) => task.userId === user.id);
}

function getVisibleTasks() {
  const scopedTasks = getScopedTasks();

  if (state.currentFilter === "pending") {
    return scopedTasks.filter((task) => !task.completed);
  }

  if (state.currentFilter === "completed") {
    return scopedTasks.filter((task) => task.completed);
  }

  return scopedTasks;
}

function getTaskCounts() {
  const tasks = getScopedTasks();

  return {
    total: tasks.length,
    pending: tasks.filter((task) => !task.completed).length,
    completed: tasks.filter((task) => task.completed).length,
  };
}

function showMessage(text, type = "info") {
  elements.appMessage.textContent = text;
  elements.appMessage.className = `message ${type}`;
  elements.appMessage.hidden = false;
}

function clearMessage() {
  elements.appMessage.textContent = "";
  elements.appMessage.className = "message";
  elements.appMessage.hidden = true;
}

function setPressedState(buttons, activeValue, dataAttributeName) {
  buttons.forEach((button) => {
    const isActive = button.dataset[dataAttributeName] === activeValue;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function switchAuthTab(tab, options = {}) {
  const { preserveMessage = false } = options;
  state.authTab = tab;

  setPressedState(elements.authTabs, tab, "authTab");
  elements.loginForm.classList.toggle("active", tab === "login");
  elements.signupForm.classList.toggle("active", tab === "signup");
  elements.authHeading.textContent = APP_CONFIG.authTabs[tab].heading;

  if (!preserveMessage) {
    clearMessage();
  }
}

function renderAuthState() {
  const user = getCurrentUser();
  const isLoggedIn = Boolean(user);

  elements.authView.classList.toggle("hidden", isLoggedIn);
  elements.dashboardView.classList.toggle("hidden", !isLoggedIn);
  elements.logoutBtn.classList.toggle("hidden", !isLoggedIn);

  elements.footerCopy.innerHTML = isLoggedIn
    ? `Active session: <strong>${user.name}</strong> (${user.role})`
    : 'Demo admin: <strong>admin@todoapp.com</strong> / <strong>Admin@123</strong>';

  if (!isLoggedIn) {
    return;
  }

  elements.welcomeText.textContent = `Welcome, ${user.name}`;
  elements.roleText.textContent =
    user.role === "admin"
      ? "Signed in as admin. You can review and manage every user's task in this session."
      : "Signed in as user. You can manage your own tasks in this session.";

  elements.boardDescription.textContent =
    user.role === "admin"
      ? "Admin view shows all tasks from every account created during this session."
      : "User view shows only your own tasks.";
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

function createBadge(text, className) {
  return createElement("span", `badge ${className}`, text);
}

function createTaskItem(task, isAdminView) {
  const taskItem = createElement(
    "article",
    `task-item${task.completed ? " completed" : ""}`
  );
  const taskMain = createElement("div", "task-main");
  const checkboxWrap = createElement("label", "checkbox-wrap");
  const checkbox = createElement("input");
  const customCheck = createElement("span", "custom-check");
  const taskCopy = createElement("div", "task-copy");
  const title = createElement("h4", "", task.title);
  const taskMeta = createElement("div", "task-meta");
  const taskActions = createElement("div", "task-actions");
  const toggleButton = createElement(
    "button",
    `mini-btn ${task.completed ? "secondary" : "success"}`,
    task.completed ? "Mark Pending" : "Mark Complete"
  );
  const deleteButton = createElement("button", "mini-btn danger", "Delete");

  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", `Mark task "${task.title}" as complete`);
  checkbox.dataset.taskAction = "toggle";
  checkbox.dataset.taskId = task.id;

  taskMeta.append(
    createBadge(task.completed ? "Completed" : "Pending", task.completed ? "success" : "warning"),
    createBadge(task.priority, "neutral")
  );

  if (isAdminView) {
    const owner = state.users.find((user) => user.id === task.userId);
    taskMeta.append(createBadge(`Owner: ${owner ? owner.name : "Unknown user"}`, "owner"));
  }

  toggleButton.type = "button";
  toggleButton.dataset.taskAction = "toggle";
  toggleButton.dataset.taskId = task.id;

  deleteButton.type = "button";
  deleteButton.dataset.taskAction = "delete";
  deleteButton.dataset.taskId = task.id;

  checkboxWrap.append(checkbox, customCheck);
  taskCopy.append(title, taskMeta);
  taskActions.append(toggleButton, deleteButton);
  taskMain.append(checkboxWrap, taskCopy);
  taskItem.append(taskMain, taskActions);

  return taskItem;
}

function renderTasks() {
  const user = getCurrentUser();
  const visibleTasks = getVisibleTasks();

  setPressedState(elements.filterButtons, state.currentFilter, "filter");
  elements.taskList.replaceChildren();

  if (!user) {
    elements.emptyState.classList.add("hidden");
    return;
  }

  if (!visibleTasks.length) {
    elements.emptyState.classList.remove("hidden");
    return;
  }

  elements.emptyState.classList.add("hidden");

  const fragment = document.createDocumentFragment();
  const isAdminView = user.role === "admin";

  visibleTasks.forEach((task) => {
    fragment.append(createTaskItem(task, isAdminView));
  });

  elements.taskList.append(fragment);
}

function renderStats() {
  const counts = getTaskCounts();
  elements.totalCount.textContent = String(counts.total);
  elements.pendingCount.textContent = String(counts.pending);
  elements.completedCount.textContent = String(counts.completed);
}

function renderApp() {
  renderAuthState();
  renderStats();
  renderTasks();
}

function validateName(name) {
  const { minLength, maxLength } = APP_CONFIG.validation.name;

  if (name.length < minLength || name.length > maxLength) {
    return `Full name must be between ${minLength} and ${maxLength} characters.`;
  }

  return "";
}

function validatePassword(password) {
  const { minLength, maxLength, pattern } = APP_CONFIG.validation.password;

  if (password.length < minLength || password.length > maxLength) {
    return `Password must be between ${minLength} and ${maxLength} characters.`;
  }

  if (!pattern.test(password)) {
    return "Password must include uppercase, lowercase, number, and symbol characters.";
  }

  return "";
}

function validateTaskTitle(title) {
  const { minLength, maxLength } = APP_CONFIG.validation.taskTitle;

  if (title.length < minLength || title.length > maxLength) {
    return `Task title must be between ${minLength} and ${maxLength} characters.`;
  }

  return "";
}

function findUserByEmail(email) {
  return state.users.find((user) => user.email === normalizeEmail(email)) || null;
}

function canManageTask(user, task) {
  return Boolean(user) && (user.role === "admin" || task.userId === user.id);
}

async function seedDemoAdmin() {
  if (findUserByEmail(APP_CONFIG.demoAdmin.email)) {
    return;
  }

  state.users.push({
    id: createId(),
    name: APP_CONFIG.demoAdmin.name,
    email: APP_CONFIG.demoAdmin.email,
    passwordHash: await hashText(APP_CONFIG.demoAdmin.password),
    role: APP_CONFIG.demoAdmin.role,
  });
}

async function handleSignup(event) {
  event.preventDefault();

  const name = trimAndCollapseSpaces(elements.signupName.value);
  const email = normalizeEmail(elements.signupEmail.value);
  const password = elements.signupPassword.value.trim();
  const confirmPassword = elements.signupConfirmPassword.value.trim();

  const nameError = validateName(name);
  if (nameError) {
    showMessage(nameError, "error");
    return;
  }

  if (!email) {
    showMessage("Please enter a valid email address.", "error");
    return;
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    showMessage(passwordError, "error");
    return;
  }

  if (password !== confirmPassword) {
    showMessage("Password and confirm password must match.", "error");
    return;
  }

  if (findUserByEmail(email)) {
    switchAuthTab("login", { preserveMessage: true });
    showMessage("An account with this email already exists. Please log in instead.", "error");
    return;
  }

  state.users.push({
    id: createId(),
    name,
    email,
    passwordHash: await hashText(password),
    role: "user",
  });

  elements.signupForm.reset();
  switchAuthTab("login", { preserveMessage: true });
  showMessage("Signup successful. Your account is available for this session.", "success");
}

async function handleLogin(event) {
  event.preventDefault();

  const email = normalizeEmail(elements.loginEmail.value);
  const password = elements.loginPassword.value.trim();

  if (!email || !password) {
    showMessage("Email and password are required.", "error");
    return;
  }

  const user = findUserByEmail(email);
  if (!user) {
    showMessage("Invalid email or password. Please try again.", "error");
    return;
  }

  if (user.passwordHash !== await hashText(password)) {
    showMessage("Invalid email or password. Please try again.", "error");
    return;
  }

  state.sessionUserId = user.id;
  state.currentFilter = "all";
  elements.loginForm.reset();
  clearMessage();
  renderApp();
}

function handleLogout() {
  state.sessionUserId = null;
  state.currentFilter = "all";
  switchAuthTab("login", { preserveMessage: true });
  renderApp();
  showMessage("You have been logged out.", "success");
}

function handleTaskSubmit(event) {
  event.preventDefault();

  const user = getCurrentUser();
  const title = trimAndCollapseSpaces(elements.taskInput.value);
  const priority = elements.taskPriority.value;

  if (!user) {
    showMessage("Please log in before adding a task.", "error");
    return;
  }

  const titleError = validateTaskTitle(title);
  if (titleError) {
    showMessage(titleError, "error");
    return;
  }

  const duplicateTask = state.tasks.some(
    (task) =>
      task.userId === user.id &&
      task.title.toLowerCase() === title.toLowerCase() &&
      !task.completed
  );

  if (duplicateTask) {
    showMessage("A matching pending task already exists for this user.", "error");
    return;
  }

  state.tasks.unshift({
    id: createId(),
    userId: user.id,
    title,
    priority,
    completed: false,
    createdAt: new Date().toISOString(),
  });

  elements.taskForm.reset();
  elements.taskPriority.value = "Medium";
  clearMessage();
  renderApp();
}

function toggleTask(taskId) {
  const user = getCurrentUser();
  const task = state.tasks.find((item) => item.id === taskId);

  if (!user || !task) {
    return;
  }

  if (!canManageTask(user, task)) {
    showMessage("You are not allowed to update this task.", "error");
    return;
  }

  task.completed = !task.completed;
  task.updatedAt = new Date().toISOString();
  clearMessage();
  renderApp();
}

function deleteTask(taskId) {
  const user = getCurrentUser();
  const taskIndex = state.tasks.findIndex((item) => item.id === taskId);

  if (!user || taskIndex === -1) {
    return;
  }

  if (!canManageTask(user, state.tasks[taskIndex])) {
    showMessage("You are not allowed to delete this task.", "error");
    return;
  }

  state.tasks.splice(taskIndex, 1);
  clearMessage();
  renderApp();
}

function handleTaskListInteraction(event) {
  const actionTrigger = event.target.closest("[data-task-action]");

  if (!actionTrigger) {
    return;
  }

  const { taskAction, taskId } = actionTrigger.dataset;

  if (taskAction === "toggle") {
    toggleTask(taskId);
    return;
  }

  if (taskAction === "delete") {
    deleteTask(taskId);
  }
}

function handleDemoAdminFill() {
  elements.loginEmail.value = APP_CONFIG.demoAdmin.email;
  elements.loginPassword.value = APP_CONFIG.demoAdmin.password;
  showMessage("Demo admin credentials loaded into the login form.", "success");
}

function setupEventListeners() {
  elements.authTabs.forEach((button) => {
    button.addEventListener("click", () => switchAuthTab(button.dataset.authTab));
  });

  elements.filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.currentFilter = button.dataset.filter;
      renderTasks();
    });
  });

  elements.signupForm.addEventListener("submit", (event) => {
    void handleSignup(event);
  });

  elements.loginForm.addEventListener("submit", (event) => {
    void handleLogin(event);
  });

  elements.logoutBtn.addEventListener("click", handleLogout);
  elements.taskForm.addEventListener("submit", handleTaskSubmit);
  elements.taskList.addEventListener("click", handleTaskListInteraction);
  elements.taskList.addEventListener("change", handleTaskListInteraction);
  elements.demoAdminBtn.addEventListener("click", handleDemoAdminFill);
}

async function initializeApp() {
  await seedDemoAdmin();
  setupEventListeners();
  renderApp();
}

void initializeApp();
