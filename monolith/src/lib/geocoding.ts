import axios from 'axios';
import { config } from '../config';

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<{ address: string; city: string; state: string; zip: string } | null> {
  try {
    const url = `${config.external.nominatimUrl}/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14`;
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'FlowLoads/1.0' },
    });
    const data = response.data as { address?: Record<string, string> };
    if (!data || !data.address) return null;
    const a = data.address;
    return {
      address: a.road ? `${a.house_number ?? ''} ${a.road}`.trim() : (a.display_name ?? ''),
      city: a.city || a.town || a.village || a.county || '',
      state: a.state || '',
      zip: a.postcode || '',
    };
  } catch {
    return null;
  }
}
