const SUPABASE_URL = 'https://zgsxwkvjkvpteqbdkwpl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_l4mOVtEA7jA91gRaqfdmng_tEXF88NM';
const TABLE_NAME = 'dados';
const OUTSIDE_TABLE_NAME = 'outside_group';
const OUTSIDE_KEY = 'controle-carros-fora-do-grupo-v1';
const LOCAL_RECORDS_KEY = 'uber-gastos-local-records-v1';
const PEOPLE = ['Gu', 'PH', 'Patrício'];

window.__uberRuntime = window.__uberRuntime || {};
window.__uberRuntime.supabaseClient = window.__uberRuntime.supabaseClient || null;
window.__uberRuntime.appInitialized = window.__uberRuntime.appInitialized || false;

let appSupabase = window.__uberRuntime.supabaseClient;

const defaultLocalRecords = [
  {
    id: 1,
    data: '2026-08-23',
    pagador: 'Gu',
    nome: 'Teste browser',
    categoria: 'Diversos',
    valor: 123,
    observacao: 'teste from browser'
  }
];

function loadLocalRecords() {
  const raw = localStorage.getItem(LOCAL_RECORDS_KEY);
  if (!raw) {
    localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(defaultLocalRecords));
    return defaultLocalRecords.map((item) => ({ ...item }));
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : defaultLocalRecords;
  } catch (error) {
    localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(defaultLocalRecords));
    return defaultLocalRecords.map((item) => ({ ...item }));
  }
}

function persistLocalRecords(records) {
  localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(records));
}

const state = {
  records: loadLocalRecords().map((item) => normalizeRecord(item)),
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

function safeBind(element, eventName, handler) {
  if (!element) return;
  element.addEventListener(eventName, handler);
}

async function ensureSupabase() {
  if (window.__uberRuntime.supabaseClient && window.__uberRuntime.supabaseClient.from) {
    appSupabase = window.__uberRuntime.supabaseClient;
    return true;
  }

  if (window.supabase && typeof window.supabase.createClient === 'function') {
    window.__uberRuntime.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    appSupabase = window.__uberRuntime.supabaseClient;
    return true;
  }

  console.error('Supabase client não carregou no navegador. Verifique se a página está em HTTP e se o script CDN foi incluído antes do app.');
  return false;
}

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

function normalizeOutsideRecord(item) {
  return {
    id: item.id ?? Date.now(),
    date: item.date || new Date().toISOString().slice(0, 10),
    from: item.from || 'Gu',
    to: item.to || 'PH',
    description: item.description || 'Ajuste fora do grupo',
    value: Number(item.value || 0),
    note: item.note || ''
  };
}

function loadOutside() {
  const raw = localStorage.getItem(OUTSIDE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeOutsideRecord) : [];
  } catch (error) {
    return [];
  }
}

