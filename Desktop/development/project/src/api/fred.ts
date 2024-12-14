interface EconomicIndicator {
  date: string;
  value: number;
  indicator: string;
}

const BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';
const API_KEY = import.meta.env.VITE_FRED_API_KEY;

export const fetchEconomicIndicator = async (
  seriesId: string,
  indicator: string
): Promise<EconomicIndicator[]> => {
  const response = await fetch(
    `${BASE_URL}?series_id=${seriesId}&api_key=${API_KEY}&file_type=json&sort_order=desc&limit=30`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch FRED data');
  }

  const data = await response.json();
  return data.observations.map((obs: any) => ({
    date: obs.date,
    value: parseFloat(obs.value),
    indicator,
  }));
};