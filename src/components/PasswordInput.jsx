import { useState } from 'react'

// A password field with a Show / Hide button inside it. Takes the same props as <input>.
export default function PasswordInput({ className = '', ...props }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative mt-1">
      <input {...props} type={visible ? 'text' : 'password'} className={`${className.replace(/\bmt-1\b/, '')} pr-16`} />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-pressed={visible}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-2 my-auto h-fit rounded-md px-2 py-1 text-xs font-bold text-blue-100 hover:text-white"
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}
