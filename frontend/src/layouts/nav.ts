export interface NavItem {
  id: string;
  path: string;
  label: string;
  group: "Analytics" | "Predictive" | "AI" | "Data" | "System";
  badge?: string | number;
}

/** The app's pages, in sidebar order. Labels match each page's title exactly. */
export const NAV_ITEMS: NavItem[] = [
  { id: "overview", path: "/", label: "Executive overview", group: "Analytics" },
  { id: "sales", path: "/sales", label: "Sales", group: "Analytics" },
  { id: "customers", path: "/customers", label: "Customers", group: "Analytics" },
  { id: "products", path: "/products", label: "Products", group: "Analytics" },
  { id: "operations", path: "/operations", label: "Operations", group: "Analytics" },
  { id: "forecast", path: "/forecast", label: "Forecast", group: "Predictive" },
  { id: "anomalies", path: "/anomalies", label: "Anomalies", group: "Predictive" },
  { id: "assistant", path: "/assistant", label: "Lens assistant", group: "AI" },
  { id: "observatory", path: "/observatory", label: "AI observatory", group: "AI" },
  { id: "datasets", path: "/datasets", label: "Dataset management", group: "Data" },
  { id: "design-system", path: "/design-system", label: "Design system", group: "System" },
];
