import { getUserFromRequest } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ success: false, message: 'No autenticado' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ success: false, message: 'ID de transacción requerido' });
  }

  try {
    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('transacciones')
        .delete()
        .eq('id', id)
        .eq('usuario_id', user.id);

      if (error) {
        console.error('Error al eliminar transacción:', error);
        return res.status(500).json({ success: false, message: 'Error al eliminar el gasto' });
      }

      return res.status(200).json({ success: true, message: 'Gasto eliminado exitosamente' });
    }

    return res.status(405).json({ success: false, message: 'Método no permitido' });
  } catch (error) {
    console.error('Error en /api/expenses/[id]:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}
