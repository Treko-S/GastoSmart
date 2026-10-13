import { getUserFromRequest } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Modelos candidatos en orden de prioridad (compatibles y de alta velocidad)
const GEMINI_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.8-flash',
  'gemini-flash-latest'
];

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

    const limiteUSD = Number(userData?.limite_mensual_usd) || 1000;
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

      Debes responder ÚNICAMENTE un objeto JSON válido (sin markdown, sin bloques de código) con esta estructura:
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

    let adviceData = null;

    // Intentar consultar modelos de Gemini con fallback
    if (GEMINI_API_KEY) {
      for (const model of GEMINI_MODELS) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
          const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemPrompt }] }],
              generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 600,
                responseMimeType: 'application/json'
              }
            })
          });

          if (geminiResponse.ok) {
            const geminiData = await geminiResponse.json();
            const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            if (cleanedText) {
              adviceData = JSON.parse(cleanedText);
              break; // Modelo exitoso, salir del ciclo
            }
          } else {
            console.warn(`Modelo ${model} devolvió status ${geminiResponse.status}`);
          }
        } catch (mErr) {
          console.warn(`Fallo al consultar modelo ${model}:`, mErr.message);
        }
      }
    }

    // 3. Si Gemini no está disponible o falla por cuota/red, usar diagnóstico inteligente de respaldo
    if (!adviceData || !adviceData.consejos) {
      adviceData = generateHeuristicAdvice(userData, limiteUSD, totalMesUSD, catMap);
    }

    return res.status(200).json({
      success: true,
      data: adviceData,
      resumen_analizado: {
        total_usd: totalMesUSD,
        limite_usd: limiteUSD
      }
    });
  } catch (error) {
    console.error('Error en asesor IA:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor al procesar el análisis' });
  }
}

/**
 * Genera un diagnóstico financiero inteligente y personalizado
 * en caso de que la API externa de IA esté saturada temporalmente.
 */
function generateHeuristicAdvice(userData, limiteUSD, totalMesUSD, catMap) {
  const percentUsed = limiteUSD > 0 ? (totalMesUSD / limiteUSD) * 100 : 0;
  const restante = Math.max(0, limiteUSD - totalMesUSD);

  let maxCat = 'Gastos generales';
  let maxCatAmount = 0;
  for (const [cat, amt] of Object.entries(catMap)) {
    if (amt > maxCatAmount) {
      maxCatAmount = amt;
      maxCat = cat;
    }
  }

  let salud = 'Excelente';
  let diagnostico = '';
  const consejos = [];

  if (percentUsed >= 100) {
    salud = 'Crítico';
    diagnostico = `Has alcanzado el límite presupuestario mensual ($${totalMesUSD.toFixed(2)} USD gastados de $${limiteUSD} USD). Es momento de pausar consumos no esenciales.`;
    consejos.push(`Controla las compras en "${maxCat}", que concentran la mayor parte de tus egresos ($${maxCatAmount.toFixed(2)} USD).`);
    consejos.push('Revisa gastos hormiga y pospón compras no prioritarias hasta el siguiente ciclo.');
    consejos.push('Aparta una pequeña reserva de emergencia para amortiguar sobrecostos.');
  } else if (percentUsed >= 75) {
    salud = 'Precaución';
    diagnostico = `Has utilizado el ${percentUsed.toFixed(0)}% de tu presupuesto. Quedan $${restante.toFixed(2)} USD de margen para finalizar el mes.`;
    consejos.push(`Tu categoría de mayor impacto actual es "${maxCat}". Verifica si puedes optimizar precios en ella.`);
    consejos.push('Fija un tope de gasto diario moderado para no sobrepasar el presupuesto.');
    consejos.push('Registra cada egreso en tiempo real para no perder de vista los saldos.');
  } else if (percentUsed >= 40) {
    salud = 'Bueno';
    diagnostico = `Mantienes un consumo controlado (${percentUsed.toFixed(0)}% usado). Tienes $${restante.toFixed(2)} USD disponibles.`;
    consejos.push(`El rubro "${maxCat}" es el más representativo. Mantén un seguimiento continuo.`);
    consejos.push('Compara opciones antes de realizar compras grandes para proteger tu margen restante.');
    consejos.push('Considera destinar parte del excedente proyectado a tu fondo de ahorro.');
  } else {
    salud = 'Excelente';
    diagnostico = `Excelente salud financiera. Solo has gastado el ${percentUsed.toFixed(0)}% de tu presupuesto mensual.`;
    consejos.push('Excelente disciplina: mantén este mismo ritmo en tus próximas semanas.');
    consejos.push('Aprovecha la disponibilidad para reforzar tus metas de ahorro o inversión.');
    consejos.push('Sigue anotando compras para tener un histórico financiero sólido.');
  }

  return {
    salud_financiera: salud,
    diagnostico,
    consejos,
    meta_recomendada: `Mantener el remanente de $${(restante * 0.85).toFixed(2)} USD como reserva positiva al cierre de mes.`
  };
}
