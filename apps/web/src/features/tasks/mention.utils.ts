import type { MemberOption } from './types';

// @mention trong bình luận (task-management.md, Đợt 3 S3). Chữ trong bình luận là "@Họ Tên"; id người được
// nhắc suy ra lúc gửi từ danh sách thành viên board — không lưu trạng thái riêng.

const MAX_QUERY = 30;
const MAX_SUGGESTIONS = 6;

/** Bỏ dấu tiếng Việt, chữ thường: "Đặng Ánh" → "dang anh". */
export const foldText = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

/** Đoạn "@abc" ngay trước con trỏ (đầu dòng hoặc sau khoảng trắng, không xuống dòng); null nếu không có. */
export function findMentionQuery(
  text: string,
  caret: number,
): { start: number; query: string } | null {
  const start = text.lastIndexOf('@', caret - 1);
  if (start < 0 || (start > 0 && !/\s/.test(text[start - 1] ?? ''))) return null;
  const query = text.slice(start + 1, caret);
  if (query.length > MAX_QUERY || query.includes('\n') || query.startsWith(' ')) return null;
  return { start, query };
}

/** Thành viên có tên chứa chuỗi gõ (không phân biệt dấu, hoa thường). */
export function matchMembers(members: MemberOption[], query: string): MemberOption[] {
  const folded = foldText(query.trim());
  return members
    .filter((member) => foldText(member.fullName).includes(folded))
    .slice(0, MAX_SUGGESTIONS);
}

/** Thay "@abc" bằng "@Họ Tên " → chữ mới và vị trí con trỏ sau tên. */
export function insertMention(
  text: string,
  range: { start: number; caret: number },
  fullName: string,
): { text: string; caret: number } {
  const inserted = `@${fullName} `;
  return {
    text: text.slice(0, range.start) + inserted + text.slice(range.caret),
    caret: range.start + inserted.length,
  };
}

/** Id các thành viên còn được nhắc trong chữ ("@Họ Tên" còn nguyên lúc gửi). */
export const mentionedIds = (text: string, members: MemberOption[]): string[] =>
  members.filter((member) => text.includes(`@${member.fullName}`)).map((member) => member.id);
