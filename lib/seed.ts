import { supabase } from './supabase';

const SAMPLE_RESTAURANTS = [
  {
    name: 'ครัวครูแอน (โรงอาหารกิจกรรม)',
    description: 'อาหารตามสั่งรสเด็ด ขวัญใจชาว มวล. สด สะอาด ราคามิตรภาพ',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
    category: 'อาหารไทย',
    min_order: 40,
    tags: ['อาหารตามสั่ง', 'รสเด็ด', 'ยอดนิยม'],
    menu: [
      { name: 'ข้าวผัดกะเพราไก่ไข่ดาว', price: 50, category: 'อาหารจานเดียว', popular: true, image: 'https://images.unsplash.com/photo-1562607394-5bad038cf0a5?auto=format&fit=crop&w=300&q=80' },
      { name: 'ข้าวคะน้าหมูกรอบ', price: 60, category: 'อาหารจานเดียว', popular: true, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80' },
      { name: 'ต้มยำกุ้งน้ำข้น', price: 120, category: 'กับข้าว', image: 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?auto=format&fit=crop&w=300&q=80' }
    ]
  },
  {
    name: 'ร้านตำแซ่บ (หน้า ม.)',
    description: 'ส้มตำปลาร้านัวๆ ไก่ย่างเขาสวนกวาง คอหมูย่างฉ่ำๆ',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21bc4a6f8?auto=format&fit=crop&w=800&q=80',
    category: 'อาหารอีสาน',
    min_order: 60,
    tags: ['ส้มตำ', 'แซ่บ', 'นัว'],
    menu: [
      { name: 'ส้มตำไทยปู', price: 45, category: 'ส้มตำ', image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=300&q=80' },
      { name: 'ลาบหมู', price: 70, category: 'ลาบ', popular: true, image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=300&q=80' },
      { name: 'ไก่ย่างส่วนสะโพก', price: 80, category: 'ของย่าง', image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=300&q=80' }
    ]
  },
  {
    name: 'คาเฟ่ มวล. (WUS Cafe)',
    description: 'กาแฟอาราบิก้าแท้ เบเกอรี่โฮมเมด บรรยากาศน่านั่ง',
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80',
    category: 'ของหวาน/เครื่องดื่ม',
    min_order: 30,
    tags: ['กาแฟ', 'ขนมหวาน', 'อ่านหนังสือ'],
    menu: [
      { name: 'อเมริกาโน่เย็น (ไม่หวาน)', price: 45, category: 'กาแฟ', popular: true, image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=300&q=80' },
      { name: 'ชาไทยเย็นนมหอม', price: 40, category: 'ชา', image: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&w=300&q=80' },
      { name: 'ครัวซองต์เนยสด', price: 55, category: 'เบเกอรี่', popular: true, image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=300&q=80' }
    ]
  }
];

export async function seedDatabase() {
  for (const res of SAMPLE_RESTAURANTS) {
    const resId = `r_${Math.random().toString(36).slice(2, 7)}`;
    
    const { error: resError } = await supabase.from('restaurants').insert({
      id: resId,
      name: res.name,
      description: res.description,
      image: res.image,
      category: res.category,
      min_order: res.min_order,
      tags: res.tags,
      rating: 4.8,
      review_count: Math.floor(Math.random() * 200) + 50
    });

    if (resError) {
      console.error('Error seeding restaurant:', resError);
      continue;
    }

    const menuItems = res.menu.map(item => ({
      id: `m_${Math.random().toString(36).slice(2, 7)}`,
      restaurant_id: resId,
      name: item.name,
      price: item.price,
      category: item.category,
      popular: item.popular || false,
      image: item.image,
      is_available: true
    }));

    const { error: menuError } = await supabase.from('menu_items').insert(menuItems);
    if (menuError) {
      console.error('Error seeding menu items:', menuError);
    }
  }
}
