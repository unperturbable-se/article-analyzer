// Point this at your FastAPI route. Not shown in the UI — set it here once.
const ENDPOINT = 'http://localhost:8000/analyze';

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

// start with one entry
addEntry(false);

function setStatus(text, kind) {
  statusEl.textContent = text || '';
  statusEl.classList.remove('is-error', 'is-success');
  if (kind) statusEl.classList.add(kind === 'error' ? 'is-error' : 'is-success');
}

function renderResults(data) {
  resultsEl.innerHTML = '';
  resultsEl.hidden = false;

  const title = document.createElement('h2');
  title.className = 'results-title';
  title.textContent = 'Grouped by topic';
  resultsEl.appendChild(title);

  const sub = document.createElement('p');
  sub.className = 'results-sub';
  const groups = Array.isArray(data.groups) ? data.groups : Array.isArray(data) ? data : [];
  sub.textContent = groups.length + (groups.length === 1 ? ' topic found.' : ' topics found.');
  resultsEl.appendChild(sub);

  const originalTexts = entries.map(e => e.textarea.value.trim());

  groups.forEach(group => {
    const g = document.createElement('div');
    g.className = 'group';

    const topic = document.createElement('h3');
    topic.className = 'group-topic';
    topic.textContent = group.topic || group.name || group.label || 'Untitled topic';
    g.appendChild(topic);

    const ul = document.createElement('ul');
    let passageTexts = [];

    if (Array.isArray(group.passages)) {
      passageTexts = group.passages.map(p => {
        if (typeof p === 'number') return originalTexts[p] ?? ('Passage ' + (p + 1));
        return p;
      });
    } else if (Array.isArray(group.indices)) {
      passageTexts = group.indices.map(i => originalTexts[i] ?? ('Passage ' + (i + 1)));
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
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passages })
    });

    if (!res.ok) {
      throw new Error('Server responded with status ' + res.status);
    }

    const data = await res.json();
    renderResults(data);
    setStatus('Done. Grouped ' + passages.length + ' passages.', 'success');
  } catch (err) {
    renderError(err.message + ' Check that the API is running at ' + ENDPOINT + '.');
    setStatus('Something went wrong.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Analyze passages';
  }
});
