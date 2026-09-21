import {
  Dialog, DialogPanel, Transition, TransitionChild,
} from "@headlessui/react";
import {
  MagnifyingGlassIcon, ShoppingBagIcon, XMarkIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment, useCallback, useEffect, useState } from "react";

import { Button, Input } from "@/components/ui";
import { Get, toasterrormsg } from "@/ApiHelper";
import { SaleItem, mapApiSaleItem } from "./data";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (item: SaleItem) => void;
}

export function ItemSelectorModal({ open, onClose, onSelect }: Props) {
  const [items, setItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const loadItems = useCallback((query?: string) => {
    setLoading(true);
    Get("pos/sale-search-item/", query ? { query } : {})
      .then((res: any) => {
        const body = res?.data ?? res;
        const rows: any[] = Array.isArray(body?.results) ? body.results
          : Array.isArray(body?.data) ? body.data
          : Array.isArray(body) ? body : [];
        setItems(rows.map(mapApiSaleItem));
      })
      .catch(() => toasterrormsg("Failed to load items."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    loadItems();
  }, [open, loadItems]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => loadItems(search.trim() || undefined), 300);
    return () => clearTimeout(timer);
  }, [search, open, loadItems]);

  const filtered = search.trim()
    ? items.filter(i =>
        i.itemName.toLowerCase().includes(search.toLowerCase()) ||
        i.hsn.includes(search) ||
        i.barcode.includes(search) ||
        i.size.toLowerCase().includes(search.toLowerCase()) ||
        i.color.toLowerCase().includes(search.toLowerCase()))
    : items;

  const inStock = filtered.filter(i => i.stock > 0).length;

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[200]" onClose={onClose}>
        <TransitionChild as="div"
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={DialogPanel}
              enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
              className="w-full max-w-4xl rounded-2xl bg-white dark:bg-dark-700 shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="bg-primary flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-2">
                  <ShoppingBagIcon className="size-5 text-white" />
                  <h3 className="text-base font-semibold text-white">Select Item Variant</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-white/20 px-3 py-0.5 text-xs font-medium text-white">
                    {inStock} items in stock
                  </span>
                  <button onClick={onClose} className="grid size-7 place-items-center rounded-full text-white hover:bg-white/20">
                    <XMarkIcon className="size-4" />
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="border-b border-gray-200 px-5 py-3 dark:border-dark-600">
                <Input value={search} onChange={e => setSearch(e.target.value)}
                  prefix={<MagnifyingGlassIcon className="size-4" />}
                  classNames={{ input: "h-9 text-sm" }}
                  placeholder="Search item, HSN, barcode..." />
              </div>

              {/* Table */}
              <div className="max-h-[60vh] overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-primary text-white">
                      {["Action","Item Name","HSN Code","Barcode","Size","Color","S.Price","Stock","Unit","Tax%"].map(h => (
                        <th key={h} className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={10} className="py-10 text-center text-sm text-gray-400">Loading items...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={10} className="py-10 text-center text-sm text-gray-400">No items found.</td></tr>
                    ) : filtered.map(item => (
                      <tr key={item.id} className={clsx(
                        "border-b border-gray-100 transition-colors dark:border-dark-700",
                        item.stock > 0 ? "hover:bg-gray-50 dark:hover:bg-dark-600" : "opacity-60",
                      )}>
                        <td className="px-3 py-2.5">
                          <Button
                            color="primary"
                            className={clsx("h-7 gap-1 rounded-full px-3 text-xs",
                              item.stock === 0 && "opacity-50 cursor-not-allowed")}
                            onClick={() => { if (item.stock > 0) { onSelect(item); onClose(); } }}
                            disabled={item.stock === 0}
                          >
                            Select
                          </Button>
                        </td>
                        <td className="px-3 py-2.5 font-medium text-gray-800 dark:text-dark-100">{item.itemName}</td>
                        <td className="px-3 py-2.5 text-gray-500">{item.hsn}</td>
                        <td className="px-3 py-2.5  text-xs text-gray-500">{item.barcode}</td>
                        <td className="px-3 py-2.5 text-gray-500">{item.size}</td>
                        <td className="px-3 py-2.5 text-gray-500">{item.color}</td>
                        <td className="px-3 py-2.5 font-semibold text-gray-800 dark:text-dark-100">₹{item.salesPrice}</td>
                        <td className="px-3 py-2.5">
                          <span className={clsx("font-bold", item.stock > 0 ? "text-emerald-600" : "text-red-500")}>
                            {item.stock}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-gray-500">{item.unit}</td>
                        <td className="px-3 py-2.5 font-medium text-amber-600">{item.taxPercent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="flex justify-end border-t border-gray-200 px-5 py-3 dark:border-dark-600">
                <Button variant="outlined" className="px-6" onClick={onClose}>Close</Button>
              </div>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
