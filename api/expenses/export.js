import { getUserFromRequest } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ success: false, message: 'No autenticado' });
  }

  try {
    const { data: transacciones, error } = await supabase
      .from('transacciones')
      .select(`
        fecha,
        descripcion,
        monto,
        moneda,
        monto_usd,
        categorias ( nombre )
      `)
      .eq('usuario_id', user.id)
      .order('fecha', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, message: 'Error al exportar gastos' });
    }

    // Cabecera CSV
    let csvContent = 'Fecha,Descripcion,Categoria,Monto,Moneda,Equivalente_USD\r\n';

    (transacciones || []).forEach(tx => {
      const fecha = tx.fecha || '';
      const desc = `"${(tx.descripcion || '').replace(/"/g, '""')}"`;
      const cat = `"${(tx.categorias?.nombre || 'Otros').replace(/"/g, '""')}"`;
      const monto = tx.monto;
      const moneda = tx.moneda;
      const montoUSD = tx.monto_usd;

      csvContent += `${fecha},${desc},${cat},${monto},${moneda},${montoUSD}\r\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="gastosmart_${new Date().toISOString().split('T')[0]}.csv"`);
    return res.status(200).send('\uFEFF' + csvContent); // \uFEFF BOM para compatibilidad con Excel
  } catch (error) {
    console.error('Error al exportar CSV:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}
