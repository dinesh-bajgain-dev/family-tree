import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

interface FieldWrapperProps {
  label?: string
  error?: string
}

const fieldClasses =
  'w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-white/70 dark:bg-ink-900/60 px-3 py-2 text-sm text-ink-900 dark:text-ink-100 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldWrapperProps>(
  ({ label, error, className = '', id, ...props }, ref) => (
    <label className="flex flex-col gap-1.5 text-sm" htmlFor={id}>
      {label && <span className="font-medium text-ink-700 dark:text-ink-200">{label}</span>}
      <input ref={ref} id={id} className={`${fieldClasses} ${className}`} {...props} />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </label>
  ),
)
Input.displayName = 'Input'

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & FieldWrapperProps
>(({ label, error, className = '', id, ...props }, ref) => (
  <label className="flex flex-col gap-1.5 text-sm" htmlFor={id}>
    {label && <span className="font-medium text-ink-700 dark:text-ink-200">{label}</span>}
    <textarea ref={ref} id={id} className={`${fieldClasses} ${className}`} {...props} />
    {error && <span className="text-xs text-red-500">{error}</span>}
  </label>
))
Textarea.displayName = 'Textarea'

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & FieldWrapperProps
>(({ label, error, className = '', id, children, ...props }, ref) => (
  <label className="flex flex-col gap-1.5 text-sm" htmlFor={id}>
    {label && <span className="font-medium text-ink-700 dark:text-ink-200">{label}</span>}
    <select ref={ref} id={id} className={`${fieldClasses} ${className}`} {...props}>
      {children}
    </select>
    {error && <span className="text-xs text-red-500">{error}</span>}
  </label>
))
Select.displayName = 'Select'
