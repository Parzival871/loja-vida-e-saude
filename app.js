const form = document.getElementById("transaction-form");
const tableBody = document.getElementById("transactions-table-body");

const currentBalanceElement = document.getElementById("current-balance");
const totalIncomeElement = document.getElementById("total-income");
const totalExpenseElement = document.getElementById("total-expense");
const upcomingBillsElement = document.getElementById("upcoming-bills");
const submitButton = document.getElementById("submit-button");
const cancelEditButton = document.getElementById("cancel-edit-button");

let editingTransactionId = null;

let transactions = JSON.parse(localStorage.getItem("transactions")) || [];

function saveTransactions() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

function formatCurrency(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
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

  currentBalanceElement.textContent = formatCurrency(currentBalance);
  totalIncomeElement.textContent = formatCurrency(totalIncome);
  totalExpenseElement.textContent = formatCurrency(totalExpense);
  upcomingBillsElement.textContent = upcomingBills;
}

function addTransactionToTable(transaction) {
  const row = document.createElement("tr");

  row.innerHTML = `
    <td>${transaction.type}</td>
    <td>${transaction.description}</td>
    <td>${transaction.category}</td>
    <td>${formatCurrency(Number(transaction.amount))}</td>
    <td>${transaction.dueDate}</td>
    <td>${transaction.status}</td>
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

  transactions.forEach((transaction) => {
    addTransactionToTable(transaction);
  });

  updateDashboard();
}
function editTransaction(id) {
  const transaction = transactions.find(
    (transaction) => transaction.id === id
  );

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

  if (!confirmed) {
    return;
  }

  transactions = transactions.filter((transaction) => transaction.id !== id);

  saveTransactions();
  renderTransactions();
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

  editingTransactionId = null;

  submitButton.textContent = "Adicionar lançamento";
  cancelEditButton.classList.add("hidden");
} else {
  transactions.push(transaction);
}

saveTransactions();
renderTransactions();

form.reset();
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
cancelEditButton.addEventListener("click", () => {
  editingTransactionId = null;

  form.reset();

  submitButton.textContent = "Adicionar lançamento";

  cancelEditButton.classList.add("hidden");
});
renderTransactions();