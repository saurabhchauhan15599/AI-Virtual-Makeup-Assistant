export interface ChildShade {
  name: string;
  hex: string;
}

export interface Product {
  sku: string;
  name: string;
  url: string;
  price: string;
  in_stock: string;
  image_url: string;
  categories: string;
  group_id: string;
  Base_price_map: string;
  Is_New_In: string;
  Is_Trending: string;
  RRP_Price_Map: string;
  available_sizes: string | null;
  brand: string;
  breadcrumbs_Categories: string;
  discount_rrp: string;
  dy_display_price: string;
  new_in_release_date: string;
  price_sale_amount: string;
  review_number: string;
  reviews_stars: string;
  rrp_saving: string;
  sale_price: string | null;
  childShades: ChildShade[];
}