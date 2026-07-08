import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { FamilyMember } from '../../types'
import { Button } from '../ui/Button'
import { Input, Select, Textarea } from '../ui/Input'

const memberSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  nickname: z.string().optional(),
  gender: z.enum(['', 'male', 'female', 'other']).optional(),
  date_of_birth: z.string().optional(),
  place_of_birth: z.string().optional(),
  nationality: z.string().optional(),
  occupation: z.string().optional(),
  education: z.string().optional(),
  biography: z.string().optional(),
  blood_group: z.enum(['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  religion: z.string().optional(),
  is_living: z.boolean(),
  date_of_death: z.string().optional(),
  burial_location: z.string().optional(),
  notes: z.string().optional(),
})

export type MemberFormValues = z.infer<typeof memberSchema>

interface MemberFormProps {
  initialValues?: Partial<FamilyMember>
  onSubmit: (values: MemberFormValues) => Promise<void>
  submitLabel?: string
}

export function MemberForm({ initialValues, onSubmit, submitLabel = 'Save' }: MemberFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      full_name: initialValues?.full_name ?? '',
      nickname: initialValues?.nickname ?? '',
      gender: initialValues?.gender ?? '',
      date_of_birth: initialValues?.date_of_birth ?? '',
      place_of_birth: initialValues?.place_of_birth ?? '',
      nationality: initialValues?.nationality ?? '',
      occupation: initialValues?.occupation ?? '',
      education: initialValues?.education ?? '',
      biography: initialValues?.biography ?? '',
      blood_group: initialValues?.blood_group ?? '',
      religion: initialValues?.religion ?? '',
      is_living: initialValues?.is_living ?? true,
      date_of_death: initialValues?.date_of_death ?? '',
      burial_location: initialValues?.burial_location ?? '',
      notes: initialValues?.notes ?? '',
    },
  })

  const isLiving = watch('is_living')

  function submitWithNormalizedDates(values: MemberFormValues) {
    return onSubmit({
      ...values,
      date_of_birth: values.date_of_birth || undefined,
      date_of_death: values.date_of_death || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit(submitWithNormalizedDates)} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Full name" required {...register('full_name')} error={errors.full_name?.message} />
        <Input label="Nickname" {...register('nickname')} />
        <Select label="Gender" {...register('gender')}>
          <option value="">Prefer not to say</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </Select>
        <Input label="Date of birth" type="date" {...register('date_of_birth')} />
        <Input label="Place of birth" {...register('place_of_birth')} />
        <Input label="Nationality" {...register('nationality')} />
        <Input label="Occupation" {...register('occupation')} />
        <Input label="Education" {...register('education')} />
        <Select label="Blood group" {...register('blood_group')}>
          <option value="">Unknown</option>
          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
            <option key={bg} value={bg}>
              {bg}
            </option>
          ))}
        </Select>
        <Input label="Religion (optional)" {...register('religion')} />
      </div>

      <Textarea label="Biography" rows={3} {...register('biography')} />

      <label className="flex items-center gap-2 text-sm font-medium text-ink-700 dark:text-ink-200">
        <input type="checkbox" {...register('is_living')} className="h-4 w-4 rounded" />
        Living
      </label>

      {!isLiving && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Date of death" type="date" {...register('date_of_death')} />
          <Input label="Burial / cremation location" {...register('burial_location')} />
        </div>
      )}

      <Textarea label="Personal notes" rows={2} {...register('notes')} />

      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}
