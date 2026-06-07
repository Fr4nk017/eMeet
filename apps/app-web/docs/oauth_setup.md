# OAuth Setup — Google y Facebook con Supabase

## Prerequisito: tu URL de Supabase

En **supabase.com/dashboard → Settings → API**:
```
https://xxxxxxxxxxxx.supabase.co
```
La necesitas para armar las redirect URIs en cada plataforma.

---

## Google

### 1. Google Cloud Console
- Ve a [console.cloud.google.com](https://console.cloud.google.com)
- **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
- Tipo: **Web application**
- En **Authorized redirect URIs** agrega:
  ```
  https://<tu-proyecto>.supabase.co/auth/v1/callback
  ```
- Copia el **Client ID** y **Client Secret**

### 2. Supabase Dashboard
- **Authentication → Providers → Google**
- Activa el toggle
- Pega **Client ID** y **Client Secret**
- Guarda

---

## Facebook

### 1. Meta for Developers
- Ve a [developers.facebook.com](https://developers.facebook.com)
- **My Apps → Create App → Consumer**
- Agrega el producto **Facebook Login → Settings**
- En **Valid OAuth Redirect URIs**:
  ```
  https://<tu-proyecto>.supabase.co/auth/v1/callback
  ```
- Copia **App ID** y **App Secret** (en **Settings → Basic**)

### 2. Supabase Dashboard
- **Authentication → Providers → Facebook**
- Activa el toggle
- Pega **App ID** como Client ID y **App Secret** como Client Secret
- Guarda

---

## Variables de entorno requeridas (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

Sin estas variables el botón OAuth muestra el error "OAuth no disponible en modo local".

---

## Cómo funciona el flujo en el código

1. Usuario hace click en "Continuar con Google/Facebook"
2. `loginWithOAuth(provider)` en `AuthContext.tsx` llama a `supabase.auth.signInWithOAuth` con redirect a `/auth/callback`
3. Supabase redirige al proveedor (Google/Facebook)
4. El proveedor redirige de vuelta a `https://<tu-proyecto>.supabase.co/auth/v1/callback`
5. Supabase redirige a `/auth/callback` en la app
6. `app/auth/callback/route.ts` intercambia el código por una sesión y redirige al home
