# 🧪 Guía de Testing - Sistema de Autenticación eMeet

## ✅ Checks Antes de Empezar

```bash
# 1. Asegúrate de estar en la carpeta correcta
cd c:\Users\anton\Desktop\EMEET\eMeet_frontend

# 2. Instala las dependencias (ya lo hiciste)
npm install

# 3. Inicia el servidor de desarrollo
npm run dev
```

El servidor estará en: **http://localhost:3000**

---

## 🎯 Test Cases

### 1️⃣ Test: Login como Usuario Regular

**Paso a paso:**

1. Abre http://localhost:3000/auth
2. Haz clic en el botón **"Usuario"** (tipo de cuenta)
3. Verás las opciones pre-llenadas:
   - Email: `user@emeet.com`
   - Cualquier contraseña funciona
4. Haz clic en **"Inicia Sesión"**

**Resultados esperados:**
- ✅ Se redirige a `/chat`
- ✅ La NavBar muestra "Juan Pérez" como usuario
- ✅ Rol mostrado: "Usuario"
- ✅ Sin acceso a panels de admin o locatario

---

### 2️⃣ Test: Login como Administrador

**Paso a paso:**

1. Abre http://localhost:3000/auth
2. Haz clic en **"Admin"** (tipo de cuenta)
3. Ingresa:
   - Email: `admin@emeet.com`
   - Contraseña: cualquiera
4. Haz clic en **"Inicia Sesión"**

**Resultados esperados:**
- ✅ Se redirige a `/admin`
- ✅ Ves el dashboard de administración
- ✅ Tabla de usuarios, eventos, reportes
- ✅ NavBar muestra "Admin eMeet"
- ✅ Opción "Panel Admin" visible en NavBar

---

### 3️⃣ Test: Login como Locatario

**Paso a paso:**

1. Abre http://localhost:3000/auth
2. Haz clic en **"Locatario"** (tipo de cuenta)
3. Ingresa:
   - Email: `locatario@emeet.com`
   - Contraseña: cualquiera
4. Haz clic en **"Inicia Sesión"**

**Resultados esperados:**
- ✅ Se redirige a `/locatario`
- ✅ Ves panel de eventos, cupones analytics
- ✅ Botón "Crear Evento" disponible
- ✅ NavBar muestra "Carlos Restaurant"
- ✅ Rol mostrado: "Locatario"

---

### 4️⃣ Test: Registro como Usuario

**Paso a paso:**

1. Abre http://localhost:3000/auth
2. Haz clic en la tab **"Registrarse"**
3. Selecciona **"Usuario Regular"**
4. Llena el formulario:
   - Nombre: `Test User`
   - Email: `test@email.com`
   - Teléfono: `+56912345678`
   - Contraseña: `Password123`
   - Confirmar: `Password123`
5. Marca "Acepto los términos"
6. Haz clic en **"Crear Cuenta"**

**Resultados esperados:**
- ✅ Se crea el usuario
- ✅ Se redirige a `/chat`
- ✅ NavBar muestra el nuevo usuario

---

### 5️⃣ Test: Registro como Locatario

**Paso a paso:**

1. Abre http://localhost:3000/auth
2. Haz clic en **"Registrarse"**
3. Selecciona **"Soy Locatario"** (botón naranja)
4. Llena el formulario:
   - Nombre: `Carlos Pérez`
   - Email: `carlos@restaurant.com`
   - Teléfono: `+56987654321`
   - Nombre del negocio: `La Cantina Gourmet`
   - Ubicación: `Bellavista, Santiago`
   - Bio: `Restaurante con 10 años de experiencia`
   - Contraseña: `SecurePass123`
5. Marca términos y crea cuenta

**Resultados esperados:**
- ✅ Nuevos campos aparecen (negocio, ubicación)
- ✅ Botón es naranja/dorado
- ✅ Se redirige a `/locatario`
- ✅ Datos del negocio se muestran en panel

---

### 6️⃣ Test: NavBar y Navegación

**Paso a paso:**

1. Login como Admin
2. En la NavBar superior:
   - Haz clic en el logo eMeet
   - Haz clic en "Inicio"
   - Haz clic en "Panel Admin"

**Resultados esperados:**
- ✅ Logo redirige a `/admin`
- ✅ "Inicio" redirige a `/chat`
- ✅ "Panel Admin" redirige a `/admin`

