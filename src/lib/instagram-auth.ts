// Instagram OAuth Authentication
export interface InstagramAuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string[];
}

export interface InstagramAccessToken {
  access_token: string;
  user_id: string;
  expires_in: number;
  token_type: string;
  expires_at?: number; // Added when storing token
}

export class InstagramAuth {
  private config: InstagramAuthConfig;
  private readonly STORAGE_KEY = 'instagram_access_token';
  
  constructor(config: InstagramAuthConfig) {
    this.config = config;
  }

  // Generate Instagram OAuth URL
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scope.join(','),
      response_type: 'code'
    });
    
    return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
  }

  // Exchange code for access token
  async exchangeCodeForToken(code: string): Promise<InstagramAccessToken> {
    const response = await fetch('/api/instagram/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        redirect_uri: this.config.redirectUri
      })
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await response.json();
    this.storeToken(tokenData);
    return tokenData;
  }

  // Store token securely
  private storeToken(token: InstagramAccessToken): void {
    const tokenWithExpiry = {
      ...token,
      expires_at: Date.now() + (token.expires_in * 1000)
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tokenWithExpiry));
  }

  // Get stored token
  getStoredToken(): InstagramAccessToken | null {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return null;

    const token = JSON.parse(stored);
    
    // Check if token is expired
    if (token.expires_at && Date.now() > token.expires_at) {
      this.clearToken();
      return null;
    }

    return token;
  }

  // Clear stored token
  clearToken(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.getStoredToken() !== null;
  }

  // Get user access token
  getAccessToken(): string | null {
    const token = this.getStoredToken();
    return token ? token.access_token : null;
  }

  // Refresh token if needed
  async refreshTokenIfNeeded(): Promise<boolean> {
    const token = this.getStoredToken();
    if (!token) return false;

    // If token expires in less than 1 hour, try to refresh
    const oneHour = 60 * 60 * 1000;
    if (token.expires_at && (token.expires_at - Date.now()) < oneHour) {
      try {
        const response = await fetch('/api/instagram/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: token.access_token
          })
        });

        if (response.ok) {
          const newToken = await response.json();
          this.storeToken(newToken);
          return true;
        }
      } catch (error) {
        console.error('Failed to refresh token:', error);
        this.clearToken();
        return false;
      }
    }

    return true;
  }
}

// Default Instagram Auth instance
export const instagramAuth = new InstagramAuth({
  clientId: import.meta.env.VITE_INSTAGRAM_APP_ID || 'YOUR_INSTAGRAM_APP_ID',
  redirectUri: `${window.location.origin}/auth/callback`,
  scope: ['user_profile', 'user_media']
});