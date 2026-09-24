// Base URL pointing to your FastAPI instance
const BASE_URL = 'http://localhost:8000';

const entriesEl = document.getElementById('entries');
const addBtn = document.getElementById('addBtn');
const submitBtn = document.getElementById('submitBtn');
const countEl = document.getElementById('count');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');

let nextId = 0;
let entries = []; // { id, el, textarea, numEl, removeBtn }

function pad(n) { return String(n).padStart(2, '0'); }

function renumber() {
  entries.forEach((entry, i) => {
    entry.numEl.textContent = 'Passage ' + pad(i + 1);
  });
  entries.forEach(entry => {
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

  head.appendChild(num);
  head.appendChild(removeBtn);
  wrap.appendChild(head);
  wrap.appendChild(textarea);
  entriesEl.appendChild(wrap);

  const entry = { id, el: wrap, textarea, numEl: num, removeBtn };
  entries.push(entry);

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

// Start with one entry
addEntry(false);

function setStatus(text, kind) {
  statusEl.textContent = text || '';
  statusEl.classList.remove('is-error', 'is-success');
  if (kind) statusEl.classList.add(kind === 'error' ? 'is-error' : 'is-success');
}

function renderResults(data, originalTexts) {
  resultsEl.innerHTML = '';
  resultsEl.hidden = false;

  // Render Topic Groups / Clusters if present
  if (data.clusters || data.groups) {
    const title = document.createElement('h2');
    title.className = 'results-title';
    title.textContent = 'Grouped by topic';
    resultsEl.appendChild(title);

    const groups = data.clusters || data.groups || [];
    const sub = document.createElement('p');
    sub.className = 'results-sub';
    sub.textContent = groups.length + (groups.length === 1 ? ' topic found.' : ' topics found.');
    resultsEl.appendChild(sub);

    groups.forEach(group => {
      const g = document.createElement('div');
      g.className = 'group';

      const topic = document.createElement('h3');
      topic.className = 'group-topic';
      
      // Topic title incorporating extracted TF-IDF keywords if returned
      const keywords = Array.isArray(group.keywords) ? ` [${group.keywords.join(', ')}]` : '';
      topic.textContent = (group.topic || group.name || group.label || `Cluster ${group.cluster_id || ''}`) + keywords;
      g.appendChild(topic);

      const ul = document.createElement('ul');
      let passageTexts = [];

      if (Array.isArray(group.documents)) {
        passageTexts = group.documents.map(i => originalTexts[i] ?? (`Passage ${i + 1}`));
      } else if (Array.isArray(group.passages)) {
        passageTexts = group.passages.map(p => typeof p === 'number' ? originalTexts[p] : p);
      }

      passageTexts.forEach(text => {
        const li = document.createElement('li');
        li.textContent = text.length > 180 ? text.slice(0, 180) + '…' : text;
        ul.appendChild(li);
      });

      g.appendChild(ul);
      resultsEl.appendChild(g);
    });
  }

  // Render Pairwise Similarity Matrix
  const matrix = data.similarity_matrix || (Array.isArray(data) && Array.isArray(data[0]) ? data : null);
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

    // Header Row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.appendChild(document.createElement('th')); // Blank top-left corner
    matrix.forEach((_, idx) => {
      const th = document.createElement('th');
      th.textContent = `P${idx + 1}`;
      th.style.padding = '8px';
      th.style.borderBottom = '2px solid #ccc';
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Matrix Rows
    const tbody = document.createElement('tbody');
    matrix.forEach((row, rowIdx) => {
      const tr = document.createElement('tr');
      const rowHeader = document.createElement('td');
      rowHeader.textContent = `P${rowIdx + 1}`;
      rowHeader.style.fontWeight = 'bold';
      rowHeader.style.padding = '8px';
      tr.appendChild(rowHeader);

      row.forEach((val) => {
        const td = document.createElement('td');
        const score = typeof val === 'number' ? val.toFixed(3) : val;
        td.textContent = score;
        td.style.padding = '8px';
        td.style.textAlign = 'center';
        // Simple background highlight for high similarity scores
        if (typeof val === 'number' && val > 0.1 && rowIdx !== row.indexOf(val)) {
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
  const strong = document.createElement('strong');
  strong.textContent = "Couldn't reach the endpoint.";
  const p = document.createElement('p');
  p.style.margin = '0';
  p.textContent = message;
  box.appendChild(strong);
  box.appendChild(p);
  resultsEl.appendChild(box);
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
  setStatus('Analyzing ' + passages.length + ' passage' + (passages.length === 1 ? '' : 's') + '…');
  resultsEl.hidden = true;

  try {
    // 1. Vectorize documents via FastAPI POST endpoint
    const vectorizeRes = await fetch(`${BASE_URL}/vectorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(passages) // Sends raw list of strings to Body(...)
    });

    if (!vectorizeRes.ok) {
      throw new Error(`Vectorize endpoint failed with status ${vectorizeRes.status}`);
    }

    const vectors = await vectorizeRes.json();

    // 2. Compute full pairwise similarity matrix via /compare_all
    const matrixRes = await fetch(`${BASE_URL}/compare_all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vectors) // Sends vector matrix to Body(...)
    });

    if (!matrixRes.ok) {
      throw new Error(`Compare endpoint failed with status ${matrixRes.status}`);
    }

    const similarityMatrix = await matrixRes.json();

    // Combine results into a single object for rendering
    const responseData = {
      similarity_matrix: similarityMatrix,
      // If vectors was directly returned as a array or dictionary
      vectors: vectors
    };

    renderResults(responseData, passages);
    setStatus('Done. Processed ' + passages.length + ' passages.', 'success');
  } catch (err) {
    renderError(err.message + ' Check that your FastAPI server is running at ' + BASE_URL + '.');
    setStatus('Something went wrong.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Analyze passages';
  }
});