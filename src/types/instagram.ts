export interface Comment {
  id: string;
  username: string;
  text: string;
  timestamp: string;
  user: {
    id: string;
    username: string;
    profile_picture_url?: string;
  };
}

export interface InstagramPost {
  id: string;
  caption: string;
  media_url: string;
  media_type: string;
  timestamp: string;
  permalink: string;
  comments_count: number;
}

export interface InstagramUser {
  id: string;
  username: string;
  name: string;
  profile_picture_url: string;
  followers_count: number;
  media_count: number;
}