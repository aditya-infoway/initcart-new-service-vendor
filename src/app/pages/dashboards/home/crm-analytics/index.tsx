import type { ComponentType, SVGProps } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import {
  ArchiveBoxIcon,
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ClockIcon,
  CubeIcon,
  EllipsisHorizontalIcon,
  ExclamationCircleIcon,
  ShoppingBagIcon,
  TruckIcon,
  UserGroupIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { Card, Table, TBody, THead, Td, Th, Tr } from "@/components/ui";
import { Page } from "@/components/shared/Page";
import { dashboardData } from "./dashboardData";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const metricIcons: readonly Icon[] = [ArchiveBoxIcon, ShoppingBagIcon, CubeIcon, UserGroupIcon];
const statusIcons: readonly Icon[] = [ClockIcon, CheckCircleIcon, ArchiveBoxIcon, TruckIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon, ExclamationCircleIcon];

const toneClasses = {
  primary: "bg-primary-500/10 text-primary-600 dark:text-primary-400",
  secondary: "bg-secondary-500/10 text-secondary-600 dark:text-secondary-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  info: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  error: "bg-red-500/10 text-red-600 dark:text-red-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
} as const;

const statusText = {
  primary: "text-primary-600 dark:text-primary-400",
  secondary: "text-secondary-600 dark:text-secondary-400",
  warning: "text-amber-600 dark:text-amber-400",
  success: "text-emerald-600 dark:text-emerald-400",
  info: "text-sky-600 dark:text-sky-400",
  error: "text-red-600 dark:text-red-400",
  rose: "text-rose-600 dark:text-rose-400",
} as const;

type Tone = keyof typeof toneClasses;

// Guards against `status.tone` coming back typed as a plain `string` from
// dashboardData, and falls back safely instead of producing an invisible/blank card.
function resolveTone(tone: string): Tone {
  return (tone in toneClasses ? tone : "primary") as Tone;
}

// IMPORTANT: fixes the invisible 2nd metric card.
// bg-secondary-500 (solid) was never actually defined in the Tailwind theme —
// only the /10-opacity variant is used elsewhere (toneClasses), so this class
// silently produced no background at all, leaving white text on a transparent
// card. Swap in colors that are confirmed to exist in your theme (or, better,
// add `--color-secondary-500` to your Tailwind theme and revert this).
const metricCardClasses: readonly string[] = [
  "bg-primary-600",
  "bg-indigo-500", // was bg-secondary-500 — replace once secondary-500 is defined in your theme
  "bg-amber-500",
  "bg-emerald-500",
];

const FALLBACK_ICON: Icon = CubeIcon;

const revenueOptions: ApexOptions = {
  chart: { toolbar: { show: false }, parentHeightOffset: 0, fontFamily: "Inter, sans-serif" },
  colors: ["#4f46e5", "#06b6d4"],
  stroke: { curve: "smooth", width: 3.5 },
  dataLabels: { enabled: false },
  legend: { position: "top", horizontalAlign: "right", markers: { radius: 12 } as any },
  grid: { borderColor: "#e5e7eb", strokeDashArray: 4, padding: { left: 4, right: 8 } },
  fill: { type: "solid", opacity: 0.14 },
  markers: { size: 3, strokeWidth: 2, strokeColors: "#fff", hover: { size: 7 } },
  states: { hover: { filter: { type: "lighten" } }, active: { filter: { type: "darken" } } },
  yaxis: { labels: { formatter: (value: number) => `₹${Math.round(value / 1000)}k` } },
  xaxis: { axisBorder: { show: false }, axisTicks: { show: false } },
  tooltip: { enabled: true, theme: "light", shared: true, intersect: false, followCursor: true, y: { formatter: (value: number) => `₹${value.toLocaleString("en-IN")}` } },
};

function PeriodTabs() {
  return (
    <div className="dark:bg-dark-600 flex rounded-lg bg-gray-100 p-1 text-xs font-medium">
      <span className="rounded-md bg-white px-3 py-1.5 text-primary-600 shadow-sm dark:bg-dark-700 dark:text-primary-400">Month</span>
      <span className="px-3 py-1.5 text-gray-500 dark:text-dark-200">Week</span>
      <span className="px-3 py-1.5 text-gray-500 dark:text-dark-200">Day</span>
    </div>
  );
}

function SalesChart({ series, name = "Sales" }: { series: readonly number[]; name?: string }) {
  const options: ApexOptions = {
    chart: { toolbar: { show: false }, parentHeightOffset: 0 },
    stroke: { curve: "smooth", width: 3.5 },
    colors: ["#4f46e5"],
    // Data labels were previously left at their ApexCharts default (enabled),
    // which is why every point on the line showed a little number badge.
    // Disabling them here (same as the big revenue chart above) and relying
    // on the tooltip is the "proper" way to surface the value on hover only.
    dataLabels: { enabled: false },
    fill: { type: "solid", opacity: 0.13 },
    markers: { size: 3, strokeWidth: 2, strokeColors: "#fff", hover: { size: 8 } },
    states: { hover: { filter: { type: "lighten" } }, active: { filter: { type: "darken" } } },
    grid: { show: false, padding: { left: 2, right: 2, top: 8, bottom: 0 } },
    xaxis: {
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
      categories: series.map((_, index) => `Day ${index + 1}`),
    },
    yaxis: { show: false },
    tooltip: {
      enabled: true,
      theme: "light",
      shared: false,
      intersect: false,
      followCursor: true,
      x: { show: true },
      y: { title: { formatter: () => `${name}:` }, formatter: (value: number) => `₹${value.toLocaleString("en-IN")}` },
    },
  };
  return (
    <div className="cursor-crosshair">
      <Chart type="area" height={155} options={options} series={[{ name, data: [...series] }]} />
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold tracking-tight text-gray-800 dark:text-dark-100">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">{subtitle}</p>}
    </div>
  );
}

