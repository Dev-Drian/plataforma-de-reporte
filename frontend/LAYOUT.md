# 🏗️ Layout Principal - Documentación

## Estructura del Layout

El layout principal está ubicado en `src/components/layout/Layout.tsx` y proporciona la estructura base de la aplicación.

### Componentes del Layout

```
Layout
├── Sidebar (Navegación lateral)
├── Header (Barra superior)
└── Main (Área de contenido)
```

---

## 📐 Estructura Visual

```
┌─────────────────────────────────────────────────┐
│  Sidebar  │  Header                             │
│           ├─────────────────────────────────────┤
│           │                                     │
│           │  Main Content Area                  │
│           │  (Páginas de la app)                │
│           │                                     │
│           │                                     │
└───────────┴─────────────────────────────────────┘
```

---

## 🧩 Componentes

### 1. **Sidebar** (`components/layout/Sidebar.tsx`)

**Ubicación:** Lado izquierdo, ancho fijo (256px)

**Contenido:**
- Logo y nombre de la aplicación
- Menú de navegación:
  - Dashboard (📊)
  - SEO (🔍)
  - Analytics (📈)
  - Ads (📢)
  - Settings (⚙️)

**Características:**
- Resalta la ruta activa
- Responsive (se oculta en móviles)
- Usa el tema de la aplicación

---

### 2. **Header** (`components/layout/Header.tsx`)

**Ubicación:** Parte superior, ancho completo

**Contenido:**
- Información del usuario
- Botón de logout
- Selector de tema (opcional)

**Características:**
- Fijo en la parte superior
- Muestra datos del usuario autenticado

---

### 3. **Main** (Área de contenido)

**Ubicación:** Centro, debajo del header

**Contenido:**
- Páginas de la aplicación
- Scroll vertical cuando es necesario
- Padding responsive

**Características:**
- Scroll independiente
- Max-width para contenido centrado
- Padding adaptativo (móvil/desktop)

---

## 📱 Responsive Design

### Desktop (> 768px)
- Sidebar visible (256px)
- Header completo
- Main con padding 32px

### Tablet (768px - 1024px)
- Sidebar visible (256px)
- Header completo
- Main con padding 24px

### Mobile (< 768px)
- Sidebar oculto (hamburger menu)
- Header compacto
- Main con padding 16px

---

## 🎨 Estilos

### Clases principales:

```css
/* Contenedor principal */
.flex.h-screen.bg-background

/* Sidebar */
.w-64.bg-surface.border-r

/* Header */
.flex.items-center.justify-between.p-4

/* Main */
.flex-1.overflow-y-auto.p-6
```

---

## 🔄 Uso del Layout

### En App.tsx:

```tsx
import Layout from './components/layout/Layout'

<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Layout>
        <Dashboard />
      </Layout>
    </ProtectedRoute>
  }
/>
```

### En páginas:

```tsx
// Las páginas NO necesitan importar Layout
// Solo renderizan su contenido

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      {/* Contenido de la página */}
    </div>
  )
}
```

---

## 📊 Tabla de Componentes

| Componente | Ubicación | Props | Descripción |
|------------|-----------|-------|-------------|
| `Layout` | `layout/Layout.tsx` | `children: ReactNode` | Contenedor principal |
| `Sidebar` | `layout/Sidebar.tsx` | - | Navegación lateral |
| `Header` | `layout/Header.tsx` | - | Barra superior |

---

## 🎯 Mejoras Implementadas

✅ Layout responsive  
✅ Sidebar con navegación activa  
✅ Header con información del usuario  
✅ Área de contenido con scroll independiente  
✅ Max-width para contenido centrado  
✅ Padding adaptativo  
✅ Documentación completa  

---

## 🔍 Archivos Relacionados

- `src/components/layout/Layout.tsx` - Layout principal
- `src/components/layout/Sidebar.tsx` - Sidebar
- `src/components/layout/Header.tsx` - Header
- `src/App.tsx` - Rutas que usan el Layout
- `src/pages/**/*.tsx` - Páginas que se renderizan dentro del Layout

