import { Avatar, Button, Input } from '@/components/ui';

interface ProfileAvatarFieldProps {
  fullName: string;
  /** Ảnh đang lưu (signed URL); null nếu chưa có. */
  avatarUrl: string | null;
  /** Đã bấm [Gỡ ảnh], chờ [Lưu hồ sơ]. */
  removing: boolean;
  disabled: boolean;
  onRemoveChange: (removing: boolean) => void;
  onFileChange: (file: File | null) => void;
}

/** Ảnh đại diện: xem ảnh hiện tại, [Gỡ ảnh] / [Hoàn tác], chọn ảnh mới. Thay đổi lưu cùng nút Lưu hồ sơ. */
export function ProfileAvatarField({
  fullName,
  avatarUrl,
  removing,
  disabled,
  onRemoveChange,
  onFileChange,
}: ProfileAvatarFieldProps) {
  const showsPhoto = avatarUrl !== null && !removing;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        {showsPhoto ? (
          <img
            src={avatarUrl}
            alt={`Ảnh đại diện của ${fullName}`}
            className="h-24 w-24 rounded-full object-cover"
          />
        ) : (
          <Avatar name={fullName} size="lg" />
        )}
        {avatarUrl !== null && (
          <div className="space-y-1">
            <Button
              variant="secondary"
              size="sm"
              disabled={disabled}
              onClick={() => onRemoveChange(!removing)}
            >
              {removing ? 'Hoàn tác' : 'Gỡ ảnh'}
            </Button>
            {removing && <p className="text-sm text-gray-600">Ảnh sẽ được gỡ khi bấm Lưu hồ sơ.</p>}
          </div>
        )}
      </div>
      <Input
        label="Ảnh đại diện (JPG, PNG, WebP; tối đa 2 MB)"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          onFileChange(file);
          // Chọn ảnh mới thì không gỡ nữa: ảnh mới thay ảnh cũ.
          if (file) onRemoveChange(false);
        }}
      />
    </div>
  );
}
