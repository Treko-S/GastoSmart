const EXCHANGERATE_API_KEY = process.env.EXCHANGERATE_API_KEY;

// Caché en memoria para optimizar rendimiento y cuota de peticiones
let cachedRates = null;
let lastFetchTime = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hora de caché

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  const now = Date.now();
  if (cachedRates && (now - lastFetchTime < CACHE_TTL)) {
    return res.status(200).json({
      success: true,
      source: 'cache',
      base: 'USD',
      updated: new Date(lastFetchTime).toISOString(),
      rates: cachedRates
    });
  }

  try {
    const url = EXCHANGERATE_API_KEY 
      ? `https://v6.exchangerate-api.com/v6/${EXCHANGERATE_API_KEY}/latest/USD`
      : 'https://open.er-api.com/v6/latest/USD';

    const response = await fetch(url);
    const data = await response.json();

    if (data.result === 'success' || data.rates || data.conversion_rates) {
      const allRates = data.conversion_rates || data.rates || {};
      
      // Filtramos las principales monedas para un payload ligero y veloz
      cachedRates = {
        USD: 1,
        PYG: allRates.PYG || 7500,
        EUR: allRates.EUR || 0.92,
        BRL: allRates.BRL || 5.20,
        ARS: allRates.ARS || 1100,
        CLP: allRates.CLP || 950,
        UYU: allRates.UYU || 40
      };
      lastFetchTime = now;

      // Cabeceras de caché HTTP para el navegador y CDN
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

      return res.status(200).json({
        success: true,
        source: 'live_api',
        base: 'USD',
        updated: new Date(lastFetchTime).toISOString(),
        rates: cachedRates
      });
    }

    throw new Error('Respuesta inválida de ExchangeRate-API');
  } catch (error) {
    console.error('Error al obtener tasas de cambio:', error);
    
    // Fallback de contingencia si falla la red
    const fallbackRates = {
      USD: 1,
      PYG: 7550,
      EUR: 0.92,
      BRL: 5.15,
      ARS: 1200
    };

    return res.status(200).json({
      success: true,
      source: 'fallback',
      base: 'USD',
      updated: new Date().toISOString(),
      rates: fallbackRates
    });
  }
}
