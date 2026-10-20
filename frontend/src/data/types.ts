// Shapes mirror the real dataset's columns (ecommerce_sales_customer_analytics_150k.csv and friends),
// so the demo service can be swapped for the analytics API without touching the pages.

export type OrderStatus = "Completed" | "Returned" | "Cancelled" | "Pending";
export type DeliveryStatus = "On Time" | "Early" | "Delayed" | "Cancelled";

export interface Product {
  product_id: string;
  product_name: string;
  product_category: string;
  product_subcategory: string;
  brand: string;
  unit_price: number;
  product_cost: number;
  product_rating: number;
}

export interface Customer {
  customer_id: string;
  customer_segment: string;
  region: string;
  customer_country: string;
  gender: string;
  customer_age: number;
  first_order_date: string;
}

export interface Order {
  order_id: string;
  order_date: string; // YYYY-MM-DD
  order_status: OrderStatus;
  sales_channel: string;
  customer_id: string;
  customer_segment: string;
  region: string;
  customer_country: string;
  product_id: string;
  product_category: string;
  product_subcategory: string;
  brand: string;
  payment_method: string;
  shipping_method: string;
  warehouse: string;
  delivery_days: number;
  delivery_status: DeliveryStatus;
  return_reason: string;
  customer_rating: number | null;
  marketing_channel: string;
  quantity: number;
  gross_sales: number;
  discount_amount: number;
  net_sales: number;
  product_cost: number;
  profit: number;
  is_repeat_customer: boolean;
}

export interface DemoData {
  orders: Order[];
  customers: Customer[];
  products: Product[];
  /** Last date in the data; relative date ranges count back from here. */
  maxDate: string;
  minDate: string;
}
