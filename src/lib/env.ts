// Environment configuration for Instagram API
// For production, these should be set as environment variables

export const INSTAGRAM_CONFIG = {
  // Instagram App ID - Replace with your actual Instagram App ID
  APP_ID: 'YOUR_INSTAGRAM_APP_ID',
  
  // Instagram App Secret - Replace with your actual Instagram App Secret  
  APP_SECRET: 'YOUR_INSTAGRAM_APP_SECRET',
  
  // Redirect URI for OAuth
  REDIRECT_URI: `${window.location.origin}/auth/callback`,
  
  // Instagram Graph API base URL
  GRAPH_API_BASE: 'https://graph.instagram.com',
  
  // Instagram OAuth URL
  OAUTH_BASE: 'https://api.instagram.com/oauth',
  
  // Required scopes
  SCOPES: ['user_profile', 'user_media']
};

// Check if Instagram is properly configured
export const isInstagramConfigured = (): boolean => {
  return INSTAGRAM_CONFIG.APP_ID !== 'YOUR_INSTAGRAM_APP_ID' && 
         INSTAGRAM_CONFIG.APP_SECRET !== 'YOUR_INSTAGRAM_APP_SECRET';
};

// Development mode flags
export const IS_DEVELOPMENT = import.meta.env.DEV;

// Mock mode for development when Instagram is not configured
export const USE_MOCK_API = IS_DEVELOPMENT && !isInstagramConfigured();