import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { MAX_LENGTH, listEntries, addEntry, updateEntry, deleteEntry } from './db.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const form = document.getElementById('entry-form');
const textarea = document.getElementById('content');
const submitBtn = document.getElementById('submit-btn');
const charCount = document.getElementById('char-count');
const message = document.getElementById('message');
const entryCount = document.getElementById('entry-count');
const status = document.getElementById('status');
const list = document.getElementById('entry-list');

const dateFormat = new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

let entries = [];
let editingId = null;

function showError(text) {
  message.textContent = text;
  message.hidden = false;
}

function clearError() {
  message.hidden = true;
}

// 요청하는 동안 버튼을 잠그고, 실패하면 오류 문구를 보여 줍니다.
async function run(button, action) {
  button.disabled = true;
  clearError();
  try {
    await action();
  } catch (err) {
    showError(err.message || '문제가 생겼어요. 다시 시도해 주세요.');
  } finally {
    button.disabled = false;
  }
}

function makeButton(label, className, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  if (className) button.className = className;
  button.addEventListener('click', () => onClick(button));
  return button;
}

function formatMeta(entry) {
  const created = dateFormat.format(new Date(entry.created_at));
  return entry.updated_at ? `${created} · 수정됨` : created;
}

function renderViewItem(entry) {
  const li = document.createElement('li');
  li.className = 'card';

  const content = document.createElement('p');
  content.className = 'entry-content';
  content.textContent = entry.content;

  const meta = document.createElement('span');
  meta.className = 'muted';
  meta.textContent = formatMeta(entry);

  const actions = document.createElement('div');
  actions.className = 'entry-actions';
  actions.append(
    makeButton('수정', 'secondary', () => {
      editingId = entry.id;
      render();
    }),
    makeButton('삭제', 'danger', (button) => {
      if (!confirm('이 글을 삭제할까요?')) return;
      run(button, async () => {
        await deleteEntry(supabase, entry.id);
        await refresh();
      });
    }),
  );

  const footer = document.createElement('div');
  footer.className = 'entry-footer';
  footer.append(meta, actions);

  li.append(content, footer);
  return li;
}

function renderEditItem(entry) {
  const li = document.createElement('li');
  li.className = 'card';

  const editor = document.createElement('textarea');
  editor.rows = 3;
  editor.maxLength = MAX_LENGTH;
  editor.value = entry.content;
  editor.setAttribute('aria-label', '수정할 내용');

  const actions = document.createElement('div');
  actions.className = 'entry-actions';
  actions.append(
    makeButton('취소', 'secondary', () => {
      editingId = null;
      clearError();
      render();
    }),
    makeButton('저장', '', (button) => {
      run(button, async () => {
        await updateEntry(supabase, entry.id, editor.value);
        editingId = null;
        await refresh();
      });
    }),
  );

  const footer = document.createElement('div');
  footer.className = 'entry-footer';
  footer.append(document.createElement('span'), actions);

  li.append(editor, footer);
  queueMicrotask(() => editor.focus());
  return li;
}

function render() {
  list.replaceChildren(
    ...entries.map((entry) =>
      entry.id === editingId ? renderEditItem(entry) : renderViewItem(entry),
    ),
  );
  entryCount.textContent = `(${entries.length})`;
  status.hidden = entries.length > 0;
  status.textContent = '아직 글이 없어요. 첫 글을 남겨 보세요!';
}

async function refresh() {
  entries = await listEntries(supabase);
  render();
}

function updateCharCount() {
  charCount.textContent = `${textarea.value.length} / ${MAX_LENGTH}`;
}

textarea.addEventListener('input', updateCharCount);

form.addEventListener('submit', (event) => {
  event.preventDefault();
  run(submitBtn, async () => {
    await addEntry(supabase, textarea.value);
    form.reset();
    updateCharCount();
    await refresh();
  });
});

refresh().catch((err) => {
  status.textContent = '목록을 불러오지 못했어요.';
  showError(err.message);
});
