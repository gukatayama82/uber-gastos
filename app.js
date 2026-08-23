const STORAGE_KEY = 'controle-carros-3-pessoas-v1';
const OUTSIDE_KEY = 'controle-carros-fora-do-grupo-v1';
const PEOPLE = ['Gu', 'PH', 'Patrício'];
const PERSON_FIELD_MAP = { Gu: 'gu', PH: 'ph', 'Patrício': 'patricio' };
const seedData = [
  { id: 1, date: '2026-05-01', description: 'Frete / Guincho', category: 'Logística', payer: 'PH', value: 1900, note: 'Gasto compartilhado' },
  { id: 2, date: '2026-05-02', description: 'Tramitação / Logística', category: 'Logística', payer: 'PH', value: 1300, note: 'Documentação e transporte' },
  { id: 3, date: '2026-05-03', description: 'Oficina', category: 'Manutenção', payer: 'Gu', value: 10500, note: 'Reparo geral' },
  { id: 4, date: '2026-05-04', description: 'Bateria', category: 'Elétrica', payer: 'Patrício', value: 800, note: 'Troca de bateria' },
  { id: 5, date: '2026-05-05', description: 'Rastreador', category: 'Acessório', payer: 'PH', value: 160, note: 'Equipamento' },
  { id: 6, date: '2026-05-06', description: 'TBI', category: 'Acessório', payer: 'Patrício', value: 280, note: 'Dispositivo' },
  { id: 7, date: '2026-05-07', description: 'Seguro', category: 'Seguro', payer: 'PH', value: 360, note: 'Cobertura' },
  { id: 8, date: '2026-05-08', description: 'Uber', category: 'Transporte', payer: 'PH', value: 60, note: 'Deslocamento' },
  { id: 9, date: '2026-05-09', description: 'Documentação', category: 'Documentação', payer: 'PH', value: 892, note: 'Trâmites' },
  { id: 10, date: '2026-05-10', description: 'Últimos itens (2k já enviado)', category: 'Diversos', payer: 'Patrício', value: 2000, note: 'Itens finais' },
  { id: 11, date: '2026-05-11', description: 'Últimos itens restantes', category: 'Diversos', payer: 'PH', value: 1377.29, note: 'Saldo restante' },
  { id: 12, date: '2026-05-12', description: 'Seguro', category: 'Seguro', payer: 'Patrício', value: 316.17, note: 'Cobertura extra' },
  { id: 13, date: '2026-05-13', description: 'Correia', category: 'Manutenção', payer: 'PH', value: 229.9, note: 'Peça' },
  { id: 14, date: '2026-05-14', description: 'Silvio Mecânico', category: 'Mecânica', payer: 'Gu', value: 1700, note: 'Serviço de mecânico' }
];

const state = {
  entries: loadEntries(),
  outside: loadOutside(),
  filters: {
    search: '',
    payer: 'all',
    month: ''
  }
};

const form = document.getElementById('entry-form');
const tableBody = document.getElementById('entry-table-body');
const categoryList = document.getElementById('category-list');
const peopleSummary = document.getElementById('people-summary');
const searchInput = document.getElementById('search');
const payerFilter = document.getElementById('filter-payer');
const monthFilter = document.getElementById('filter-month');
const inputDate = document.getElementById('date');
const inputPayer = document.getElementById('payer');
const inputDescription = document.getElementById('description');
const inputCategory = document.getElementById('category');
const inputValue = document.getElementById('value');
const inputGu = document.getElementById('gu-value');
const inputPh = document.getElementById('ph-value');
const inputPatricio = document.getElementById('patricio-value');
const inputNote = document.getElementById('note');
const entryIdInput = document.getElementById('entry-id');
const cancelEditButton = document.getElementById('cancel-edit');
const outsideForm = document.getElementById('outside-form');
const outsideTableBody = document.getElementById('outside-table-body');
const outsideDate = document.getElementById('outside-date');
const outsideFrom = document.getElementById('outside-from');
const outsideTo = document.getElementById('outside-to');
const outsideValue = document.getElementById('outside-value');
const outsideDescription = document.getElementById('outside-description');
const outsideNote = document.getElementById('outside-note');
const outsideCancelButton = document.getElementById('outside-cancel');

