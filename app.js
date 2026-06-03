const form = document.getElementById("transaction-form");
const tableBody = document.getElementById("transactions-table-body");

const currentBalanceElement = document.getElementById("current-balance");
const totalIncomeElement = document.getElementById("total-income");
const totalExpenseElement = document.getElementById("total-expense");
const upcomingBillsElement = document.getElementById("upcoming-bills");
const overdueBillsElement = document.getElementById("overdue-bills");

const projectionTodayElement = document.getElementById("projection-today");
const projection7DaysElement = document.getElementById("projection-7-days");
const projection15DaysElement = document.getElementById("projection-15-days");
const projection30DaysElement = document.getElementById("projection-30-days");

const cashflowDateInput = document.getElementById("cashflow-date");
const selectedDateIncomeElement = document.getElementById("selected-date-income");
const selectedDateExpenseElement = document.getElementById("selected-date-expense");
const selectedDateBalanceElement = document.getElementById("selected-date-balance");
const selectedDatePendingExpenseElement = document.getElementById("selected-date-pending-expense");
const weeklyCashflowBody = document.getElementById("weekly-cashflow-body");

const categoryReportBody = document.getElementById("category-report-body");
const incomeExpenseChart = document.getElementById("income-expense-chart");
const expenseCategoryChart = document.getElementById("expense-category-chart");

const submitButton = document.getElementById("submit-button");
const cancelEditButton = document.getElementById("cancel-edit-button");

const filterType = document.getElementById("filter-type");
const filterCategory = document.getElementById("filter-category");
const filterStatus = document.getElementById("filter-status");

const categorySelect = document.getElementById("category");
const newCategoryInput = document.getElementById("new-category");
const addCategoryButton = document.getElementById("add-category-button");

const exportBackupButton = document.getElementById("export-backup-button");
const importBackupInput = document.getElementById("import-backup-input");

let editingTransactionId = null;

