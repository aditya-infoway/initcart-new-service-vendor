import { Button } from "@/components/ui";

interface StepActionsProps {
  showPrevious?: boolean;
  onPrevious?: () => void;
  onCancel: () => void;
  submitLabel?: string;
  loading?: boolean;
}

export function StepActions({
  showPrevious = false,
  onPrevious,
  onCancel,
  submitLabel = "Next",
  loading = false,
}: StepActionsProps) {
  return (
    <div className="mt-6 flex flex-wrap justify-end gap-3">
      {showPrevious && onPrevious && (
        <Button
          type="button"
          className="min-w-[7rem]"
          onClick={onPrevious}
          disabled={loading}
        >
          Previous
        </Button>
      )}
      <Button
        type="button"
        className="min-w-[7rem]"
        onClick={onCancel}
        disabled={loading}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        className="min-w-[7rem]"
        color="primary"
        disabled={loading}
      >
        {loading ? "Please wait..." : submitLabel}
      </Button>
    </div>
  );
}
