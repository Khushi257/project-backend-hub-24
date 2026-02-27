import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Film, Search, LogOut, Star, Clock, Ticket, Calendar } from "lucide-react";

type Movie = {
  id: string;
  title: string;
  description: string | null;
  genre: string;
  duration_minutes: number;
  rating: number;
  poster_url: string | null;
  release_date: string | null;
  language: string;
  status: string;
};

const CustomerDashboard = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    try {
      const { data, error } = await supabase
        .from("movies")
        .select("*")
        .eq("status", "now_showing")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setMovies(data || []);
    } catch (error) {
      console.error("Error fetching movies:", error);
    } finally {
      setLoading(false);
    }
  };

  const genres = [...new Set(movies.map((m) => m.genre))];

  const filteredMovies = movies.filter((movie) => {
    const matchesSearch = movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movie.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = !selectedGenre || movie.genre === selectedGenre;
    return matchesSearch && matchesGenre;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div className="relative h-[350px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black via-[hsl(0,30%,10%)] to-black" />
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'radial-gradient(circle at 30% 40%, hsl(0, 85%, 40%) 0%, transparent 60%), radial-gradient(circle at 70% 60%, hsl(40, 80%, 40%) 0%, transparent 50%)'
        }} />
        <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center">
          <h1 className="text-6xl md:text-7xl font-bold tracking-wider mb-2">Now Showing</h1>
          <p className="text-xl text-muted-foreground max-w-lg">Book your seats for the latest blockbusters. Experience cinema like never before.</p>
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <Film className="h-7 w-7 text-primary" />
            <span className="text-3xl font-bold tracking-wider">CineBook</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search movies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted/50"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/my-bookings")}>
              <Ticket className="mr-2 h-4 w-4" /> My Bookings
            </Button>
            <Button variant="ghost" size="icon" onClick={() => signOut()}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Genre Filter */}
        <div className="flex gap-2 mb-8 flex-wrap">
          <Button
            variant={selectedGenre === "" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedGenre("")}
            className="rounded-full"
          >
            All
          </Button>
          {genres.map((genre) => (
            <Button
              key={genre}
              variant={selectedGenre === genre ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedGenre(genre)}
              className="rounded-full"
            >
              {genre}
            </Button>
          ))}
        </div>

        {/* Movies Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredMovies.map((movie) => (
              <Card
                key={movie.id}
                className="group cursor-pointer overflow-hidden border-border/30 bg-card hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_30px_-5px_hsl(0,85%,50%,0.3)]"
                onClick={() => navigate(`/movie/${movie.id}`)}
              >
                <div className="aspect-[2/3] relative overflow-hidden bg-muted">
                  {movie.poster_url ? (
                    <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                      <Film className="h-16 w-16 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Badge className="absolute top-2 right-2 bg-secondary text-secondary-foreground">
                    {movie.genre}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-1 line-clamp-1" style={{ fontFamily: 'Inter, sans-serif' }}>{movie.title}</h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-secondary fill-secondary" />
                      {Number(movie.rating).toFixed(1)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {movie.duration_minutes}m
                    </span>
                  </div>
                  {movie.release_date && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(movie.release_date).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && filteredMovies.length === 0 && (
          <div className="text-center py-20">
            <Film className="h-20 w-20 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-2xl text-muted-foreground tracking-wider">No movies found</p>
            <p className="text-muted-foreground mt-2">Check back later for new releases</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerDashboard;
