import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Film, Plus, LogOut, BarChart3, Users, Ticket, Clapperboard, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

const AdminDashboard = () => {
  const { signOut, user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [movies, setMovies] = useState<any[]>([]);
  const [theaters, setTheaters] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Movie form
  const [movieDialog, setMovieDialog] = useState(false);
  const [movieForm, setMovieForm] = useState({
    title: "", description: "", genre: "Action", duration_minutes: "120",
    rating: "0", poster_url: "", language: "English", status: "now_showing"
  });

  // Theater form
  const [theaterDialog, setTheaterDialog] = useState(false);
  const [theaterForm, setTheaterForm] = useState({
    name: "", total_rows: "10", seats_per_row: "12", screen_type: "Standard"
  });

  // Showtime form
  const [showtimeDialog, setShowtimeDialog] = useState(false);
  const [showtimeForm, setShowtimeForm] = useState({
    movie_id: "", theater_id: "", show_date: "", show_time: "", price: "150"
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [moviesRes, theatersRes, bookingsRes] = await Promise.all([
      supabase.from("movies").select("*").order("created_at", { ascending: false }),
      supabase.from("theaters").select("*").order("name"),
      supabase.from("bookings").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setMovies(moviesRes.data || []);
    setTheaters(theatersRes.data || []);
    setBookings(bookingsRes.data || []);
    setLoading(false);
  };

  const handleAddMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("movies").insert({
        ...movieForm,
        duration_minutes: parseInt(movieForm.duration_minutes),
        rating: parseFloat(movieForm.rating),
      });
      if (error) throw error;
      toast.success("Movie added!");
      setMovieDialog(false);
      setMovieForm({ title: "", description: "", genre: "Action", duration_minutes: "120", rating: "0", poster_url: "", language: "English", status: "now_showing" });
      fetchAll();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDeleteMovie = async (id: string) => {
    const { error } = await supabase.from("movies").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Movie deleted"); fetchAll(); }
  };

  const handleAddTheater = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("theaters").insert({
        ...theaterForm,
        total_rows: parseInt(theaterForm.total_rows),
        seats_per_row: parseInt(theaterForm.seats_per_row),
      });
      if (error) throw error;
      toast.success("Theater added!");
      setTheaterDialog(false);
      setTheaterForm({ name: "", total_rows: "10", seats_per_row: "12", screen_type: "Standard" });
      fetchAll();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAddShowtime = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const theater = theaters.find(t => t.id === showtimeForm.theater_id);
      const totalSeats = theater ? theater.total_rows * theater.seats_per_row : 120;
      const { error } = await supabase.from("showtimes").insert({
        ...showtimeForm,
        price: parseFloat(showtimeForm.price),
        available_seats: totalSeats,
      });
      if (error) throw error;
      toast.success("Showtime added!");
      setShowtimeDialog(false);
      setShowtimeForm({ movie_id: "", theater_id: "", show_date: "", show_time: "", price: "150" });
    } catch (e: any) { toast.error(e.message); }
  };

  const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.total_amount), 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="h-7 w-7 text-primary" />
            <span className="text-3xl font-bold tracking-wider">CineBook Admin</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-border/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Movies</p>
                  <p className="text-3xl font-bold">{movies.length}</p>
                </div>
                <Clapperboard className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Theaters</p>
                  <p className="text-3xl font-bold">{theaters.length}</p>
                </div>
                <Film className="h-8 w-8 text-secondary/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Bookings</p>
                  <p className="text-3xl font-bold">{bookings.length}</p>
                </div>
                <Ticket className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                  <p className="text-3xl font-bold text-secondary">₹{totalRevenue.toFixed(0)}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-secondary/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="movies">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="movies">Movies</TabsTrigger>
            <TabsTrigger value="theaters">Theaters</TabsTrigger>
            <TabsTrigger value="showtimes">Showtimes</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
          </TabsList>

          {/* Movies Tab */}
          <TabsContent value="movies" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl tracking-wider">Movies</h2>
              <Dialog open={movieDialog} onOpenChange={setMovieDialog}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" /> Add Movie</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Add Movie</DialogTitle></DialogHeader>
                  <form onSubmit={handleAddMovie} className="space-y-3">
                    <div><Label>Title</Label><Input value={movieForm.title} onChange={e => setMovieForm({...movieForm, title: e.target.value})} required /></div>
                    <div><Label>Description</Label><Textarea value={movieForm.description} onChange={e => setMovieForm({...movieForm, description: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Genre</Label>
                        <Select value={movieForm.genre} onValueChange={v => setMovieForm({...movieForm, genre: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Romance", "Thriller", "Animation"].map(g => (
                              <SelectItem key={g} value={g}>{g}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Duration (min)</Label><Input type="number" value={movieForm.duration_minutes} onChange={e => setMovieForm({...movieForm, duration_minutes: e.target.value})} required /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Rating (0-10)</Label><Input type="number" step="0.1" max="10" value={movieForm.rating} onChange={e => setMovieForm({...movieForm, rating: e.target.value})} /></div>
                      <div>
                        <Label>Language</Label>
                        <Select value={movieForm.language} onValueChange={v => setMovieForm({...movieForm, language: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["English", "Hindi", "Tamil", "Telugu", "Malayalam"].map(l => (
                              <SelectItem key={l} value={l}>{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div><Label>Poster URL</Label><Input value={movieForm.poster_url} onChange={e => setMovieForm({...movieForm, poster_url: e.target.value})} placeholder="https://..." /></div>
                    <div>
                      <Label>Status</Label>
                      <Select value={movieForm.status} onValueChange={v => setMovieForm({...movieForm, status: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="now_showing">Now Showing</SelectItem>
                          <SelectItem value="coming_soon">Coming Soon</SelectItem>
                          <SelectItem value="ended">Ended</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full">Add Movie</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {movies.map(movie => (
                <Card key={movie.id} className="border-border/30 overflow-hidden">
                  <div className="aspect-video bg-muted relative">
                    {movie.poster_url ? (
                      <img src={movie.poster_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Film className="h-12 w-12 text-muted-foreground/30" /></div>
                    )}
                    <Badge className="absolute top-2 left-2">{movie.status}</Badge>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="text-xl tracking-wider mb-1">{movie.title}</h3>
                    <p className="text-sm text-muted-foreground">{movie.genre} • {movie.duration_minutes}m • {movie.language}</p>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-secondary font-bold">★ {Number(movie.rating).toFixed(1)}</span>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteMovie(movie.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Theaters Tab */}
          <TabsContent value="theaters" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl tracking-wider">Theaters</h2>
              <Dialog open={theaterDialog} onOpenChange={setTheaterDialog}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" /> Add Theater</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Theater</DialogTitle></DialogHeader>
                  <form onSubmit={handleAddTheater} className="space-y-3">
                    <div><Label>Name</Label><Input value={theaterForm.name} onChange={e => setTheaterForm({...theaterForm, name: e.target.value})} required /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Rows</Label><Input type="number" value={theaterForm.total_rows} onChange={e => setTheaterForm({...theaterForm, total_rows: e.target.value})} required /></div>
                      <div><Label>Seats/Row</Label><Input type="number" value={theaterForm.seats_per_row} onChange={e => setTheaterForm({...theaterForm, seats_per_row: e.target.value})} required /></div>
                    </div>
                    <div>
                      <Label>Screen Type</Label>
                      <Select value={theaterForm.screen_type} onValueChange={v => setTheaterForm({...theaterForm, screen_type: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Standard">Standard</SelectItem>
                          <SelectItem value="IMAX">IMAX</SelectItem>
                          <SelectItem value="4DX">4DX</SelectItem>
                          <SelectItem value="Dolby Atmos">Dolby Atmos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full">Add Theater</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {theaters.map(t => (
                <Card key={t.id} className="border-border/30">
                  <CardContent className="p-6">
                    <h3 className="text-xl tracking-wider mb-2">{t.name}</h3>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>Type: {t.screen_type}</p>
                      <p>Capacity: {t.total_rows * t.seats_per_row} seats ({t.total_rows} rows × {t.seats_per_row})</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Showtimes Tab */}
          <TabsContent value="showtimes" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl tracking-wider">Showtimes</h2>
              <Dialog open={showtimeDialog} onOpenChange={setShowtimeDialog}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" /> Add Showtime</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Showtime</DialogTitle></DialogHeader>
                  <form onSubmit={handleAddShowtime} className="space-y-3">
                    <div>
                      <Label>Movie</Label>
                      <Select value={showtimeForm.movie_id} onValueChange={v => setShowtimeForm({...showtimeForm, movie_id: v})}>
                        <SelectTrigger><SelectValue placeholder="Select movie" /></SelectTrigger>
                        <SelectContent>
                          {movies.map(m => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Theater</Label>
                      <Select value={showtimeForm.theater_id} onValueChange={v => setShowtimeForm({...showtimeForm, theater_id: v})}>
                        <SelectTrigger><SelectValue placeholder="Select theater" /></SelectTrigger>
                        <SelectContent>
                          {theaters.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.screen_type})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Date</Label><Input type="date" value={showtimeForm.show_date} onChange={e => setShowtimeForm({...showtimeForm, show_date: e.target.value})} required /></div>
                      <div><Label>Time</Label><Input type="time" value={showtimeForm.show_time} onChange={e => setShowtimeForm({...showtimeForm, show_time: e.target.value})} required /></div>
                    </div>
                    <div><Label>Price (₹)</Label><Input type="number" value={showtimeForm.price} onChange={e => setShowtimeForm({...showtimeForm, price: e.target.value})} required /></div>
                    <Button type="submit" className="w-full">Add Showtime</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-muted-foreground text-sm">Showtimes are managed per movie. Add a showtime by selecting a movie and theater above.</p>
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="mt-6">
            <h2 className="text-2xl tracking-wider mb-4">Recent Bookings</h2>
            <Card className="border-border/30">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs">{b.id.slice(0, 8)}...</TableCell>
                      <TableCell className="text-secondary font-bold">₹{Number(b.total_amount).toFixed(0)}</TableCell>
                      <TableCell><Badge variant={b.status === "confirmed" ? "default" : "secondary"}>{b.status}</Badge></TableCell>
                      <TableCell>{b.payment_method}</TableCell>
                      <TableCell>{new Date(b.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
