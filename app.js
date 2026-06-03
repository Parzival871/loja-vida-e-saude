const form = document.getElementById("transaction-form");
const tableBody = document.getElementById("transactions-table-body");

const currentBalanceElement = document.getElementById("current-balance");
const totalIncomeElement = document.getElementById("total-income");
const totalExpenseElement = document.getElementById("total-expense");
const upcomingBillsElement = document.getElementById("upcoming-bills");
const overdueBillsElement = document.getElementById("overdue-bills");

const submitButton = document.getElementById("submit-button");
const cancelEditButton = document.getElementById("cancel-edit-button");

const filterType = document.getElementById("filter-type");
const filterCategory = document.getElementById("filter-category");

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

function getSortedCategories() {
  return [...categories].sort((a, b) => a.localeCompare(b, "pt-BR"));
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

function updateDashboard() {
  const totalIncome = transactions
    .filter((transaction) => transaction.type === "entrada")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  const totalExpense = transactions
    .filter((transaction) => transaction.type === "saida")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  const currentBalance = totalIncome - totalExpense;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(today.getDate() + 7);

  const upcomingBills = transactions.filter((transaction) => {
    if (transaction.type !== "saida") return false;
    if (transaction.status !== "pendente") return false;

    const dueDate = new Date(transaction.dueDate + "T00:00:00");

    return dueDate >= today && dueDate <= sevenDaysFromNow;
  }).length;

  const overdueBills = transactions.filter((transaction) => {
    if (transaction.type !== "saida") return false;
    if (transaction.status !== "pendente") return false;

    const dueDate = new Date(transaction.dueDate + "T00:00:00");

    return dueDate < today;
  }).length;

  currentBalanceElement.textContent = formatCurrency(currentBalance);
  totalIncomeElement.textContent = formatCurrency(totalIncome);
  totalExpenseElement.textContent = formatCurrency(totalExpense);
  upcomingBillsElement.textContent = upcomingBills;
  overdueBillsElement.textContent = overdueBills;
}

function getDisplayStatus(transaction) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(transaction.dueDate + "T00:00:00");

  if (
    transaction.type === "saida" &&
    transaction.status === "pendente" &&
    dueDate < today
  ) {
    return "vencido";
  }

  return transaction.status;
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
    <td>${transaction.dueDate}</td>
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

function renderTransactions() {
  tableBody.innerHTML = "";

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

  filteredTransactions.forEach((transaction) => {
    addTransactionToTable(transaction);
  });

  updateDashboard();
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

  submitButton.textContent = "Adicionar lançamento";
  cancelEditButton.classList.add("hidden");
}

function exportBackup() {
  const backupData = {
    appName: "Financeiro MVP",
    version: "1.0.0",
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
  link.download = `financeiro-mvp-backup-${new Date()
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
      categories = [...new Set(backupData.categories.map((category) => category.trim()).filter(Boolean))];

      saveTransactions();
      saveCategories();

      filterType.value = "all";
      filterCategory.value = "todos";

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

addCategoryButton.addEventListener("click", () => {
  const newCategory = newCategoryInput.value.trim();

  if (!newCategory) {
    alert("Informe o nome da categoria.");
    return;
  }

  if (categories.includes(newCategory)) {
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

renderCategories();
renderTransactions();
