import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/toaster";
import { AuthModal } from "@/components/AuthModal";
import { UserProfile } from "@/components/UserProfile";
import {
  Car,
  MapPin,
  Clock,
  Plus,
  Users,
  Search,
  Calendar,
  RefreshCw,
  LogIn,
  LogOut,
  Lock,
  Eye,
  Mail,
  Shield,
} from "lucide-react";

interface Ride {
  id: string;
  type: "offering" | "seeking";
  from: string;
  to: string;
  date: string;
  time: string;
  seats: number;
  price: number;
  name: string;
  contact: string;
  notes?: string;
}

export default function Index() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [filteredRides, setFilteredRides] = useState<Ride[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "offering" | "seeking">(
    "all",
  );
  const [isAddRideOpen, setIsAddRideOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastModified, setLastModified] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, isAuthenticated, logout, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const pollIntervalRef = useRef<NodeJS.Timeout>();

  // Form state for adding new ride
  const [newRide, setNewRide] = useState({
    type: "offering" as "offering" | "seeking",
    from: "",
    to: "",
    date: "",
    time: "",
    seats: 1,
    price: 0,
    name: "",
    contact: "",
    notes: "",
  });

  // Update form defaults when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      setNewRide((prev) => ({
        ...prev,
        name: user.name,
        contact: user.email,
      }));
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchRides();
    startPolling();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let filtered = rides;

    if (filterType !== "all") {
      filtered = filtered.filter((ride) => ride.type === filterType);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (ride) =>
          ride.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ride.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ride.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    setFilteredRides(filtered);
  }, [rides, searchTerm, filterType]);

  const startPolling = () => {
    pollIntervalRef.current = setInterval(() => {
      checkForUpdates();
    }, 10000);
  };

  const checkForUpdates = async () => {
    try {
      const response = await fetch("/api/rides/check-updates");
      const data = await response.json();

      if (data.lastModified > lastModified) {
        console.log("CSV file updated, refreshing data...");
        setRides(data.rides || []);
        setLastModified(data.lastModified);
        toast({
          title: "Data Updated",
          description: "Ride information has been refreshed from the file.",
        });
      }
    } catch (error) {
      console.error("Failed to check for updates:", error);
    }
  };

  const fetchRides = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/rides");
      const data = await response.json();

      if (response.ok) {
        setRides(data.rides || []);
        setLastModified(data.lastModified || Date.now());
        console.log("Loaded rides:", data.rides?.length || 0);
      } else {
        throw new Error(data.error || "Failed to fetch rides");
      }
    } catch (error) {
      console.error("Failed to fetch rides:", error);
      toast({
        title: "Error",
        description: "Failed to load ride data. Please try refreshing.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchRides();
    setIsRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Ride data has been updated.",
    });
  };

  const validateForm = () => {
    const required = ["type", "from", "to", "date", "time", "name", "contact"];
    for (const field of required) {
      if (!newRide[field as keyof typeof newRide]) {
        toast({
          title: "Validation Error",
          description: `${field.charAt(0).toUpperCase() + field.slice(1)} is required.`,
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  const handleAddRide = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please login to add a ride.",
        variant: "destructive",
      });
      setIsAuthModalOpen(true);
      return;
    }

    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      console.log("Submitting ride:", newRide);

      const response = await fetch("/api/rides", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newRide),
      });

      const data = await response.json();

      if (response.ok) {
        setIsAddRideOpen(false);
        setNewRide({
          type: "offering",
          from: "",
          to: "",
          date: "",
          time: "",
          seats: 1,
          price: 0,
          name: user?.name || "",
          contact: user?.email || "",
          notes: "",
        });

        toast({
          title: "Success!",
          description: "Your ride has been added successfully.",
        });

        await fetchRides();
      } else {
        throw new Error(data.error || "Failed to add ride");
      }
    } catch (error) {
      console.error("Failed to add ride:", error);
      toast({
        title: "Error",
        description: "Failed to add ride. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginClick = () => {
    setIsAuthModalOpen(true);
  };

  const handleLogout = () => {
    logout();
    setNewRide({
      type: "offering",
      from: "",
      to: "",
      date: "",
      time: "",
      seats: 1,
      price: 0,
      name: "",
      contact: "",
      notes: "",
    });
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  const maskContactInfo = (contact: string): string => {
    if (contact.includes("@")) {
      // Email
      const [local, domain] = contact.split("@");
      const maskedLocal = local.substring(0, 2) + "***";
      const [domainName, ext] = domain.split(".");
      return `${maskedLocal}@${domainName.substring(0, 1)}***.${ext}`;
    } else {
      // Phone - handle various formats
      const cleaned = contact.replace(/\D/g, "");
      if (cleaned.length >= 10) {
        const formatted = `${cleaned.substring(0, 3)}***${cleaned.slice(-2)}`;
        return formatted;
      }
      return "***";
    }
  };

  const maskName = (name: string): string => {
    const parts = name.split(" ");
    if (parts.length === 1) {
      return parts[0].substring(0, 1) + "***";
    }
    return parts[0] + " " + parts[1].substring(0, 1) + "***";
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-purple-50/30 to-green-50/20 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-purple-50/30 to-green-50/20">
      <Toaster />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                <Car className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                RideShare Hub
              </h1>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </Button>

              {isAuthenticated ? (
                <>
                  <div className="hidden sm:flex items-center space-x-2 text-sm">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <span className="text-muted-foreground">
                      Welcome, {user?.name}
                    </span>
                  </div>

                  <UserProfile />

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="text-muted-foreground"
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    Logout
                  </Button>

                  <Dialog open={isAddRideOpen} onOpenChange={setIsAddRideOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Ride
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add New Ride</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="type">Type</Label>
                          <Select
                            value={newRide.type}
                            onValueChange={(value: "offering" | "seeking") =>
                              setNewRide({ ...newRide, type: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="offering">
                                Offering Ride
                              </SelectItem>
                              <SelectItem value="seeking">
                                Seeking Ride
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="from">From *</Label>
                            <Input
                              id="from"
                              value={newRide.from}
                              onChange={(e) =>
                                setNewRide({ ...newRide, from: e.target.value })
                              }
                              placeholder="Starting location"
                            />
                          </div>
                          <div>
                            <Label htmlFor="to">To *</Label>
                            <Input
                              id="to"
                              value={newRide.to}
                              onChange={(e) =>
                                setNewRide({ ...newRide, to: e.target.value })
                              }
                              placeholder="Destination"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="date">Date *</Label>
                            <Input
                              id="date"
                              type="date"
                              value={newRide.date}
                              onChange={(e) =>
                                setNewRide({ ...newRide, date: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="time">Time *</Label>
                            <Input
                              id="time"
                              type="time"
                              value={newRide.time}
                              onChange={(e) =>
                                setNewRide({ ...newRide, time: e.target.value })
                              }
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="seats">Seats</Label>
                            <Input
                              id="seats"
                              type="number"
                              min="1"
                              max="8"
                              value={newRide.seats}
                              onChange={(e) =>
                                setNewRide({
                                  ...newRide,
                                  seats: parseInt(e.target.value) || 1,
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="price">Price ($)</Label>
                            <Input
                              id="price"
                              type="number"
                              min="0"
                              step="0.01"
                              value={newRide.price}
                              onChange={(e) =>
                                setNewRide({
                                  ...newRide,
                                  price: parseFloat(e.target.value) || 0,
                                })
                              }
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="name">Your Name *</Label>
                          <Input
                            id="name"
                            value={newRide.name}
                            onChange={(e) =>
                              setNewRide({ ...newRide, name: e.target.value })
                            }
                            placeholder="Full name"
                          />
                        </div>

                        <div>
                          <Label htmlFor="contact">Contact Info *</Label>
                          <Input
                            id="contact"
                            value={newRide.contact}
                            onChange={(e) =>
                              setNewRide({
                                ...newRide,
                                contact: e.target.value,
                              })
                            }
                            placeholder="Email or phone"
                          />
                        </div>

                        <div>
                          <Label htmlFor="notes">Notes (Optional)</Label>
                          <Textarea
                            id="notes"
                            value={newRide.notes}
                            onChange={(e) =>
                              setNewRide({ ...newRide, notes: e.target.value })
                            }
                            placeholder="Additional details..."
                          />
                        </div>

                        <Button
                          onClick={handleAddRide}
                          className="w-full bg-gradient-to-r from-primary to-secondary"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Adding Ride...
                            </>
                          ) : (
                            "Add Ride"
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              ) : (
                <Button
                  onClick={handleLoginClick}
                  className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Share Your Journey
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Connect with fellow travelers to share rides, split costs, and
              reduce your carbon footprint. Find rides or offer yours in our
              growing community.
            </p>

            {!isAuthenticated && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 max-w-lg mx-auto">
                <div className="flex items-center gap-2 text-amber-800">
                  <Shield className="h-5 w-5" />
                  <span className="font-semibold">
                    Secure Email Authentication
                  </span>
                </div>
                <p className="text-sm text-amber-700 mt-1">
                  Create an account with email verification to access contact
                  details and add rides
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-8">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live updates every 10 seconds</span>
              {isAuthenticated && (
                <>
                  <span>•</span>
                  <Mail className="h-3 w-3" />
                  <span className="text-green-600 font-medium">
                    Logged in as {user?.name}
                  </span>
                </>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-8 mt-12">
              <div className="flex items-center space-x-2">
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Verified Community</p>
                  <p className="text-sm text-muted-foreground">
                    Email-verified users only
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="h-12 w-12 bg-secondary/10 rounded-full flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-secondary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Local & Long Distance</p>
                  <p className="text-sm text-muted-foreground">
                    Any route, any distance
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="h-12 w-12 bg-accent/10 rounded-full flex items-center justify-center">
                  <Shield className="h-6 w-6 text-accent" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Secure & Private</p>
                  <p className="text-sm text-muted-foreground">
                    Password + OTP protection
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search and Filter Section */}
      <section className="py-8 px-4 border-t bg-background/50">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by location or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant={filterType === "all" ? "default" : "outline"}
                onClick={() => setFilterType("all")}
                size="sm"
              >
                All Rides ({rides.length})
              </Button>
              <Button
                variant={filterType === "offering" ? "default" : "outline"}
                onClick={() => setFilterType("offering")}
                size="sm"
                className={
                  filterType === "offering"
                    ? "bg-secondary hover:bg-secondary/90"
                    : ""
                }
              >
                Offering ({rides.filter((r) => r.type === "offering").length})
              </Button>
              <Button
                variant={filterType === "seeking" ? "default" : "outline"}
                onClick={() => setFilterType("seeking")}
                size="sm"
                className={
                  filterType === "seeking"
                    ? "bg-accent text-accent-foreground hover:bg-accent/90"
                    : ""
                }
              >
                Seeking ({rides.filter((r) => r.type === "seeking").length})
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Rides Section */}
      <section className="py-8 px-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold">Available Rides</h3>
            {filteredRides.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Showing {filteredRides.length} of {rides.length} rides
              </p>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-3">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredRides.length === 0 ? (
            <div className="text-center py-12">
              <Car className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h4 className="text-xl font-semibold mb-2">No rides found</h4>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterType !== "all"
                  ? "Try adjusting your search or filters."
                  : "Be the first to add a ride!"}
              </p>
              {isAuthenticated ? (
                <Button
                  onClick={() => setIsAddRideOpen(true)}
                  className="bg-gradient-to-r from-primary to-secondary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add the First Ride
                </Button>
              ) : (
                <Button
                  onClick={handleLoginClick}
                  className="bg-gradient-to-r from-primary to-secondary"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In to Add Rides
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRides.map((ride) => (
                <Card
                  key={ride.id}
                  className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary/20 hover:border-l-primary"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">
                        {ride.from} → {ride.to}
                      </CardTitle>
                      <Badge
                        variant={
                          ride.type === "offering" ? "default" : "secondary"
                        }
                        className={
                          ride.type === "offering"
                            ? "bg-secondary hover:bg-secondary/90"
                            : "bg-accent text-accent-foreground hover:bg-accent/90"
                        }
                      >
                        {ride.type === "offering" ? "Offering" : "Seeking"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      by {isAuthenticated ? ride.name : maskName(ride.name)}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      {ride.date} at {ride.time}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <Users className="h-4 w-4 mr-1" />
                        {ride.seats} seats
                      </div>
                      <div className="font-semibold text-lg text-primary">
                        ${ride.price}
                      </div>
                    </div>
                    {ride.notes && (
                      <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                        {ride.notes}
                      </p>
                    )}
                    <div className="pt-2 border-t">
                      {isAuthenticated ? (
                        <p className="text-sm font-medium">
                          Contact: {ride.contact}
                        </p>
                      ) : (
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">
                            Contact: {maskContactInfo(ride.contact)}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleLoginClick}
                            className="text-xs"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Show
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-20 border-t bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="h-6 w-6 bg-gradient-to-br from-primary to-secondary rounded-md flex items-center justify-center">
                <Car className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-lg">RideShare Hub</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Connecting verified travelers with secure email authentication.
              Data syncs in real-time with your CSV file.
              {!isAuthenticated && (
                <>
                  <br />
                  <Button
                    variant="link"
                    className="text-xs p-0 h-auto"
                    onClick={handleLoginClick}
                  >
                    Create account to see full contact details
                  </Button>
                </>
              )}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
