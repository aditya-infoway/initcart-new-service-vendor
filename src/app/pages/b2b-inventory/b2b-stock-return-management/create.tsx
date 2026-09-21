import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router";

import { Page } from "@/components/shared/Page";
import { Button } from "@/components/ui";

export default function B2BStockReturnManagementCreatePage() {
  const navigate = useNavigate();

  return (
    <Page title="Create B2B Stock Return">
      <div className="px-(--margin-x) py-6">
        <Button
          variant="outlined"
          className="mb-4 gap-2"
          onClick={() => navigate("/b2b-inventory/b2b-stock-return-management")}
        >
          <ArrowLeftIcon className="size-4" /> Back
        </Button>
        <p className="text-sm text-gray-500 dark:text-dark-400">
          Create B2B stock return form is not yet implemented.
        </p>
      </div>
    </Page>
  );
}
