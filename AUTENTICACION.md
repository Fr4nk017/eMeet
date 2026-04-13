# 🎉 Sistema de Autenticación con Roles - eMeet

## 📋 Descripción General

He implementado un **sistema de autenticación profesional** con soporte para 3 tipos de usuarios en la plataforma eMeet:

### Tipos de Usuario

#### 1. **Usuario Regular** (usuario)
- Acceso a la exploración de eventos, bares y restaurantes
- Puede ver eventos, cupones y promociones
- Puede guardar eventos favoritos y cambiar preferencias
- Acceso a chateo comunitario
- **Ruta**: `/chat` (página de inicio)

#### 2. **Administrador** (admin)
- Acceso completo al panel de administración
- Gestiona usuarios y roles
- Revisa y modera eventos publicados
- Accede a reportes y estadísticas
- Gestiona reportes de usuarios
- **Ruta**: `/admin`

#### 3. **Locatario** (locatario)
- Panel para propietarios de establecimientos
- Crear y editar eventos
- Gestionar cupones de descuento
- Ver estadísticas de asistencia
- Analítica de visitas y conversión
- **Ruta**: `/locatario`

---

## 🚀 Cómo Usar

### Acceso al Login

```
URL: http://localhost:3000/auth
```

### Credenciales de Demostración

Haz clic en los botones de **"Tipo de cuenta"** para cambiar entre roles:

#### Usuario Regular
- **Email**: `user@emeet.com`
- **Contraseña**: cualquiera (demo)

#### Administrador
- **Email**: `admin@emeet.com`
- **Contraseña**: cualquiera (demo)

#### Locatario
- **Email**: `locatario@emeet.com`
- **Contraseña**: cualquiera (demo)

---

## 📁 Archivos Creados/Modificados

### Nuevos Componentes

1. **`src/components/LoginForm.tsx`**
   - Formulario de login profesional
   - Selector de tipo de usuario para demo
   - Validación de campos

2. **`src/components/SignUpForm.tsx`**
   - Formulario de registro con campos dinámicos según rol
   - Para locatarios: campos adicionales de negocio
   - Validación completa

3. **`src/components/NavBar.tsx`**
   - Barra de navegación responsive
   - Muestra usuario autenticado
   - Navegación según rol
   - Botón de logout

4. **`src/components/ProtectedRoute.tsx`**
   - Componente para proteger rutas
   - Valida rol de usuario
   - Redirige si no tiene acceso

### Páginas

1. **`app/auth/page.tsx`** (mejorada)
   - Página de autenticación
   - Tabs para login/registro
   - Diseño profesional con gradientes
   - Botones de login social (placeholder)

2. **`app/admin/page.tsx`** (nueva)
   - Dashboard de administrador
   - Estadísticas de usuarios y eventos
   - Tabla de actividad reciente
   - Gestión de reportes

3. **`app/locatario/page.tsx`** (nueva)
   - Panel para locatarios
   - Crear eventos
   - Gestionar cupones
   - Analítica de rendimiento

### Contexto y Tipos

1. **`src/context/AuthContext.tsx`** (mejorado)
   - Soporte para roles
   - Métodos: `login()`, `logout()`, `updateUser()`
   - Flags: `isAdmin`, `isLocatario`
   - Persistencia en localStorage

2. **`src/types/index.ts`** (mejorado)
   - Tipo `UserRole`: `'user' | 'admin' | 'locatario'`
   - Expandida interfaz `User`
   - Nuevos campos: `role`, `isVerified`, `phone`, `businessName`, `businessLocation`

3. **`src/providers/AppProviders.tsx`** (mejorado)
   - Incluye `NavBar` en todas las páginas

---

## 🎨 Diseño y Colores

El login respeta la paleta de colores de eMeet:

- **Violeta Primario**: `#7C3AED` (botones, texto destacado)
- **Dorado Accent**: `#F59E0B` (botón de locatario)
- **Fondo Oscuro**: `#1A1A2E` (background principal)
- **Card**: `#16213E` (tarjetas y inputs)
- **Muted**: `#94A3B8` (texto secundario)

### Características Visuales
- Fondos con degradados y blur effects
- Iconos de React Icons
- Animaciones suaves con Tailwind
- Componentes responsive (mobile-first)
- Botones con hover effects

---

## 🔄 Flujo de Autenticación

```
1. Usuario va a /auth
   ↓
2. Selecciona tipo de cuenta (Usuario/Admin/Locatario)
   ↓
3. Ingresa email/contraseña
   ↓
4. Se guarda en AuthContext + localStorage
   ↓
5. Se redirige según rol:
   - User → /chat
   - Admin → /admin
   - Locatario → /locatario
   ↓
6. NavBar aparece en todas las páginas
7. Botón logout destruye sesión
```

---

## 🛡️ Protección de Rutas

Usa el componente `ProtectedRoute` para proteger páginas:

```tsx
import ProtectedRoute from '@/src/components/ProtectedRoute'

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      {/* Contenido solo para admins */}
    </ProtectedRoute>
  )
}
```

---

## 📦 Persistencia de Datos

Los datos de usuario se guardan en `localStorage`:

```typescript
// Se guarda al hacer login
localStorage.setItem('authUser', JSON.stringify(user))

// Se carga automáticamente si existe (implementar en useEffect)
const savedUser = localStorage.getItem('authUser')
```

---

## ✨ Funcionalidades Implementadas

### Panel de Admin
- ✅ Dashboard con estadísticas
- ✅ Tabla de usuarios/eventos
- ✅ Gestión de reportes
- ✅ Estado de actividades recientes

### Panel de Locatario
- ✅ Crear eventos
- ✅ Gestor de cupones
- ✅ Tabla de eventos
- ✅ Estadísticas de rendimiento
- ✅ Progreso visual de analítica

### Login/Registro
- ✅ Selector de roles
- ✅ Validación de formularios
- ✅ Mensajes de error
- ✅ Visibilidad de contraseña

---

## 🔧 Próximas Mejoras (Opcional)

1. **Backend Integration**
   - Conectar con API real
   - Implementar JWT tokens
   - Hash de contraseñas

2. **Features Adicionales**
   - Recuperar contraseña
   - Verificación de email
   - Two-factor authentication
   - OAuth con Google/Apple

3. **Validaciones**
   - Validaciones más estrictas
   - Rate limiting en login
   - Detección de fraude

4. **UI/UX**
   - Animaciones más sofisticadas
   - Temas (dark/light)
   - Notificaciones toast

---

## 🚁 Comandos Útiles

```bash
# Desarrollar
npm run dev

# Construir
npm run build

# Producción
npm start
```

---

## 📞 Soporte

Si necesitas cambios o mejoras en el sistema de autenticación, contáctame. El código está completamente comentado y es fácil de personalizar.

**¡Disfruta del sistema!** 🎉
