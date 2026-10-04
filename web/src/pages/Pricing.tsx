import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { money, SERVICE_LABELS, SERVICES } from '../lib/format'
import { PageLoader } from '../components/ui'

export default function Pricing() {
  const { data, isLoading } = useQuery({ queryKey: ['products'], queryFn: api.products, staleTime: Infinity })
  if (isLoading || !data) return <PageLoader />

  return (
    <div className="page">
      <h1 className="text-2xl font-semibold tracking-tight">Pricing</h1>
      <p className="mt-1 text-sm text-slate-500">Prices are per piece. Combine services as you like; a flat {money(data.pickupCharge)} pickup charge applies per order.</p>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Item</th>
              {SERVICES.map((s) => <th key={s} className="th text-right">{SERVICE_LABELS[s]}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.products.map((p) => (
              <tr key={p.slug}>
                <td className="td">
                  <div className="flex items-center gap-3">
                    <img src={`/products/${p.image}`} alt="" className="h-10 w-10 rounded-lg border border-slate-200 object-cover" loading="lazy" />
                    <span>
                      <span className="block font-medium text-slate-900">{p.name}</span>
                      <span className="block text-xs text-slate-500">{p.description}</span>
                    </span>
                  </div>
                </td>
                {SERVICES.map((s) => <td key={s} className="td text-right tabular-nums">{money(p.prices[s])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end">
        <Link to="/orders/new" className="btn-primary">Start an order</Link>
      </div>
    </div>
  )
}
