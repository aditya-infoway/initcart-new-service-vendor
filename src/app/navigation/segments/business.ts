import { NavigationTree } from "@/@types/navigation";

export const business: NavigationTree = {
  id: "business",
  type: "collapse",
  path: "/business",
  title: "BUSINESS",
  icon: "business",
  childs: [
    {
      id: "business.approvedServices",
      type: "item",
      path: "/business/approved-services",
      title: "Approved Services",
      icon: "business.approvedServices",
    },
    {
      id: "business.pendingServices",
      type: "item",
      path: "/business/pending-services",
      title: "Pending Services",
      icon: "business.pendingServices",
    },
    {
      id: "business.rejectedServices",
      type: "item",
      path: "/business/rejected-services",
      title: "Rejected Services",
      icon: "business.rejectedServices",
    },
    {
      id: "business.inquiryPage",
      type: "item",
      path: "/business/inquiry-page",
      title: "Inquiry Page",
      icon: "business.inquiryPage",
    },
    {
      id: "business.followUpsPage",
      type: "item",
      path: "/business/follow-ups-page",
      title: "Follow-ups Page",
      icon: "business.followUpsPage",
    },
  ],
};
