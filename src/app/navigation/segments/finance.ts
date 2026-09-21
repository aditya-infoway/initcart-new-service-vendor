import { NavigationTree } from "@/@types/navigation";

export const finance: NavigationTree = {
  id: "finance",
  type: "collapse",
  path: "/finance",
  title: "FINANCE",
  icon: "finance",
  childs: [
    {
      id: "finance.withdraws",
      type: "item",
      path: "/finance/withdraws",
      title: "Withdraws",
      icon: "finance.withdraws",
    },
  ],
};