function loadEntries() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (error) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  return [...seedData];
}

function persistEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
}

function loadOutside() {
  const saved = localStorage.getItem(OUTSIDE_KEY);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function persistOutside() {
  localStorage.setItem(OUTSIDE_KEY, JSON.stringify(state.outside));
}

function money(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function getFilteredEntries() {
  const search = state.filters.search.trim().toLowerCase();
  const month = state.filters.month;

  return state.entries.filter((entry) => {
    const matchesSearch = !search ||
      entry.description.toLowerCase().includes(search) ||
      entry.category.toLowerCase().includes(search);

    const matchesPayer = state.filters.payer === 'all' || entry.payer === state.filters.payer;
    const matchesMonth = !month || entry.date.startsWith(month);

    return matchesSearch && matchesPayer && matchesMonth;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getPersonSummary() {
  const totals = PEOPLE.map((person) => {
    const groupPaid = state.entries.reduce((sum, entry) => sum + (entry.payer === person ? Number(entry.value || 0) : 0), 0);
    const outsideAdjustment = state.outside.reduce((sum, item) => {
      if (item.from === person) return sum - Number(item.value || 0);
      if (item.to === person) return sum + Number(item.value || 0);
      return sum;
    }, 0);
    const paid = groupPaid + outsideAdjustment;

    return {
      name: person,
      groupPaid,
      outsideAdjustment,
      paid,
      share: 0,
      net: 0
    };
  });

  const totalSpent = state.entries.reduce((sum, entry) => sum + Number(entry.value || 0), 0);
  const sharePerPerson = totalSpent / PEOPLE.length;

  totals.forEach((person) => {
    person.share = sharePerPerson;
    person.net = person.paid - person.share;
  });

  return { totalSpent, sharePerPerson, totals };
}

function getDebts(totals) {
  const debtors = totals.filter((person) => person.net < 0).map((person) => ({
    ...person,
    net: Math.abs(person.net)
  }));
  const creditors = totals.filter((person) => person.net > 0).map((person) => ({
    ...person,
    net: person.net
  }));

  const settlements = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.net, creditor.net);

    if (amount > 0) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount
      });
    }

    debtor.net -= amount;
    creditor.net -= amount;

    if (debtor.net <= 0.01) debtorIndex += 1;
    if (creditor.net <= 0.01) creditorIndex += 1;
  }

  return settlements;
}

function renderSummary() {
  const { totalSpent, sharePerPerson, totals } = getPersonSummary();
  const debts = getDebts(totals);
  document.getElementById('total-expense').textContent = money(totalSpent);
  document.getElementById('share-per-person').textContent = money(sharePerPerson);
  document.getElementById('balance-total').textContent = money(totalSpent);

  const whoReceives = totals.filter((person) => person.net > 0).sort((a, b) => b.net - a.net)[0];
  const whoOwes = totals.filter((person) => person.net < 0).sort((a, b) => a.net - b.net)[0];

  document.getElementById('who-receives').textContent = whoReceives ? `${whoReceives.name} ${money(whoReceives.net)}` : 'Ninguém';
  document.getElementById('who-owes').textContent = whoOwes ? `${whoOwes.name} ${money(Math.abs(whoOwes.net))}` : 'Ninguém';

  const monthLabel = document.getElementById('month-label');
  const today = new Date();
  monthLabel.textContent = today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  peopleSummary.innerHTML = totals.map((person) => {
    const status = person.net >= 0 ? 'recebe' : 'deve';
    const label = person.net >= 0 ? 'Recebe' : 'Deve';
    const amount = Math.abs(person.net);

    return `
      <div class="person-card">
        <div class="name-row">
          <h4>${person.name}</h4>
          <span class="status ${status}">${label}</span>
        </div>
        <p>Pago: <strong>${money(person.paid)}</strong></p>
        <p>Pago no carro: <strong>${money(person.groupPaid)}</strong></p>
        <p>Ajuste fora: <strong>${money(person.outsideAdjustment)}</strong></p>
        <p>Share: <strong>${money(person.share)}</strong></p>
        <p>Saldo: <strong>${money(person.net)}</strong></p>
        <p>${person.net >= 0 ? 'Recebe de' : 'Deve para'}: <strong>${amount > 0 ? money(amount) : 'R$ 0,00'}</strong></p>
      </div>
    `;
  }).join('');

  if (debts.length) {
    const settlementList = debts.map((debt) => `${debt.from} paga ${money(debt.amount)} para ${debt.to}`).join('<br>');
    peopleSummary.insertAdjacentHTML('beforeend', `<div class="person-card"><div class="name-row"><h4>Liquidação</h4></div><p>${settlementList}</p></div>`);
  }
}

