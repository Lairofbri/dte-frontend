# Deploy dte-frontend a Cloudflare Pages

**Fecha:** 2026-05-27
**Proyecto:** dte-frontend
**Contexto:** SPA React 19 + Vite 8, build estático a `dist/`, backend API separado.

## Objetivo

Desplegar dte-frontend en Cloudflare Pages con dos ambientes (producción y staging) usando integración con GitHub, sin costo inicial, y con ruta para agregar dominio personalizado en el futuro.

## Arquitectura

```
[GitHub repo: dte-frontend]
  ├── main      → Cloudflare Pages → dte-frontend.pages.dev      (producción)
  └── develop   → Cloudflare Pages → develop.dte-frontend.pages.dev (staging)

[Browser] → Cloudflare CDN → SPA en dist/ → Llamadas API a backend externo (VITE_API_URL)
```

- No hay SSR. Todo el contenido es estático (HTML, CSS, JS generado por Vite).
- El frontend se comunica con un backend separado (`VITE_API_URL`) — la URL cambia entre ambientes.
- Cloudflare Pages maneja el CDN, SSL/TLS automático y el enrutamiento SPA (fallback a `index.html`).

## Ambientes

| Ambiente | Branch | URL | VITE_API_URL |
|---|---|---|---|
| Producción | `main` | `dte-frontend.pages.dev` (o dominio personalizado futuro) | Backend producción |
| Staging | `develop` | `develop.dte-frontend.pages.dev` | Backend staging |

Cada push a `develop` despliega automáticamente en staging. Cuando se hace merge de `develop` a `main`, se despliega en producción.

## Configuración de Cloudflare Pages

### Build settings

| Parámetro | Valor |
|---|---|
| **Framework preset** | Vite |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | (raíz del repo) |
| **Node.js version** | 18 o superior (por defecto en CF Pages) |

### Environment variables

| Variable | Producción | Staging |
|---|---|---|
| `VITE_API_URL` | URL del backend de producción | URL del backend de staging (ej: Docker local) |
| `NODE_VERSION` | `20` | `20` |

### SPA fallback (Single Page Application)

Cloudflare Pages requiere una regla para que todas las rutas (`/dtes`, `/clientes`, etc.) sirvan `index.html` en lugar de devolver 404. Se configura con un archivo `_redirects` o `_routes.json`.

**Opción elegida:** `_redirects` en `public/` (se copia automáticamente a `dist/` en el build).

Contenido de `public/_redirects`:
```
/*    /index.html   200
```

Esto hace que Cloudflare Pages sirva `index.html` para cualquier ruta que no coincida con un archivo estático, permitiendo que React Router maneje la navegación del lado del cliente.

### Variables de entorno en producción

El backend de producción se configura como variable de entorno en el dashboard de Cloudflare Pages, no en el repositorio.

## Flujo de trabajo

### Desarrollo diario
1. Trabajar en `develop` (o ramas derivadas de `develop`)
2. Hacer push → automáticamente se despliega en `develop.dte-frontend.pages.dev`
3. Probar en staging con datos de prueba
4. Cuando todo funciona, mergear `develop → main`

### Rollback
Cloudflare Pages mantiene historial de deploys. En el dashboard se puede hacer rollback a cualquier deploy anterior con un clic — sin necesidad de revertir commits en Git.

### Promoción a producción
```
git checkout main
git merge develop
git push origin main
```
Cloudflare Pages detecta el push a `main`, hace build y despliega.

## Dominio personalizado (futuro)

Cloudflare Pages permite agregar dominios personalizados desde el dashboard:

1. Comprar dominio en Cloudflare Registrar (precio de costo, sin margen)
2. Agregar el dominio en Pages → Custom domains
3. Cloudflare configura automáticamente el DNS y SSL

No se requiere cambiar nada en el código — solo actualizar `VITE_API_URL` si el backend también cambia de dominio.

## Consideraciones de seguridad

- **No hay secretos en el frontend.** `VITE_API_URL` es una variable de compilación pública — visible en el bundle. No debe contener tokens ni claves.
- **Refresh token** vive en cookie `httpOnly` (manejado por el backend), fuera del alcance de JS.
- **Access token** solo en memoria (Zustand), nunca en `localStorage`.
- SSL/TLS automático por Cloudflare.

## Prerrequisitos

1. Cuenta en Cloudflare (gratuita)
2. Repositorio en GitHub con `main` y `develop`
3. Backend desplegado con URL accesible (producción y staging)

## Checklist de lanzamiento

- [ ] `public/_redirects` creado con `/* /index.html 200`
- [ ] Cloudflare Pages conectado al repo de GitHub
- [ ] Variables de entorno configuradas en dashboard CF (no en el repo)
- [ ] Build exitoso en staging (branch `develop`)
- [ ] Pruebas E2E contra staging
- [ ] Build exitoso en producción (branch `main`)
- [ ] (Opcional) Dominio personalizado configurado
- [ ] Rollback verificado (simular revertir a deploy anterior)
