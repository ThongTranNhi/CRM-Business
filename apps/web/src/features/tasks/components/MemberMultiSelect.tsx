import { useId } from 'react';
import { Avatar } from '@/components/ui';
import type { MemberOption } from '../types';

interface MemberMultiSelectProps {
  label: string;
  members: MemberOption[];
  value: string[];
  onChange: (ids: string[]) => void;
}

/** Chọn nhiều người phối hợp bằng ô tick (danh sách thành viên board đã có sẵn, không gọi API). */
export function MemberMultiSelect({ label, members, value, onChange }: MemberMultiSelectProps) {
  const labelId = useId();
  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((selected) => selected !== id) : [...value, id]);

  return (
    <fieldset className="space-y-1.5" aria-labelledby={labelId}>
      <legend id={labelId} className="text-sm font-medium text-gray-700">
        {label}
      </legend>
      {members.length === 0 ? (
        <p className="text-sm text-gray-500">Không còn thành viên nào khác.</p>
      ) : (
        <ul className="max-h-40 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
          {members.map((member) => (
            <li key={member.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm text-gray-900 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={value.includes(member.id)}
                  onChange={() => toggle(member.id)}
                  className="h-4 w-4 accent-primary-500"
                />
                <Avatar name={member.fullName} src={member.avatarUrl} size="sm" />
                <span className="truncate">{member.fullName}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
