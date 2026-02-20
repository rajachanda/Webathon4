/**
 * Instagram Search Service
 * Provides Instagram search URLs for manual verification
 * 
 * No automatic handle detection or generation
 * User must manually verify and enter Instagram handle
 */

/**
 * Get Instagram search URLs for manual verification
 * Returns array of URLs user can check to find the official Instagram account
 * 
 * @param {string} filmName - Name of the film
 * @returns {Array} Array of search URL objects
 */
export function getInstagramSearchUrls(filmName) {
  const urls = [];

  // Add hashtag search
  const hashtag = filmName.toLowerCase().replace(/\s+/g, '');
  urls.push({
    type: 'hashtag',
    url: `https://www.instagram.com/explore/tags/${hashtag}/`,
    label: `#${hashtag}`
  });

  // Add search query
  urls.push({
    type: 'search',
    url: `https://www.instagram.com/explore/search/?q=${encodeURIComponent(filmName)}`,
    label: `Search: ${filmName}`
  });
  
  // Add explore page
  urls.push({
    type: 'explore',
    url: `https://www.instagram.com/explore/`,
    label: `Explore Instagram`
  });

  return urls;
}

const instagramSearchService = {
  getInstagramSearchUrls
};

export default instagramSearchService;
