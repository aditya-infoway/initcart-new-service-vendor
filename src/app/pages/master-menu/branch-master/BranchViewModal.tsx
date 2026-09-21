import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { EyeIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Fragment } from "react";

import { Badge, Button } from "@/components/ui";
import { formatDateDDMMYYYY } from "@/ApiHelper";
import { Branch } from "./data";

interface BranchViewModalProps {
  isOpen: boolean;
  close: () => void;
  branch: Branch | null;
}

function SectionBox({
  title,
  accent = "blue",
  children,
}: {
  title: string;
  accent?: "blue" | "green" | "orange" | "purple";
  children: React.ReactNode;
}) {
  const accentBar =
    accent === "blue" ? "bg-primary" :
    accent === "green" ? "bg-green-500" :
    accent === "orange" ? "bg-orange-500" :
    "bg-purple-500";

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-dark-500 dark:bg-dark-750">
      <div className="flex items-start gap-3 px-4 pt-3">
        <div className={`mt-1 h-5 w-1 rounded-full ${accentBar}`} />
        <div className="pb-2">
          <h4 className="text-sm font-bold text-gray-700 dark:text-dark-100">{title}</h4>
        </div>
      </div>
      <div className="px-4 pb-4 pt-1">{children}</div>
    </div>
  );
}

function LabeledField({ label, value, className = "" }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-300">
        {label}
      </div>
      <div className="text-sm font-medium text-gray-800 dark:text-dark-100">
        {(value === null || value === undefined || value === "") ? "—" : value}
      </div>
    </div>
  );
}

function DocLink({ label, url }: { label: string; url?: string | null }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-300">
        {label}
      </div>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          <EyeIcon className="size-4" /> View
        </a>
      ) : (
        <span className="text-sm text-gray-400">N/A</span>
      )}
    </div>
  );
}

export function BranchViewModal({ isOpen, close, branch }: BranchViewModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-120" onClose={close}>
        <TransitionChild
          as="div"
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity dark:bg-black/40"
        />

        <TransitionChild
          as={DialogPanel}
          enter="ease-out transform-gpu transition-transform duration-200"
          enterFrom="translate-x-full"
          enterTo="translate-x-0"
          leave="ease-in transform-gpu transition-transform duration-200"
          leaveFrom="translate-x-0"
          leaveTo="translate-x-full"
          className="fixed top-0 right-0 flex h-full w-full lg:max-w-[65%] xl:max-w-[55%] transform-gpu flex-col bg-white dark:bg-dark-700"
        >
          {/* Header */}
          <div className="bg-primary flex shrink-0 items-center justify-between border-b border-primary/20 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-full bg-white/20 text-white">
                <EyeIcon className="size-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {branch?.branchName || "Branch Details"}
                </h3>
                <p className="mt-0.5 text-sm text-white/75">Branch Details</p>
              </div>
            </div>
            <Button
              onClick={close}
              variant="flat"
              isIcon
              className="size-8 rounded-full text-white hover:bg-white/10"
            >
              <XMarkIcon className="size-5" />
            </Button>
          </div>

          {/* Body */}
          <div className="hide-scrollbar grow space-y-3 overflow-y-auto px-5 py-5">
            {/* Meta + Logo */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge color={branch?.status === "active" ? "success" : "error"} variant="soft">
                  {(branch?.status ?? "Active").charAt(0).toUpperCase() + (branch?.status ?? "active").slice(1)}
                </Badge>
                <span className="text-sm text-gray-500 dark:text-dark-300">
                  Created: {formatDateDDMMYYYY(branch?.createdAt ?? "")}
                </span>
                {branch?.updatedAt && (
                  <span className="text-sm text-gray-500 dark:text-dark-300">
                    Updated: {formatDateDDMMYYYY(branch.updatedAt)}
                  </span>
                )}
              </div>
              {branch?.branchLogo && (
                <img
                  src={branch.branchLogo}
                  alt={branch.branchName}
                  className="size-24 rounded-full border-4 border-white object-cover shadow-md dark:border-dark-600"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              )}
            </div>

            <SectionBox title="Basic Information" accent="blue">
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-3">
                  <LabeledField label="Branch Name" value={branch?.branchName} />
                  <LabeledField
                    label="Business Type"
                    value={
                      branch?.businessType ? (
                        <Badge color="primary" variant="soft">
                          {branch.businessType.charAt(0).toUpperCase() + branch.businessType.slice(1)}
                        </Badge>
                      ) : null
                    }
                  />
                  <LabeledField
                    label="Linked Account"
                    value={branch?.linkedAccount ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{branch.linkedAccount}</span>
                        <Badge
                          color={branch.linkedAccountId ? "primary" : "warning"}
                          variant="soft"
                          className="text-xs"
                        >
                          {branch.linkedAccountId ? "Sundry Debitor" : "Sundry Creditor"}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  />
                  <LabeledField
                    label="Branch Type"
                    value={
                      branch?.branchType ? (
                        <Badge color="primary" variant="soft">
                          {branch.branchType.charAt(0).toUpperCase() + branch.branchType.slice(1)}
                        </Badge>
                      ) : null
                    }
                  />
                  <LabeledField label="Owner Name" value={branch?.ownerName} />
                  <LabeledField label="Email" value={branch?.email} />
                  <LabeledField
                    label="Phone"
                    value={
                      branch?.phone ? (
                        <a href={`tel:${branch.phone}`} className="text-primary-600 dark:text-primary-400">
                          {branch.phone}
                        </a>
                      ) : null
                    }
                  />
                </div>
              </div>
            </SectionBox>

            <SectionBox title="Address Details" accent="green">
              <div className="space-y-3">
                <LabeledField label="Address" value={branch?.address} />
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
                  <LabeledField label="City" value={branch?.city} />
                  <LabeledField label="State" value={branch?.state} />
                  <LabeledField label="Country" value={branch?.country} />
                  <LabeledField label="Pincode" value={branch?.pincode} />
                </div>
              </div>
            </SectionBox>

            <SectionBox title="Bank Details" accent="orange">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
                <LabeledField label="Bank Name" value={branch?.bankName} />
                <LabeledField label="Account Number" value={branch?.accountNumber} />
                <LabeledField label="IFSC Code" value={branch?.ifscCode} />
                <LabeledField label="UPI ID" value={branch?.upiId} />
              </div>
            </SectionBox>

            <SectionBox title="Documents" accent="purple">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
                <DocLink label="License" url={branch?.licenseFile} />
                <DocLink label="GST Certificate" url={branch?.gstCertificate} />
                <DocLink label="ID Proof" url={branch?.idProof} />
                <DocLink label="Branch Logo" url={branch?.branchLogo} />
              </div>
            </SectionBox>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 px-5 py-4 dark:border-dark-500">
            <Button color="primary" className="min-w-[8rem] gap-2" onClick={close}>
              <XMarkIcon className="size-4" /> Close
            </Button>
          </div>
        </TransitionChild>
      </Dialog>
    </Transition>
  );
}
