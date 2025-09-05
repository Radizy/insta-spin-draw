import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AtSign, Link, Search, Instagram, Users, MessageSquare, Loader2 } from "lucide-react";
import { Comment, InstagramPost } from "@/types/instagram";
import { mockInstagramApi } from "@/lib/mockApi";
import { toast } from "@/hooks/use-toast";

interface PostSelectorProps {
  onPostSelected: (post: { id: string; url: string; caption: string }, comments: Comment[]) => void;
}

const PostSelector = ({ onPostSelected }: PostSelectorProps) => {
  const [username, setUsername] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [userPosts, setUserPosts] = useState<InstagramPost[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<"username" | "url">("username");

  const handleUsernameSearch = async () => {
    if (!username.trim()) {
      toast({
        title: "Username obrigatório",
        description: "Digite um nome de usuário do Instagram",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const posts = await mockInstagramApi.getUserPosts(username);
      setUserPosts(posts);
      toast({
        title: "Posts carregados!",
        description: `Encontrados ${posts.length} posts para @${username}`,
      });
    } catch (error) {
      toast({
        title: "Erro ao buscar posts",
        description: "Verifique o nome de usuário e tente novamente",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!postUrl.trim()) {
      toast({
        title: "URL obrigatória",
        description: "Cole o link da publicação do Instagram",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const postId = mockInstagramApi.extractPostId(postUrl);
      const comments = await mockInstagramApi.getComments(postId);
      
      onPostSelected({
        id: postId,
        url: postUrl,
        caption: "Publicação selecionada"
      }, comments);

      toast({
        title: "Post carregado!",
        description: `${comments.length} comentários encontrados`,
      });
    } catch (error) {
      toast({
        title: "Erro ao carregar post",
        description: "Verifique se o link está correto",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePostSelect = async (post: InstagramPost) => {
    setLoading(true);
    try {
      const comments = await mockInstagramApi.getComments(post.id);
      onPostSelected({
        id: post.id,
        url: post.permalink,
        caption: post.caption
      }, comments);

      toast({
        title: "Post selecionado!",
        description: `${comments.length} comentários carregados`,
      });
    } catch (error) {
      toast({
        title: "Erro ao carregar comentários",
        description: "Tente novamente em alguns instantes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex p-4 rounded-full bg-gradient-primary shadow-primary">
          <Instagram className="w-8 h-8 text-primary-foreground" />
        </div>
        <h2 className="text-3xl font-bold">Escolha a Publicação</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Selecione um post do Instagram para sortear entre os comentários
        </p>
      </div>

      <Tabs value={selectedMethod} onValueChange={(value) => setSelectedMethod(value as "username" | "url")} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted/50">
          <TabsTrigger value="username" className="gap-2">
            <AtSign className="w-4 h-4" />
            Por Perfil
          </TabsTrigger>
          <TabsTrigger value="url" className="gap-2">
            <Link className="w-4 h-4" />
            Por Link
          </TabsTrigger>
        </TabsList>

        <TabsContent value="username" className="space-y-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="nome_do_usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 h-12 text-base"
                onKeyDown={(e) => e.key === 'Enter' && handleUsernameSearch()}
              />
            </div>
            <Button onClick={handleUsernameSearch} disabled={loading} className="h-12 px-6 bg-gradient-primary hover:opacity-90 shadow-primary">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Buscar
            </Button>
          </div>

          {userPosts.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Posts de @{username}</h3>
              <div className="grid gap-4 max-h-96 overflow-y-auto">
                {userPosts.map((post) => (
                  <Card key={post.id} className="p-4 cursor-pointer hover:shadow-primary/20 transition-all hover:scale-[1.02] bg-card/50 border-border/50">
                    <div className="flex items-start gap-4" onClick={() => handlePostSelect(post)}>
                      <img 
                        src={post.media_url} 
                        alt="Post" 
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-card-foreground line-clamp-2 mb-2">
                          {post.caption || "Sem legenda"}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {post.comments_count} comentários
                          </span>
                          <span>{new Date(post.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="url" className="space-y-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="https://www.instagram.com/p/ABC123..."
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                className="pl-10 h-12 text-base"
                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
              />
            </div>
            <Button onClick={handleUrlSubmit} disabled={loading} className="h-12 px-6 bg-gradient-secondary hover:opacity-90 shadow-secondary">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Instagram className="w-4 h-4" />}
              Carregar
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PostSelector;