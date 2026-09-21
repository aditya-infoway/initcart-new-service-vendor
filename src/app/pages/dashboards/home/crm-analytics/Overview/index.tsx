

import { Card } from "@/components/ui";

export function Overview() {


  return (
    <div className="col-span-12">
     <Card className="flex flex-col pb-5">
      <div className="table-toolbar mt-3 flex items-center justify-between px-4 sm:px-5">
        <h2 className="dark:text-dark-100 truncate text-base font-medium tracking-wide text-gray-800">
          Sales Overview
        </h2>

      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 px-4 sm:grid-cols-3 sm:px-5">
        <div className="from-info to-info-darker relative flex flex-col overflow-hidden rounded-lg bg-linear-to-br p-3.5">
          <p className="text-xs text-sky-100 uppercase">Total Purchase </p>
          <div className="flex items-end justify-between space-x-2">
            <p className="mt-4 text-2xl font-medium text-white">31,556</p>
            <a
              href="##"
              className="truncate border-b border-dotted border-current pb-0.5 text-xs font-medium text-sky-100 outline-hidden transition-colors duration-300 hover:text-white focus:text-white"
            >
              Get Report
            </a>
          </div>
          <div className="mask is-reuleaux-triangle absolute top-0 right-0 -m-3 size-16 bg-white/20"></div>
        </div>
        <div className="relative flex flex-col overflow-hidden rounded-lg bg-linear-to-br from-amber-400 to-orange-600 p-3.5">
          <p className="text-xs text-amber-50 uppercase">Total Lead</p>
          <div className="flex items-end justify-between space-x-2">
            <p className="mt-4 text-2xl font-medium text-white">1,234</p>
            <a
              href="##"
              className="truncate border-b border-dotted border-current pb-0.5 text-xs font-medium text-amber-50 outline-hidden transition-colors duration-300 hover:text-white focus:text-white"
            >
              Get Report
            </a>
          </div>
          <div className="mask is-diamond absolute top-0 right-0 -m-3 size-16 bg-white/20"></div>
        </div>
        <div className="relative flex flex-col overflow-hidden rounded-lg bg-linear-to-br from-pink-500 to-rose-500 p-3.5">
          <p className="text-xs text-pink-100 uppercase">Total Order</p>
          <div className="flex items-end justify-between space-x-2">
            <p className="mt-4 text-2xl font-medium text-white">12,556</p>
            <a
              href="##"
              className="truncate border-b border-dotted border-current pb-0.5 text-xs font-medium text-pink-100 outline-hidden transition-colors duration-300 hover:text-white focus:text-white"
            >
              Get Report
            </a>
          </div>
          <div className="mask is-hexagon-2 absolute top-0 right-0 -m-3 size-16 bg-white/20"></div>
        </div>
      </div>
     
    </Card>
    </div>
  );
}
