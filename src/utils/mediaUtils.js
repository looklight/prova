/**
 * Utility per gestione media (video URL parsing)
 */

/**
 * Estrae l'ID video e la piattaforma da un URL
 * Supporta: Instagram, TikTok, YouTube
 */
export const extractVideoId = (url) => {
  const patterns = [
    { regex: /instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/, platform: 'instagram', idIndex: 2 },
    { regex: /(?:vm\.tiktok\.com|tiktok\.com\/.*\/video)\/([A-Za-z0-9_-]+)/, platform: 'tiktok', idIndex: 1 },
    { regex: /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]+)/, platform: 'youtube', idIndex: 1 }
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern.regex);
    if (match) return { platform: pattern.platform, id: match[pattern.idIndex] };
  }

  return null;
};
