import { Comment, InstagramPost, InstagramUser } from "@/types/instagram";
import { instagramAuth } from "./instagram-auth";
import { mockInstagramApi } from "./mockApi";
import { USE_MOCK_API } from "./env";

export interface InstagramApiError {
  error: {
    message: string;
    type: string;
    code: number;
  };
}

export class InstagramApi {
  private baseUrl = 'https://graph.instagram.com';
  
  constructor(private accessToken: string) {}

  // Get user profile
  async getUserProfile(): Promise<InstagramUser> {
    const response = await fetch(
      `${this.baseUrl}/me?fields=id,username,account_type,media_count&access_token=${this.accessToken}`
    );
    
    if (!response.ok) {
      const error: InstagramApiError = await response.json();
      throw new Error(error.error.message);
    }
    
    return response.json();
  }

  // Get user media (posts)
  async getUserMedia(limit: number = 25): Promise<InstagramPost[]> {
    const response = await fetch(
      `${this.baseUrl}/me/media?fields=id,caption,media_type,media_url,permalink,timestamp,comments_count&limit=${limit}&access_token=${this.accessToken}`
    );
    
    if (!response.ok) {
      const error: InstagramApiError = await response.json();
      throw new Error(error.error.message);
    }
    
    const data = await response.json();
    return data.data || [];
  }

  // Get media by ID
  async getMediaById(mediaId: string): Promise<InstagramPost> {
    const response = await fetch(
      `${this.baseUrl}/${mediaId}?fields=id,caption,media_type,media_url,permalink,timestamp,comments_count&access_token=${this.accessToken}`
    );
    
    if (!response.ok) {
      const error: InstagramApiError = await response.json();
      throw new Error(error.error.message);
    }
    
    return response.json();
  }

  // Get comments for a media
  async getMediaComments(mediaId: string, limit: number = 500): Promise<Comment[]> {
    let allComments: Comment[] = [];
    let nextUrl = `${this.baseUrl}/${mediaId}/comments?fields=id,text,username,timestamp,from&limit=${Math.min(limit, 50)}&access_token=${this.accessToken}`;
    
    try {
      while (nextUrl && allComments.length < limit) {
        const response = await fetch(nextUrl);
        
        if (!response.ok) {
          const error: InstagramApiError = await response.json();
          throw new Error(error.error.message);
        }
        
        const data = await response.json();
        
        // Transform API response to our Comment format
        const comments: Comment[] = (data.data || []).map((comment: any) => ({
          id: comment.id,
          username: comment.username || comment.from?.username || 'unknown',
          text: comment.text || '',
          timestamp: comment.timestamp || new Date().toISOString(),
          user: {
            id: comment.from?.id || comment.id,
            username: comment.username || comment.from?.username || 'unknown',
            profile_picture_url: `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face`
          }
        }));
        
        allComments.push(...comments);
        
        // Get next page if available
        nextUrl = data.paging?.next || null;
        
        // Add small delay to respect rate limits
        if (nextUrl && allComments.length < limit) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      return allComments.slice(0, limit);
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }
  }

  // Extract media ID from Instagram URL
  static extractMediaIdFromUrl(url: string): string | null {
    const patterns = [
      /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
      /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
      /instagram\.com\/tv\/([A-Za-z0-9_-]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }

  // Convert shortcode to media ID (Instagram uses different IDs internally)
  static async convertShortcodeToMediaId(shortcode: string): Promise<string> {
    // This is a complex conversion that typically requires server-side processing
    // For now, we'll use the shortcode as is and handle conversion on backend
    return shortcode;
  }
}

// Factory function to create API instance
export const createInstagramApi = (): InstagramApi | null => {
  const token = instagramAuth.getAccessToken();
  return token ? new InstagramApi(token) : null;
};

// Real Instagram API service
export const realInstagramApi = {
  async getUserPosts(): Promise<InstagramPost[]> {
    // Use mock API in development mode
    if (USE_MOCK_API) {
      console.log('Using mock API for getUserPosts');
      return await mockInstagramApi.getUserPosts('demo_user');
    }

    const api = createInstagramApi();
    if (!api) throw new Error('Not authenticated with Instagram');
    
    try {
      return await api.getUserMedia(50);
    } catch (error) {
      console.error('Failed to fetch user posts:', error);
      throw new Error('Erro ao carregar posts. Verifique sua conexão com Instagram.');
    }
  },

  async getComments(mediaIdOrUrl: string): Promise<Comment[]> {
    // Use mock API in development mode
    if (USE_MOCK_API) {
      console.log('Using mock API for getComments');
      return await mockInstagramApi.getComments(mediaIdOrUrl);
    }

    const api = createInstagramApi();
    if (!api) throw new Error('Not authenticated with Instagram');
    
    let mediaId = mediaIdOrUrl;
    
    // If it's a URL, extract the media ID
    if (mediaIdOrUrl.includes('instagram.com')) {
      const extractedId = InstagramApi.extractMediaIdFromUrl(mediaIdOrUrl);
      if (!extractedId) {
        throw new Error('URL do Instagram inválida');
      }
      mediaId = await InstagramApi.convertShortcodeToMediaId(extractedId);
    }
    
    try {
      return await api.getMediaComments(mediaId, 1000);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      throw new Error('Erro ao carregar comentários. Verifique se a publicação existe e é pública.');
    }
  },

  async getUserProfile(): Promise<InstagramUser> {
    // Use mock API in development mode  
    if (USE_MOCK_API) {
      console.log('Using mock API for getUserProfile');
      return {
        id: 'mock_user',
        username: 'demo_user',
        name: 'Usuário Demo',
        profile_picture_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
        followers_count: 1500,
        media_count: 45
      };
    }

    const api = createInstagramApi();
    if (!api) throw new Error('Not authenticated with Instagram');
    
    try {
      const profile = await api.getUserProfile();
      return {
        ...profile,
        name: profile.username,
        profile_picture_url: `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face`,
        followers_count: 0 // Not available in basic API
      };
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      throw new Error('Erro ao carregar perfil do Instagram.');
    }
  },

  extractPostId(url: string): string {
    const shortcode = InstagramApi.extractMediaIdFromUrl(url);
    if (!shortcode) {
      throw new Error('URL do Instagram inválida');
    }
    return shortcode;
  }
};