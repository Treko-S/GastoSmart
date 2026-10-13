# GastoSmart - Documentación del Proyecto

## Descripción General
**GastoSmart** es una aplicación web enfocada en el control de finanzas personales. Permite a los usuarios registrar transacciones, visualizar sus gastos a través de un panel de control interactivo, y descargar historiales.

## Arquitectura y Tecnologías
- **Frontend:** HTML, TailwindCSS, JavaScript (Vanilla), FontAwesome, Chart.js.
- **Backend:** PHP (Arquitectura MVC simplificada).
- **Base de Datos:** MySQL (PDO).
- **Servicios en 2do plano:** Node.js (whatsapp-web.js) para notificaciones.

## Sistema de Roles y Usuarios
El sistema implementa dos roles principales:
1. **Administrador (`admin@gastos.com`):** 
   - Panel exclusivo (`admin.php`) para ver estadísticas generales de todos los usuarios.
   - Restricción de acceso mediante `$_SESSION['rol']`.
2. **Usuario Regular (`fabri@test.com`):**
   - Panel de control propio (`dashboard.php`) donde el usuario gestiona únicamente sus datos personales y gastos.

## Características Principales Implementadas
1. **Gestión de Transacciones:**
   - Alta, baja y visualización de gastos (Monto, Descripción, Categoría, Fecha).
2. **Soporte Multidivisa (USD y Guaraníes - PYG):**
   - Posibilidad de registrar montos tanto en **Dólares ($)** como en **Guaraníes (Gs.)** con selector interactivo y cálculo de conversión aproximada en tiempo real.
   - Visualización de totales desglosados en ambas monedas en el resumen del mes, historial y gráficos.
3. **Modo Claro / Oscuro:**
   - Implementado en `dashboard.php` usando `localStorage` y TailwindCSS `dark:` clases.
4. **Sección de Configuración (Ajustes):**
   - Permite al usuario cambiar su correo y contraseña.
   - Permite registrar su número de WhatsApp y seleccionar la frecuencia de notificaciones.
5. **Exportación a CSV:**
   - Opción para que el usuario descargue su historial financiero filtrado por períodos (Mes, Año, Todo) mediante `api/expenses.php?action=export`, indicando montos y monedas.

---

## 🤖 Bot de WhatsApp (Automatización)

Para mejorar el servicio al usuario, se implementó un sistema de notificaciones automáticas vía WhatsApp utilizando **Node.js** y **whatsapp-web.js**.

### Estructura del Bot
- **Ubicación:** `whatsapp-bot/`
- **Dependencias principales:** `whatsapp-web.js`, `qrcode-terminal`, `mysql2`, `node-cron`, `dotenv`.
- **Archivo principal:** `index.js`.

### Funcionamiento del Cron Job
El bot contiene un `cron.schedule` que se ejecuta **todos los días a las 10:00 AM**.
1. Se conecta a la base de datos `gasto_smart`.
2. Filtra usuarios con `whatsapp_numero` configurado y `whatsapp_frecuencia` distinto de `none`.
3. Calcula si es el día correspondiente para enviar el reporte:
   - **Semanal:** Los días lunes.
   - **Quincenal:** Los días 1 y 15 del mes.
   - **Mensual:** Los días 1 del mes.
4. Genera un resumen (Monto gastado por categoría y Total).
5. Envía el mensaje mediante la sesión local escaneada (QR) de WhatsApp.

### Comando de Prueba (`!test`)
Para poder probar el funcionamiento sin alterar las bases de datos ni esperar a la fecha programada:
- El bot escucha todos los mensajes entrantes y enviados (`message_create`).
- Si un mensaje dice exactamente `!test`, el bot busca el número que envió el mensaje en la base de datos de usuarios.
- Si lo encuentra, genera y envía un **resumen de los últimos 7 días** en tiempo real.

### Comandos de Mantenimiento
Para encender el bot en el entorno local:
```bash
cd C:\xampp\htdocs\a_sistente\gastos_smart\whatsapp-bot
node index.js
```
*(Es necesario escanear el código QR con la aplicación móvil en el primer inicio de sesión).*