function DataTable({
  title,
  subtitle,
  headings,
  rows,
  showArrow = true,
}: {
  title: string;
  subtitle?: string;
  headings: readonly string[];
  rows: readonly (readonly string[])[];
  showArrow?: boolean;
}) {
  return (
    <Card className="overflow-hidden" skin="shadow">
      <div className="table-toolbar flex items-start justify-between border-b border-gray-100 px-5 py-4 dark:border-dark-600">
        <SectionTitle title={title} subtitle={subtitle} />
        <button className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-primary-500/10 hover:text-primary-600">
          <EllipsisHorizontalIcon className="size-5" />
        </button>
      </div>
      <div className="overflow-x-auto">
        <Table className="w-full text-left text-sm">
          <THead className="bg-gray-50/80 dark:bg-dark-700/60">
            <Tr>
              {headings.map((heading) => (
                <Th key={heading} className="whitespace-nowrap px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-300">
                  {heading}
                </Th>
              ))}
              {showArrow && <Th className="w-10 px-3 py-3" />}
            </Tr>
          </THead>
          <TBody>
            {rows.map((row, rowIndex) => (
              <Tr key={rowIndex} className="group border-b border-gray-100 transition-colors last:border-b-0 hover:bg-primary-500/[0.045] dark:border-dark-600 dark:hover:bg-primary-500/10">
                {row.map((cell, index) => (
                  <Td key={index} className={`whitespace-nowrap px-5 py-3.5 ${index === 0 ? "font-semibold text-gray-800 dark:text-dark-100" : "text-gray-500 dark:text-dark-300"}`}>
                    {cell}
                  </Td>
                ))}
                {showArrow && <Td className="px-3 text-right text-gray-300 transition-colors group-hover:text-primary-500 dark:text-dark-400">→</Td>}
              </Tr>
            ))}
          </TBody>
        </Table>
      </div>
    </Card>
  );
}

