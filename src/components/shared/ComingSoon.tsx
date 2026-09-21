// Import Dependencies
import { WrenchScrewdriverIcon } from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";

// ----------------------------------------------------------------------

interface ComingSoonProps {
  /** Page <title> and heading shown in the card */
  title: string;
  /** Optional one-line description shown under the heading */
  description?: string;
}

/**
 * Drop-in placeholder for pages that are not yet implemented.
 * Uses the project's standard Page wrapper + theme tokens so it
 * automatically inherits primary colour and dark-mode styling.
 */
export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <Page title={title}>
      <div className="transition-content flex w-full grow items-center justify-center px-(--margin-x) py-16">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-8 py-12 text-center shadow-sm dark:border-dark-500 dark:bg-dark-700">
          {/* Icon */}
          <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl border-2 border-primary/20 bg-primary/10 text-primary">
            <WrenchScrewdriverIcon className="size-10 stroke-1.5" />
          </div>

          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary dark:bg-primary/15 dark:text-primary-300">
            <span className="size-1.5 animate-pulse rounded-full bg-primary dark:bg-primary-300" />
            Under Construction
          </span>

          {/* Heading */}
          <h1 className="mt-5 text-2xl font-bold text-gray-800 dark:text-dark-50">
            {title}
          </h1>

          {/* Body copy */}
          <p className="mt-3 text-sm leading-relaxed text-gray-500 dark:text-dark-300">
            {description ??
              "This page is currently under development and will be available soon."}
          </p>
        </div>
      </div>
    </Page>
  );
}

export default ComingSoon;