let categories = JSON.parse(localStorage.getItem("categories")) || [
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

let transactions = JSON.parse(localStorage.getItem("transactions")) || [];

function saveTransactions() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

function saveCategories() {
  localStorage.setItem("categories", JSON.stringify(categories));
}

function formatCurrency(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateForInput(date) {
  return date.toISOString().slice(0, 10);
}

function formatDateForDisplay(dateString) {
  const date = parseDate(dateString);

  return date.toLocaleDateString("pt-BR");
}

function getSortedCategories() {
  return [...categories].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function getToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function addDays(baseDate, days) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return date;
}

function parseDate(dateString) {
  return new Date(dateString + "T00:00:00");
}

function isSameDate(dateString, targetDate) {
  return formatDateForInput(parseDate(dateString)) === formatDateForInput(targetDate);
}

function setDefaultDates() {
  const todayAsText = formatDateForInput(getToday());

  document.getElementById("date").value = todayAsText;
  document.getElementById("due-date").value = todayAsText;

  if (!cashflowDateInput.value) {
    cashflowDateInput.value = todayAsText;
  }
}

function renderCategories() {
  categorySelect.innerHTML = `
    <option value="">
      Selecione uma categoria
    </option>
  `;

  filterCategory.innerHTML = `
    <option value="todos">
      Todas as categorias
    </option>
  `;

  getSortedCategories().forEach((category) => {
    const categoryOption = document.createElement("option");
    categoryOption.value = category;
    categoryOption.textContent = category;
    categorySelect.appendChild(categoryOption);

    const filterOption = document.createElement("option");
    filterOption.value = category;
    filterOption.textContent = category;
    filterCategory.appendChild(filterOption);
  });
}

function getDisplayStatus(transaction) {
  const today = getToday();
  const dueDate = parseDate(transaction.dueDate);

  if (
    transaction.type === "saida" &&
    transaction.status === "pendente" &&
    dueDate < today
  ) {
    return "vencido";
  }

  return transaction.status;
}

function calculateTotalByType(type) {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
}

function calculateProjectedBalance(daysAhead) {
  const targetDate = addDays(getToday(), daysAhead);

  return transactions.reduce((balance, transaction) => {
    const dueDate = parseDate(transaction.dueDate);

    if (dueDate > targetDate) {
      return balance;
    }

    if (transaction.type === "entrada") {
      return balance + Number(transaction.amount);
    }

    return balance - Number(transaction.amount);
  }, 0);
}

function getTransactionsByDueDate(targetDate) {
  return transactions.filter((transaction) =>
    isSameDate(transaction.dueDate, targetDate)
  );
}

function calculateDailySummary(targetDate) {
  const transactionsOfDay = getTransactionsByDueDate(targetDate);

  const income = transactionsOfDay
    .filter((transaction) => transaction.type === "entrada")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  const expense = transactionsOfDay
    .filter((transaction) => transaction.type === "saida")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  const pendingExpense = transactionsOfDay
    .filter(
      (transaction) =>
        transaction.type === "saida" && transaction.status === "pendente"
    )
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  return {
    income,
    expense,
    pendingExpense,
    balance: income - expense,
  };
}

function renderSelectedDateCashflow() {
  const selectedDate = cashflowDateInput.value
    ? parseDate(cashflowDateInput.value)
    : getToday();

  const summary = calculateDailySummary(selectedDate);

  selectedDateIncomeElement.textContent = formatCurrency(summary.income);
  selectedDateExpenseElement.textContent = formatCurrency(summary.expense);
  selectedDateBalanceElement.textContent = formatCurrency(summary.balance);
  selectedDatePendingExpenseElement.textContent = formatCurrency(summary.pendingExpense);
}

function renderWeeklyCashflow() {
  weeklyCashflowBody.innerHTML = "";

  const today = getToday();

  for (let index = 0; index < 7; index++) {
    const currentDate = addDays(today, index);
    const summary = calculateDailySummary(currentDate);

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${formatDateForDisplay(formatDateForInput(currentDate))}</td>
      <td>${formatCurrency(summary.income)}</td>
      <td>${formatCurrency(summary.expense)}</td>
      <td>${formatCurrency(summary.pendingExpense)}</td>
      <td>${formatCurrency(summary.balance)}</td>
    `;

    weeklyCashflowBody.appendChild(row);
  }
}

function updateDashboard() {
  const totalIncome = calculateTotalByType("entrada");
  const totalExpense = calculateTotalByType("saida");
  const currentBalance = totalIncome - totalExpense;

  const today = getToday();
  const sevenDaysFromNow = addDays(today, 7);

  const upcomingBills = transactions.filter((transaction) => {
    if (transaction.type !== "saida") return false;
    if (transaction.status !== "pendente") return false;

    const dueDate = parseDate(transaction.dueDate);

    return dueDate >= today && dueDate <= sevenDaysFromNow;
  }).length;

  const overdueBills = transactions.filter((transaction) => {
    if (transaction.type !== "saida") return false;
    if (transaction.status !== "pendente") return false;

    const dueDate = parseDate(transaction.dueDate);

    return dueDate < today;
  }).length;

  currentBalanceElement.textContent = formatCurrency(currentBalance);
  totalIncomeElement.textContent = formatCurrency(totalIncome);
  totalExpenseElement.textContent = formatCurrency(totalExpense);
  upcomingBillsElement.textContent = upcomingBills;
  overdueBillsElement.textContent = overdueBills;

  projectionTodayElement.textContent = formatCurrency(calculateProjectedBalance(0));
  projection7DaysElement.textContent = formatCurrency(calculateProjectedBalance(7));
  projection15DaysElement.textContent = formatCurrency(calculateProjectedBalance(15));
  projection30DaysElement.textContent = formatCurrency(calculateProjectedBalance(30));
}

function addTransactionToTable(transaction) {
  const displayStatus = getDisplayStatus(transaction);
  const row = document.createElement("tr");

  if (displayStatus === "vencido") {
    row.style.backgroundColor = "#ffe5e5";
  }

  row.innerHTML = `
    <td>${transaction.type}</td>
    <td>${transaction.description}</td>
    <td>${transaction.category}</td>
    <td>${formatCurrency(Number(transaction.amount))}</td>
    <td>${formatDateForDisplay(transaction.dueDate)}</td>
    <td>${displayStatus}</td>
    <td>
      <button class="edit-button" data-id="${transaction.id}">
        Editar
      </button>

      <button class="delete-button" data-id="${transaction.id}">
        Excluir
      </button>
    </td>
  `;

  tableBody.appendChild(row);
}

function getFilteredTransactions() {
  let filteredTransactions = [...transactions];

  if (filterType.value !== "all") {
    filteredTransactions = filteredTransactions.filter(
      (transaction) => transaction.type === filterType.value
    );
  }

  if (filterCategory.value !== "todos") {
    filteredTransactions = filteredTransactions.filter(
      (transaction) => transaction.category === filterCategory.value
    );
  }

  if (filterStatus.value !== "todos") {
    filteredTransactions = filteredTransactions.filter(
      (transaction) => getDisplayStatus(transaction) === filterStatus.value
    );
  }

  return filteredTransactions;
}

function renderTransactions() {
  tableBody.innerHTML = "";

  const filteredTransactions = getFilteredTransactions();

  filteredTransactions.forEach((transaction) => {
    addTransactionToTable(transaction);
  });

  updateDashboard();
  renderSelectedDateCashflow();
  renderWeeklyCashflow();
  renderCategoryReport();
  renderCharts();
}

function renderCategoryReport() {
  categoryReportBody.innerHTML = "";

  const report = {};

  transactions.forEach((transaction) => {
    if (!report[transaction.category]) {
      report[transaction.category] = {
        income: 0,
        expense: 0,
      };
    }

    if (transaction.type === "entrada") {
      report[transaction.category].income += Number(transaction.amount);
    } else {
      report[transaction.category].expense += Number(transaction.amount);
    }
  });

  const sortedCategoryNames = Object.keys(report).sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );

  if (sortedCategoryNames.length === 0) {
    categoryReportBody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">
          Nenhum lançamento cadastrado.
        </td>
      </tr>
    `;
    return;
  }

  sortedCategoryNames.forEach((category) => {
    const income = report[category].income;
    const expense = report[category].expense;
    const balance = income - expense;

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${category}</td>
      <td>${formatCurrency(income)}</td>
      <td>${formatCurrency(expense)}</td>
      <td>${formatCurrency(balance)}</td>
    `;

    categoryReportBody.appendChild(row);
  });
}

function renderBarChart(container, items) {
  container.innerHTML = "";

  if (items.length === 0) {
    container.innerHTML = `
      <p class="empty-state">
        Nenhum dado disponível.
      </p>
    `;
    return;
  }

  const maxValue = Math.max(...items.map((item) => item.value));

  items.forEach((item) => {
    const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;

    const row = document.createElement("div");
    row.className = "chart-row";

    row.innerHTML = `
      <div class="chart-label">
        <span>${item.label}</span>
        <strong>${formatCurrency(item.value)}</strong>
      </div>

      <div class="chart-track">
        <div class="chart-bar ${item.type === "expense" ? "expense" : ""}" style="width: ${percentage}%"></div>
      </div>
    `;

    container.appendChild(row);
  });
}

function renderCharts() {
  const totalIncome = calculateTotalByType("entrada");
  const totalExpense = calculateTotalByType("saida");

  renderBarChart(incomeExpenseChart, [
    {
      label: "Entradas",
      value: totalIncome,
      type: "income",
    },
    {
      label: "Saídas",
      value: totalExpense,
      type: "expense",
    },
  ].filter((item) => item.value > 0));

  const expenseByCategory = {};

  transactions
    .filter((transaction) => transaction.type === "saida")
    .forEach((transaction) => {
      expenseByCategory[transaction.category] =
        (expenseByCategory[transaction.category] || 0) + Number(transaction.amount);
    });

  const categoryItems = Object.entries(expenseByCategory)
    .map(([category, value]) => ({
      label: category,
      value,
      type: "expense",
    }))
    .sort((a, b) => b.value - a.value);

  renderBarChart(expenseCategoryChart, categoryItems);
}

function editTransaction(id) {
  const transaction = transactions.find((transaction) => transaction.id === id);

  if (!transaction) return;

  document.getElementById("type").value = transaction.type;
  document.getElementById("description").value = transaction.description;
  document.getElementById("category").value = transaction.category;
  document.getElementById("amount").value = transaction.amount;
  document.getElementById("date").value = transaction.date;
  document.getElementById("due-date").value = transaction.dueDate;
  document.getElementById("status").value = transaction.status;

  editingTransactionId = id;

  submitButton.textContent = "Salvar alterações";
  cancelEditButton.classList.remove("hidden");
}

function deleteTransaction(id) {
  const confirmed = confirm("Deseja realmente excluir este lançamento?");

  if (!confirmed) return;

  transactions = transactions.filter((transaction) => transaction.id !== id);

  saveTransactions();
  renderTransactions();
}

function resetFormState() {
  editingTransactionId = null;

  form.reset();
  setDefaultDates();

  submitButton.textContent = "Adicionar lançamento";
  cancelEditButton.classList.add("hidden");
}

function exportBackup() {
  const backupData = {
    appName: "Loja Vida e Saúde",
    version: "1.2.0",
    exportDate: new Date().toISOString(),
    transactions,
    categories,
  };

  const jsonContent = JSON.stringify(backupData, null, 2);

  const blob = new Blob([jsonContent], {
    type: "application/json",
  });

  const downloadUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = `loja-vida-saude-backup-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(downloadUrl);
}

function isValidTransaction(transaction) {
  return (
    transaction &&
    typeof transaction.id === "string" &&
    ["entrada", "saida"].includes(transaction.type) &&
    typeof transaction.description === "string" &&
    typeof transaction.category === "string" &&
    typeof transaction.amount === "number" &&
    typeof transaction.date === "string" &&
    typeof transaction.dueDate === "string" &&
    ["pendente", "pago", "recebido"].includes(transaction.status)
  );
}

function isValidBackupData(backupData) {
  return (
    backupData &&
    Array.isArray(backupData.transactions) &&
    Array.isArray(backupData.categories) &&
    backupData.transactions.every(isValidTransaction) &&
    backupData.categories.every((category) => typeof category === "string")
  );
}

function importBackup(file) {
  const reader = new FileReader();

  reader.onload = function (event) {
    try {
      const backupData = JSON.parse(event.target.result);

      if (!isValidBackupData(backupData)) {
        alert("Arquivo de backup inválido.");
        return;
      }

      const confirmed = confirm(
        "Importar este backup irá substituir os dados atuais. Deseja continuar?"
      );

      if (!confirmed) {
        return;
      }

      transactions = backupData.transactions;
      categories = [
        ...new Set(
          backupData.categories
            .map((category) => category.trim())
            .filter(Boolean)
        ),
      ];

      saveTransactions();
      saveCategories();

      filterType.value = "all";
      filterCategory.value = "todos";
      filterStatus.value = "todos";

      resetFormState();
      renderCategories();
      renderTransactions();

      alert("Backup importado com sucesso.");
    } catch (error) {
      alert("Não foi possível importar o arquivo. Verifique se ele é um JSON válido.");
    } finally {
      importBackupInput.value = "";
    }
  };

  reader.readAsText(file);
}

form.addEventListener("submit", function (event) {
  event.preventDefault();

  const transaction = {
    id: crypto.randomUUID(),
    type: document.getElementById("type").value,
    description: document.getElementById("description").value,
    category: document.getElementById("category").value,
    amount: Number(document.getElementById("amount").value),
    date: document.getElementById("date").value,
    dueDate: document.getElementById("due-date").value,
    status: document.getElementById("status").value,
  };

  if (editingTransactionId) {
    transactions = transactions.map((item) => {
      if (item.id === editingTransactionId) {
        return {
          ...transaction,
          id: editingTransactionId,
        };
      }

      return item;
    });
  } else {
    transactions.push(transaction);
  }

  saveTransactions();
  renderTransactions();
  resetFormState();
});

tableBody.addEventListener("click", function (event) {
  if (event.target.classList.contains("edit-button")) {
    const id = event.target.dataset.id;
    editTransaction(id);
    return;
  }

  if (event.target.classList.contains("delete-button")) {
    const id = event.target.dataset.id;
    deleteTransaction(id);
  }
});

cancelEditButton.addEventListener("click", resetFormState);

filterType.addEventListener("change", renderTransactions);
filterCategory.addEventListener("change", renderTransactions);
filterStatus.addEventListener("change", renderTransactions);
cashflowDateInput.addEventListener("change", renderSelectedDateCashflow);

addCategoryButton.addEventListener("click", () => {
  const newCategory = newCategoryInput.value.trim();

  if (!newCategory) {
    alert("Informe o nome da categoria.");
    return;
  }

  const categoryAlreadyExists = categories.some(
    (category) => category.toLocaleLowerCase("pt-BR") === newCategory.toLocaleLowerCase("pt-BR")
  );

  if (categoryAlreadyExists) {
    alert("Essa categoria já existe.");
    return;
  }

  categories.push(newCategory);

  saveCategories();
  renderCategories();

  newCategoryInput.value = "";
});

exportBackupButton.addEventListener("click", exportBackup);

importBackupInput.addEventListener("change", (event) => {
  const file = event.target.files[0];

  if (!file) return;

  importBackup(file);
});

setDefaultDates();
renderCategories();
renderTransactions();
