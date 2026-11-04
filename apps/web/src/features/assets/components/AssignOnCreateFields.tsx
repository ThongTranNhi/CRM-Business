import { Input, Skeleton } from '@/components/ui';
import { useIssueFormOptions } from '../hooks/useIssuedAssets';
import type { IssueForm, IssueFormErrors } from '../schemas/issued-asset.schema';
import { IssueHolderFields } from './IssueHolderFields';

interface AssignOnCreateFieldsProps {
  issue: IssueForm;
  errors: IssueFormErrors;
  /** false = "Chưa cấp": tài sản vào kho, cấp sau bằng nút [Cấp]. */
  assignNow: boolean;
  onAssignNowChange: (assignNow: boolean) => void;
  onChange: (changes: Partial<IssueForm>) => void;
}

/** Phần "Đối tượng sử dụng" của form Thêm tài sản: chọn Chưa cấp, hoặc cấp luôn cho cá nhân / phòng / công ty. */
export function AssignOnCreateFields({
  issue,
  errors,
  assignNow,
  onAssignNowChange,
  onChange,
}: AssignOnCreateFieldsProps) {
  const options = useIssueFormOptions();
  if (options.isPending) return <Skeleton className="h-24 w-full" />;
  if (options.isError) {
    return (
      <p role="alert" className="text-sm text-danger-700">
        Không tải được danh sách nhân viên. Thêm tài sản trước rồi bấm [Cấp] sau.
      </p>
    );
  }
  const people = options.data.people.map((person) => ({
    value: person.id,
    label: person.departmentName
      ? `${person.fullName} — ${person.departmentName}`
      : person.fullName,
  }));
  return (
    <div className="space-y-4 rounded-card border border-gray-200 p-4">
      <IssueHolderFields
        form={issue}
        errors={errors}
        people={people}
        unassigned={{ selected: !assignNow, onSelect: () => onAssignNowChange(false) }}
        onChange={(changes) => {
          if (changes.holderType) onAssignNowChange(true);
          onChange(changes);
        }}
      />
      {assignNow && (
        <Input
          type="date"
          label="Ngày cấp"
          value={issue.issuedOn}
          error={errors.issuedOn}
          onChange={(event) => onChange({ issuedOn: event.target.value })}
        />
      )}
    </div>
  );
}
