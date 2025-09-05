import { Comment, InstagramPost, InstagramUser } from "@/types/instagram";

// Mock data para demonstração
const mockUsers = [
  { id: "1", username: "joao_silva", name: "João Silva", profile_picture_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150", followers_count: 1200, media_count: 45 },
  { id: "2", username: "maria_santos", name: "Maria Santos", profile_picture_url: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150", followers_count: 2500, media_count: 78 },
  { id: "3", username: "pedro_gamer", name: "Pedro Gamer", profile_picture_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150", followers_count: 890, media_count: 23 },
  { id: "4", username: "ana_beauty", name: "Ana Beauty", profile_picture_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150", followers_count: 5600, media_count: 156 },
  { id: "5", username: "carlos_fitness", name: "Carlos Fitness", profile_picture_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150", followers_count: 3400, media_count: 89 }
];

const mockPosts: InstagramPost[] = [
  {
    id: "post1",
    caption: "Que dia incrível! 🌞 #bomdia #grateful",
    media_url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400",
    media_type: "IMAGE",
    timestamp: "2024-01-15T10:30:00Z",
    permalink: "https://www.instagram.com/p/post1/",
    comments_count: 45
  },
  {
    id: "post2", 
    caption: "Novo projeto chegando! Marque 2 amigos que vão amar 👇",
    media_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400",
    media_type: "IMAGE",
    timestamp: "2024-01-14T15:20:00Z",
    permalink: "https://www.instagram.com/p/post2/",
    comments_count: 78
  },
  {
    id: "post3",
    caption: "SORTEIO! Participe comentando e marcando seus amigos! 🎉",
    media_url: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400",
    media_type: "IMAGE", 
    timestamp: "2024-01-13T20:45:00Z",
    permalink: "https://www.instagram.com/p/post3/",
    comments_count: 234
  }
];

const generateMockComments = (count: number): Comment[] => {
  const comments: Comment[] = [];
  const sampleTexts = [
    "Que legal! @ana_beauty @pedro_gamer vocês precisam ver isso!",
    "Adorei! Marcando a @maria_santos para participar",
    "Incrível! @joao_silva @carlos_fitness vem ver",
    "Participando! @ana_beauty @maria_santos",
    "Amo esse perfil! @pedro_gamer vem participar",
    "Top demais! Marcando @carlos_fitness e @joao_silva",
    "Quero participar! @ana_beauty @pedro_gamer",
    "Lindo trabalho! @maria_santos @carlos_fitness",
    "Maravilhoso! @joao_silva você precisa ver",
    "Perfeito! @ana_beauty @maria_santos @pedro_gamer",
    "Show! Participando do sorteio",
    "Amei! @carlos_fitness @joao_silva",
    "Que demais! @maria_santos vem ver",
    "Participando! @pedro_gamer @ana_beauty",
    "Lindo! @carlos_fitness @maria_santos"
  ];

  for (let i = 0; i < count; i++) {
    const user = mockUsers[i % mockUsers.length];
    const textIndex = Math.floor(Math.random() * sampleTexts.length);
    
    comments.push({
      id: `comment_${i + 1}`,
      username: user.username,
      text: sampleTexts[textIndex],
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      user: {
        id: user.id,
        username: user.username,
        profile_picture_url: user.profile_picture_url
      }
    });
  }

  return comments.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const mockInstagramApi = {
  async getUserPosts(username: string): Promise<InstagramPost[]> {
    // Simula delay de API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (Math.random() < 0.1) {
      throw new Error("User not found");
    }
    
    return mockPosts.map(post => ({
      ...post,
      comments_count: Math.floor(Math.random() * 200) + 20
    }));
  },

  async getComments(postId: string): Promise<Comment[]> {
    // Simula delay de API
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (Math.random() < 0.05) {
      throw new Error("Failed to load comments");
    }

    const commentCount = Math.floor(Math.random() * 150) + 30;
    return generateMockComments(commentCount);
  },

  async getUserProfile(username: string): Promise<InstagramUser> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const user = mockUsers.find(u => u.username === username) || mockUsers[0];
    return user;
  },

  extractPostId(url: string): string {
    // Extrai ID do post da URL do Instagram
    const match = url.match(/\/p\/([^\/\?]+)/);
    return match ? match[1] : `extracted_${Date.now()}`;
  }
};