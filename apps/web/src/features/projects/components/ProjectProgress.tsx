import { Badge, ProgressBar } from '@/components/ui';
import { progressLabel } from '../project.utils';
import type { ProjectProgress as Progress } from '../types';

/** BR-31: thanh % + "x/y việc xong" + số việc quá hạn. Chưa có task → chỉ hiện câu nhắc. */
export function ProjectProgress({ progress }: { progress: Progress }) {
  return (
    <div className="min-w-40 space-y-1">
      {progress.percent !== null && (
        <ProgressBar value={progress.percent} label={`Tiến độ ${progress.percent}%`} />
      )}
      <p className="flex flex-wrap items-center gap-1.5 text-xs text-gray-600">
        {progress.percent !== null && <b className="font-semibold">{progress.percent}%</b>}
        {progressLabel(progress)}
        {progress.overdue > 0 && <Badge tone="danger">{progress.overdue} quá hạn</Badge>}
      </p>
    </div>
  );
}
