import { Page } from "@/components/shared/Page";
import { Button } from "@/components/ui";
import { useNavigate } from "react-router";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function NewStockTransfer() {
  const navigate = useNavigate();

  return (
    <Page title="New Stock Transfer">
      <div className="transition-content w-full pb-8">
        <div className="px-(--margin-x) flex items-center gap-2 pt-4 pb-2">
          <Button variant="outlined" className="h-8 gap-2 rounded-md px-3 text-sm"
            onClick={() => navigate("/order-management/stock-transfer")}>
            <ArrowLeftIcon className="size-4" />
            <span>Back</span>
          </Button>
        </div>
        <div className="px-(--margin-x) mt-4">
          <div className="rounded-lg border border-gray-200 bg-white p-8 dark:border-dark-500 dark:bg-dark-750">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-dark-100 mb-4">New Stock Transfer</h2>
            <p className="text-gray-600 dark:text-dark-300">Stock transfer form will be implemented here.</p>
          </div>
        </div>
      </div>
    </Page>
  );
}
