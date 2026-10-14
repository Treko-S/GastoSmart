import { getUserFromRequest } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';
import { sendBudgetAlertEmail } from '../_lib/brevo.js';
import { applyCors } from '../_lib/cors.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ success: false, message: 'No autenticado' });
  }

  try {
    // ==========================================
    // GET: Obtener transacciones y estadísticas
    // ==========================================
    if (req.method === 'GET') {
      const { period = 'mes' } = req.query;

      // Obtener datos del usuario (límite mensual y preferencias)
      const { data: userData } = await supabase
        .from('usuarios')
        .select('limite_mensual_usd, notificaciones_email, moneda_principal')
        .eq('id', user.id)
        .single();

      const limiteUSD = userData?.limite_mensual_usd || 100.00;

      // Construir filtro de fecha
      let query = supabase
        .from('transacciones')
        .select(`
          id,
          descripcion,
          monto,
          moneda,
          monto_usd,
          fecha,
          creado_en,
          categorias (
            id,
            nombre,
            icono,
            color
          )
        `)
        .eq('usuario_id', user.id)
        .order('fecha', { ascending: false })
        .order('creado_en', { ascending: false });

      const now = new Date();
      if (period === 'hoy') {
        const todayStr = now.toISOString().split('T')[0];
        query = query.eq('fecha', todayStr);
      } else if (period === 'mes') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        query = query.gte('fecha', firstDay);
      } else if (period === 'año') {
        const firstDayYear = `${now.getFullYear()}-01-01`;
        query = query.gte('fecha', firstDayYear);
      }

      const { data: transacciones, error: txError } = await query;
      if (txError) {
        console.error('Error al consultar transacciones:', txError);
        return res.status(500).json({ success: false, message: 'Error al obtener gastos' });
      }

      // Obtener categorías para el formulario
      const { data: categorias } = await supabase
        .from('categorias')
        .select('*')
        .order('id', { ascending: true });

      // Calcular acumulados
      let totalUSD = 0;
      let totalPYG = 0;
      const categoriaMap = {};

      (transacciones || []).forEach(tx => {
        const mUSD = Number(tx.monto_usd) || 0;
        totalUSD += mUSD;

        if (tx.moneda === 'PYG') {
          totalPYG += Number(tx.monto);
        } else {
          totalPYG += mUSD * 7500; // Aproximado para visualización acumulada
        }

        const catName = tx.categorias?.nombre || 'Otros';
        const catColor = tx.categorias?.color || '#6B7280';
        const catIcon = tx.categorias?.icono || 'fa-tags';

        if (!categoriaMap[catName]) {
          categoriaMap[catName] = {
            nombre: catName,
            color: catColor,
            icono: catIcon,
            total_usd: 0,
            cantidad: 0
          };
        }
        categoriaMap[catName].total_usd += mUSD;
        categoriaMap[catName].cantidad += 1;
      });

      // Formato para gráficos (Chart.js)
      const desgloseCategorias = Object.values(categoriaMap).map(c => ({
        ...c,
        porcentaje: totalUSD > 0 ? ((c.total_usd / totalUSD) * 100).toFixed(1) : 0
      }));

      const porcentajePresupuesto = limiteUSD > 0 
        ? Math.min(((totalUSD / limiteUSD) * 100).toFixed(1), 100) 
        : 0;

      return res.status(200).json({
        success: true,
        data: {
          periodo: period,
          resumen: {
            total_usd: totalUSD,
            total_pyg: totalPYG,
            limite_usd: limiteUSD,
            restante_usd: Math.max(limiteUSD - totalUSD, 0),
            porcentaje_usado: porcentajePresupuesto,
            alerta_superada: totalUSD > limiteUSD
          },
          desglose_categorias: desgloseCategorias,
          transacciones: transacciones || [],
          categorias: categorias || []
        }
      });
    }

    // ==========================================
    // POST: Crear nuevo gasto
    // ==========================================
    if (req.method === 'POST') {
      const { descripcion, monto, moneda = 'USD', categoria_id, fecha, tasa_usd = 7500 } = req.body || {};

      if (!descripcion || !monto || !categoria_id) {
        return res.status(400).json({ success: false, message: 'Descripción, monto y categoría son obligatorios' });
      }

      const numMonto = parseFloat(monto);
      if (isNaN(numMonto) || numMonto <= 0) {
        return res.status(400).json({ success: false, message: 'Monto inválido' });
      }

      // Normalizar a USD para comparaciones y límites
      let montoUSD = numMonto;
      if (moneda === 'PYG') {
        const rate = parseFloat(tasa_usd) || 7500;
        montoUSD = numMonto / rate;
      } else if (moneda === 'EUR') {
        montoUSD = numMonto * 1.08;
      } else if (moneda === 'BRL') {
        montoUSD = numMonto / 5.20;
      } else if (moneda === 'ARS') {
        montoUSD = numMonto / 1200;
      }

      const fechaFinal = fecha || new Date().toISOString().split('T')[0];

      // Insertar en Supabase
      const { data: newTx, error: insertError } = await supabase
        .from('transacciones')
        .insert([
          {
            usuario_id: user.id,
            categoria_id: parseInt(categoria_id),
            descripcion: descripcion.trim(),
            monto: numMonto,
            moneda: moneda.toUpperCase(),
            monto_usd: parseFloat(montoUSD.toFixed(2)),
            fecha: fechaFinal
          }
        ])
        .select(`
          id,
          descripcion,
          monto,
          moneda,
          monto_usd,
          fecha,
          categorias ( id, nombre, icono, color )
        `)
        .single();

      if (insertError) {
        console.error('Error insertando gasto:', insertError);
        return res.status(500).json({ success: false, message: 'Error al guardar el gasto' });
      }

      // Verificación de alerta de presupuesto mensual
      // Consultamos el acumulado del mes para este usuario
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

      const { data: monthTxs } = await supabase
        .from('transacciones')
        .select('monto_usd')
        .eq('usuario_id', user.id)
        .gte('fecha', firstDay);

      const totalMes = (monthTxs || []).reduce((acc, curr) => acc + (Number(curr.monto_usd) || 0), 0);

      const { data: userData } = await supabase
        .from('usuarios')
        .select('email, nombre, limite_mensual_usd, notificaciones_email')
        .eq('id', user.id)
        .single();

      if (userData?.notificaciones_email && userData.limite_mensual_usd > 0) {
        if (totalMes > userData.limite_mensual_usd) {
          sendBudgetAlertEmail(userData.email, userData.nombre, totalMes, userData.limite_mensual_usd, false)
            .catch(err => console.error('Error alerta 100% Brevo:', err));
        } else if (totalMes >= userData.limite_mensual_usd * 0.9) {
          sendBudgetAlertEmail(userData.email, userData.nombre, totalMes, userData.limite_mensual_usd, true)
            .catch(err => console.error('Error alerta 90% Brevo:', err));
        }
      }

      return res.status(201).json({
        success: true,
        message: 'Gasto registrado correctamente',
        data: newTx,
        alerta_presupuesto: totalMes > (userData?.limite_mensual_usd || 0)
      });
    }

    return res.status(405).json({ success: false, message: 'Método no permitido' });
  } catch (error) {
    console.error('Error en /api/expenses:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}
