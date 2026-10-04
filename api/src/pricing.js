import { HttpError } from './errors.js'

/**
 * Prices an order on the server from the product catalog.
 * The client only sends product slugs, quantities and services; it never sends amounts.
 */
export function priceOrder(requestedItems, products, pickupCharge) {
  const bySlug = new Map(products.map((p) => [p.slug, p]))
  const items = requestedItems.map((req) => {
    const product = bySlug.get(req.product)
    if (!product) throw new HttpError(400, `Unknown product: ${req.product}`)
    const services = [...new Set(req.services)]
    const unitPrice = services.reduce((sum, s) => sum + product.prices[s], 0)
    return {
      product: product.slug,
      name: product.name,
      quantity: req.quantity,
      services,
      unitPrice,
      lineTotal: unitPrice * req.quantity,
    }
  })
  const subTotal = items.reduce((sum, i) => sum + i.lineTotal, 0)
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  return { items, subTotal, totalItems, pickupCharge, total: subTotal + pickupCharge }
}