function renderCategoryList() {
  const categories = {};

  state.entries.forEach((entry) => {
    const key = entry.category;
    categories[key] = (categories[key] || 0) + Number(entry.value);
  });

  const items = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...items.map(([, value]) => value), 1);

  if (!items.length) {
    categoryList.innerHTML = '<div class="empty-state">Nenhuma despesa cadastrada.</div>';
    return;
  }

  categoryList.innerHTML = items.map(([name, value]) => {
    const width = (value / max) * 100;
    return `
      <div class="category-item">
        <div class="category-header">
          <span>${name}</span>
          <strong>${money(value)}</strong>
        </div>
        <div class="bar"><span style="width: ${width}%"></span></div>
      </div>
    `;
  }).join('');
}

function renderOutsideTable() {
  if (!state.outside.length) {
    outsideTableBody.innerHTML = '<tr><td colspan="6" class="empty-state">Nenhum ajuste fora do grupo.</td></tr>';
    return;
  }

  outsideTableBody.innerHTML = state.outside
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((item) => `
      <tr class="desktop-row">
        <td>${formatDate(item.date)}</td>
        <td><span class="badge expense">${item.from}</span></td>
        <td><span class="badge income">${item.to}</span></td>
        <td>${item.description}</td>
        <td class="money expense">${money(Number(item.value || 0))}</td>
        <td>${item.note || '-'}</td>
        <td>
          <div class="row-actions">
            <button class="icon-btn delete" type="button" data-outside-action="delete" data-id="${item.id}">Excluir</button>
          </div>
        </td>
      </tr>
      <tr class="mobile-row">
        <td colspan="7">
          <div class="mobile-record">
            <div class="mobile-record-top">
              <span class="mobile-date">${formatDate(item.date)}</span>
              <span class="mobile-title">${item.description}</span>
              <span class="mobile-category">${item.from} → ${item.to}</span>
            </div>
            <div class="mobile-record-bottom">
              <span class="badge expense">${item.from}</span>
              <span class="money expense">${money(Number(item.value || 0))}</span>
              <span class="mobile-note">${item.note || '—'}</span>
              <div class="row-actions compact">
                <button class="icon-btn delete" type="button" data-outside-action="delete" data-id="${item.id}">Excluir</button>
              </div>
            </div>
          </div>
        </td>
      </tr>
    `)
    .join('');
}

function renderTable() {
  const entries = getFilteredEntries();

  if (!entries.length) {
    tableBody.innerHTML = '<tr><td colspan="10" class="empty-state">Nenhuma despesa encontrada.</td></tr>';
    return;
  }

  tableBody.innerHTML = entries.map((entry) => `
    <tr class="desktop-row">
      <td>${formatDate(entry.date)}</td>
      <td>${entry.description}</td>
      <td>${entry.category}</td>
      <td><span class="badge expense">${entry.payer}</span></td>
      <td class="money expense">${money(entry.value)}</td>
      <td>${entry.note || '-'}</td>
      <td>
        <div class="row-actions">
          <button class="icon-btn" type="button" data-action="edit" data-id="${entry.id}">Editar</button>
          <button class="icon-btn delete" type="button" data-action="delete" data-id="${entry.id}">Excluir</button>
        </div>
      </td>
    </tr>
    <tr class="mobile-row">
      <td colspan="7">
        <div class="mobile-record">
          <div class="mobile-record-top">
            <span class="mobile-date">${formatDate(entry.date)}</span>
            <span class="mobile-title">${entry.description}</span>
            <span class="mobile-category">${entry.category}</span>
          </div>
          <div class="mobile-record-bottom">
            <span class="badge expense">${entry.payer}</span>
            <span class="money expense">${money(entry.value)}</span>
            <span class="mobile-note">${entry.note || 'Sem obs.'}</span>
            <div class="row-actions compact">
              <button class="icon-btn" type="button" data-action="edit" data-id="${entry.id}">Editar</button>
              <button class="icon-btn delete" type="button" data-action="delete" data-id="${entry.id}">Excluir</button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  `).join('');
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('pt-BR');
}

