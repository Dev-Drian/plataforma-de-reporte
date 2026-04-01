import { z } from 'zod'

// Esquemas de validación
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('El email no es válido'),
  password: z
    .string()
    .min(1, 'La contraseña es requerida')
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
})

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('El email no es válido'),
  password: z
    .string()
    .min(1, 'La contraseña es requerida')
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .regex(/[A-Z]/, 'La contraseña debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'La contraseña debe contener al menos una minúscula')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número'),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  organization_name: z.string().optional()
})

export const dateRangeSchema = z.object({
  start: z.date(),
  end: z.date()
}).refine(
  (data) => data.end >= data.start,
  {
    message: 'La fecha de fin debe ser posterior a la fecha de inicio',
    path: ['end']
  }
)

// Tipos inferidos de los schemas
export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type DateRangeFormData = z.infer<typeof dateRangeSchema>