**En móvil:**
- ✅ Menú hamburguesa aparece
- ✅ Opciones visibles al abrirlo
- ✅ Se cierra al seleccionar opción

---

### 7️⃣ Test: Logout

**Paso a paso:**

1. Login como cualquier rol
2. En NavBar, haz clic en el botón de logout (rojo, esquina superior derecha)

**Resultados esperados:**
- ✅ Usuario se desconecta
- ✅ Se redirige a `/auth`
- ✅ AuthContext se limpia
- ✅ localStorage se borra

---

### 8️⃣ Test: Protección de Rutas

**Paso a paso:**

1. Login como Usuario Regular
2. Intenta acceder a `/admin` directamente en la URL
3. Intenta acceder a `/locatario` directamente

**Resultados esperados:**
- ✅ Redirige a `/chat` (página permitida)
- ✅ No puedes ver contenido protegido

---

### 9️⃣ Test: Validaciones de Formulario

**Paso a paso (Login):**

1. Abre `/auth`
2. Intenta enviar sin llenar campos
3. Intenta con email inválido (sin @)
4. Intenta con contraseña muy corta

**Resultados esperados:**
- ✅ Validación en el lado del cliente
- ✅ Mensajes de error claros

**Paso a paso (Registro Locatario):**

1. Selecciona "Soy Locatario"
2. Deja campo "Nombre del negocio" vacío
3. Intenta crear cuenta

**Resultados esperados:**
- ✅ Error: "Debes ingresar el nombre del negocio"
- ✅ No se crea la cuenta

---

### 🔟 Test: Crear Evento (Locatario)

**Paso a paso:**

1. Login como Locatario
2. Haz clic en botón **"Crear Evento"** (naranja, arriba a la derecha)
3. Llena el modal:
   - Nombre: `Happy Hour Viernes`
   - Descripción: `Descuentos especiales todo el día`
   - Fecha/hora: mañana a las 18:00
   - Precio: `0`
4. Haz clic en **"Crear Evento"**

**Resultados esperados:**
- ✅ Modal aparece
- ✅ Al crear, muestra "Evento creado exitosamente!"
- ✅ Modal se cierra

---

## 📊 Checklist de Testing Completo

- [ ] Login funciona para los 3 roles
- [ ] Registro funciona para usuario y locatario
- [ ] NavBar se muestra correctamente en cada rol
- [ ] Protección de rutas funciona
- [ ] Logout funciona
- [ ] Validaciones de formulario funcionan
- [ ] Diseño es responsive (móvil y desktop)
- [ ] Colores respetan paleta eMeet
- [ ] Sin errores en consola de navegador
- [ ] localStorage guarda/recupera datos

---

## 🐛 Troubleshooting

### "No se redirige después de login"
```
Solución: Verifica que useRouter funcione
- Abre DevTools (F12)
- Tab Console
- Busca errores
```

### "NavBar no aparece"
```
Solución: Verifica AppProviders.tsx
- Confirma que NavBar esté importado
- Verifica que no haya errores de importación
```

### "Formulario valida incorrectamente"
```
Solución: Abre DevTools
- Consola → busca errores
- Network → verifica que no haya requests fallidas
```

### "Datos no persisten después de F5"
```
Solución: localStorage podría estar deshabilitado
- Abre DevTools
- Application → Local Storage
- Verifica que 'authUser' esté guardado
```

---

## 📸 Screenshots Esperados

### ✅ Login Page
```
┌─────────────────────────────┐
│  🎉 eMeet                   │
│  Descubre eventos...        │
│                             │
│  [Inicia Sesión][Registr]   │
│  ┌─────────────────────────┐│
│  │ [👤 Usuario][🏪 Admin] ││
│  │ [Admin]    [Locatario] ││
│  │                         ││
│  │ Email: user@emeet.com  ││
│  │ Pwd: •••••••••         ││
│  │ [👁 mostrar]           ││
│  │ [Inicia Sesión]        ││
│  └─────────────────────────┘│
└─────────────────────────────┘
```

### ✅ NavBar Logged In
```
┌─────────────────────────────────────────┐
│ eMeet  [Inicio][Panel Admin] [Usuario]  │
│                            [Salir 🔑]   │
└─────────────────────────────────────────┘
```

---

## 🎓 Conclusión

Si todos los tests pasan ✅, el sistema de autenticación está funcionando correctamente y listo para producción.

¿Necesitas ayuda? Abre DevTools (F12) y revisa la consola para errores.

**¡Happy testing!** 🚀
