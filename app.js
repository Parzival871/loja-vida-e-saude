const form = document.getElementById("transaction-form");
const tableBody = document.getElementById("transactions-table-body");

form.addEventListener("submit", function (event) {
  event.preventDefault();

  const type = document.getElementById("type").value;
  const description = document.getElementById("description").value;
  const category = document.getElementById("category").value;
  const amount = document.getElementById("amount").value;
  const dueDate = document.getElementById("due-date").value;
  const status = document.getElementById("status").value;

  const row = document.createElement("tr");

  row.innerHTML = `
    <td>${type}</td>
    <td>${description}</td>
    <td>${category}</td>
    <td>R$ ${Number(amount).toFixed(2)}</td>
    <td>${dueDate}</td>
    <td>${status}</td>
  `;

  tableBody.appendChild(row);

  form.reset();
});