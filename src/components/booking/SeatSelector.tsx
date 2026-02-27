import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Monitor } from "lucide-react";
import { toast } from "sonner";

type Props = {
  showtime: {
    id: string;
    show_date: string;
    show_time: string;
    price: number;
    available_seats: number;
    theaters: { id: string; name: string; total_rows: number; seats_per_row: number; screen_type: string } | null;
  };
  movie: { id: string; title: string };
  onBack: () => void;
  onBookingComplete: () => void;
};

const SeatSelector = ({ showtime, movie, onBack, onBookingComplete }: Props) => {
  const { user } = useAuth();
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [bookedSeats, setBookedSeats] = useState<Set<string>>(new Set());
  const [booking, setBooking] = useState(false);

  const rows = showtime.theaters?.total_rows || 10;
  const cols = showtime.theaters?.seats_per_row || 12;

  useEffect(() => {
    fetchBookedSeats();
  }, []);

  const fetchBookedSeats = async () => {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("showtime_id", showtime.id)
      .eq("status", "confirmed");

    if (bookings && bookings.length > 0) {
      const bookingIds = bookings.map(b => b.id);
      const { data: seats } = await supabase
        .from("booking_seats")
        .select("seat_label")
        .in("booking_id", bookingIds);
      setBookedSeats(new Set(seats?.map(s => s.seat_label) || []));
    }
  };

  const getSeatLabel = (row: number, col: number) => {
    return `${String.fromCharCode(65 + row)}${col + 1}`;
  };

  const toggleSeat = (label: string) => {
    if (bookedSeats.has(label)) return;
    setSelectedSeats(prev =>
      prev.includes(label) ? prev.filter(s => s !== label) : [...prev, label]
    );
  };

  const handleBooking = async () => {
    if (!user || selectedSeats.length === 0) return;
    setBooking(true);
    try {
      const totalAmount = selectedSeats.length * Number(showtime.price);

      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          user_id: user.id,
          showtime_id: showtime.id,
          total_amount: totalAmount,
          status: "confirmed",
          payment_method: "card",
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      const seatInserts = selectedSeats.map(label => {
        const row = label.charCodeAt(0) - 65;
        const col = parseInt(label.slice(1)) - 1;
        return {
          booking_id: bookingData.id,
          seat_row: row,
          seat_col: col,
          seat_label: label,
        };
      });

      const { error: seatsError } = await supabase.from("booking_seats").insert(seatInserts);
      if (seatsError) throw seatsError;

      // Update available seats
      await supabase
        .from("showtimes")
        .update({ available_seats: showtime.available_seats - selectedSeats.length })
        .eq("id", showtime.id);

      onBookingComplete();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBooking(false);
    }
  };

  const totalPrice = selectedSeats.length * Number(showtime.price);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl tracking-wider">{movie.title}</h1>
            <p className="text-sm text-muted-foreground">
              {showtime.theaters?.name} • {new Date(showtime.show_date + 'T00:00:00').toLocaleDateString()} • {showtime.show_time.slice(0, 5)}
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Screen */}
          <div className="text-center mb-8">
            <div className="relative mx-auto w-3/4">
              <div className="h-2 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full mb-1" />
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Monitor className="h-3 w-3" /> SCREEN
              </div>
            </div>
          </div>

          {/* Seat Grid */}
          <div className="flex flex-col items-center gap-1.5 mb-8">
            {Array.from({ length: rows }).map((_, row) => (
              <div key={row} className="flex items-center gap-1.5">
                <span className="w-6 text-xs text-muted-foreground text-right">
                  {String.fromCharCode(65 + row)}
                </span>
                {Array.from({ length: cols }).map((_, col) => {
                  const label = getSeatLabel(row, col);
                  const isBooked = bookedSeats.has(label);
                  const isSelected = selectedSeats.includes(label);
                  return (
                    <button
                      key={label}
                      onClick={() => toggleSeat(label)}
                      disabled={isBooked}
                      className={`w-8 h-8 rounded-t-lg text-[10px] font-medium transition-all ${
                        isBooked
                          ? "bg-muted text-muted-foreground/30 cursor-not-allowed"
                          : isSelected
                          ? "bg-primary text-primary-foreground shadow-[0_0_10px_hsl(0,85%,50%,0.5)]"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50"
                      }`}
                      title={label}
                    >
                      {col + 1}
                    </button>
                  );
                })}
                <span className="w-6 text-xs text-muted-foreground">
                  {String.fromCharCode(65 + row)}
                </span>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-6 mb-8 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-t-lg bg-muted/50 border border-border/50" />
              <span className="text-muted-foreground">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-t-lg bg-primary" />
              <span className="text-muted-foreground">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-t-lg bg-muted" />
              <span className="text-muted-foreground">Booked</span>
            </div>
          </div>

          {/* Booking Summary */}
          {selectedSeats.length > 0 && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Selected Seats</p>
                    <p className="font-semibold text-lg" style={{ fontFamily: 'Inter' }}>
                      {selectedSeats.sort().join(", ")}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedSeats.length} × ₹{Number(showtime.price).toFixed(0)} = <span className="text-secondary font-bold text-lg">₹{totalPrice.toFixed(0)}</span>
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={handleBooking}
                    disabled={booking}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {booking ? "Booking..." : "Confirm Booking"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default SeatSelector;
