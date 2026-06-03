const STORAGE_KEYS = {
  stateV2: "loja-vida-e-saude:state:v2",
  legacyTransactions: "transactions",
  legacyCategories: "categories",
  migrationBackupV1: "loja-vida-e-saude:migration-backup:v1",
  destructiveBackup: "loja-vida-e-saude:destructive-backup",
  activeView: "loja-vida-e-saude:active-view",
};

const APP_VIEWS = {
  dashboard: "view-dashboard",
  cashflow: "view-cashflow",
  transactions: "view-transactions",
  reports: "view-reports",
  settings: "view-settings",
};

const VALID_VIEW_NAMES = Object.keys(APP_VIEWS);

const APP_INFO = {
  appName: "Loja Vida e Saúde",
  schemaVersion: 2,
  backupVersion: "2.0.0",
};

const DEFAULT_CATEGORIES = [
  "Vendas",
  "Mercadorias",
  "Aluguel",
  "Energia",
  "Água",
  "Internet",
  "Impostos",
  "Pró-labore",
  "Marketing",
  "Fretes",
  "Outros",
];

const STATUS_LABELS = {
  pendente: "Pendente",
  pago: "Pago",
  recebido: "Recebido",
  vencido: "Vencido",
  a_receber_atrasado: "A receber atrasado",
};

const CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const DECIMAL_INPUT_FORMATTER = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const DOM = {
  appNav: document.getElementById("app-nav"),
  appNavButtons: document.querySelectorAll(".app-nav-button[data-view]"),

  form: document.getElementById("transaction-form"),
  formFeedback: document.getElementById("form-feedback"),

  realizedIncome: document.getElementById("realized-income"),
  realizedExpense: document.getElementById("realized-expense"),
  realizedBalance: document.getElementById("realized-balance"),
  expectedIncome: document.getElementById("expected-income"),
  expectedExpense: document.getElementById("expected-expense"),
  expectedBalance: document.getElementById("expected-balance"),
  alertOverdueExpensesCount: document.getElementById("alert-overdue-expenses-count"),
  alertOverdueExpensesValue: document.getElementById("alert-overdue-expenses-value"),
  alertUpcomingExpensesCount: document.getElementById("alert-upcoming-expenses-count"),
  alertUpcomingExpensesValue: document.getElementById("alert-upcoming-expenses-value"),
  alertOverdueIncomeCount: document.getElementById("alert-overdue-income-count"),
  alertOverdueIncomeValue: document.getElementById("alert-overdue-income-value"),
  summaryPeriodLabel: document.getElementById("summary-period-label"),
  analysisMonth: document.getElementById("analysis-month"),

  projectionToday: document.getElementById("projection-today"),
  projection7Days: document.getElementById("projection-7-days"),
  projection15Days: document.getElementById("projection-15-days"),
  projection30Days: document.getElementById("projection-30-days"),

  cashflowDate: document.getElementById("cashflow-date"),
  dailyRealizedIncome: document.getElementById("daily-realized-income"),
  dailyRealizedExpense: document.getElementById("daily-realized-expense"),
  dailyRealizedBalance: document.getElementById("daily-realized-balance"),
  dailyExpectedIncome: document.getElementById("daily-expected-income"),
  dailyExpectedExpense: document.getElementById("daily-expected-expense"),
  dailyExpectedBalance: document.getElementById("daily-expected-balance"),
  dailyPendingExpense: document.getElementById("daily-pending-expense"),
  dailyPendingIncome: document.getElementById("daily-pending-income"),
  weeklyCashflowBody: document.getElementById("weekly-cashflow-body"),

  categoryReportBody: document.getElementById("category-report-body"),
  incomeExpenseChart: document.getElementById("income-expense-chart"),
  expenseCategoryChart: document.getElementById("expense-category-chart"),

  submitButton: document.getElementById("submit-button"),
  cancelEditButton: document.getElementById("cancel-edit-button"),

  filterType: document.getElementById("filter-type"),
  filterCategory: document.getElementById("filter-category"),
  filterStatus: document.getElementById("filter-status"),

  type: document.getElementById("type"),
  description: document.getElementById("description"),
  category: document.getElementById("category"),
  amount: document.getElementById("amount"),
  date: document.getElementById("date"),
  dueDate: document.getElementById("due-date"),
  status: document.getElementById("status"),

  transactionsTableBody: document.getElementById("transactions-table-body"),

  newCategory: document.getElementById("new-category"),
  addCategoryButton: document.getElementById("add-category-button"),

  exportBackupButton: document.getElementById("export-backup-button"),
  importBackupInput: document.getElementById("import-backup-input"),
};

let state = createEmptyState();
let editingTransactionId = null;

function createEmptyState() {
  return {
    schemaVersion: APP_INFO.schemaVersion,
    categories: [...DEFAULT_CATEGORIES],
    transactions: [],
  };
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function localDateToISO(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function getTodayISO() {
  return localDateToISO(new Date());
}

function getCurrentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

function isValidMonthValue(value) {
  return /^\d{4}-\d{2}$/.test(value);
}

function getMonthBounds(monthValue) {
  if (!isValidMonthValue(monthValue)) {
    throw new Error("Mês inválido.");
  }

  const [year, month] = monthValue.split("-").map(Number);
  const lastDayDate = new Date(year, month, 0);

  return {
    startISO: `${year}-${pad2(month)}-01`,
    endISO: `${year}-${pad2(month)}-${pad2(lastDayDate.getDate())}`,
  };
}

function parseISODateParts(isoDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return null;
  }

  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const isValid =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  if (!isValid) {
    return null;
  }

  return { year, month, day };
}

function isValidISODate(isoDate) {
  return Boolean(parseISODateParts(isoDate));
}

function normalizeISODateString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (isValidISODate(trimmed)) {
    return trimmed;
  }

  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (brMatch) {
    const [, day, month, year] = brMatch;
    const iso = `${year}-${month}-${day}`;
    return isValidISODate(iso) ? iso : null;
  }

  return null;
}

