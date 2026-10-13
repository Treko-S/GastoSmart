require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const mysql = require('mysql2/promise');
const cron = require('node-cron');

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    console.log('¡Escanea este código QR con tu WhatsApp para iniciar sesión!');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Cliente de WhatsApp listo y conectado.');
});

client.initialize();

// Funciones de ayuda
function cleanPhoneNumber(number) {
    let clean = number.replace(/\D/g, ''); // Quitar todo lo que no sea dígito
    return `${clean}@c.us`; // Formato requerido por whatsapp-web.js
}

async function getGastosSummary(userId, db, days) {
    const [rows] = await db.execute(`
        SELECT c.nombre as categoria, COALESCE(t.moneda, 'USD') as moneda, SUM(t.monto) as total
        FROM transacciones t
        JOIN categorias c ON t.categoria_id = c.id
        WHERE t.usuario_id = ? AND t.fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY t.categoria_id, t.moneda
    `, [userId, days]);

    let totalUSD = 0;
    let totalPYG = 0;
    let text = '';
    
    rows.forEach(row => {
        const isPYG = row.moneda === 'PYG';
        const formatted = isPYG ? `Gs. ${Math.round(Number(row.total)).toLocaleString('es-PY')}` : `$${Number(row.total).toFixed(2)}`;
        text += `- ${row.categoria}: ${formatted}\n`;
        if (isPYG) totalPYG += Number(row.total);
        else totalUSD += Number(row.total);
    });

    return { text, totalUSD, totalPYG, hasExpenses: rows.length > 0 };
}

async function sendSummary(user, days, title, db) {
    if (!user.whatsapp_numero) return;

    try {
        const summary = await getGastosSummary(user.id, db, days);
        const phoneId = cleanPhoneNumber(user.whatsapp_numero);
        
        let message = `📊 *GastoSmart - ${title}*\nHola ${user.nombre},\nAquí tienes el resumen de tus gastos de los últimos ${days} días:\n\n`;
        
        if (!summary.hasExpenses) {
            message += `¡No registraste ningún gasto en este periodo! 🥳\n`;
        } else {
            message += summary.text;
            message += `\n*Totales:*`;
            if (summary.totalUSD > 0) message += `\n- Dólares: $${summary.totalUSD.toFixed(2)} USD`;
            if (summary.totalPYG > 0) message += `\n- Guaraníes: Gs. ${Math.round(summary.totalPYG).toLocaleString('es-PY')} PYG`;
        }
        
        message += `\n\n_Para cambiar la frecuencia o darte de baja, ve a Ajustes en GastoSmart._`;

        await client.sendMessage(phoneId, message);
        console.log(`Resumen enviado a ${user.nombre} (${user.whatsapp_numero})`);
    } catch (err) {
        console.error(`Error enviando mensaje a ${user.nombre}:`, err.message);
    }
}

// CRON JOB: Todos los días a las 10:00 AM
cron.schedule('0 10 * * *', async () => {
    console.log('Iniciando envío de resúmenes de WhatsApp...');
    
    try {
        const db = await mysql.createConnection(dbConfig);
        const [usuarios] = await db.execute("SELECT * FROM usuarios WHERE whatsapp_frecuencia != 'none' AND whatsapp_numero IS NOT NULL");
        
        const date = new Date();
        const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Lunes...
        const dayOfMonth = date.getDate(); // 1 al 31

        for (const user of usuarios) {
            // Semanal (Ej: Todos los Lunes)
            if (user.whatsapp_frecuencia === 'semanal' && dayOfWeek === 1) {
                await sendSummary(user, 7, 'Resumen Semanal', db);
            }
            // Quincenal (Ej: Días 1 y 15 del mes)
            else if (user.whatsapp_frecuencia === 'quincenal' && (dayOfMonth === 1 || dayOfMonth === 15)) {
                await sendSummary(user, 15, 'Resumen Quincenal', db);
            }
            // Mensual (Ej: Día 1 del mes)
            else if (user.whatsapp_frecuencia === 'mensual' && dayOfMonth === 1) {
                await sendSummary(user, 30, 'Resumen Mensual', db);
            }
        }
        
        await db.end();
        console.log('Envío de resúmenes finalizado.');
    } catch (err) {
        console.error('Error en el cron job:', err);
    }
});

// ESCUCHAR MENSAJES (Para comando de prueba)
client.on('message_create', async (msg) => {
    console.log(`Mensaje detectado de ${msg.from} hacia ${msg.to}: ${msg.body}`); // DEBUG: Para ver si el bot está leyendo los mensajes
    
    if (msg.body.toLowerCase() === '!test') {
        try {
            const db = await mysql.createConnection(dbConfig);
            // Buscar al usuario que tenga este número de teléfono registrado
            let phoneStr = msg.from.replace('@c.us', '');
            
            // Si el mensaje es de uno mismo, a veces msg.from no es el teléfono sino msg.to, así que tomamos el que tenga números
            if(phoneStr === 'status@broadcast' || phoneStr.includes('@g.us')) {
                return; // Ignorar estados y grupos
            }

            // Buscar en BD
            const [usuarios] = await db.execute("SELECT * FROM usuarios WHERE whatsapp_numero LIKE ?", ['%' + phoneStr + '%']);
            
            if (usuarios.length > 0) {
                const user = usuarios[0];
                msg.reply(`¡Hola ${user.nombre}! Has solicitado una prueba. Generando reporte de los últimos 7 días...`);
                // Enviar resumen de 7 días como prueba
                await sendSummary(user, 7, 'Resumen de Prueba (!test)', db);
            } else {
                msg.reply("Lo siento, no encontré este número de teléfono (" + phoneStr + ") registrado en ninguna cuenta de GastoSmart. Por favor verifica los Ajustes.");
            }
            await db.end();
        } catch (err) {
            console.error('Error procesando comando !test:', err);
            msg.reply('Ocurrió un error al intentar generar la prueba.');
        }
    }
});

console.log('Bot iniciado. Esperando conexión a WhatsApp...');
