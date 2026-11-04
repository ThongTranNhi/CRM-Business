import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { Button, Input } from '@/components/ui';
import { errorMessage } from '@/lib/api-client';
import { taskLinkFormSchema, type TaskLinkErrors, type TaskLinkForm } from '../schemas/task.schema';

const EMPTY: TaskLinkForm = { url: '', title: '' };

interface AddTaskLinkFormProps {
  isPending: boolean;
  /** Ném lỗi khi server từ chối — lỗi hiện dưới ô link, giữ nguyên chữ đã nhập. */
  onAdd: (link: { url: string; title: string | null }) => Promise<unknown>;
}

/** Ô dán link + tên hiển thị (tuỳ chọn), nút Thêm. */
export function AddTaskLinkForm({ isPending, onAdd }: AddTaskLinkFormProps) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<TaskLinkErrors>({});

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = taskLinkFormSchema.safeParse(form);
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      setErrors({ url: fields.url?.[0], title: fields.title?.[0] });
      return;
    }
    try {
      await onAdd({ url: parsed.data.url, title: parsed.data.title || null });
      setForm(EMPTY);
      setErrors({});
    } catch (error) {
      setErrors({ url: errorMessage(error) });
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-2 rounded-lg bg-gray-50 p-3">
      <Input
        type="url"
        label="Link"
        placeholder="https://onedrive.live.com/… hoặc link bài viết, file .docx"
        value={form.url}
        maxLength={2000}
        error={errors.url}
        onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
      />
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Input
            label="Tên hiển thị (tuỳ chọn)"
            placeholder="Ví dụ: Báo cáo tháng 10"
            value={form.title}
            maxLength={120}
            error={errors.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          />
        </div>
        <Button type="submit" loading={isPending}>
          Thêm link
        </Button>
      </div>
    </form>
  );
}
