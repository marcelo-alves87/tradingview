// --- 5-level bands (no "Baixo" / "Muito Baixo") ----------------------------

export type Band5 = '+Alto' | '+Medio' | '0' | '-Medio' | '-Alto';

export function toBand5(x: number | undefined): Band5 {
  if (typeof x !== 'number' || !Number.isFinite(x)) return '0';

  if (x >= 0.65) return '+Alto';
  if (x >= 0.10) return '+Medio';
  if (x >= -0.10) return '0';
  if (x >= -0.65) return '-Medio';
  return '-Alto';
}



export async function interpret(ds?: number, liq?: number, press?: number, ad?: number) {

  // Convert the input values to the corresponding labels
  const key = { 
    dens: toBand5(ds), 
    liq: toBand5(liq), 
    press: toBand5(press),
    ad: toBand5(press)  
  };

  // Function to encode the URL parameters
  const encodeLabel = (label: string) => {
    return encodeURIComponent(label); // Properly encode the label to avoid issues with special characters
  };

  try {
    const url_ = `http://localhost:3000/interpretation?DensitySpread_Label=${encodeLabel(key.dens)}&Liquidity_Label=${encodeLabel(key.liq)}&Pressure_Label=${encodeLabel(key.press)}&AgentDensity_Label=${encodeLabel(key.ad)}`;
    console.log(url_);
    // Make the request to the interpretation endpoint
    const response = await fetch(url_);
    
    // Check if the response is successful
    if (!response.ok) {
      // If not, return the default value
      return {
        dens: key.dens, 
        liq: key.liq, 
        press: key.press,
        ad: key.ad,
        leitura: 'Sem leitura definida (5 níveis)',
        tendencia: 'Neutra',
        observacoes: 'Adicione uma regra ao INTERP5 para cobrir este combo.'
      };
    }

    // Parse the response JSON
    const data = await response.json();
    
    // If data exists, return it, otherwise, return the default
    return data ?? {
      dens: key.dens,
      liq: key.liq,
      press: key.press,
      ad: key.ad,
      leitura: 'Sem leitura definida (5 níveis)',
      tendencia: 'Neutra',
      obs: 'Adicione uma regra ao INTERP5 para cobrir este combo.'
    };
  } catch (error) {
    console.error('Error fetching interpretation:', error);
    
    // Return the default value if an error occurs
    return {
      dens: key.dens,
      liq: key.liq,
      press: key.press,
      ad: key.ad,
      leitura: 'Sem leitura definida (5 níveis)',
      tendencia: 'Neutra',
      obs: 'Adicione uma regra ao INTERP5 para cobrir este combo.'
    };
  }
}

