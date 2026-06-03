const form = document.getElementById("transaction-form");
const tableBody = document.getElementById("transactions-table-body");

const currentBalanceElement = document.getElementById("current-balance");
const totalIncomeElement = document.getElementById("total-income");
const totalExpenseElement = document.getElementById("total-expense");
const upcomingBillsElement = document.getElementById("upcoming-bills");

const transactions = [];

function formatCurrency(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function updateDashboard() {
  const totalIncome = transactions
    .filter((transaction) => transaction.type === "entrada")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const totalExpense = transactions
    .filter((transaction) => transaction.type === "saida")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const currentBalance = totalIncome - totalExpense;

  const today = new Date();
  const sevenDaysFromNow = new Date();
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
    <td>${formatCurrency(transaction.amount)}</td>
    <td>${transaction.dueDate}</td>
    <td>${transaction.status}</td>
  `;

  tableBody.appendChild(row);
}

form.addEventListener("submit", function (event) {
  event.preventDefault();

  const transaction = {
    type: document.getElementById("type").value,
    description: document.getElementById("description").value,
    category: document.getElementById("category").value,
    amount: Number(document.getElementById("amount").value),
    date: document.getElementById("date").value,
    dueDate: document.getElementById("due-date").value,
    status: document.getElementById("status").value,
  };

  transactions.push(transaction);

  addTransactionToTable(transaction);
  updateDashboard();

  form.reset();
});