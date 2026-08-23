const SUPABASE_URL = 'https://zgsxwkvjkvpteqbdkwpl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_l4mOVtEA7jA91gRaqfdmng_tEXF88NM';
const TABLE_NAME = 'dados';
const OUTSIDE_KEY = 'controle-carros-fora-do-grupo-v1';
const PEOPLE = ['Gu', 'PH', 'Patrício'];

const state = {
  records: [],
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

const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

function showStatus(message, type = 'info') {
  let target = document.getElementById('status-message');
  if (!target) {
    target = document.createElement('div');
    target.id = 'status-message';
    target.style.marginTop = '12px';
    target.style.padding = '10px 12px';
    target.style.borderRadius = '10px';
    target.style.fontSize = '14px';
    target.style.display = 'none';
    document.querySelector('.main-content').appendChild(target);
  }

  target.textContent = message;
  target.style.display = 'block';
  target.style.background = type === 'error' ? '#fff0f2' : type === 'success' ? '#edfdf5' : '#eef3ff';
  target.style.color = type === 'error' ? '#b42318' : type === 'success' ? '#067647' : '#1d4ed8';
}

function loadOutside() {
  const raw = localStorage.getItem(OUTSIDE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
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
  }).format(Number(value || 0));
}

function normalizeRecord(row) {
  return {
    id: row.id,
    date: row.data || row.date || new Date().toISOString().slice(0, 10),
    description: row.nome || row.description || 'Despesa',
    category: row.categoria || row.category || 'Diversos',
    payer: row.pagador || row.payer || 'Gu',
    value: Number(row.valor ?? row.value ?? 0),
    note: row.observacao || row.note || ''
  };
}

function getFilteredEntries() {
  const search = state.filters.search.trim().toLowerCase();
  const month = state.filters.month;

  return state.records.filter((entry) => {
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
    const groupPaid = state.records.reduce((sum, entry) => sum + (entry.payer === person ? Number(entry.value || 0) : 0), 0);
    const outsideAdjustment = state.outside.reduce((sum, item) => {
      if (item.from === person) return sum - Number(item.value || 0);
      if (item.to === person) return sum + Number(item.value || 0);
      return sum;
    }, 0);

    return {
      name: person,
      groupPaid,
      outsideAdjustment,
      paid: groupPaid + outsideAdjustment,
      share: 0,
      net: 0
    };
  });

  const totalSpent = state.records.reduce((sum, entry) => sum + Number(entry.value || 0), 0);
  const sharePerPerson = totalSpent / PEOPLE.length;

  totals.forEach((person) => {
    person.share = sharePerPerson;
    person.net = person.paid - person.share;
  });

  return { totalSpent, sharePerPerson, totals };
}

function getDebts(totals) {
  const debtors = totals.filter((person) => person.net < 0).map((person) => ({ ...person, net: Math.abs(person.net) }));
  const creditors = totals.filter((person) => person.net > 0).map((person) => ({ ...person, net: person.net }));

  const settlements = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.net, creditor.net);

    if (amount > 0) {
      settlements.push({ from: debtor.name, to: creditor.name, amount });
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

  state.records.forEach((entry) => {
    const key = entry.category;
    categories[key] = (categories[key] || 0) + Number(entry.value);
  });

  const items = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...items.map(([, value]) => value), 1);

  if (!items.length) {
    categoryList.innerHTML = '<p class="empty-state">Nenhuma categoria encontrada.</p>';
    return;
  }

  categoryList.innerHTML = items.map(([category, value]) => {
    const width = (value / max) * 100;
    return `
      <div class="category-item">
        <div class="category-header">
          <span>${category}</span>
          <strong>${money(value)}</strong>
        </div>
        <div class="bar"><span style="width: ${width}%"></span></div>
      </div>
    `;
  }).join('');
}

function renderOutsideTable() {
  if (!state.outside.length) {
    outsideTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">Nenhum ajuste fora do grupo.</td></tr>';
    return;
  }

  outsideTableBody.innerHTML = state.outside
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((item) => `
      <tr>
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
    `)
    .join('');
}

function renderTable() {
  const entries = getFilteredEntries();

  if (!entries.length) {
    tableBody.innerHTML = '<tr><td colspan="7" class="empty-state">Nenhuma despesa encontrada.</td></tr>';
    return;
  }

  tableBody.innerHTML = entries.map((entry) => `
    <tr>
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

async function loadRecords() {
  if (!supabase) {
    showStatus('Configure SUPABASE_URL e SUPABASE_ANON_KEY antes de usar o app.', 'error');
    return;
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('data', { ascending: false });

  if (error) {
    showStatus('Erro ao carregar os dados do Supabase.', 'error');
    console.error(error);
    return;
  }

  state.records = (data || []).map(normalizeRecord);
  render();
}

async function handleSubmit(event) {
  event.preventDefault();

  if (!supabase) {
    showStatus('Supabase não configurado.', 'error');
    return;
  }

  const payload = {
    data: inputDate.value,
    pagador: inputPayer.value,
    nome: inputDescription.value.trim(),
    categoria: inputCategory.value.trim(),
    valor: Number(inputValue.value || 0),
    observacao: inputNote.value.trim()
  };

  if (!payload.data || !payload.nome || !payload.categoria || !payload.valor || !payload.pagador) {
    showStatus('Preencha todos os campos obrigatórios.', 'error');
    return;
  }

  try {
    if (entryIdInput.value) {
      const { error } = await supabase
        .from(TABLE_NAME)
        .update(payload)
        .eq('id', entryIdInput.value);

      if (error) throw error;
      showStatus('Despesa atualizada com sucesso.', 'success');
    } else {
      const { error } = await supabase
        .from(TABLE_NAME)
        .insert([payload]);

      if (error) throw error;
      showStatus('Despesa salva com sucesso.', 'success');
    }

    resetForm();
    await loadRecords();
  } catch (error) {
    showStatus('Não foi possível salvar a despesa.', 'error');
    console.error(error);
  }
}

async function handleTableClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;
  const entryId = Number(id);

  if (action === 'edit') {
    const entry = state.records.find((item) => Number(item.id) === entryId);
    if (entry) fillForm(entry);
  }

  if (action === 'delete') {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', entryId);

      if (error) throw error;
      showStatus('Despesa removida com sucesso.', 'success');
      await loadRecords();
    } catch (error) {
      showStatus('Não foi possível excluir a despesa.', 'error');
      console.error(error);
    }
  }
}

function handleFilters() {
  state.filters.search = searchInput.value;
  state.filters.payer = payerFilter.value;
  state.filters.month = monthFilter.value;
  renderTable();
}

function handleOutsideSubmit(event) {
  event.preventDefault();

  const value = Number(outsideValue.value || 0);
  const from = outsideFrom.value;
  const to = outsideTo.value;
  const description = outsideDescription.value.trim();

  if (!outsideDate.value || !from || !to || !description || !value || from === to) {
    showStatus('Preencha corretamente o ajuste fora do grupo.', 'error');
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
loadRecords();
