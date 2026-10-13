import { getUserFromRequest } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Usamos gemini-2.5-flash: el modelo más eficiente, veloz y de menor consumo
const GEMINI_MODEL = 'gemini-2.5-flash';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ success: false, message: 'No autenticado' });
  }

  try {
    // 1. Obtener gastos del mes actual y límite
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const { data: userData } = await supabase
      .from('usuarios')
      .select('nombre, limite_mensual_usd')
      .eq('id', user.id)
      .single();

    const { data: transacciones } = await supabase
      .from('transacciones')
      .select('monto_usd, descripcion, categorias(nombre)')
      .eq('usuario_id', user.id)
      .gte('fecha', firstDay);

    const limiteUSD = userData?.limite_mensual_usd || 1000;
    let totalMesUSD = 0;
    const catMap = {};

    (transacciones || []).forEach(t => {
      const m = Number(t.monto_usd) || 0;
      totalMesUSD += m;
      const c = t.categorias?.nombre || 'Otros';
      catMap[c] = (catMap[c] || 0) + m;
    });

    const categoriesBreakdown = Object.entries(catMap)
      .map(([cat, amount]) => `${cat}: $${amount.toFixed(2)} USD`)
      .join(', ') || 'Sin gastos registrados todavía';

    // 2. Prompt estricto en formato JSON
    const systemPrompt = `
      Eres el Asesor Financiero Inteligente de la app GastoSmart.
      Analiza la siguiente información financiera del usuario para este mes:
      - Nombre: ${userData?.nombre || 'Usuario'}
      - Presupuesto mensual establecido: $${limiteUSD} USD
      - Total gastado hasta ahora: $${totalMesUSD.toFixed(2)} USD (${limiteUSD > 0 ? ((totalMesUSD / limiteUSD) * 100).toFixed(0) : 0}% usado)
      - Desglose por categorías: ${categoriesBreakdown}

      Debes responder ÚNICAMENTE un objeto JSON válido (sin markdown, sin bloques de código \`\`\`json) con esta estructura:
      {
        "salud_financiera": "Excelente" | "Bueno" | "Precaución" | "Crítico",
        "diagnostico": "Breve frase resumen del estado actual (máximo 2 líneas)",
        "consejos": [
          "Consejo 1 específico y accionable",
          "Consejo 2 sobre su categoría de mayor gasto",
          "Consejo 3 para optimizar su ahorro"
        ],
        "meta_recomendada": "Recomendación de ahorro para el próximo mes"
      }
    `;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: systemPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 600
        }
      })
    });

    const geminiData = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error('Error en Gemini API:', geminiData);
      return res.status(500).json({ success: false, message: 'Error al consultar la IA de Gemini' });
    }

    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Limpieza de formato JSON por si el modelo incluye comillas de bloque
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    let parsedAdvice;

    try {
      parsedAdvice = JSON.parse(cleanedText);
    } catch (e) {
      // Fallback si no responde JSON perfecto
      parsedAdvice = {
        salud_financiera: totalMesUSD > limiteUSD ? 'Precaución' : 'Bueno',
        diagnostico: 'Has consumido parte de tu presupuesto mensual. Mantén el monitoreo diario.',
        consejos: [
          'Evita gastos hormiga no planificados durante la semana.',
          'Compara precios antes de realizar compras grandes en categorías principales.',
          'Aparta un porcentaje de tus ingresos antes de asignar presupuesto de ocio.'
        ],
        meta_recomendada: 'Intentar reducir un 10% en consumos secundarios.'
      };
    }

    return res.status(200).json({
      success: true,
      data: parsedAdvice,
      resumen_analizado: {
        total_usd: totalMesUSD,
        limite_usd: limiteUSD
      }
    });
  } catch (error) {
    console.error('Error en asesor IA:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}
