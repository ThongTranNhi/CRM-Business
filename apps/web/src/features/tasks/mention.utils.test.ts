import { describe, expect, it } from 'vitest';
import {
  findMentionQuery,
  foldText,
  insertMention,
  matchMembers,
  mentionedIds,
} from './mention.utils';

const members = [
  { id: 'a', fullName: 'Đặng Ánh', avatarUrl: null },
  { id: 'b', fullName: 'Nguyễn An', avatarUrl: null },
  { id: 'c', fullName: 'Trần Bình', avatarUrl: null },
];

describe('foldText', () => {
  it('bỏ dấu và chữ đ', () => {
    expect(foldText('Đặng Ánh')).toBe('dang anh');
  });
});

describe('findMentionQuery', () => {
  it('lấy chữ sau @ tới con trỏ', () => {
    expect(findMentionQuery('xin chào @an', 12)).toEqual({ start: 9, query: 'an' });
    expect(findMentionQuery('@', 1)).toEqual({ start: 0, query: '' });
  });

  it('bỏ qua email, xuống dòng, khoảng trắng ngay sau @', () => {
    expect(findMentionQuery('mail a@b', 8)).toBeNull();
    expect(findMentionQuery('@an\nb', 5)).toBeNull();
    expect(findMentionQuery('@ an', 4)).toBeNull();
  });
});

describe('matchMembers', () => {
  it('khớp không phân biệt dấu, hoa thường', () => {
    expect(matchMembers(members, 'ng').map((member) => member.id)).toEqual(['a', 'b']);
    expect(matchMembers(members, 'BÌNH').map((member) => member.id)).toEqual(['c']);
  });
});

describe('insertMention', () => {
  it('thay đoạn @gõ dở bằng tên đầy đủ, con trỏ sau tên', () => {
    expect(insertMention('nhờ @ng xem', { start: 4, caret: 7 }, 'Nguyễn An')).toEqual({
      text: 'nhờ @Nguyễn An  xem',
      caret: 15,
    });
  });
});

describe('mentionedIds', () => {
  it('chỉ người còn "@Họ Tên" trong chữ', () => {
    expect(mentionedIds('@Nguyễn An và @Trần Bình xem', members)).toEqual(['b', 'c']);
    expect(mentionedIds('Nguyễn An xem', members)).toEqual([]);
  });
});
