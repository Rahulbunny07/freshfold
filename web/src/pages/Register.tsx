import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import AuthLayout from '../components/AuthLayout'
import { Field, Spinner } from '../components/ui'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'

const empty = { name: '', email: '', phone: '', password: '', line: '', district: '', state: '', pincode: '' }
type Form = typeof empty

function validate(f: Form, agreed: boolean) {
  const e: Partial<Record<keyof Form | 'terms', string>> = {}
  if (f.name.trim().length < 2) e.name = 'Enter your full name'
  if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email'
  if (!/^[6-9]\d{9}$/.test(f.phone)) e.phone = 'Enter a valid 10-digit mobile number'
  if (f.password.length < 8) e.password = 'Use at least 8 characters'
  if (f.line.trim().length < 5) e.line = 'Enter your full address'
  if (f.district.trim().length < 2) e.district = 'Enter your district'
  if (f.state.trim().length < 2) e.state = 'Enter your state'
  if (!/^\d{6}$/.test(f.pincode)) e.pincode = 'Enter a valid 6-digit pincode'
  if (!agreed) e.terms = 'Please accept the terms to continue'
  return e
}

export default function Register() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<Form>(empty)
  const [agreed, setAgreed] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const set = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    if (errors[key]) setErrors(({ [key]: _, ...rest }) => rest)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validate(form, agreed)
    setErrors(found as Record<string, string>)
    if (Object.keys(found).length) return
    setSubmitting(true)
    try {
      const { token, user } = await api.register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        address: { line: form.line.trim(), district: form.district.trim(), state: form.state.trim(), pincode: form.pincode.trim() },
      })
      signIn(token, user)
      toast.success(`Welcome, ${user.name.split(' ')[0]}! Your account is ready.`)
      navigate('/orders/new', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        const fieldErrors = Object.fromEntries(Object.entries(err.fieldErrors).map(([k, v]) => [k.replace('address.', ''), v]))
        setErrors({ ...fieldErrors, ...(Object.keys(fieldErrors).length ? {} : { form: err.message }) })
      } else setErrors({ form: 'Something went wrong' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="We’ll use your address for pickups and deliveries.">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {errors.form && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errors.form}</div>}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
          <Field label="Mobile number" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={form.phone} onChange={set('phone')} error={errors.phone} placeholder="98765 43210" />
          <Field label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
          <Field label="Password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} hint="At least 8 characters" />
        </div>
        <div className="border-t border-slate-200 pt-5">
          <p className="mb-4 text-sm font-semibold text-slate-900">Pickup address</p>
          <div className="space-y-5">
            <Field label="House / street / area" autoComplete="street-address" value={form.line} onChange={set('line')} error={errors.line} />
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="District" value={form.district} onChange={set('district')} error={errors.district} />
              <Field label="State" autoComplete="address-level1" value={form.state} onChange={set('state')} error={errors.state} />
              <Field label="Pincode" inputMode="numeric" autoComplete="postal-code" maxLength={6} value={form.pincode} onChange={set('pincode')} error={errors.pincode} />
            </div>
          </div>
        </div>
        <div>
          <label className="flex items-start gap-3 text-sm text-slate-600">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); setErrors(({ terms: _, ...rest }) => rest) }} />
            I agree to the Terms & Conditions and to receive order updates.
          </label>
          {errors.terms && <p className="mt-1.5 text-xs text-red-600">{errors.terms}</p>}
        </div>
        <button type="submit" className="btn-primary w-full !py-3" disabled={submitting}>
          {submitting && <Spinner />} Create account
        </button>
      </form>
      <p className="mt-8 text-center text-sm text-slate-500">
        Already have an account? <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">Sign in</Link>
      </p>
    </AuthLayout>
  )
}