function formatISODateForDisplay(isoDate) {
  const parts = parseISODateParts(isoDate);

  if (!parts) {
    return "Data inválida";
  }

  return `${pad2(parts.day)}/${pad2(parts.month)}/${parts.year}`;
}

function addDaysToISO(baseISO, days) {
  const parts = parseISODateParts(baseISO);

  if (!parts) {
    throw new Error("Data base inválida.");
  }

  // Usamos meio-dia local para evitar armadilhas em transições de horário.
  const date = new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0);
  date.setDate(date.getDate() + days);

  return localDateToISO(date);
}

function compareISODate(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function formatCents(amountCents) {
  return CURRENCY_FORMATTER.format((amountCents || 0) / 100);
}

function formatCentsForInput(amountCents) {
  return DECIMAL_INPUT_FORMATTER.format((amountCents || 0) / 100);
}

function parseMoneyToCents(input) {
  if (typeof input === "number" && Number.isFinite(input)) {
    return Math.round(input * 100);
  }

  if (typeof input !== "string") {
    throw new Error("Valor monetário inválido.");
  }

  let value = input.trim();

  if (!value) {
    throw new Error("Informe o valor.");
  }

  value = value.replace(/\s+/g, "").replace(/^R\$/i, "");

  if (value.startsWith("-")) {
    throw new Error("Use o tipo Entrada/Saída; não informe valor negativo.");
  }

  if (!/^[\d.,]+$/.test(value)) {
    throw new Error("Use apenas números, vírgula e ponto.");
  }

  const commaCount = (value.match(/,/g) || []).length;
  const dotCount = (value.match(/\./g) || []).length;
  let normalized = value;

  if (commaCount > 0 && dotCount > 0) {
    // Quando há os dois separadores, o último é tratado como separador decimal.
    if (value.lastIndexOf(",") > value.lastIndexOf(".")) {
      normalized = value.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = value.replace(/,/g, "");
    }
  } else if (commaCount === 1 && dotCount === 0) {
    const [intPart, fracPart] = value.split(",");

    if (fracPart.length > 2) {
      throw new Error("Use no máximo 2 casas decimais.");
    }

    normalized = `${intPart}.${fracPart}`;
  } else if (commaCount === 0 && dotCount === 1) {
    const [intPart, fracPart] = value.split(".");

    if (fracPart.length <= 2) {
      normalized = value;
    } else if (fracPart.length === 3 && /^\d{1,3}$/.test(intPart)) {
      // Ex.: 3.000 => 3000
      normalized = `${intPart}${fracPart}`;
    } else {
      throw new Error("Formato numérico inválido.");
    }
  } else if (commaCount === 0 && dotCount > 1) {
    const groups = value.split(".");

    const looksLikeThousands = groups.every((group, index) => {
      if (index === 0) {
        return /^\d{1,3}$/.test(group);
      }
      return /^\d{3}$/.test(group);
    });

    if (!looksLikeThousands) {
      throw new Error("Formato numérico inválido.");
    }

    normalized = groups.join("");
  } else if (commaCount > 1 && dotCount === 0) {
    throw new Error("Formato numérico inválido.");
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Use no máximo 2 casas decimais.");
  }

  const [wholePart, fractionPart = ""] = normalized.split(".");
  const cents =
    Number(wholePart) * 100 + Number(fractionPart.padEnd(2, "0").slice(0, 2));

  if (!Number.isSafeInteger(cents)) {
    throw new Error("Valor muito alto para ser processado.");
  }

  return cents;
}

function sumAmountCents(items) {
  return items.reduce((sum, item) => sum + item.amountCents, 0);
}

// --- Helpers de tipo/status ---

function isValidTransactionType(type) {
  return type === "entrada" || type === "saida";
}

function getAllowedStatusesForType(type) {
  if (type === "entrada") {
    return ["pendente", "recebido"];
  }

  if (type === "saida") {
    return ["pendente", "pago"];
  }

  return [];
}

function isStatusAllowedForType(type, status) {
  return getAllowedStatusesForType(type).includes(status);
}

function normalizeStatus(type, status) {
  if (!isValidTransactionType(type)) {
    return "pendente";
  }

  if (isStatusAllowedForType(type, status)) {
    return status;
  }

  if (type === "entrada" && status === "pago") {
    return "recebido";
  }

  if (type === "saida" && status === "recebido") {
    return "pago";
  }

  return "pendente";
}

function isIncome(transaction) {
  return Boolean(transaction && transaction.type === "entrada");
}

function isExpense(transaction) {
  return Boolean(transaction && transaction.type === "saida");
}

function isPending(transaction) {
  return Boolean(transaction && transaction.status === "pendente");
}

function isReceived(transaction) {
  return isIncome(transaction) && transaction.status === "recebido";
}

function isPaid(transaction) {
  return isExpense(transaction) && transaction.status === "pago";
}

function isRealizedIncome(transaction) {
  return isReceived(transaction);
}

function isRealizedExpense(transaction) {
  return isPaid(transaction);
}

function isExpectedIncome(transaction) {
  return isIncome(transaction) && isPending(transaction);
}

function isExpectedExpense(transaction) {
  return isExpense(transaction) && isPending(transaction);
}

function getStatusLabel(status) {
  return STATUS_LABELS[status] || status;
}

// --- Status derivados ---

function isOverdueExpense(transaction, todayISO) {
  return (
    isExpense(transaction) &&
    isPending(transaction) &&
    isValidISODate(transaction.dueDate) &&
    compareISODate(transaction.dueDate, todayISO) < 0
  );
}

function isOverdueIncome(transaction, todayISO) {
  return (
    isIncome(transaction) &&
    isPending(transaction) &&
    isValidISODate(transaction.dueDate) &&
    compareISODate(transaction.dueDate, todayISO) < 0
  );
}

function getDisplayStatus(transaction, todayISO = getTodayISO()) {
  if (!transaction) {
    return "pendente";
  }

  if (isOverdueExpense(transaction, todayISO)) {
    return "vencido";
  }

  if (isOverdueIncome(transaction, todayISO)) {
    return "a_receber_atrasado";
  }

  return transaction.status;
}

// --- Normalização de transações ---

function normalizeTransactionStatus(transaction) {
  if (!transaction || typeof transaction !== "object") {
    return transaction;
  }

  if (!isValidTransactionType(transaction.type)) {
    return transaction;
  }

  return {
    ...transaction,
    status: normalizeStatus(transaction.type, transaction.status),
  };
}

function updateStatusOptions(preferredStatus = null) {
  const type = DOM.type.value;
  const allowedStatuses = getAllowedStatusesForType(type);
  const currentStatus = preferredStatus || DOM.status.value || allowedStatuses[0];

  DOM.status.innerHTML = "";

  allowedStatuses.forEach((status) => {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = getStatusLabel(status);
    DOM.status.appendChild(option);
  });

  if (allowedStatuses.includes(currentStatus)) {
    DOM.status.value = currentStatus;
  } else {
    DOM.status.value = allowedStatuses[0];
  }
}

function getCategoryListFromState() {
  return [...new Set(state.categories.map((category) => category.trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function switchView(viewName) {
  const targetView = VALID_VIEW_NAMES.includes(viewName) ? viewName : "dashboard";

  VALID_VIEW_NAMES.forEach((name) => {
    const viewElement = document.getElementById(APP_VIEWS[name]);

    if (!viewElement) {
      return;
    }

    viewElement.hidden = name !== targetView;
  });

  DOM.appNavButtons.forEach((button) => {
    const isActive = button.dataset.view === targetView;
    button.classList.toggle("is-active", isActive);

    if (isActive) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  try {
    sessionStorage.setItem(STORAGE_KEYS.activeView, targetView);
  } catch (error) {
    console.warn("Não foi possível salvar a view ativa.", error);
  }
}

function getSavedViewName() {
  try {
    const savedView = sessionStorage.getItem(STORAGE_KEYS.activeView);

    if (savedView && VALID_VIEW_NAMES.includes(savedView)) {
      return savedView;
    }
  } catch (error) {
    console.warn("Não foi possível ler a view ativa.", error);
  }

  return "dashboard";
}

function safeReadJson(key) {
  const value = localStorage.getItem(key);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    console.error(`Não foi possível ler o JSON da chave ${key}.`, error);
    return null;
  }
}

function saveCurrentState() {
  try {
    localStorage.setItem(STORAGE_KEYS.stateV2, JSON.stringify(state));
  } catch (error) {
    if (error && error.name === "QuotaExceededError") {
      alert(
        "O armazenamento local atingiu o limite do navegador. " +
        "Exporte um backup e remova lançamentos antigos."
      );
      return;
    }

    throw error;
  }
}

function backupBeforeDestructiveChange(reason) {
  const backup = {
    reason,
    createdAtISO: new Date().toISOString(),
    state,
  };

  try {
    localStorage.setItem(STORAGE_KEYS.destructiveBackup, JSON.stringify(backup));
  } catch (error) {
    console.warn("Não foi possível salvar backup de segurança antes da alteração.", error);
  }
}

function generateTransactionId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `tx-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function normalizeDescription(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeCategoryName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeTransactionFromAnySchema(rawTransaction) {
  if (!rawTransaction || typeof rawTransaction !== "object") {
    return null;
  }

  const type = rawTransaction.type === "entrada" ? "entrada" : rawTransaction.type === "saida" ? "saida" : null;
  const description = normalizeDescription(rawTransaction.description);
  const category = normalizeCategoryName(rawTransaction.category);

  if (!type || !description || !category) {
    return null;
  }

  let amountCents = null;

  if (Number.isInteger(rawTransaction.amountCents)) {
    amountCents = rawTransaction.amountCents;
  } else if (typeof rawTransaction.amount === "number" && Number.isFinite(rawTransaction.amount)) {
    amountCents = Math.round(rawTransaction.amount * 100);
  } else if (typeof rawTransaction.amount === "string") {
    try {
      amountCents = parseMoneyToCents(rawTransaction.amount);
    } catch (error) {
      amountCents = null;
    }
  }

  const date = normalizeISODateString(rawTransaction.date || rawTransaction.dateISO);
  const dueDate = normalizeISODateString(rawTransaction.dueDate || rawTransaction.dueDateISO);

  if (!Number.isInteger(amountCents) || amountCents <= 0 || !date || !dueDate) {
    return null;
  }

  return normalizeTransactionStatus({
    id:
      typeof rawTransaction.id === "string" && rawTransaction.id.trim()
        ? rawTransaction.id.trim()
        : generateTransactionId(),
    type,
    description,
    category,
    amountCents,
    date,
    dueDate,
    status: rawTransaction.status,
  });
}

function migrateLegacyStateIfNeeded() {
  const currentV2State = safeReadJson(STORAGE_KEYS.stateV2);

  if (currentV2State && currentV2State.schemaVersion === APP_INFO.schemaVersion) {
    const normalizedTransactions = (currentV2State.transactions || [])
      .map(normalizeTransactionFromAnySchema)
      .filter(Boolean);

    const normalizedCategories = [
      ...new Set([
        ...DEFAULT_CATEGORIES,
        ...(currentV2State.categories || []).map(normalizeCategoryName).filter(Boolean),
        ...normalizedTransactions.map((transaction) => transaction.category),
      ]),
    ].sort((a, b) => a.localeCompare(b, "pt-BR"));

    return {
      schemaVersion: APP_INFO.schemaVersion,
      categories: normalizedCategories,
      transactions: normalizedTransactions,
    };
  }

  const legacyTransactionsRaw = localStorage.getItem(STORAGE_KEYS.legacyTransactions);
  const legacyCategoriesRaw = localStorage.getItem(STORAGE_KEYS.legacyCategories);

  if (!legacyTransactionsRaw && !legacyCategoriesRaw) {
    return createEmptyState();
  }

  const legacyBackupPayload = {
    createdAtISO: new Date().toISOString(),
    legacyTransactionsRaw,
    legacyCategoriesRaw,
  };

  try {
    localStorage.setItem(
      STORAGE_KEYS.migrationBackupV1,
      JSON.stringify(legacyBackupPayload)
    );
  } catch (error) {
    console.warn("Não foi possível salvar o backup da migração.", error);
  }

  const legacyTransactions = safeReadJson(STORAGE_KEYS.legacyTransactions) || [];
  const legacyCategories = safeReadJson(STORAGE_KEYS.legacyCategories) || [];

  const normalizedTransactions = legacyTransactions
    .map(normalizeTransactionFromAnySchema)
    .filter(Boolean);

  const normalizedCategories = [
    ...new Set([
      ...DEFAULT_CATEGORIES,
      ...legacyCategories.map(normalizeCategoryName).filter(Boolean),
      ...normalizedTransactions.map((transaction) => transaction.category),
    ]),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));

  const migratedState = {
    schemaVersion: APP_INFO.schemaVersion,
    categories: normalizedCategories,
    transactions: normalizedTransactions,
  };

  state = migratedState;
  saveCurrentState();

  return migratedState;
}

function loadState() {
  state = migrateLegacyStateIfNeeded();
}

function buildTransactionFromForm() {
  const description = normalizeDescription(DOM.description.value);
  const category = normalizeCategoryName(DOM.category.value);
  const date = normalizeISODateString(DOM.date.value);
  const dueDate = normalizeISODateString(DOM.dueDate.value);
  const type = DOM.type.value;
  const status = normalizeStatus(type, DOM.status.value);

  if (!description) {
    throw new Error("Informe a descrição.");
  }

  if (!category) {
    throw new Error("Selecione uma categoria.");
  }

  if (!date) {
    throw new Error("Informe a data do lançamento.");
  }

  if (!dueDate) {
    throw new Error("Informe a data de vencimento.");
  }

  const amountCents = parseMoneyToCents(DOM.amount.value);

  if (amountCents <= 0) {
    throw new Error("O valor deve ser maior que zero.");
  }

  return normalizeTransactionStatus({
    id: editingTransactionId || generateTransactionId(),
    type,
    description,
    category,
    amountCents,
    date,
    dueDate,
    status,
  });
}

function isValidTransactionV2(transaction) {
  if (!transaction || typeof transaction !== "object") {
    return false;
  }

  const allowedStatuses = getAllowedStatusesForType(transaction.type);

  return (
    typeof transaction.id === "string" &&
    ["entrada", "saida"].includes(transaction.type) &&
    typeof transaction.description === "string" &&
    transaction.description.trim().length > 0 &&
    typeof transaction.category === "string" &&
    transaction.category.trim().length > 0 &&
    Number.isInteger(transaction.amountCents) &&
    transaction.amountCents > 0 &&
    isValidISODate(transaction.date) &&
    isValidISODate(transaction.dueDate) &&
    allowedStatuses.includes(transaction.status)
  );
}

function normalizeBackupPayload(rawBackup) {
  if (!rawBackup || typeof rawBackup !== "object") {
    throw new Error("Arquivo de backup inválido.");
  }

  // Backup novo.
  if (
    rawBackup.schemaVersion === APP_INFO.schemaVersion &&
    Array.isArray(rawBackup.transactions) &&
    Array.isArray(rawBackup.categories)
  ) {
    const normalizedTransactions = rawBackup.transactions
      .map(normalizeTransactionFromAnySchema)
      .filter(Boolean);

    const normalizedCategories = [
      ...new Set([
        ...DEFAULT_CATEGORIES,
        ...rawBackup.categories.map(normalizeCategoryName).filter(Boolean),
        ...normalizedTransactions.map((transaction) => transaction.category),
      ]),
    ].sort((a, b) => a.localeCompare(b, "pt-BR"));

    const normalizedState = {
      schemaVersion: APP_INFO.schemaVersion,
      categories: normalizedCategories,
      transactions: normalizedTransactions,
    };

    if (!normalizedState.transactions.every(isValidTransactionV2)) {
      throw new Error("Backup contém lançamentos inválidos.");
    }

    return normalizedState;
  }

  // Backup legado.
  if (Array.isArray(rawBackup.transactions) && Array.isArray(rawBackup.categories)) {
    const normalizedTransactions = rawBackup.transactions
      .map(normalizeTransactionFromAnySchema)
      .filter(Boolean);

    const normalizedCategories = [
      ...new Set([
        ...DEFAULT_CATEGORIES,
        ...rawBackup.categories.map(normalizeCategoryName).filter(Boolean),
        ...normalizedTransactions.map((transaction) => transaction.category),
      ]),
    ].sort((a, b) => a.localeCompare(b, "pt-BR"));

    return {
      schemaVersion: APP_INFO.schemaVersion,
      categories: normalizedCategories,
      transactions: normalizedTransactions,
    };
  }

  throw new Error("Estrutura de backup não reconhecida.");
}

function getTransactionsForAnalysisMonth() {
  const monthValue = DOM.analysisMonth.value || getCurrentMonthValue();
  const { startISO, endISO } = getMonthBounds(monthValue);

  return state.transactions.filter(
    (transaction) =>
      transaction.dueDate >= startISO && transaction.dueDate <= endISO
  );
}

function calculateSummaryForMonth() {
  const monthTransactions = getTransactionsForAnalysisMonth();
  const todayISO = getTodayISO();

  const realizedIncomeCents = sumAmountCents(
    monthTransactions.filter(isRealizedIncome)
  );
  const realizedExpenseCents = sumAmountCents(
    monthTransactions.filter(isRealizedExpense)
  );
  const expectedIncomeCents = sumAmountCents(
    monthTransactions.filter(isExpectedIncome)
  );
  const expectedExpenseCents = sumAmountCents(
    monthTransactions.filter(isExpectedExpense)
  );

  const realizedBalanceCents = realizedIncomeCents - realizedExpenseCents;
  const expectedBalanceCents =
    realizedIncomeCents +
    expectedIncomeCents -
    (realizedExpenseCents + expectedExpenseCents);

  const overdueExpenses = state.transactions.filter((transaction) =>
    isOverdueExpense(transaction, todayISO)
  );

  const upcomingExpensesInMonth = monthTransactions.filter(
    (transaction) =>
      isExpectedExpense(transaction) &&
      compareISODate(transaction.dueDate, todayISO) >= 0
  );

  const overdueIncome = state.transactions.filter((transaction) =>
    isOverdueIncome(transaction, todayISO)
  );

  return {
    realizedIncomeCents,
    realizedExpenseCents,
    realizedBalanceCents,
    expectedIncomeCents,
    expectedExpenseCents,
    expectedBalanceCents,
    overdueExpensesCount: overdueExpenses.length,
    overdueExpensesValueCents: sumAmountCents(overdueExpenses),
    upcomingExpensesInMonthCount: upcomingExpensesInMonth.length,
    upcomingExpensesInMonthValueCents: sumAmountCents(upcomingExpensesInMonth),
    overdueIncomeCount: overdueIncome.length,
    overdueIncomeValueCents: sumAmountCents(overdueIncome),
  };
}

function calculateProjectedBalance(daysAhead) {
  const targetISO = addDaysToISO(getTodayISO(), daysAhead);

  return state.transactions.reduce((balanceCents, transaction) => {
    if (compareISODate(transaction.dueDate, targetISO) > 0) {
      return balanceCents;
    }

    if (transaction.type === "entrada") {
      return balanceCents + transaction.amountCents;
    }

    return balanceCents - transaction.amountCents;
  }, 0);
}

function getTransactionsByDueDate(targetISO) {
  return state.transactions.filter((transaction) => transaction.dueDate === targetISO);
}

function calculateDailySummary(targetISO) {
  const transactionsOfDay = getTransactionsByDueDate(targetISO);

  const realizedIncomeCents = sumAmountCents(
    transactionsOfDay.filter(isRealizedIncome)
  );
  const expectedIncomeCents = sumAmountCents(
    transactionsOfDay.filter(isExpectedIncome)
  );
  const realizedExpenseCents = sumAmountCents(
    transactionsOfDay.filter(isRealizedExpense)
  );
  const expectedExpenseCents = sumAmountCents(
    transactionsOfDay.filter(isExpectedExpense)
  );

  const realizedBalanceCents = realizedIncomeCents - realizedExpenseCents;
  const expectedBalanceCents =
    realizedIncomeCents +
    expectedIncomeCents -
    (realizedExpenseCents + expectedExpenseCents);

  return {
    realizedIncomeCents,
    expectedIncomeCents,
    realizedExpenseCents,
    expectedExpenseCents,
    realizedBalanceCents,
    expectedBalanceCents,
    pendingExpenseCents: expectedExpenseCents,
    pendingIncomeCents: expectedIncomeCents,
  };
}

function getFilteredTransactions() {
  let filtered = [...state.transactions];

  if (DOM.filterType.value !== "all") {
    filtered = filtered.filter((transaction) => transaction.type === DOM.filterType.value);
  }

  if (DOM.filterCategory.value !== "todos") {
    filtered = filtered.filter(
      (transaction) => transaction.category === DOM.filterCategory.value
    );
  }

  if (DOM.filterStatus.value !== "todos") {
    filtered = filtered.filter(
      (transaction) => getDisplayStatus(transaction) === DOM.filterStatus.value
    );
  }

  return filtered.sort((a, b) => {
    const byDueDate = compareISODate(a.dueDate, b.dueDate);

    if (byDueDate !== 0) {
      return byDueDate;
    }

    const byDate = compareISODate(a.date, b.date);

    if (byDate !== 0) {
      return byDate;
    }

    return a.description.localeCompare(b.description, "pt-BR");
  });
}

function clearElementChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function appendTextCell(row, text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  row.appendChild(cell);
  return cell;
}

function renderCategories() {
  const selectedCategory = DOM.category.value;
  const selectedFilterCategory = DOM.filterCategory.value;
  const categories = getCategoryListFromState();

  DOM.category.innerHTML = "";
  DOM.filterCategory.innerHTML = "";

  const formPlaceholder = document.createElement("option");
  formPlaceholder.value = "";
  formPlaceholder.textContent = "Selecione uma categoria";
  DOM.category.appendChild(formPlaceholder);

  const filterPlaceholder = document.createElement("option");
  filterPlaceholder.value = "todos";
  filterPlaceholder.textContent = "Todas as categorias";
  DOM.filterCategory.appendChild(filterPlaceholder);

  categories.forEach((category) => {
    const categoryOption = document.createElement("option");
    categoryOption.value = category;
    categoryOption.textContent = category;
    DOM.category.appendChild(categoryOption);

    const filterOption = document.createElement("option");
    filterOption.value = category;
    filterOption.textContent = category;
    DOM.filterCategory.appendChild(filterOption);
  });

  if (categories.includes(selectedCategory)) {
    DOM.category.value = selectedCategory;
  }

  if (selectedFilterCategory === "todos" || categories.includes(selectedFilterCategory)) {
    DOM.filterCategory.value = selectedFilterCategory;
  } else {
    DOM.filterCategory.value = "todos";
  }
}

function renderDashboard() {
  const summary = calculateSummaryForMonth();
  const monthValue = DOM.analysisMonth.value || getCurrentMonthValue();
  const [year, month] = monthValue.split("-");
  DOM.summaryPeriodLabel.textContent = `${month}/${year}`;

  DOM.realizedIncome.textContent = formatCents(summary.realizedIncomeCents);
  DOM.realizedExpense.textContent = formatCents(summary.realizedExpenseCents);
  DOM.realizedBalance.textContent = formatCents(summary.realizedBalanceCents);

  DOM.expectedIncome.textContent = formatCents(summary.expectedIncomeCents);
  DOM.expectedExpense.textContent = formatCents(summary.expectedExpenseCents);
  DOM.expectedBalance.textContent = formatCents(summary.expectedBalanceCents);

  DOM.alertOverdueExpensesCount.textContent = String(summary.overdueExpensesCount);
  DOM.alertOverdueExpensesValue.textContent = formatCents(summary.overdueExpensesValueCents);

  DOM.alertUpcomingExpensesCount.textContent = String(summary.upcomingExpensesInMonthCount);
  DOM.alertUpcomingExpensesValue.textContent = formatCents(
    summary.upcomingExpensesInMonthValueCents
  );

  DOM.alertOverdueIncomeCount.textContent = String(summary.overdueIncomeCount);
  DOM.alertOverdueIncomeValue.textContent = formatCents(summary.overdueIncomeValueCents);

  DOM.projectionToday.textContent = formatCents(calculateProjectedBalance(0));
  DOM.projection7Days.textContent = formatCents(calculateProjectedBalance(7));
  DOM.projection15Days.textContent = formatCents(calculateProjectedBalance(15));
  DOM.projection30Days.textContent = formatCents(calculateProjectedBalance(30));
}

function renderSelectedDateCashflow() {
  const selectedISO = normalizeISODateString(DOM.cashflowDate.value) || getTodayISO();
  const summary = calculateDailySummary(selectedISO);

  DOM.dailyRealizedIncome.textContent = formatCents(summary.realizedIncomeCents);
  DOM.dailyRealizedExpense.textContent = formatCents(summary.realizedExpenseCents);
  DOM.dailyRealizedBalance.textContent = formatCents(summary.realizedBalanceCents);

  DOM.dailyExpectedIncome.textContent = formatCents(summary.expectedIncomeCents);
  DOM.dailyExpectedExpense.textContent = formatCents(summary.expectedExpenseCents);
  DOM.dailyExpectedBalance.textContent = formatCents(summary.expectedBalanceCents);

  DOM.dailyPendingExpense.textContent = formatCents(summary.pendingExpenseCents);
  DOM.dailyPendingIncome.textContent = formatCents(summary.pendingIncomeCents);
}

function renderWeeklyCashflow() {
  clearElementChildren(DOM.weeklyCashflowBody);

  const startISO = getTodayISO();

  for (let index = 0; index < 7; index += 1) {
    const currentISO = addDaysToISO(startISO, index);
    const summary = calculateDailySummary(currentISO);
    const row = document.createElement("tr");

    appendTextCell(row, formatISODateForDisplay(currentISO));
    appendTextCell(row, formatCents(summary.realizedIncomeCents));
    appendTextCell(row, formatCents(summary.expectedIncomeCents));
    appendTextCell(row, formatCents(summary.realizedExpenseCents));
    appendTextCell(row, formatCents(summary.expectedExpenseCents));
    appendTextCell(row, formatCents(summary.pendingExpenseCents));
    appendTextCell(row, formatCents(summary.pendingIncomeCents));
    appendTextCell(row, formatCents(summary.realizedBalanceCents));
    appendTextCell(row, formatCents(summary.expectedBalanceCents));

    DOM.weeklyCashflowBody.appendChild(row);
  }
}

function renderCategoryReport() {
  clearElementChildren(DOM.categoryReportBody);

  const reportTransactions = getTransactionsForAnalysisMonth();
  const reportByCategory = {};

  reportTransactions.forEach((transaction) => {
    if (!reportByCategory[transaction.category]) {
      reportByCategory[transaction.category] = {
        incomeCents: 0,
        expenseCents: 0,
      };
    }

    if (transaction.type === "entrada") {
      reportByCategory[transaction.category].incomeCents += transaction.amountCents;
    } else {
      reportByCategory[transaction.category].expenseCents += transaction.amountCents;
    }
  });

  const categoryNames = Object.keys(reportByCategory).sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );

  if (categoryNames.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.className = "empty-state";
    cell.textContent = "Nenhum lançamento no mês selecionado.";
    row.appendChild(cell);
    DOM.categoryReportBody.appendChild(row);
    return;
  }

  categoryNames.forEach((category) => {
    const row = document.createElement("tr");
    const incomeCents = reportByCategory[category].incomeCents;
    const expenseCents = reportByCategory[category].expenseCents;
    const balanceCents = incomeCents - expenseCents;

    appendTextCell(row, category);
    appendTextCell(row, formatCents(incomeCents));
    appendTextCell(row, formatCents(expenseCents));
    appendTextCell(row, formatCents(balanceCents));

    DOM.categoryReportBody.appendChild(row);
  });
}

function renderBarChart(container, items) {
  clearElementChildren(container);

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Nenhum dado disponível para o mês selecionado.";
    container.appendChild(empty);
    return;
  }

  const maxValue = Math.max(...items.map((item) => item.value));

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "chart-row";

    const label = document.createElement("div");
    label.className = "chart-label";

    const labelText = document.createElement("span");
    labelText.textContent = item.label;

    const labelValue = document.createElement("strong");
    labelValue.textContent = formatCents(item.value);

    label.appendChild(labelText);
    label.appendChild(labelValue);

    const track = document.createElement("div");
    track.className = "chart-track";

    const bar = document.createElement("div");
    bar.className = `chart-bar ${item.type === "expense" ? "expense" : ""}`.trim();
    bar.style.width = `${maxValue === 0 ? 0 : (item.value / maxValue) * 100}%`;

    track.appendChild(bar);
    row.appendChild(label);
    row.appendChild(track);
    container.appendChild(row);
  });
}

function renderCharts() {
  const reportTransactions = getTransactionsForAnalysisMonth();

  const totalIncomeCents = sumAmountCents(
    reportTransactions.filter((transaction) => transaction.type === "entrada")
  );

  const totalExpenseCents = sumAmountCents(
    reportTransactions.filter((transaction) => transaction.type === "saida")
  );

  renderBarChart(
    DOM.incomeExpenseChart,
    [
      { label: "Entradas", value: totalIncomeCents, type: "income" },
      { label: "Saídas", value: totalExpenseCents, type: "expense" },
    ].filter((item) => item.value > 0)
  );

  const expenseByCategory = {};

  reportTransactions
    .filter((transaction) => transaction.type === "saida")
    .forEach((transaction) => {
      expenseByCategory[transaction.category] =
        (expenseByCategory[transaction.category] || 0) + transaction.amountCents;
    });

  const categoryItems = Object.entries(expenseByCategory)
    .map(([category, value]) => ({
      label: category,
      value,
      type: "expense",
    }))
    .sort((a, b) => b.value - a.value);

  renderBarChart(DOM.expenseCategoryChart, categoryItems);
}

function renderTransactionsTable() {
  clearElementChildren(DOM.transactionsTableBody);

  const filteredTransactions = getFilteredTransactions();

  if (filteredTransactions.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 8;
    cell.className = "empty-state";
    cell.textContent = "Nenhum lançamento encontrado para os filtros atuais.";
    row.appendChild(cell);
    DOM.transactionsTableBody.appendChild(row);
    return;
  }

  filteredTransactions.forEach((transaction) => {
    const row = document.createElement("tr");
    const displayStatus = getDisplayStatus(transaction);

    if (displayStatus === "vencido" || displayStatus === "a_receber_atrasado") {
      row.classList.add("row-overdue");
    }

    appendTextCell(row, transaction.type === "entrada" ? "Entrada" : "Saída");
    appendTextCell(row, transaction.description);
    appendTextCell(row, transaction.category);
    appendTextCell(row, formatCents(transaction.amountCents));
    appendTextCell(row, formatISODateForDisplay(transaction.date));
    appendTextCell(row, formatISODateForDisplay(transaction.dueDate));
    appendTextCell(row, getStatusLabel(displayStatus));

    const actionCell = document.createElement("td");
    actionCell.className = "actions-cell";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "secondary-button edit-button";
    editButton.dataset.id = transaction.id;
    editButton.textContent = "Editar";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "danger-button delete-button";
    deleteButton.dataset.id = transaction.id;
    deleteButton.textContent = "Excluir";

    actionCell.appendChild(editButton);
    actionCell.appendChild(deleteButton);
    row.appendChild(actionCell);

    DOM.transactionsTableBody.appendChild(row);
  });
}

function renderAll() {
  renderCategories();
  renderDashboard();
  renderSelectedDateCashflow();
  renderWeeklyCashflow();
  renderCategoryReport();
  renderCharts();
  renderTransactionsTable();
}

function setDefaults() {
  if (!DOM.analysisMonth.value) {
    DOM.analysisMonth.value = getCurrentMonthValue();
  }

  const todayISO = getTodayISO();

  if (!DOM.date.value) {
    DOM.date.value = todayISO;
  }

  if (!DOM.dueDate.value) {
    DOM.dueDate.value = todayISO;
  }

  if (!DOM.cashflowDate.value) {
    DOM.cashflowDate.value = todayISO;
  }
}

function showFormFeedback(message, type = "error") {
  DOM.formFeedback.textContent = message;
  DOM.formFeedback.className = `form-feedback ${type}`;
}

function clearFormFeedback() {
  DOM.formFeedback.textContent = "";
  DOM.formFeedback.className = "form-feedback";
}

function resetFormState() {
  editingTransactionId = null;
  DOM.form.reset();
  setDefaults();
  DOM.type.value = "entrada";
  updateStatusOptions("pendente");
  DOM.submitButton.textContent = "Salvar movimento";
  DOM.cancelEditButton.classList.add("hidden");
  clearFormFeedback();
}

function editTransaction(id) {
  const transaction = state.transactions.find((item) => item.id === id);

  if (!transaction) {
    return;
  }

  switchView("transactions");

  editingTransactionId = id;
  DOM.type.value = transaction.type;
  updateStatusOptions(transaction.status);

  DOM.description.value = transaction.description;
  DOM.category.value = transaction.category;
  DOM.amount.value = formatCentsForInput(transaction.amountCents);
  DOM.date.value = transaction.date;
  DOM.dueDate.value = transaction.dueDate;

  DOM.submitButton.textContent = "Salvar alterações";
  DOM.cancelEditButton.classList.remove("hidden");
  showFormFeedback("Modo edição ativo.", "success");
  DOM.description.focus();
}

function deleteTransaction(id) {
  const transaction = state.transactions.find((item) => item.id === id);

  if (!transaction) {
    return;
  }

  const confirmed = confirm(
    `Deseja excluir o lançamento "${transaction.description}"?`
  );

  if (!confirmed) {
    return;
  }

  backupBeforeDestructiveChange("delete-transaction");
  state.transactions = state.transactions.filter((item) => item.id !== id);
  saveCurrentState();
  renderAll();

  if (editingTransactionId === id) {
    resetFormState();
  }
}

function addCategory() {
  const newCategory = normalizeCategoryName(DOM.newCategory.value);

  if (!newCategory) {
    alert("Informe o nome da categoria.");
    return;
  }

  const alreadyExists = state.categories.some(
    (category) =>
      category.toLocaleLowerCase("pt-BR") === newCategory.toLocaleLowerCase("pt-BR")
  );

  if (alreadyExists) {
    alert("Essa categoria já existe.");
    return;
  }

  state.categories.push(newCategory);
  state.categories = getCategoryListFromState();
  saveCurrentState();
  renderCategories();

  DOM.category.value = newCategory;
  DOM.newCategory.value = "";
  showFormFeedback("Categoria adicionada com sucesso.", "success");
}

function exportBackup() {
  const backupData = {
    appName: APP_INFO.appName,
    schemaVersion: APP_INFO.schemaVersion,
    backupVersion: APP_INFO.backupVersion,
    exportedAtISO: new Date().toISOString(),
    categories: getCategoryListFromState(),
    transactions: state.transactions,
  };

  const jsonContent = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = `loja-vida-e-saude-backup-${getTodayISO()}.json`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}

function importBackup(file) {
  const reader = new FileReader();

  reader.onload = (event) => {
    try {
      const rawBackup = JSON.parse(event.target.result);
      const normalizedState = normalizeBackupPayload(rawBackup);

      const confirmed = confirm(
        "Importar este backup irá substituir os dados atuais. Deseja continuar?"
      );

      if (!confirmed) {
        return;
      }

      backupBeforeDestructiveChange("import-backup");
      state = normalizedState;
      saveCurrentState();

      DOM.filterType.value = "all";
      DOM.filterCategory.value = "todos";
      DOM.filterStatus.value = "todos";

      resetFormState();
      renderAll();

      alert("Backup importado com sucesso.");
    } catch (error) {
      alert(error.message || "Não foi possível importar o backup.");
    } finally {
      DOM.importBackupInput.value = "";
    }
  };

  reader.readAsText(file);
}

function handleFormSubmit(event) {
  event.preventDefault();

  try {
    const transaction = buildTransactionFromForm();
    const successMessage = editingTransactionId
      ? "Lançamento atualizado com sucesso."
      : "Lançamento cadastrado com sucesso.";

    if (editingTransactionId) {
      state.transactions = state.transactions.map((item) =>
        item.id === editingTransactionId ? transaction : item
      );
    } else {
      state.transactions.push(transaction);
    }

    saveCurrentState();
    renderAll();
    resetFormState();
    showFormFeedback(successMessage, "success");
  } catch (error) {
    showFormFeedback(error.message || "Não foi possível salvar o lançamento.");
  }
}

function handleAmountBlur() {
  const rawValue = DOM.amount.value.trim();

  if (!rawValue) {
    return;
  }

  try {
    const amountCents = parseMoneyToCents(rawValue);
    DOM.amount.value = formatCentsForInput(amountCents);
    clearFormFeedback();
  } catch (error) {
    showFormFeedback(error.message || "Valor inválido.");
  }
}

function handleStorageSync(event) {
  if (
    ![
      STORAGE_KEYS.stateV2,
      STORAGE_KEYS.legacyTransactions,
      STORAGE_KEYS.legacyCategories,
    ].includes(event.key)
  ) {
    return;
  }

  loadState();
  renderAll();
}

function bindEvents() {
  DOM.appNav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-view]");

    if (!button) {
      return;
    }

    switchView(button.dataset.view);
  });

  DOM.form.addEventListener("submit", handleFormSubmit);

  DOM.transactionsTableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button");

    if (!button) {
      return;
    }

    const { id } = button.dataset;

    if (!id) {
      return;
    }

    if (button.classList.contains("edit-button")) {
      editTransaction(id);
      return;
    }

    if (button.classList.contains("delete-button")) {
      deleteTransaction(id);
    }
  });

  DOM.cancelEditButton.addEventListener("click", resetFormState);
  DOM.addCategoryButton.addEventListener("click", addCategory);
  DOM.exportBackupButton.addEventListener("click", exportBackup);

  DOM.importBackupInput.addEventListener("change", (event) => {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    importBackup(file);
  });

  DOM.filterType.addEventListener("change", renderTransactionsTable);
  DOM.filterCategory.addEventListener("change", renderTransactionsTable);
  DOM.filterStatus.addEventListener("change", renderTransactionsTable);

  DOM.analysisMonth.addEventListener("change", () => {
    renderDashboard();
    renderCategoryReport();
    renderCharts();
  });

  DOM.cashflowDate.addEventListener("change", renderSelectedDateCashflow);

  DOM.type.addEventListener("change", () => {
    updateStatusOptions();
  });

  DOM.amount.addEventListener("blur", handleAmountBlur);

  window.addEventListener("storage", handleStorageSync);
}

function init() {
  loadState();
  setDefaults();
  updateStatusOptions("pendente");
  bindEvents();
  renderAll();
  switchView(getSavedViewName());
}

init();
