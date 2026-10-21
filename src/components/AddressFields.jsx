import { METRO_MANILA_CITIES } from '../lib/pricing'
import { getBarangays } from '../data/metroManila'
import { REGION } from '../lib/address'

const fieldClass = 'w-full border border-white/20 bg-white/5 rounded-xl p-2 text-white placeholder-blue-200'

// The delivery address inputs, shared by checkout and the profile page.
// form holds name, email, phone, city, barangay, street, landmark and instructions.
export default function AddressFields({ form, onChange, showContact = true, showInstructions = true }) {
  return (
    <>
      {showContact && (
        <>
          <input required placeholder="Full name *" value={form.name} onChange={(e) => onChange('name', e.target.value)} className={fieldClass} />
          <input placeholder="Email" value={form.email} onChange={(e) => onChange('email', e.target.value)} className={fieldClass} />
          <input required placeholder="Phone number *" value={form.phone} onChange={(e) => onChange('phone', e.target.value)} className={fieldClass} />
        </>
      )}
      <input readOnly aria-label="Region" value={REGION} className="w-full border border-white/20 bg-white/10 rounded-xl p-2 text-white opacity-80" />
      <select required aria-label="City / Municipality" value={form.city} onChange={(e) => onChange('city', e.target.value)} className="w-full border border-white/20 bg-white/5 rounded-xl p-2 text-white">
        <option value="" className="text-blue-900">City / Municipality *</option>
        {METRO_MANILA_CITIES.map((city) => <option key={city} value={city} className="text-blue-900">{city}</option>)}
      </select>
      <select required aria-label="Barangay" value={form.barangay} disabled={!form.city} onChange={(e) => onChange('barangay', e.target.value)} className="w-full border border-white/20 bg-white/5 rounded-xl p-2 text-white disabled:opacity-60">
        <option value="" className="text-blue-900">{form.city ? 'Barangay *' : 'Select a city first'}</option>
        {getBarangays(form.city).map((barangay) => <option key={barangay} value={barangay} className="text-blue-900">{barangay}</option>)}
      </select>
      <input required placeholder="Street / house / building *" value={form.street} onChange={(e) => onChange('street', e.target.value)} className={fieldClass} />
      <input placeholder="Landmark (optional)" value={form.landmark} onChange={(e) => onChange('landmark', e.target.value)} className={fieldClass} />
      {showInstructions && (
        <label className="block text-sm font-semibold text-blue-100">
          Delivery instructions (optional)
          <textarea value={form.instructions || ''} onChange={(e) => onChange('instructions', e.target.value)} className={`${fieldClass} mt-1`} rows={3} />
        </label>
      )}
    </>
  )
}
