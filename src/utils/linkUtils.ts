/**
 * linkUtils — helper condivisi per link esterni
 * Usati da MediaGrid.
 */

import { colors } from '../styles/theme';

/** Estrae il dominio da un URL, senza www. */
export const getDomain = (url: string): string => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
};

/** Identifica piattaforma, colore e nome brand icon da un URL */
export const getLinkPlatformInfo = (url: string): { name: string; color: string; icon: string } => {
  // Video / Social
  if (url.includes('youtube.com') || url.includes('youtu.be'))
    return { name: 'YouTube', color: '#FF0000', icon: 'YouTube' };
  if (url.includes('instagram.com'))
    return { name: 'Instagram', color: '#E4405F', icon: 'Instagram' };
  if (url.includes('tiktok.com') || url.includes('vm.tiktok.com'))
    return { name: 'TikTok', color: '#000000', icon: 'TikTok' };
  if (url.includes('vimeo.com'))
    return { name: 'Vimeo', color: '#1AB7EA', icon: 'Vimeo' };
  if (url.includes('twitter.com') || url.includes('x.com'))
    return { name: 'X', color: '#000000', icon: 'XTwitter' };
  if (url.includes('facebook.com') || url.includes('fb.watch'))
    return { name: 'Facebook', color: '#1877F2', icon: 'Facebook' };
  if (url.includes('pinterest.'))
    return { name: 'Pinterest', color: '#E60023', icon: 'Pinterest' };
  // Prenotazione / Travel
  if (url.includes('booking.com'))
    return { name: 'Booking', color: '#003580', icon: 'Booking' };
  if (url.includes('airbnb.'))
    return { name: 'Airbnb', color: '#FF5A5F', icon: 'Airbnb' };
  if (url.includes('tripadvisor.'))
    return { name: 'TripAdvisor', color: '#34E0A1', icon: 'TripAdvisor' };
  if (url.includes('expedia.'))
    return { name: 'Expedia', color: '#FBCE00', icon: 'Expedia' };
  if (url.includes('hotels.com'))
    return { name: 'Hotels.com', color: '#D32F2F', icon: 'Hotels' };
  // Mappe
  if (url.includes('google.com/maps') || url.includes('goo.gl/maps') || url.includes('maps.app.goo.gl'))
    return { name: 'Maps', color: '#4285F4', icon: 'GoogleMaps' };
  if (url.includes('maps.apple.com'))
    return { name: 'Maps', color: '#000000', icon: 'AppleMaps' };
  // Attività / Tour
  if (url.includes('getyourguide.'))
    return { name: 'GetYourGuide', color: '#FF5533', icon: 'GetYourGuide' };
  if (url.includes('trip.com'))
    return { name: 'Trip.com', color: '#2681FF', icon: 'TripCom' };
  // Generico
  return { name: getDomain(url), color: colors.accent, icon: 'Link' };
};

/** Estrae thumbnail YouTube da URL watch/shorts/embed/youtu.be */
export const getYouTubeThumbnail = (url: string): string | null => {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]+)/);
  return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
};
