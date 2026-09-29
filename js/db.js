// 방명록 테이블 읽기·쓰기·수정·삭제
// supabase 클라이언트를 인자로 받아서 브라우저와 테스트에서 같이 씁니다.

const TABLE = 'guestbook';
const COLUMNS = 'id, content, created_at, updated_at';

export const MAX_LENGTH = 500;

// 앞뒤 공백을 지운 내용을 돌려주고, 비었거나 너무 길면 오류를 냅니다.
export function validateContent(content) {
  const text = String(content ?? '').trim();
  if (text.length === 0) {
    throw new Error('내용을 입력해 주세요.');
  }
  if (text.length > MAX_LENGTH) {
    throw new Error(`내용은 ${MAX_LENGTH}자까지 쓸 수 있어요.`);
  }
  return text;
}

export async function listEntries(supabase) {
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLUMNS)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addEntry(supabase, content) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ content: validateContent(content) })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateEntry(supabase, id, content) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ content: validateContent(content) })
    .eq('id', id)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEntry(supabase, id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
