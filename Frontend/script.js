const BASE_URL = 'https://unified-backend-68gc.onrender.com/api/article-analyzer';

const entriesEl = document.getElementById('entries');
const addBtn = document.getElementById('addBtn');
const submitBtn = document.getElementById('submitBtn');
const countEl = document.getElementById('count');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const loadingIndicator = document.getElementById('loadingIndicator');
const loadingMessage = document.getElementById('loadingMessage');

let nextId = 0;
let entries = [];

document.addEventListener('DOMContentLoaded', () => {
  fetch(`${BASE_URL}/docs`, { mode: 'no-cors' }).catch(() => {});
});

const pad = n => String(n).padStart(2, '0');

function renumber() {
  entries.forEach((entry, i) => {
    entry.numEl.textContent = 'Passage ' + pad(i + 1);
    entry.removeBtn.disabled = entries.length <= 1;
  });
  countEl.textContent = entries.length === 1
    ? '1 passage ready'
    : entries.length + ' passages ready';
}

function addEntry(focus) {
  const id = nextId++;
  const wrap = document.createElement('div');
  wrap.className = 'entry';

  const head = document.createElement('div');
  head.className = 'entry-head';

  const num = document.createElement('span');
  num.className = 'entry-num';

  const removeBtn = document.createElement('button');
  removeBtn.className = 'remove-btn';
  removeBtn.type = 'button';
  removeBtn.setAttribute('aria-label', 'Remove this passage');
  removeBtn.textContent = '×';

  const textarea = document.createElement('textarea');
  textarea.placeholder = 'Paste or write the passage here…';

  head.append(num, removeBtn);
  wrap.append(head, textarea);
  entriesEl.appendChild(wrap);

  entries.push({ id, el: wrap, textarea, numEl: num, removeBtn });

  removeBtn.addEventListener('click', () => {
    if (entries.length <= 1) return;
    entries = entries.filter(e => e.id !== id);
    wrap.remove();
    renumber();
  });

  renumber();
  if (focus) textarea.focus();
}

addBtn.addEventListener('click', () => addEntry(true));
addEntry(false);

function setStatus(text, kind) {
  if (!statusEl) return;
  statusEl.textContent = text || '';
  statusEl.classList.remove('is-error', 'is-success');
  if (kind) statusEl.classList.add(kind === 'error' ? 'is-error' : 'is-success');
}

function showLoading(msg) {
  if (loadingMessage) loadingMessage.textContent = msg || 'Processing passages…';
  if (loadingIndicator) loadingIndicator.hidden = false;
}

function updateLoadingMessage(msg) {
  if (loadingMessage) loadingMessage.textContent = msg;
}

function hideLoading() {
  if (loadingIndicator) loadingIndicator.hidden = true;
}

function renderResults(data, originalTexts) {
  resultsEl.innerHTML = '';
  resultsEl.hidden = false;

  if (data.cluster || data.topics) {
    const title = document.createElement('h2');
    title.className = 'results-title';
    title.textContent = 'Topic Analysis';
    resultsEl.appendChild(title);

    if (data.cluster) {
      const clusterBox = document.createElement('div');
      clusterBox.className = 'group';
      clusterBox.innerHTML = `<h3 class="group-topic">Cluster Root Topic: ${data.cluster}</h3>`;
      resultsEl.appendChild(clusterBox);
    }

    if (data.topics) {
      const g = document.createElement('div');
      g.className = 'group';
      const shared = Array.isArray(data.topics['shared topic'])
        ? data.topics['shared topic'].join(', ')
        : data.topics['shared topic'];

      let html = `<h3 class="group-topic">Shared Topic: ${shared}</h3><ul>`;
      data.topics['per document'].forEach((topic, i) => {
        const keywords = (topic['Top Keywords'] || []).join(', ');
        html += `<li><strong>P${i + 1}:</strong> ${topic.Topic} (${keywords}) — <span style="color:#666;">${originalTexts[i]?.slice(0, 60)}…</span></li>`;
      });
      html += '</ul>';
      g.innerHTML = html;
      resultsEl.appendChild(g);
    }
  }

  const matrix = data.similarity_matrix;
  if (matrix) {
    const matrixTitle = document.createElement('h2');
    matrixTitle.className = 'results-title';
    matrixTitle.style.marginTop = '2rem';
    matrixTitle.textContent = 'Pairwise Cosine Similarity Grid';
    resultsEl.appendChild(matrixTitle);

    const table = document.createElement('table');
    table.className = 'similarity-table';
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '1rem';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.appendChild(document.createElement('th'));
    matrix.forEach((_, idx) => {
      const th = document.createElement('th');
      th.textContent = `P${idx + 1}`;
      th.style.padding = '8px';
      th.style.borderBottom = '2px solid #ccc';
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    matrix.forEach((row, rowIdx) => {
      const tr = document.createElement('tr');
      const rowHeader = document.createElement('td');
      rowHeader.textContent = `P${rowIdx + 1}`;
      rowHeader.style.fontWeight = 'bold';
      rowHeader.style.padding = '8px';
      tr.appendChild(rowHeader);

      row.forEach((val, colIdx) => {
        const td = document.createElement('td');
        td.textContent = typeof val === 'number' ? val.toFixed(3) : val;
        td.style.padding = '8px';
        td.style.textAlign = 'center';
        if (typeof val === 'number' && val > 0.1 && rowIdx !== colIdx) {
          td.style.backgroundColor = 'rgba(74, 144, 226, 0.15)';
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    resultsEl.appendChild(table);
  }
}

function renderError(message) {
  resultsEl.innerHTML = '';
  resultsEl.hidden = false;
  const box = document.createElement('div');
  box.className = 'error-box';
  box.innerHTML = `<strong>Analysis Failed</strong><p style="margin:0;">${message}</p>`;
  resultsEl.appendChild(box);
}

async function apiPost(endpoint, bodyData, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(bodyData),
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!res.ok) {
      let errDetail = '';
      try {
        const errJson = await res.json();
        errDetail = errJson.detail || JSON.stringify(errJson);
      } catch {
        errDetail = await res.text();
      }
      throw new Error(`HTTP ${res.status}: ${errDetail || res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000} seconds.`);
    }
    throw err;
  }
}

submitBtn.addEventListener('click', async () => {
  const passages = entries
    .map(e => e.textarea.value.trim())
    .filter(text => text.length > 0);

  if (passages.length === 0) {
    setStatus('Add at least one passage before submitting.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Analyzing…';
  setStatus('Analyzing ' + passages.length + ' passage(s)…');
  resultsEl.hidden = true;
  showLoading('Analyzing passages…');

  const coldStartTimer = setTimeout(() => {
    updateLoadingMessage('Server is responding slowly, please wait…');
  }, 3000);

  try {
    await apiPost('/reset', {});
    const vectors = await apiPost('/vectorize', passages);

    const [similarityMatrix, topics] = await Promise.all([
      apiPost('/compare_all', vectors),
      apiPost('/get_topics', vectors)
    ]);

    renderResults({ similarity_matrix: similarityMatrix, topics }, passages);
    setStatus('Done. Processed ' + passages.length + ' passages.', 'success');
  } catch (err) {
    console.error('API Processing Error:', err);
    renderError(err.message || 'Failed to communicate with backend.');
    setStatus('Something went wrong.', 'error');
  } finally {
    clearTimeout(coldStartTimer);
    hideLoading();
    submitBtn.disabled = false;
    submitBtn.textContent = 'Analyze passages';
  }
});