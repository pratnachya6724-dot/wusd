'use client';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Restaurant, MenuItem } from '@/lib/data';

interface RestaurantContextType {
  restaurants: Restaurant[];
  loading: boolean;
  addRestaurant: (r: Omit<Restaurant, 'id'>) => Promise<Restaurant>;
  updateRestaurant: (id: string, data: Partial<Omit<Restaurant, 'id' | 'menu'>>) => Promise<void>;
  deleteRestaurant: (id: string) => Promise<void>;
  addMenuItem: (restaurantId: string, item: Omit<MenuItem, 'id'>) => Promise<void>;
  updateMenuItem: (restaurantId: string, itemId: string, data: Partial<Omit<MenuItem, 'id'>>) => Promise<void>;
  deleteMenuItem: (restaurantId: string, itemId: string) => Promise<void>;
  searchItems: (q: string) => { restaurant: Restaurant; item: MenuItem }[];
  autocompleteSuggestions: (q: string) => { restaurant: Restaurant; item: MenuItem }[];
}

const RestaurantContext = createContext<RestaurantContextType | null>(null);

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function mapRow(r: Record<string, unknown>, menuItems: Record<string, unknown>[]): Restaurant {
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) || '',
    image: (r.image as string) || '',
    category: (r.category as string) || '',
    rating: (r.rating as number) || 4.5,
    reviewCount: (r.review_count as number) || 0,
    deliveryTime: (r.delivery_time as string) || '20-30',
    minOrder: (r.min_order as number) || 50,
    tags: (r.tags as string[]) || [],
    menu: menuItems.map((m) => ({
      id: m.id as string,
      name: m.name as string,
      description: (m.description as string) || '',
      price: m.price as number,
      image: (m.image as string) || '',
      category: (m.category as string) || '',
      popular: (m.popular as boolean) || false,
    })),
  };
}

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRestaurants = useCallback(async () => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*, menu_items(*)')
      .order('name');

    // If Supabase has data → use it; otherwise fall back to mock data
    if (!error && data && data.length > 0) {
      const mapped = data.map((r) => mapRow(r, r.menu_items || []));
      setRestaurants(mapped);
    } else {
      setRestaurants([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchRestaurants();
    };
    init();
    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurants' }, fetchRestaurants)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, fetchRestaurants)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchRestaurants]);

  const addRestaurant = useCallback(async (data: Omit<Restaurant, 'id'>): Promise<Restaurant> => {
    const newId = genId('r');
    const { error } = await supabase.from('restaurants').insert({
      id: newId, name: data.name, description: data.description, image: data.image,
      category: data.category, rating: data.rating, review_count: data.reviewCount,
      delivery_time: data.deliveryTime, min_order: data.minOrder, tags: data.tags,
    });
    if (error) throw error;
    return { ...data, id: newId };
  }, []);

  const updateRestaurant = useCallback(async (id: string, data: Partial<Omit<Restaurant, 'id' | 'menu'>>) => {
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.description !== undefined) update.description = data.description;
    if (data.image !== undefined) update.image = data.image;
    if (data.category !== undefined) update.category = data.category;
    if (data.rating !== undefined) update.rating = data.rating;
    if (data.reviewCount !== undefined) update.review_count = data.reviewCount;
    if (data.deliveryTime !== undefined) update.delivery_time = data.deliveryTime;
    if (data.minOrder !== undefined) update.min_order = data.minOrder;
    if (data.tags !== undefined) update.tags = data.tags;
    const { error } = await supabase.from('restaurants').update(update).eq('id', id);
    if (error) throw error;
  }, []);

  const deleteRestaurant = useCallback(async (id: string) => {
    const { error } = await supabase.from('restaurants').delete().eq('id', id);
    if (error) throw error;
  }, []);

  const addMenuItem = useCallback(async (restaurantId: string, item: Omit<MenuItem, 'id'>) => {
    const newId = genId('m');
    const { error } = await supabase.from('menu_items').insert({
      id: newId, restaurant_id: restaurantId, name: item.name,
      description: item.description, price: item.price, image: item.image,
      category: item.category, popular: item.popular,
    });
    if (error) throw error;
  }, []);

  const updateMenuItem = useCallback(async (_restaurantId: string, itemId: string, data: Partial<Omit<MenuItem, 'id'>>) => {
    const { error } = await supabase.from('menu_items').update({
      name: data.name, description: data.description, price: data.price,
      image: data.image, category: data.category, popular: data.popular,
    }).eq('id', itemId);
    if (error) throw error;
  }, []);

  const deleteMenuItem = useCallback(async (_restaurantId: string, itemId: string) => {
    const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
    if (error) throw error;
  }, []);

  const searchItems = useCallback((query: string) => {
    const q = query.toLowerCase();
    const results: { restaurant: Restaurant; item: MenuItem }[] = [];
    restaurants.forEach(r => {
      r.menu.forEach(item => {
        if (item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) ||
            r.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q))
          results.push({ restaurant: r, item });
      });
    });
    return results;
  }, [restaurants]);

  const autocompleteSuggestions = useCallback((query: string) => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results: { restaurant: Restaurant; item: MenuItem }[] = [];
    restaurants.forEach(r => {
      r.menu.forEach(item => {
        if (item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) ||
            item.category.toLowerCase().includes(q) || r.name.toLowerCase().includes(q))
          results.push({ restaurant: r, item });
      });
    });
    results.sort((a, b) => (a.item.name.toLowerCase().startsWith(q) ? 0 : 1) - (b.item.name.toLowerCase().startsWith(q) ? 0 : 1));
    return results;
  }, [restaurants]);



  return (
    <RestaurantContext.Provider value={{
      restaurants, loading, addRestaurant, updateRestaurant, deleteRestaurant,
      addMenuItem, updateMenuItem, deleteMenuItem, searchItems, autocompleteSuggestions,
    }}>
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurants() {
  const ctx = useContext(RestaurantContext);
  if (!ctx) throw new Error('useRestaurants must be used within RestaurantProvider');
  return ctx;
}
