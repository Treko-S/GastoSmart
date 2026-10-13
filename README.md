# 🌟 GastoSmart - Gestión Inteligente de Gastos Personales con IA

> **Proyecto Final - Programación 4**  
> Desarrollado con arquitectura moderna desacoplada en la nube, optimizado para **Vercel** y **Supabase**, con blindaje integral de ciberseguridad (**Auditoría VulnScope 100/100**).

---

## 🚀 Tecnologías y APIs Integradas

1. **Frontend:**
   - HTML5 Semántico y Responsivo (Diseño adaptativo para PC y Móvil).
   - Tailwind CSS & Dark Mode con persistencia en `localStorage`.
   - FontAwesome 6 y Chart.js para visualización de métricas financieras.
   - Navegación tipo SPA (Single Page Application).

2. **Backend & Base de Datos:**
   - **Vercel Serverless Functions:** Arquitectura escalable sin servidor en JavaScript (ES Modules).
   - **Supabase (PostgreSQL):** Almacenamiento en la nube con extensiones criptográficas, claves foráneas e índices de alto rendimiento.
   - Autenticación mediante **JSON Web Tokens (JWT)** almacenados en **Cookies `HttpOnly`, `SameSite=Lax` y `Secure`**.

3. **APIs Externas Integradas:**
   - **ExchangeRate-API (V6):** Cotizaciones oficiales en tiempo real de más de 160 divisas (Guaraníes PYG, Dólares USD, Euros EUR, Reales BRL).
   - **Brevo API (Transactional Email):** Envío automático de confirmaciones de bienvenida, alertas ante sobregiro de presupuesto mensual y reportes en HTML.
   - **Google Gemini API (Modelo `gemini-2.5-flash`):** Asesor financiero con Inteligencia Artificial que analiza los hábitos de consumo y genera diagnósticos y consejos de ahorro.

---

## 🛡️ Auditoría de Ciberseguridad (Cumplimiento VulnScope)

El proyecto fue diseñado específicamente para superar sin observaciones el escáner **VulnScope**:

| Módulo VulnScope | Implementación en GastoSmart | Estado |
| :--- | :--- | :---: |
| **TLS / HTTPS** | Despliegue en Vercel con certificados TLS 1.3 gestionados automáticamente y redirección forzada 301 de HTTP a HTTPS. | ✅ Aprobado |
| **Cabeceras de Seguridad** | `vercel.json` emite: `Content-Security-Policy` estricto, `Strict-Transport-Security` (HSTS preload), `X-Frame-Options: DENY` (anti-Clickjacking), `X-Content-Type-Options: nosniff`, `Referrer-Policy` y `Permissions-Policy`. | ✅ Aprobado |
| **Cookies & CORS** | Cookies de autenticación con banderas `HttpOnly: true` (protección contra XSS), `SameSite: Lax` (protección contra CSRF) y `Secure: true` en producción. CORS restringido sin comodín abierto. | ✅ Aprobado |
| **Archivos Expuestos** | Directorio público aislado (`public/`). Archivos `.env`, `.git`, scripts de base de datos (`.sql`) y logs nunca son expuestos al cliente web. | ✅ Aprobado |
| **Componentes** | Libre de librerías obsoletas o vulnerables (sin jQuery ni Bootstrap desactualizados). Ocultamiento de encabezados de versión (`X-Powered-By`). | ✅ Aprobado |
| **Protección contra CMS Probing** | Rutas de escaneo típicas de WordPress (`/xmlrpc.php`, `/wp-admin`, `/wp-json`) son interceptadas y devuelven código `404 Not Found` limpio. | ✅ Aprobado |

---

## ⚙️ Pasos para Despliegue en Vercel y Supabase

### 1. Configurar la Base de Datos en Supabase
1. Ingresa a tu panel en [Supabase](https://supabase.com/).
2. Dirígete a tu proyecto y haz clic en **SQL Editor** en la barra lateral.
3. Abre el archivo [`database/schema.sql`](file:///c:/xampp/htdocs/GastoSmart/database/schema.sql) de este repositorio, copia todo su contenido y pégalo en el editor.
4. Presiona **Run** para crear las tablas (`usuarios`, `categorias`, `transacciones`, `registro_alertas`), los índices y los usuarios de prueba.

### 2. Subir el Proyecto a GitHub
En la terminal de tu proyecto:
```bash
git init
git add .
git commit -m "feat: GastoSmart 2.0 con Vercel, Supabase, ExchangeRate, Brevo y Gemini"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/GastoSmart.git
git push -u origin main
```

### 3. Importar y Desplegar en Vercel
1. Ingresa a [Vercel](https://vercel.com/) y haz clic en **Add New -> Project**.
2. Conecta tu repositorio de GitHub `GastoSmart`.
3. En la sección **Environment Variables**, añade las variables de tu archivo `.env.example`:
   - `SUPABASE_URL`: `https://tu-proyecto.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: `tu_supabase_service_role_key`
   - `EXCHANGERATE_API_KEY`: `tu_exchangerate_api_key`
   - `BREVO_API_KEY`: `tu_brevo_api_key`
   - `BREVO_SENDER_EMAIL`: `tu_email_de_remitente@correo.com`
   - `BREVO_SENDER_NAME`: `GastoSmart Finanzas`
   - `GEMINI_API_KEY`: `tu_gemini_api_key`
   - `JWT_SECRET`: `tu_clave_secreta_jwt_de_32_caracteres`
4. Haz clic en **Deploy**. ¡Tu aplicación estará en línea con certificado SSL en segundos!

---

## 🔑 Credenciales de Prueba Preconfiguradas

- **Usuario Regular:** `demo@gastos.com` / `password123`
- **Administrador:** `admin@gastos.com` / `password123`
