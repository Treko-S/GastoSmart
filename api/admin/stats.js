import { getUserFromRequest } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const user = getUserFromRequest(req);
  if (!user || user.rol !== 'admin') {
    return res.status(403).json({ success: false, message: 'Acceso exclusivo para administradores' });
  }

  try {
    // 1. Total usuarios
    const { count: totalUsers } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true });

    // 2. Total transacciones
    const { count: totalTx } = await supabase
      .from('transacciones')
      .select('*', { count: 'exact', head: true });

    // 3. Volumen total acumulado
    const { data: allTxs } = await supabase
      .from('transacciones')
      .select('monto_usd, moneda, monto');

    let totalUSD = 0;
    let totalPYG = 0;

    (allTxs || []).forEach(tx => {
      totalUSD += Number(tx.monto_usd) || 0;
      if (tx.moneda === 'PYG') {
        totalPYG += Number(tx.monto) || 0;
      }
    });

    // 4. Lista de usuarios registrados recientes
    const { data: recentUsers } = await supabase
      .from('usuarios')
      .select('id, nombre, email, rol, limite_mensual_usd, creado_en')
      .order('creado_en', { ascending: false })
      .limit(30);

    return res.status(200).json({
      success: true,
      stats: {
        total_usuarios: totalUsers || 0,
        total_transacciones: totalTx || 0,
        volumen_total_usd: totalUSD,
        volumen_total_pyg: totalPYG
      },
      usuarios: recentUsers || []
    });
  } catch (error) {
    console.error('Error en admin stats:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}