function resetForm() {
  form.reset();
  inputDate.value = new Date().toISOString().slice(0, 10);
  inputPayer.value = 'Gu';
  entryIdInput.value = '';
}

function fillForm(entry) {
  entryIdInput.value = entry.id;
  inputDate.value = entry.date;
  inputPayer.value = entry.payer;
  inputDescription.value = entry.description;
  inputCategory.value = entry.category;
  inputValue.value = entry.value;
  inputNote.value = entry.note || '';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleSubmit(event) {
  event.preventDefault();

  const totalValue = Number(inputValue.value || 0);
  const payer = inputPayer.value;

  const entry = {
    id: Number(entryIdInput.value) || Date.now(),
    date: inputDate.value,
    payer,
    description: inputDescription.value.trim(),
    category: inputCategory.value.trim(),
    value: totalValue,
    note: inputNote.value.trim()
  };

  if (!entry.date || !entry.description || !entry.category || !entry.value || !entry.payer) {
    return;
  }

  const existingIndex = state.entries.findIndex((item) => item.id === entry.id);

  if (existingIndex >= 0) {
    state.entries[existingIndex] = entry;
  } else {
    state.entries.unshift(entry);
  }

  persistEntries();
  render();
  resetForm();
}

function handleTableClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;
  const entryId = Number(id);

  if (action === 'edit') {
    const entry = state.entries.find((item) => item.id === entryId);
    if (entry) fillForm(entry);
  }

  if (action === 'delete') {
    state.entries = state.entries.filter((item) => item.id !== entryId);
    persistEntries();
    render();
  }
}

function handleOutsideSubmit(event) {
  event.preventDefault();

  const value = Number(outsideValue.value || 0);
  const from = outsideFrom.value;
  const to = outsideTo.value;
  const description = outsideDescription.value.trim();

  if (!outsideDate.value || !from || !to || !description || !value || from === to) {
    return;
  }

  state.outside.unshift({
    id: Date.now(),
    date: outsideDate.value,
    from,
    to,
    description,
    value,
    note: outsideNote.value.trim()
  });

  persistOutside();
  render();
  resetOutsideForm();
}

function resetOutsideForm() {
  outsideForm.reset();
  outsideDate.value = new Date().toISOString().slice(0, 10);
  outsideFrom.value = 'Gu';
  outsideTo.value = 'PH';
}

function handleFilters() {
  state.filters.search = searchInput.value;
  state.filters.payer = payerFilter.value;
  state.filters.month = monthFilter.value;
  renderTable();
}

function render() {
  renderSummary();
  renderCategoryList();
  renderTable();
  renderOutsideTable();
}

form.addEventListener('submit', handleSubmit);
outsideForm.addEventListener('submit', handleOutsideSubmit);
tableBody.addEventListener('click', handleTableClick);
outsideTableBody.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-outside-action]');
  if (!button) return;

  const { id } = button.dataset;
  state.outside = state.outside.filter((item) => String(item.id) !== String(id));
  persistOutside();
  render();
});
searchInput.addEventListener('input', handleFilters);
payerFilter.addEventListener('change', handleFilters);
monthFilter.addEventListener('change', handleFilters);
cancelEditButton.addEventListener('click', resetForm);
outsideCancelButton.addEventListener('click', resetOutsideForm);

inputDate.value = new Date().toISOString().slice(0, 10);
outsideDate.value = new Date().toISOString().slice(0, 10);
inputPayer.value = 'Gu';
outsideFrom.value = 'Gu';
outsideTo.value = 'PH';
render();
