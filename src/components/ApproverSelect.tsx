import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Approver } from '@/hooks/useApprovers';
import { Loader2 } from 'lucide-react';

interface ApproverSelectProps {
  label: string;
  approvers: Approver[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
  error?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
}

export function ApproverSelect({
  label,
  approvers,
  value,
  onChange,
  placeholder = 'Select an approver',
  loading = false,
  error,
  helpText,
  required = false,
  disabled = false,
}: ApproverSelectProps) {
  const getDisplayName = (approver: Approver) => {
    if (approver.full_name) {
      return `${approver.full_name} (${approver.email})`;
    }
    return approver.email;
  };

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {loading ? (
        <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading approvers...</span>
        </div>
      ) : approvers.length === 0 ? (
        <div className="flex items-center h-10 px-3 border rounded-md bg-muted/50">
          <span className="text-sm text-muted-foreground">No approvers available</span>
        </div>
      ) : (
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger className={error ? 'border-destructive' : ''}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            {approvers.map((approver) => (
              <SelectItem key={`${approver.user_id}-${approver.role}`} value={approver.email}>
                {getDisplayName(approver)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {helpText && !error && <p className="text-xs text-muted-foreground">{helpText}</p>}
    </div>
  );
}
