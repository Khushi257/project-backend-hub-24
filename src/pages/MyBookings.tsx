import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Film, Ticket, Calendar, Clock, MapPin } from "lucide-react";

type Booking = {
  id: string;
  total_amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  showtime: {
    show_date: string;
    show_time: string;
    movie: { title: string; poster_url: string | null; genre: string } | null;
    theater: { name: string; screen_type: string } | null;
  } | null;
  seats: string[];
};

const MyBookings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    try {
      const { data: bookingsData, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const enriched: Booking[] = [];
      for (const b of bookingsData || []) {
        // Fetch showtime with movie and theater
        const { data: showtime } = await supabase
          .from("showtimes")
          .select("show_date, show_time, movie_id, theater_id")
          .eq("id", b.showtime_id)
          .single();

        let movieData = null;
        let theaterData = null;
        if (showtime) {
          const { data: m } = await supabase.from("movies").select("title, poster_url, genre").eq("id", showtime.movie_id).single();
          const { data: t } = await supabase.from("theaters").select("name, screen_type").eq("id", showtime.theater_id).single();
          movieData = m;
          theaterData = t;
        }

        const { data: seats } = await supabase
          .from("booking_seats")
          .select("seat_label")
          .eq("booking_id", b.id);

        enriched.push({
          ...b,
          showtime: showtime ? {
            show_date: showtime.show_date,
            show_time: showtime.show_time,
            movie: movieData,
            theater: theaterData,
          } : null,
          seats: seats?.map(s => s.seat_label) || [],
        });
      }

      setBookings(enriched);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl tracking-wider">My Bookings</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20">
            <Ticket className="h-20 w-20 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-2xl text-muted-foreground tracking-wider">No bookings yet</p>
            <Button className="mt-4" onClick={() => navigate("/dashboard")}>Browse Movies</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map(booking => (
              <Card key={booking.id} className="border-border/30 overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex">
                    <div className="w-24 h-36 flex-shrink-0 bg-muted">
                      {booking.showtime?.movie?.poster_url ? (
                        <img src={booking.showtime.movie.poster_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl tracking-wider">{booking.showtime?.movie?.title || "Unknown"}</h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {booking.showtime?.show_date ? new Date(booking.showtime.show_date + 'T00:00:00').toLocaleDateString() : "N/A"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {booking.showtime?.show_time?.slice(0, 5) || "N/A"}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {booking.showtime?.theater?.name || "N/A"}
                          </p>
                        </div>
                        <Badge variant={booking.status === "confirmed" ? "default" : "secondary"}>
                          {booking.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Seats: </span>
                          <span className="font-medium">{booking.seats.sort().join(", ")}</span>
                        </div>
                        <span className="text-lg font-bold text-secondary">₹{Number(booking.total_amount).toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyBookings;
