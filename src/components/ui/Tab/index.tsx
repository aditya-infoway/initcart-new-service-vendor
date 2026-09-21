// Import Dependencies
import {
  HomeIcon,
  EnvelopeIcon,
  UserIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";

// Local Imports
import { Button, Tag } from "components/ui";
import { randomId } from "@/utils/randomId";

// ----------------------------------------------------------------------

export interface TabItem {
  id: string;
  title: string;
  icon: any;
  content: React.ReactNode;
}

export interface WithIconProps {
  tabs: TabItem[];
  selectedIndex?: number;
  onChange?: (index: number) => void;
  hidePanels?: boolean;
}

const WithIcon = ({ tabs, selectedIndex, onChange, hidePanels = false }: WithIconProps) => {
  return (
    <div className="w-full">
      <TabGroup selectedIndex={selectedIndex} onChange={onChange}>
        <div className="hide-scrollbar overflow-x-auto">
          <div className="w-full border-b-2 border-gray-150 dark:border-dark-500">
            <TabList className="-mb-0.5 flex">
              {tabs.map((tab) => (
                <Tab
                  key={tab.id}
                  className={({ selected }: { selected: boolean }) =>
                    clsx(
                      "shrink-0 space-x-2 whitespace-nowrap border-b-2 px-3 py-2 font-medium ",
                      selected
                        ? "border-primary-600 text-primary-600 dark:border-primary-500 dark:text-primary-400"
                        : "border-transparent hover:text-gray-800 focus:text-gray-800 dark:hover:text-dark-100 dark:focus:text-dark-100",
                    )
                  }
                  as={Button}
                  unstyled
                >
                  <tab.icon className="size-4.5" />
                  <span>{tab.title}</span>
                </Tab>
              ))}
            </TabList>
          </div>
        </div>
        {!hidePanels && (
          <TabPanels className="mt-3">
            {tabs.map((tab) => (
              <TabPanel key={tab.id}>{tab.content}</TabPanel>
            ))}
          </TabPanels>
        )}
      </TabGroup>
    </div>
  );
};

export { WithIcon };
export { Tab, TabGroup, TabList, TabPanel, TabPanels };
