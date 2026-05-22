# 📦 Documentación de Componentes

## 🏗️ Estructura de Componentes

```
frontend/src/
├── components/
│   ├── common/          # Componentes reutilizables
│   ├── layout/          # Componentes de layout
│   └── auth/            # Componentes de autenticación
├── pages/               # Páginas de la aplicación
├── contexts/            # Contextos de React
├── hooks/               # Custom hooks
└── services/            # Servicios API
```

## 🎨 Componentes Comunes (`components/common/`)

### 1. **Button** - Botón reutilizable
```tsx
<Button 
  type="submit" 
  loading={false}
  variant="primary" | "outline"
  size="sm" | "md" | "lg"
>
  Texto del botón
</Button>
```

**Props:**
- `type`: 'button' | 'submit' | 'reset'
- `loading`: boolean - Muestra spinner mientras carga
- `variant`: 'primary' | 'outline'
- `size`: 'sm' | 'md' | 'lg'
- `disabled`: boolean

---

### 2. **FormField** - Campo de formulario
```tsx
<FormField
  label="Nombre del campo"
  type="text"
  placeholder="Placeholder"
  error={errors.field?.message}
  helperText="Texto de ayuda"
  icon={<Icon />}
  required
  {...register('field')}
/>
```

**Props:**
- `label`: string - Etiqueta del campo
- `type`: string - Tipo de input (text, email, password, etc.)
- `error`: string - Mensaje de error
- `helperText`: string - Texto de ayuda
- `icon`: ReactNode - Icono a la izquierda
- `as`: 'input' | 'textarea' - Tipo de elemento
- `rows`: number - Filas para textarea

---

### 3. **Select** - Selector dropdown
```tsx
<Select
  label="Selecciona opción"
  options={[
    { value: '1', label: 'Opción 1' },
    { value: '2', label: 'Opción 2' }
  ]}
  placeholder="Selecciona..."
  error={errors.field?.message}
  helperText="Texto de ayuda"
  {...register('field')}
/>
```

**Props:**
- `label`: string
- `options`: Array<{value: string, label: string}>
- `placeholder`: string
- `error`: string
- `helperText`: string
- `icon`: ReactNode

---

### 4. **Card** - Tarjeta contenedora
```tsx
<Card className="p-6">
  Contenido de la tarjeta
</Card>
```

**Props:**
- `className`: string - Clases adicionales

---

### 5. **Alert** - Alerta/Notificación
```tsx
<Alert
  type="success" | "error" | "warning" | "info"
  message="Mensaje de la alerta"
  onClose={() => setAlert(null)}
/>
```

**Props:**
- `type`: 'success' | 'error' | 'warning' | 'info'
- `message`: string
- `onClose`: () => void

---

### 6. **LoadingSpinner** - Spinner de carga
```tsx
<LoadingSpinner size="sm" | "md" | "lg" />
```

---

### 7. **ErrorMessage** - Mensaje de error
```tsx
<ErrorMessage message="Error ocurrido" />
```

---

## 🏛️ Componentes de Layout (`components/layout/`)

### 1. **Layout** - Layout principal
```tsx
<Layout>
  <TuComponente />
</Layout>
```

**Estructura:**
- Sidebar (navegación lateral)
- Header (barra superior)
- Main (área de contenido)

**Ubicación:** `src/components/layout/Layout.tsx`

---

### 2. **Sidebar** - Barra lateral de navegación
- Muestra el logo y nombre de la aplicación
- Menú de navegación con iconos
- Resalta la ruta activa
- Responsive

**Ubicación:** `src/components/layout/Sidebar.tsx`

**Items del menú:**
- Dashboard (📊)
- SEO (🔍)
- Analytics (📈)
- Ads (📢)
- Settings (⚙️)

---

### 3. **Header** - Barra superior
- Muestra información del usuario
- Botón de logout
- Selector de tema (si está implementado)

**Ubicación:** `src/components/layout/Header.tsx`

---

## 🔐 Componentes de Autenticación (`components/auth/`)

### 1. **ProtectedRoute** - Ruta protegida
```tsx
<ProtectedRoute>
  <ComponenteProtegido />
</ProtectedRoute>
```

**Funcionalidad:**
- Verifica si el usuario está autenticado
- Redirige a `/login` si no está autenticado
- Muestra loading mientras verifica

**Ubicación:** `src/components/auth/ProtectedRoute.tsx`

---

## 📄 Páginas (`pages/`)

### Estructura de páginas:

```
pages/
├── auth/
│   └── LoginPage.tsx          # Página de login
├── dashboard/
│   └── Dashboard.tsx          # Dashboard principal
├── seo/
│   └── SEOPage.tsx            # Página SEO
├── analytics/
│   └── AnalyticsPage.tsx       # Página Analytics
├── ads/
│   └── AdsPage.tsx            # Página Ads
├── settings/
│   ├── SettingsPage.tsx        # Página principal de settings
│   ├── OAuthConfigPage.tsx    # Configuración OAuth
│   └── EnvironmentVariablesPage.tsx
└── errors/
    ├── NotFoundPage.tsx
    └── UnauthorizedPage.tsx
```

---

## 🎯 Uso de Componentes en Formularios

### Ejemplo completo - Formulario OAuth:

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormField, Select, Button, Card, Alert } from '../../components/common'

const schema = z.object({
  platform: z.string().min(1, 'Requerido'),
  client_id: z.string().min(1, 'Requerido'),
  client_secret: z.string().min(1, 'Requerido'),
  redirect_uri: z.string().url().optional()
})

export default function OAuthForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema)
  })

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit(onSubmit)}>
        <Select
          label="Plataforma"
          options={platformOptions}
          error={errors.platform?.message}
          {...register('platform')}
          required
        />
        
        <FormField
          label="Client ID"
          error={errors.client_id?.message}
          {...register('client_id')}
          required
        />
        
        <Button type="submit">Guardar</Button>
      </form>
    </Card>
  )
}
```

---

## 🎨 Estilos y Temas

Los componentes usan clases de Tailwind CSS con variables de tema:

- `text-text` - Color de texto principal
- `text-text-secondary` - Color de texto secundario
- `bg-background` - Fondo principal
- `bg-surface` - Fondo de superficie (cards)
- `border-border` - Color de borde
- `text-primary` - Color primario
- `text-error` - Color de error

---

## 📝 Notas Importantes

1. **Validación**: Usa `react-hook-form` con `zod` para validación
2. **Animaciones**: Los componentes usan `framer-motion` para animaciones
3. **Responsive**: Todos los componentes son responsive
4. **Accesibilidad**: Los componentes incluyen labels y ARIA attributes
5. **Iconos**: Usa SVG inline o iconos de librerías

---

## 🔄 Flujo de Datos

```
Usuario → Formulario → react-hook-form → Validación (zod) → Servicio API → Backend
```

---

## 📚 Recursos Adicionales

- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)
- [Framer Motion](https://www.framer.com/motion/)
- [Tailwind CSS](https://tailwindcss.com/)

