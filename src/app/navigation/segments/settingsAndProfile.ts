import { NavigationTree } from "@/@types/navigation";

export const settingsAndProfile: NavigationTree = {
  id: "settingsAndProfile",
  type: "collapse",
  path: "/settings",
  title: "Settings",
  icon: "settingsAndProfile",
  childs: [
    {
      id: "settingsAndProfile.profile",
      type: "item",
      path: "/settings/profile",
      title: "Profile",
      icon: "settingsAndProfile.profile",
    },
    {
      id: "settingsAndProfile.general",
      type: "item",
      path: "/settings/general",
      title: "General",
      icon: "settingsAndProfile.general",
    },
    {
      id: "settingsAndProfile.appearance",
      type: "item",
      path: "/settings/appearance",
      title: "Appearance",
      icon: "settingsAndProfile.appearance",
    },
  ],
};
