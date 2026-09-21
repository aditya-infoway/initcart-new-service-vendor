export const dashboardData = {
  metrics: [
    { label: "Total Orders", value: "195", change: "+12.5%", tone: "primary" },
    { label: "Active Stores", value: "10", change: "+2 this month", tone: "secondary" },
    { label: "Listed Products", value: "402", change: "+36 this month", tone: "warning" },
    { label: "Total Customers", value: "7", change: "+18.2%", tone: "success" },
  ],
  orderStatus: [
    { label: "Pending", value: 58, tone: "primary" },
    { label: "Confirmed", value: 21, tone: "info" },
    { label: "Packing", value: 9, tone: "warning" },
    { label: "Out for delivery", value: 0, tone: "secondary" },
    { label: "Delivered", value: 81, tone: "success" },
    { label: "Cancelled", value: 9, tone: "error" },
    { label: "Returned", value: 4, tone: "rose" },
    { label: "Failed delivery", value: 0, tone: "error" },
  ],
  revenue: {
    total: "₹69,700",
    product: "₹7,660",
    service: "₹2,820",
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
    productSeries: [6800, 7200, 8100, 7600, 9400, 10600, 11800],
    serviceSeries: [2100, 2400, 2200, 2600, 2400, 2900, 2820],
  },
  salesCards: [
    { title: "Product sales", subtitle: "Recent sales activity", total: "₹5.8M", values: [["Author sales", "₹2,034"], ["Commission", "₹706"], ["Tax collected", "₹49"], ["All-time sales", "₹5.8M"]], series: [18, 15, 12, 23, 17, 14, 26, 34, 27, 21, 31, 42, 42] },
    { title: "Service sales", subtitle: "Recent service activity", total: "₹2.8M", values: [["Service sales", "₹2,034"], ["Commission", "₹706"], ["Tax collected", "₹49"], ["All-time services", "₹2.8M"]], series: [17, 15, 11, 20, 28, 21, 17, 25, 39, 39] },
  ],
  vendors: [
    ["Brad Simmons", "Aditya Infoway", "₹55,000", "₹18,000"],
    ["Popular Authors", "Aditya Infoway", "₹45,000", "₹15,000"],
    ["New Users", "InitCart Direct", "₹30,000", "₹7,000"],
    ["Active Customers", "TechWorld", "₹15,000", "₹4,000"],
  ],
  products: [
    ["MacBook Pro M3", "Aditya Infoway", "320"],
    ["Nike Air Max", "ShoeMart", "210"],
    ["OnePlus 12", "MobileHub", "400"],
    ["Apple Watch Ultra", "TechWorld", "150"],
  ],
  services: [
    ["Haircut & Styling", "120", "+10%"],
    ["Barber Services", "80", "-5%"],
    ["Manicure & Pedicure", "95", "+8%"],
    ["Massage Therapy", "110", "+12%"],
    ["Yoga & Pilates Classes", "60", "-2%"],
  ],
} as const;
