import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui";
import { AppShell } from "@/layouts/AppShell";

const page = (load: () => Promise<{ default: React.ComponentType }>) => {
  const C = lazy(load);
  return (
    <Suspense fallback={<Skeleton className="h-96" label="Loading page" />}>
      <C />
    </Suspense>
  );
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: page(() => import("@/pages/OverviewPage")) },
      { path: "sales", element: page(() => import("@/pages/SalesPage")) },
      { path: "customers", element: page(() => import("@/pages/CustomersPage")) },
      { path: "products", element: page(() => import("@/pages/ProductsPage")) },
      { path: "operations", element: page(() => import("@/pages/OperationsPage")) },
      { path: "forecast", element: page(() => import("@/pages/ForecastPage")) },
      { path: "anomalies", element: page(() => import("@/pages/AnomaliesPage")) },
      { path: "assistant", element: page(() => import("@/pages/AssistantPage")) },
      { path: "observatory", element: page(() => import("@/pages/ObservatoryPage")) },
      { path: "datasets", element: page(() => import("@/pages/DatasetsPage")) },
      { path: "design-system", element: page(() => import("@/pages/DesignSystemRoute")) },
      { path: "*", element: page(() => import("@/pages/NotFoundPage")) },
    ],
  },
]);

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } } });

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
