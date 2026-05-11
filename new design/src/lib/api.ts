/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface NetworkInfo {
  ip: string;
  isp: string;
  city: string;
  country: string;
  country_code: string;
  is_vpn: boolean;
}

export const fetchNetworkInfo = async (): Promise<NetworkInfo> => {
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) throw new Error('Network info fetch failed');
    const data = await response.json();
    
    // Simple VPN detection: check if browser language matches country
    const browserLang = navigator.language.split('-')[0].toLowerCase();
    // This is a naive check for the demo's sake
    const countryCode = data.country_code?.toLowerCase();
    
    // In a real app, you'd check known VPN IP ranges or headers
    // For this satirical app, we'll use a mix of checks
    const isVPN = (browserLang === 'id' && countryCode !== 'id') || (browserLang === 'en' && countryCode === 'id' && data.org?.toLowerCase().includes('cloud'));

    return {
      ip: data.ip || '0.0.0.0',
      isp: data.org || 'Unknown Provider',
      city: data.city || 'Unknown City',
      country: data.country_name || 'Unknown Country',
      country_code: data.country_code || '??',
      is_vpn: isVPN
    };
  } catch (error) {
    console.error('API Error:', error);
    return {
      ip: '127.0.0.1',
      isp: 'Localhost Enthusiast',
      city: 'Deep Web',
      country: 'The Matrix',
      country_code: '??',
      is_vpn: false
    };
  }
};

export const maskIP = (ip: string) => {
  if (!ip || ip === '0.0.0.0') return "***.***.***.***";
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
  }
  // IPv6 masking
  if (ip.includes(':')) {
    const v6parts = ip.split(':');
    return `${v6parts.slice(0, Math.max(1, v6parts.length - 2)).join(':')}:****:****`;
  }
  return ip;
};
