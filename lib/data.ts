export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  popular?: boolean;
}

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  minOrder: number;
  tags: string[];
  menu: MenuItem[];
}

export const DELIVERY_FEE = 10;

export const restaurants: Restaurant[] = [];

export const categories = ["ทั้งหมด", "อาหารไทย", "อาหารอีสาน", "อาหารญี่ปุ่น", "พิซซ่า", "เบอร์เกอร์", "ก๋วยเตี๋ยว"];

export function searchMenuItems(query: string) {
  const q = query.toLowerCase();
  const results: { restaurant: Restaurant; item: MenuItem }[] = [];
  restaurants.forEach(r => {
    r.menu.forEach(item => {
      if (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        r.tags.some(t => t.toLowerCase().includes(q))
      ) {
        results.push({ restaurant: r, item });
      }
    });
  });
  return results;
}
