export interface NavItem {
  id: string;
  label: string;
  group: "Analytics" | "Predictive" | "AI" | "Data" | "System";
  badge?: string | number;
}

/** The app's pages, in sidebar order. Labels match each page's title exactly. */
export const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Executive overview", group: "Analytics" },
  { id: "sales", label: "Sales", group: "Analytics" },
  { id: "customers", label: "Customers", group: "Analytics" },
  { id: "products", label: "Products", group: "Analytics" },
  { id: "operations", label: "Operations", group: "Analytics" },
  { id: "forecast", label: "Forecast", group: "Predictive" },
  { id: "anomalies", label: "Anomalies", group: "Predictive" },
  { id: "assistant", label: "Lens assistant", group: "AI" },
  { id: "observatory", label: "AI observatory", group: "AI" },
  { id: "datasets", label: "Dataset management", group: "Data" },
  { id: "design-system", label: "Design system", group: "System" },
];