export default function CRMAnalytics() {
  const { metrics, orderStatus, revenue, salesCards, vendors, products, services } = dashboardData;
  const statusCounts: number[] = orderStatus.map((item) => item.value);

  return (
    <Page title="InitCart POS Dashboard">
      <div className="min-h-screen pb-8">
        <main className="transition-content mx-auto max-w-[1600px] space-y-5 px-(--margin-x) pt-5 sm:pt-6">
          <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-500">InitCart POS</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900 dark:text-dark-50">Business analytics</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">Your marketplace performance at a glance.</p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 shadow-sm dark:border-dark-600 dark:bg-dark-700 dark:text-dark-200">
              <span className="size-2 rounded-full bg-emerald-500" />
              Live data <span className="border-l border-gray-200 pl-2 text-xs dark:border-dark-500">July 2026</span>
            </div>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric, index) => {
              const MetricIcon = metricIcons[index] ?? FALLBACK_ICON;
              const cardColorClass = metricCardClasses[index] ?? "bg-gray-500";
              return (
                <Card
                  key={metric.label}
                  className={`group relative overflow-hidden bg-linear-to-br p-5 text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${cardColorClass}`}
                  skin="none"
                >
                  <div className="pointer-events-none absolute -right-6 -top-6 z-0 size-28 rounded-full bg-white/10 transition-transform duration-500 group-hover:scale-125" />
                  <div className="relative z-10 flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-white/75">{metric.label}</p>
                      <p className="mt-2 text-3xl font-semibold tracking-tight">{metric.value}</p>
                    </div>
                    <span className="grid size-11 place-items-center rounded-xl border border-white/20 bg-white/15 text-white shadow-sm backdrop-blur-sm">
                      <MetricIcon className="size-5" />
                    </span>
                  </div>
                  <p className="relative z-10 mt-4 flex items-center gap-1 text-xs font-medium text-white">
                    <ArrowTrendingUpIcon className="size-3.5" />
                    {metric.change}
                    <span className="font-normal text-white/65"> vs. last month</span>
                  </p>
                </Card>
              );
            })}
          </section>

          <Card className="p-5 sm:p-6" skin="shadow">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <SectionTitle title="Order status overview" subtitle="195 orders across all InitCart stores" />
              <div className="text-sm font-semibold text-gray-700 dark:text-dark-100">
                {statusCounts.reduce((total: number, count) => total + count, 0)} <span className="text-xs font-normal text-gray-400">tracked</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {orderStatus.map((status, index) => {
                const StatusIcon = statusIcons[index] ?? FALLBACK_ICON;
                const tone = resolveTone(status.tone);
                return (
                  <div key={status.label} className="rounded-xl border border-gray-100 p-4 transition-shadow hover:shadow-md dark:border-dark-600">
                    <span className={`grid size-9 place-items-center rounded-lg ${toneClasses[tone]}`}>
                      <StatusIcon className="size-4.5" />
                    </span>
                    <p className="mt-4 text-xs font-medium text-gray-500 dark:text-dark-300">{status.label}</p>
                    <p className={`mt-1 text-xl font-semibold ${statusText[tone]}`}>{status.value}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          <section className="grid gap-5 xl:grid-cols-[1.65fr_0.85fr]">
            <Card className="p-5 sm:p-6" skin="shadow">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-dark-300">Total earnings</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-gray-900 dark:text-dark-50">{revenue.total}</p>
                </div>
                <select className="dark:border-dark-500 dark:bg-dark-700 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 outline-hidden focus:border-primary-500 dark:text-dark-100">
                  <option>Overall</option>
                  <option>Products</option>
                  <option>Services</option>
                </select>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:max-w-xs">
                <div className="rounded-lg bg-primary-500/8 p-3">
                  <p className="text-xs text-gray-500">Products</p>
                  <p className="mt-1 font-semibold text-primary-600">{revenue.product}</p>
                </div>
                <div className="rounded-lg bg-cyan-500/8 p-3">
                  <p className="text-xs text-gray-500">Services</p>
                  <p className="mt-1 font-semibold text-cyan-600">{revenue.service}</p>
                </div>
              </div>
              <div className="mt-2 cursor-crosshair">
                <Chart
                  type="area"
                  height={265}
                  options={{ ...revenueOptions, xaxis: { ...revenueOptions.xaxis, categories: [...revenue.months] } }}
                  series={[
                    { name: "Products", data: [...revenue.productSeries] },
                    { name: "Services", data: [...revenue.serviceSeries] },
                  ]}
                />
              </div>
            </Card>
            <Card className="overflow-hidden bg-primary-600 p-6 text-white transition-shadow hover:shadow-xl" skin="none">
              <p className="text-sm text-primary-100">Store health</p>
              <p className="mt-2 text-4xl font-semibold">92%</p>
              <p className="mt-1 text-sm text-primary-100">Healthy performance score</p>
              <div className="mt-8 space-y-4">
                {(
                  [
                    ["Order fulfilment", "94%"],
                    ["Customer satisfaction", "89%"],
                    ["Store uptime", "99.9%"],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span>{label}</span>
                      <span>{value}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                      <div className="h-full rounded-full bg-white" style={{ width: value }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 rounded-xl border border-white/15 bg-white/10 p-4 text-sm">
                <span className="font-medium">+18.2%</span>
                <span className="ml-1 text-primary-100">growth in customer activity this month.</span>
              </div>
            </Card>
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            {salesCards.map((card) => (
              <Card key={card.title} className="overflow-hidden p-5" skin="shadow">
                <div className="flex items-start justify-between">
                  <SectionTitle title={card.title} subtitle={card.subtitle} />
                  <PeriodTabs />
                </div>
                <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5">
                  {card.values.map(([label, value], index) => (
                    <div key={label} className="flex items-center gap-3">
                      <span
                        className={`grid size-9 place-items-center rounded-full ${
                          index === 1 ? "bg-rose-500/10 text-rose-500" : index === 2 ? "bg-emerald-500/10 text-emerald-500" : index === 3 ? "bg-indigo-500/10 text-indigo-500" : "bg-primary-500/10 text-primary-500"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-dark-100">{value}</p>
                        <p className="text-xs text-gray-500 dark:text-dark-300">{label}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <SalesChart series={card.series} name={card.title} />
                </div>
              </Card>
            ))}
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <DataTable title="Top product vendors" subtitle="Ranked by total revenue" headings={["Vendor", "Company", "Revenue", "Commission"]} rows={vendors} />
            <DataTable title="Top selling products" subtitle="Based on recent sales" headings={["Product", "Vendor", "Sales"]} rows={products} />
          </section>
          <section className="grid gap-5 xl:grid-cols-2">
            <DataTable title="Top service vendors" subtitle="Ranked by total revenue" headings={["Vendor", "Company", "Revenue", "Commission"]} rows={vendors} />
            <DataTable title="Top services" subtitle="Based on customer consumption" headings={["Service", "Customers", "Trend"]} rows={services} showArrow={false} />
          </section>
        </main>
      </div>
    </Page>
  );
}