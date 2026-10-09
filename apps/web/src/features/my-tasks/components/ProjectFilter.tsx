import { useState } from 'react';
import { Icon, SearchInput } from '@/components/ui';
import { useProjectName, useProjectOptions } from '@/features/projects/project-options';

interface ProjectFilterProps {
  /** `?project=` đang lọc; rỗng = mọi dự án. */
  projectId: string;
  onChange: (projectId: string) => void;
}

/** Lọc theo dự án: gõ để tìm (server), chọn một kết quả; đã chọn → hiện tên + nút bỏ lọc. */
export function ProjectFilter({ projectId, onChange }: ProjectFilterProps) {
  const [term, setTerm] = useState('');
  const name = useProjectName(projectId);
  const options = useProjectOptions(term);

  if (projectId) {
    return (
      <div className="flex h-10 items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 text-sm text-primary-800">
        <Icon name="folder" size={16} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{name ?? 'Dự án đã chọn'}</span>
        <button
          type="button"
          aria-label="Bỏ lọc dự án"
          onClick={() => onChange('')}
          className="rounded p-0.5 hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
        >
          <Icon name="x" size={16} />
        </button>
      </div>
    );
  }
  const results = term ? (options.data?.data ?? []) : [];
  return (
    <div className="relative">
      <SearchInput
        label="Tìm dự án để lọc"
        placeholder="Lọc theo dự án…"
        value={term}
        onSearch={setTerm}
      />
      {term && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg">
          {options.isPending && <li className="px-3 py-2 text-gray-500">Đang tìm…</li>}
          {!options.isPending && results.length === 0 && (
            <li className="px-3 py-2 text-gray-500">Không có dự án phù hợp</li>
          )}
          {results.map((project) => (
            <li key={project.id}>
              <button
                type="button"
                onClick={() => {
                  setTerm('');
                  onChange(project.id);
                }}
                className="block w-full px-3 py-2 text-left hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none"
              >
                <span className="font-medium text-gray-900">{project.name}</span>
                <span className="ml-2 text-xs text-gray-500">{project.department.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
