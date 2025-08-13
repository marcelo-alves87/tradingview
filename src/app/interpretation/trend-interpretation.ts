// --- 7-level bands (no "Baixo" / "Muito Baixo") ----------------------------

export type Band7 =
  | '+Muito Alto' | '+Alto' | '+Medio' | '0'
  | '-Medio' | '-Alto' | '-Muito Alto';

/** Collapse to 7 bands. You can tune the cutoffs later (or swap to percentiles). */
export function toBand7(x: number | undefined): Band7 {
  if (x == null || !isFinite(x)) return '0';
  if (x >= 0.90) return '+Muito Alto';
  if (x >= 0.45) return '+Alto';
  if (x >= 0.10) return '+Medio';
  if (x >  -0.10) return '0';
  if (x >  -0.45) return '-Medio';
  if (x >  -0.90) return '-Alto';
  return '-Muito Alto';
}



export async function interpret(ds?: number, liq?: number, press?: number) {

  // Convert the input values to the corresponding labels
  const key = { 
    dens: toBand7(ds), 
    liq: toBand7(liq), 
    press: toBand7(press) 
  };

  // Function to encode the URL parameters
  const encodeLabel = (label: string) => {
    return encodeURIComponent(label); // Properly encode the label to avoid issues with special characters
  };

  try {
    // Make the request to the interpretation endpoint
    const response = await fetch(`http://localhost:3000/interpretation?DensitySpread_Label=${encodeLabel(key.dens)}&Liquidity_Label=${encodeLabel(key.liq)}&Pressure_Label=${encodeLabel(key.press)}`);
    
    // Check if the response is successful
    if (!response.ok) {
      // If not, return the default value
      return {
        dens: key.dens, 
        liq: key.liq, 
        press: key.press,
        leitura: 'Sem leitura definida (7 níveis)',
        tendencia: 'Neutra',
        observacoes: 'Adicione uma regra ao INTERP7 para cobrir este combo.'
      };
    }

    // Parse the response JSON
    const data = await response.json();
    
    // If data exists, return it, otherwise, return the default
    return data ?? {
      dens: key.dens,
      liq: key.liq,
      press: key.press,
      leitura: 'Sem leitura definida (7 níveis)',
      tendencia: 'Neutra',
      obs: 'Adicione uma regra ao INTERP7 para cobrir este combo.'
    };
  } catch (error) {
    console.error('Error fetching interpretation:', error);
    
    // Return the default value if an error occurs
    return {
      dens: key.dens,
      liq: key.liq,
      press: key.press,
      leitura: 'Sem leitura definida (7 níveis)',
      tendencia: 'Neutra',
      obs: 'Adicione uma regra ao INTERP7 para cobrir este combo.'
    };
  }
}

