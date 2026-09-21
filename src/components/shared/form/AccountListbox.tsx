import {
    Listbox,
    ListboxButton,
    ListboxOption,
    ListboxOptions,
    Transition,
} from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Fragment, useState } from "react";

export interface AccountOption {
    id: string;
    name: string;
    number: string;
    balance: number;
}

interface AccountListboxProps {
    data: AccountOption[];
    value: AccountOption | undefined;
    onChange: (item: AccountOption) => void;
    label?: string;
    placeholder?: string;
    error?: string;
}

export function AccountListbox({
    data,
    value,
    onChange,
    label,
    placeholder = "Select account",
    error,
}: AccountListboxProps) {
    const [search, setSearch] = useState("");

    const filtered = data.filter(
        (item) =>
            (item.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
            (item.number ?? "").toLowerCase().includes(search.toLowerCase()),
    );

    return (
        <div className="flex flex-col gap-1.5">
            {/* Label — same style as Tailux Input label */}
            {label && (
                <label className="block text-sm font-[800] text-gray-800 dark:text-dark-100">
                    {label}
                </label>
            )}

            <Listbox value={value ?? undefined} onChange={onChange}>
                {({ open }) => (
                    <div className="relative">
                        {/* Trigger — matches Tailux Input border/spacing/font */}
                        <ListboxButton
                            className={`relative h-9 w-full cursor-pointer rounded-lg border bg-white px-3 py-2 text-left text-sm transition
                focus:outline-none 
                dark:bg-dark-700 dark:text-dark-100
                ${error
                                    ? "border-error focus:ring-error/30"
                                    : open
                                        ? "border-primary ring-2 ring-primary/30"
                                        : "border-gray-300 dark:border-dark-500 hover:border-gray-400 dark:hover:border-dark-400"
                                }`}
                        >
                            {value ? (
                                <div className="flex items-center justify-between gap-2 pr-5">
                                    <span className="truncate text-sm text-gray-800 dark:text-dark-100">
                                        {value.name}{" "}
                                        <span className="text-gray-400 dark:text-dark-400 text-xs">
                                            ({value.number})
                                        </span>
                                    </span>
                                    <span className="shrink-0 text-xs font-medium text-main">
                                        ₹{value.balance.toLocaleString("en-IN")}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-sm text-gray-400 dark:text-dark-500">
                                    {placeholder}
                                </span>
                            )}
                            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                                <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
                            </span>
                        </ListboxButton>

                        {/* Dropdown */}
                        <Transition
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                        >
                            <ListboxOptions className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-400 bg-white dark:border-dark-500 dark:bg-dark-700">

                                {/* Search input */}
                                <div className="flex items-center gap-2 border rounded-lg border-gray-400 px-3 py-2 dark:border-dark-600">
                                    <MagnifyingGlassIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={(e) => e.stopPropagation()}
                                        placeholder="Search by name or number..."
                                        className="w-full bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none dark:text-dark-100 dark:placeholder-dark-500"
                                    />
                                    {search && (
                                        <button
                                            onClick={() => setSearch("")}
                                            className="shrink-0 text-gray-400 hover:text-gray-600"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>

                                {/* Options list */}
                                <div className="max-h-52 overflow-y-auto">
                                    {filtered.length === 0 ? (
                                        <div className="px-3 py-4 text-center text-xs text-gray-400">
                                            No accounts found
                                        </div>
                                    ) : (
                                        filtered.map((item) => (
                                            <ListboxOption
                                                key={item.id}
                                                value={item}
                                                className={({ active }) =>
                                                    `cursor-pointer select-none px-3 py-2 transition ${active
                                                        ? "bg-primary/8 dark:bg-primary/15"
                                                        : ""
                                                    }`
                                                }
                                            >
                                                {({ selected }) => (
                                                    <div className="flex items-center justify-between gap-2">
                                                        {/* Left: check + name + number */}
                                                        <div className="flex min-w-0 items-center gap-1.5">
                                                            {selected ? (
                                                                <CheckIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                                                            ) : (
                                                                <span className="h-3.5 w-3.5 shrink-0" />
                                                            )}
                                                            <span
                                                                className={`truncate text-sm ${selected
                                                                    ? "font-semibold text-primary"
                                                                    : "text-gray-800 dark:text-dark-100"
                                                                    }`}
                                                            >
                                                                {item.name}
                                                            </span>
                                                            <span className="shrink-0 text-xs text-gray-400 dark:text-dark-400">
                                                                ({item.number})
                                                            </span>
                                                        </div>

                                                        {/* Right: balance */}
                                                        <span
                                                            className={`shrink-0 text-sm font-medium ${selected ? "text-primary" : "text-main"
                                                                }`}
                                                        >
                                                            ₹{item.balance.toLocaleString("en-IN")}
                                                        </span>
                                                    </div>
                                                )}
                                            </ListboxOption>
                                        ))
                                    )}
                                </div>
                            </ListboxOptions>
                        </Transition>
                    </div>
                )}
            </Listbox>

            {/* Error */}
            {error && (
                <p className="text-xs text-error">{error}</p>
            )}
        </div>
    );
}