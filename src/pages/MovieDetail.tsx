import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Film, Star, Clock, ArrowLeft, Calendar, MapPin } from "lucide-react";
import { toast } from "sonner";
import SeatSelector from "@/components/booking/SeatSelector";

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

type Showtime = {
  id: string;
  show_date: string;
  show_time: string;
  price: number;
  available_seats: number;
  theaters: { id: string; name: string; total_rows: number; seats_per_row: number; screen_type: string } | null;
};

type Review = {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles?: { full_name: string } | null;
};

const MovieDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedShowtime, setSelectedShowtime] = useState<Showtime | null>(null);
  const [showSeatSelector, setShowSeatSelector] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchMovie();
      fetchShowtimes();
      fetchReviews();
    }
  }, [id]);

  const fetchMovie = async () => {
    const { data, error } = await supabase.from("movies").select("*").eq("id", id).single();
    if (!error) setMovie(data);
    setLoading(false);
  };

  const fetchShowtimes = async () => {
    const { data, error } = await supabase
      .from("showtimes")
      .select("*, theaters(*)")
      .eq("movie_id", id!)
      .gte("show_date", new Date().toISOString().split("T")[0])
      .order("show_date")
      .order("show_time");
    if (!error) setShowtimes(data || []);
  };

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("movie_id", id!)
      .order("created_at", { ascending: false });
    if (!error) {
      // Fetch profile names
      const userIds = [...new Set((data || []).map(r => r.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        setReviews((data || []).map(r => ({ ...r, profiles: profileMap.get(r.user_id) || null })));
      } else {
        setReviews(data || []);
      }
    }
  };

  const handleSubmitReview = async () => {
    if (!user || !id) return;
    try {
      const { error } = await supabase.from("reviews").upsert({
        user_id: user.id,
        movie_id: id,
        rating: reviewRating,
        comment: reviewComment || null,
      }, { onConflict: "user_id,movie_id" });
      if (error) throw error;
      toast.success("Review submitted!");
      setReviewComment("");
      fetchReviews();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-xl">Movie not found</p>
      </div>
    );
  }

  if (showSeatSelector && selectedShowtime) {
    return (
      <SeatSelector
        showtime={selectedShowtime}
        movie={movie}
        onBack={() => setShowSeatSelector(false)}
        onBookingComplete={() => {
          setShowSeatSelector(false);
          fetchShowtimes();
          toast.success("Booking confirmed! 🎬");
        }}
      />
    );
  }

  const uniqueDates = [...new Set(showtimes.map(s => s.show_date))];

  return (
    <div className="min-h-screen bg-background">
      {/* Movie Hero */}
      <div className="relative h-[400px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
        {movie.poster_url && (
          <img src={movie.poster_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        )}
        <div className="relative z-10 container mx-auto px-4 h-full flex items-center gap-8">
          <Button variant="ghost" size="icon" className="absolute top-4 left-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="w-48 h-72 rounded-lg overflow-hidden shadow-2xl flex-shrink-0 border border-border/30">
            {movie.poster_url ? (
              <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Film className="h-16 w-16 text-muted-foreground/50" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-5xl md:text-6xl tracking-wider mb-3">{movie.title}</h1>
            <div className="flex items-center gap-4 mb-4">
              <Badge className="bg-secondary text-secondary-foreground">{movie.genre}</Badge>
              <span className="flex items-center gap-1 text-secondary">
                <Star className="h-4 w-4 fill-secondary" /> {Number(movie.rating).toFixed(1)}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" /> {movie.duration_minutes} min
              </span>
              <Badge variant="outline">{movie.language}</Badge>
            </div>
            <p className="text-muted-foreground max-w-2xl leading-relaxed">{movie.description}</p>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Showtimes */}
          <div className="lg:col-span-2">
            <h2 className="text-3xl tracking-wider mb-6">Showtimes</h2>
            {showtimes.length === 0 ? (
              <Card className="border-border/30">
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No showtimes available</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {uniqueDates.map(date => (
                  <div key={date}>
                    <h3 className="text-lg font-medium mb-3 flex items-center gap-2" style={{ fontFamily: 'Inter' }}>
                      <Calendar className="h-4 w-4 text-primary" />
                      {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {showtimes.filter(s => s.show_date === date).map(showtime => (
                        <Card key={showtime.id} className="border-border/30 hover:border-primary/50 transition-colors">
                          <CardContent className="p-4 flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-lg" style={{ fontFamily: 'Inter' }}>
                                {showtime.show_time.slice(0, 5)}
                              </p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {showtime.theaters?.name} • {showtime.theaters?.screen_type}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {showtime.available_seats} seats available
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-secondary">₹{Number(showtime.price).toFixed(0)}</p>
                              <Button
                                size="sm"
                                className="mt-2"
                                disabled={showtime.available_seats === 0}
                                onClick={() => {
                                  setSelectedShowtime(showtime);
                                  setShowSeatSelector(true);
                                }}
                              >
                                Book Now
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reviews */}
          <div>
            <h2 className="text-3xl tracking-wider mb-6">Reviews</h2>
            {/* Write Review */}
            {user && (
              <Card className="mb-6 border-border/30">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Your rating:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`h-5 w-5 cursor-pointer transition-colors ${star <= reviewRating ? 'text-secondary fill-secondary' : 'text-muted-foreground'}`}
                          onClick={() => setReviewRating(star)}
                        />
                      ))}
                    </div>
                  </div>
                  <Textarea
                    placeholder="Write your review..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="bg-muted/50"
                  />
                  <Button size="sm" onClick={handleSubmitReview}>Submit Review</Button>
                </CardContent>
              </Card>
            )}

            {/* Review List */}
            <div className="space-y-3">
              {reviews.map(review => (
                <Card key={review.id} className="border-border/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm" style={{ fontFamily: 'Inter' }}>
                        {review.profiles?.full_name || "Anonymous"}
                      </span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star key={star} className={`h-3.5 w-3.5 ${star <= review.rating ? 'text-secondary fill-secondary' : 'text-muted-foreground/30'}`} />
                        ))}
                      </div>
                    </div>
                    {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                    <p className="text-xs text-muted-foreground/60 mt-2">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
              {reviews.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No reviews yet</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MovieDetail;
