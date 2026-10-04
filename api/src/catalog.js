import { Product, Store } from './models.js'

export const DEFAULT_PRODUCTS = [
  { slug: 'shirts', name: 'Shirts', description: 'Formal & casual shirts', image: 'shirt.jpg', prices: { wash: 20, iron: 15, dryClean: 60, bleach: 25 } },
  { slug: 't-shirts', name: 'T-Shirts', description: 'Cotton & polo tees', image: 'tshirt.jpg', prices: { wash: 15, iron: 10, dryClean: 45, bleach: 20 } },
  { slug: 'trousers', name: 'Trousers', description: 'Formal trousers & chinos', image: 'trouser.jpg', prices: { wash: 25, iron: 15, dryClean: 70, bleach: 30 } },
  { slug: 'jeans', name: 'Jeans', description: 'Denim of all kinds', image: 'jeans.webp', prices: { wash: 30, iron: 20, dryClean: 80, bleach: 35 } },
  { slug: 'boxers', name: 'Boxers', description: 'Innerwear & shorts', image: 'boxer.jpg', prices: { wash: 10, iron: 5, dryClean: 30, bleach: 15 } },
  { slug: 'joggers', name: 'Joggers', description: 'Track pants & joggers', image: 'jogger.webp', prices: { wash: 20, iron: 10, dryClean: 55, bleach: 25 } },
  { slug: 'others', name: 'Others', description: 'Towels, bedsheets & more', image: 'other.webp', prices: { wash: 35, iron: 20, dryClean: 90, bleach: 40 } },
]

export const DEFAULT_STORES = [
  { code: 'JPN', name: 'JP Nagar', city: 'Bangalore', address: '24, 15th Cross, JP Nagar 2nd Phase', phone: '+91 98765 43210' },
  { code: 'IND', name: 'Indiranagar', city: 'Bangalore', address: '102, 100 Feet Road, Indiranagar', phone: '+91 98765 43211' },
  { code: 'KOR', name: 'Koramangala', city: 'Bangalore', address: '7, 5th Block, Koramangala', phone: '+91 98765 43212' },
]

/** Inserts the default catalog if the collections are empty. Safe to run on every boot. */
export async function ensureCatalog() {
  if ((await Product.estimatedDocumentCount()) === 0) {
    await Product.insertMany(DEFAULT_PRODUCTS.map((p, i) => ({ ...p, sortOrder: i })))
  }
  if ((await Store.estimatedDocumentCount()) === 0) {
    await Store.insertMany(DEFAULT_STORES)
  }
}
