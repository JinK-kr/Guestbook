// 실제 Supabase DB에 글을 만들고 수정·삭제해 보는 테스트입니다.
// 테스트가 만든 글은 끝나면 모두 지웁니다.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from '../js/config.js';
import {
  MAX_LENGTH,
  validateContent,
  listEntries,
  addEntry,
  updateEntry,
  deleteEntry,
} from '../js/db.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const createdIds = [];

async function add(content) {
  const entry = await addEntry(supabase, content);
  createdIds.push(entry.id);
  return entry;
}

after(async () => {
  if (createdIds.length > 0) {
    await supabase.from('guestbook').delete().in('id', createdIds);
  }
});

test('validateContent: 앞뒤 공백을 지운다', () => {
  assert.equal(validateContent('  안녕하세요  \n'), '안녕하세요');
});

test('validateContent: 비었거나 공백뿐이면 오류', () => {
  assert.throws(() => validateContent(''), /내용을 입력/);
  assert.throws(() => validateContent('   \n '), /내용을 입력/);
  assert.throws(() => validateContent(undefined), /내용을 입력/);
});

test(`validateContent: ${MAX_LENGTH}자까지 허용하고 넘으면 오류`, () => {
  assert.equal(validateContent('가'.repeat(MAX_LENGTH)).length, MAX_LENGTH);
  assert.throws(() => validateContent('가'.repeat(MAX_LENGTH + 1)), /500자/);
});

test('저장 → 조회 → 수정 → 삭제', async () => {
  const marker = `[테스트] ${Date.now()}`;

  const created = await add(`  ${marker}  `);
  assert.equal(created.content, marker);
  assert.equal(created.updated_at, null);

  const listed = await listEntries(supabase);
  assert.ok(listed.some((e) => e.id === created.id), '목록에 새 글이 있어야 함');

  const updated = await updateEntry(supabase, created.id, `${marker} 수정`);
  assert.equal(updated.content, `${marker} 수정`);
  assert.ok(updated.updated_at, '수정하면 updated_at이 기록되어야 함');

  await deleteEntry(supabase, created.id);
  const afterDelete = await listEntries(supabase);
  assert.ok(!afterDelete.some((e) => e.id === created.id), '삭제한 글은 목록에 없어야 함');
});

test('목록은 최신 글이 먼저 온다', async () => {
  const first = await add(`[테스트] 먼저 ${Date.now()}`);
  const second = await add(`[테스트] 나중 ${Date.now()}`);

  const ids = (await listEntries(supabase)).map((e) => e.id);
  assert.ok(ids.indexOf(second.id) < ids.indexOf(first.id));
});

test('없는 글을 수정하면 오류', async () => {
  const entry = await add(`[테스트] 삭제될 글 ${Date.now()}`);
  await deleteEntry(supabase, entry.id);
  await assert.rejects(updateEntry(supabase, entry.id, '수정'));
});

test('DB 제약: 앱을 거치지 않아도 빈 글과 긴 글은 거부', async () => {
  const blank = await supabase.from('guestbook').insert({ content: '   ' });
  assert.ok(blank.error, '공백뿐인 글은 거부되어야 함');

  const tooLong = await supabase.from('guestbook').insert({ content: '가'.repeat(MAX_LENGTH + 1) });
  assert.ok(tooLong.error, `${MAX_LENGTH}자를 넘는 글은 거부되어야 함`);
});