function persistOutside(records = state.outside) {
  localStorage.setItem(OUTSIDE_KEY, JSON.stringify(records.map(normalizeOutsideRecord)));
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
      const amount = Number(item.value || 0);
      if (item.from === person) return sum + amount;
      if (item.to === person) return sum - amount;
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
    person.net = (person.groupPaid - person.share) + person.outsideAdjustment;
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

  const whoReceives = totals.filter((person) => person.net > 0).sort((a, b) => b.net - a.net);
  const whoOwes = totals.filter((person) => person.net < 0).sort((a, b) => a.net - b.net);

  const receiveText = whoReceives.length ? whoReceives.map((person) => `${person.name} ${money(person.net)}`).join(' / ') : 'Ninguém';
  const oweText = whoOwes.length ? whoOwes.map((person) => `${person.name} ${money(Math.abs(person.net))}`).join(' / ') : 'Ninguém';

  document.getElementById('who-receives').textContent = receiveText;
  document.getElementById('who-owes').textContent = oweText;

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
        <p>Pago no carro: <strong>${money(person.groupPaid)}</strong></p>
        <p>Ajuste fora: <strong>${money(person.outsideAdjustment)}</strong></p>
        <p>Saldo: <strong>${money(person.net)}</strong></p>
        ${amount > 0 ? `<p>${person.net >= 0 ? 'Receber' : 'Pagar'}: <strong>${money(amount)}</strong></p>` : '<p>Sem ajuste.</p>'}
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
      <tr class="desktop-row">
        <td>${formatDate(item.date)}</td>
        <td><span class="badge expense">${item.from}</span></td>
        <td><span class="badge income">${item.to}</span></td>
        <td>${item.description}</td>
        <td class="money expense">${money(Number(item.value || 0))}</td>
        <td>${item.note || '-'}</td>
        <td>
          <div class="row-actions">
            <button class="icon-btn delete" type="button" data-outside-action="delete" data-id="${String(item.id)}">Excluir</button>
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
              <div class="row-actions compact">
                <button class="icon-btn delete" type="button" data-outside-action="delete" data-id="${String(item.id)}">Excluir</button>
              </div>
              <span class="mobile-note">${item.note || 'Sem obs.'}</span>
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
    tableBody.innerHTML = '<tr><td colspan="7" class="empty-state">Nenhuma despesa encontrada.</td></tr>';
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
            <div class="row-actions compact">
              <button class="icon-btn" type="button" data-action="edit" data-id="${entry.id}">Editar</button>
              <button class="icon-btn delete" type="button" data-action="delete" data-id="${entry.id}">Excluir</button>
            </div>
            <span class="mobile-note">${entry.note || 'Sem obs.'}</span>
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

async function loadRecords() {
  const ready = await ensureSupabase();
  if (ready && appSupabase) {
    const { data, error } = await appSupabase
      .from(TABLE_NAME)
      .select('*')
      .order('data', { ascending: false });

    if (!error && Array.isArray(data) && data.length) {
      state.records = data.map(normalizeRecord);
      persistLocalRecords(data);
      render();
      return;
    }

    if (error) {
      console.warn('Supabase falhou; usando fallback local.', error);
    }
  }

  const fallbackRecords = loadLocalRecords();
  state.records = fallbackRecords.map(normalizeRecord);
  render();

  if (!ready || !appSupabase) {
    showStatus('Usando dados locais do navegador. Configure o Supabase para sincronizar online.', 'info');
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  if (!appSupabase) {
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
      const { error } = await appSupabase
        .from(TABLE_NAME)
        .update(payload)
        .eq('id', entryIdInput.value);

      if (error) throw error;
      showStatus('Despesa atualizada com sucesso.', 'success');
    } else {
      const { error } = await appSupabase
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
    if (!appSupabase) return;

    try {
      const { error } = await appSupabase
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

async function saveOutsideRecord(outsideRecord) {
  if (!appSupabase) {
    state.outside.unshift(normalizeOutsideRecord(outsideRecord));
    persistOutside();
    return;
  }

  const payload = {
    date: outsideRecord.date,
    from_person: outsideRecord.from,
    to_person: outsideRecord.to,
    description: outsideRecord.description,
    value: Number(outsideRecord.value || 0),
    note: outsideRecord.note || ''
  };

  const { error } = await appSupabase.from(OUTSIDE_TABLE_NAME).insert([payload]);
  if (error) throw error;
  await loadOutsideRecords();
}

async function deleteOutsideRecord(recordId) {
  if (!appSupabase) {
    state.outside = state.outside.filter((item) => String(item.id) !== String(recordId));
    persistOutside();
    render();
    return;
  }

  const { error } = await appSupabase.from(OUTSIDE_TABLE_NAME).delete().eq('id', recordId);
  if (error) throw error;
  await loadOutsideRecords();
}

async function loadOutsideRecords() {
  if (!appSupabase) {
    state.outside = loadOutside();
    renderOutsideTable();
    render();
    return;
  }

  const { data, error } = await appSupabase
    .from(OUTSIDE_TABLE_NAME)
    .select('*')
    .order('date', { ascending: false });

  if (!error && Array.isArray(data)) {
    state.outside = data.map((item) => normalizeOutsideRecord({
      ...item,
      from: item.from_person || item.from,
      to: item.to_person || item.to,
      description: item.description || 'Ajuste fora do grupo',
      value: Number(item.value || 0)
    }));
    persistOutside();
    render();
    return;
  }

  state.outside = loadOutside();
  render();
}

async function handleOutsideSubmit(event) {
  event.preventDefault();

  const value = Number(outsideValue.value || 0);
  const from = outsideFrom.value;
  const to = outsideTo.value;
  const description = outsideDescription.value.trim();

  if (!outsideDate.value || !from || !to || !description || !value || from === to) {
    showStatus('Preencha corretamente o ajuste fora do grupo.', 'error');
    return;
  }

  const record = {
    id: Date.now(),
    date: outsideDate.value,
    from,
    to,
    description,
    value,
    note: outsideNote.value.trim()
  };

  try {
    await saveOutsideRecord(record);
    showStatus('Ajuste fora do grupo salvo com sucesso.', 'success');
    render();
    resetOutsideForm();
  } catch (error) {
    console.error(error);
    showStatus('Não foi possível salvar o ajuste fora do grupo.', 'error');
  }
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

function initializeApp() {
  if (window.__uberRuntime.appInitialized) {
    return;
  }

  window.__uberRuntime.appInitialized = true;

  safeBind(form, 'submit', handleSubmit);
  safeBind(outsideForm, 'submit', handleOutsideSubmit);
  safeBind(tableBody, 'click', handleTableClick);
  safeBind(outsideTableBody, 'click', async (event) => {
    const button = event.target.closest('button[data-outside-action]');
    if (!button) return;

    const { id } = button.dataset;
    try {
      await deleteOutsideRecord(id);
      showStatus('Ajuste fora do grupo removido com sucesso.', 'success');
      render();
    } catch (error) {
      console.error(error);
      showStatus('Não foi possível remover o ajuste fora do grupo.', 'error');
    }
  });
  safeBind(searchInput, 'input', handleFilters);
  safeBind(payerFilter, 'change', handleFilters);
  safeBind(monthFilter, 'change', handleFilters);
  safeBind(cancelEditButton, 'click', resetForm);
  safeBind(outsideCancelButton, 'click', resetOutsideForm);

  if (inputDate) inputDate.value = new Date().toISOString().slice(0, 10);
  if (outsideDate) outsideDate.value = new Date().toISOString().slice(0, 10);
  if (inputPayer) inputPayer.value = 'Gu';
  if (outsideFrom) outsideFrom.value = 'Gu';
  if (outsideTo) outsideTo.value = 'PH';

  render();
  loadRecords();
  loadOutsideRecords();
}

window.ensureSupabase = ensureSupabase;
window.loadRecords = loadRecords;
window.handleSubmit = handleSubmit;
window.render = render;

if (!window.__uberRuntime.initializerStarted) {
  window.__uberRuntime.initializerStarted = true;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp, { once: true });
  } else {
    initializeApp();
  }
}
