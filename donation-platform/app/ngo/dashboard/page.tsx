"use client"
import React from 'react';


import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { useToast } from "@/components/ui/use-toast";
import NGORoute from "@/components/auth/ngo-route";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  Bell,
  Building,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Gift,
  Home,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Package,
  Phone,
  Settings,
  User,
  Users,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface Coordinates {
  lat: number;
  lng: number;
}

interface User {
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

interface DonationItem {
  itemName: string;
  quantity: number;
  description?: string;
  images?: Array<{
    url: string;
    analysis?: string;
  }>;
}

interface Donation {
  _id: string;
  status: string;
  createdAt: string;
  user: User;
  items: DonationItem[];
  pickupAddress: string;
  location?: string;
  coordinates?: Coordinates;
  distance?: string;
  pickupDate: string;
  pickupTime: string;
  pickupOption: string;
  progress?: number;
  completedDate?: string;
  notes?: string;
  rejectionReason?: string;
}

interface DecodedToken {
  id: string;
  exp: number;
  name?: string;
}

// Utility functions
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

async function getCoordinates(address: string): Promise<Coordinates | null> {
  try {
    // Using OpenStreetMap's Nominatim service (free, no API key required)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
    );
    const data = await response.json();
    if (data && data[0]) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance}km`;
}

export default function NgoDashboardPage() {
  return (
    <NGORoute>
      <NgoDashboard />
    </NGORoute>
  )
}

function NgoDashboard() {
  const router = useRouter()
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("available")
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [ngoName, setNgoName] = useState<string>("NGO")

  const [availableDonations, setAvailableDonations] = useState<Donation[]>([])
  const [acceptedDonations, setAcceptedDonations] = useState<Donation[]>([])
  const [completedDonations, setCompletedDonations] = useState<Donation[]>([])
  const [rejectedDonations, setRejectedDonations] = useState<Donation[]>([])
  const [loadingDonationId, setLoadingDonationId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<string | null>(null)
  const [selectedDonationId, setSelectedDonationId] = useState<string | null>(null)
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [isRejectionReasonValid, setIsRejectionReasonValid] = useState(false)

  const handleAcceptDonation = async (donationId: string) => {
    try {
      setLoadingDonationId(donationId)
      setActionType('accept')
      
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please login again to continue.",
          variant: "destructive",
        });
        return;
      }

      // Find the donation in availableDonations to check its pickup date
      const donation = availableDonations.find(d => d._id === donationId || d.id === donationId);
      
      if (!donation) {
        toast({
          title: "Error",
          description: "Donation not found.",
          variant: "destructive",
        });
        return;
      }
      
      // Validate the pickup date
      if (donation.pickupOption === 'scheduled' && donation.pickupDate) {
        const pickupDate = new Date(donation.pickupDate);
        const today = new Date();
        
        // Set time to beginning of day for comparison
        today.setHours(0, 0, 0, 0);
        
        if (pickupDate < today) {
          toast({
            title: "Cannot Accept",
            description: "The scheduled pickup date has already passed. Please contact the donor to reschedule.",
            variant: "destructive",
          });
          setLoadingDonationId(null);
          setActionType(null);
          return;
        }
      }

      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/donations/${donationId}/status`,
        { status: 'Accepted' },
        { 
          withCredentials: true,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

        console.log(response.data);
      if (response.status === 200) {
        // Find the donation in availableDonations
        const donationIndex = availableDonations.findIndex(d => d._id === donationId || d.id === donationId);
        if (donationIndex !== -1) {
          // Create updated donation with status changed to 'Accepted'
          const updatedDonation = { ...availableDonations[donationIndex], status: 'Accepted' };
          
          // Remove from available and add to accepted
          const newAvailable = [...availableDonations];
          newAvailable.splice(donationIndex, 1);
          
          setAvailableDonations(newAvailable);
          setAcceptedDonations([...acceptedDonations, updatedDonation]);
          
          toast({
            title: "Donation Accepted",
            description: `You have accepted donation DON-${donationId.slice(-4)}. Please arrange pickup.`,
          });
        }
      }
    } catch (error) {
      console.error("Failed to accept donation:", error);
      toast({
        title: "Error accepting donation",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoadingDonationId(null)
      setActionType(null)
    }
  }

  const openRejectionModal = (donationId: string) => {
    setSelectedDonationId(donationId);
    setRejectionReason("");
    setIsRejectionReasonValid(false);
    setShowRejectionModal(true);
  };

  const closeRejectionModal = () => {
    setSelectedDonationId(null);
    setRejectionReason("");
    setShowRejectionModal(false);
  };

  const handleRejectDonation = async (donationId: string, reason: string = "") => {
    try {
      setLoadingDonationId(donationId)
      setActionType('reject')
      
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please login again to continue.",
          variant: "destructive",
        });
        return;
      }

      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/donations/${donationId}/status`,
        { 
          status: 'Rejected',
          rejectionReason: reason 
        },
        { 
          withCredentials: true,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.status === 200) {
        // Find the donation in availableDonations
        const donationIndex = availableDonations.findIndex(d => d._id === donationId || d.id === donationId);
        if (donationIndex !== -1) {
          // Create updated donation with status changed to 'Rejected'
          const updatedDonation = { 
            ...availableDonations[donationIndex], 
            status: 'Rejected',
            rejectionReason: reason
          };
          
          // Remove from available and add to rejected
          const newAvailable = [...availableDonations];
          newAvailable.splice(donationIndex, 1);
          
          setAvailableDonations(newAvailable);
          setRejectedDonations([...rejectedDonations, updatedDonation]);
          
          toast({
            title: "Donation Rejected",
            description: `You have rejected donation DON-${donationId.slice(-4)}.`,
          });
        }
      }
    } catch (error) {
      console.error("Failed to reject donation:", error);
      toast({
        title: "Error rejecting donation",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoadingDonationId(null)
      setActionType(null)
      closeRejectionModal();
    }
  }

  const handleMarkAsCompleted = async (donationId: string) => {
    try {
      setLoadingDonationId(donationId)
      setActionType('complete')
      
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please login again to continue.",
          variant: "destructive",
        });
        return;
      }

      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/donations/${donationId}/status`,
        { 
          status: 'Completed',
          completedDate: new Date().toISOString() 
        },
        { 
          withCredentials: true,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.status === 200) {
        // Find the donation in acceptedDonations
        const donationIndex = acceptedDonations.findIndex(d => d._id === donationId || d.id === donationId);
        if (donationIndex !== -1) {
          // Create updated donation with status changed to 'Completed'
          const updatedDonation = { 
            ...acceptedDonations[donationIndex], 
            status: 'Completed',
            completedDate: new Date().toISOString(),
            progress: 100
          };
          
          // Remove from accepted and add to completed
          const newAccepted = [...acceptedDonations];
          newAccepted.splice(donationIndex, 1);
          
          setAcceptedDonations(newAccepted);
          setCompletedDonations([...completedDonations, updatedDonation]);
          
          toast({
            title: "Donation Completed",
            description: `You have marked donation DON-${donationId.slice(-4)} as collected.`,
          });
        }
      }
    } catch (error) {
      console.error("Failed to complete donation:", error);
      toast({
        title: "Error marking donation as collected",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoadingDonationId(null)
      setActionType(null)
    }
  }

  useEffect(() => {
    const fetchDonationsWithLocation = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) return;

        // Get current location
        let currentLocation: Coordinates | null = null;
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0
            });
          });
          currentLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          console.log("Current location:", currentLocation);
        } catch (error) {
          console.error("Error getting current location:", error);
          toast({
            title: "Location Error",
            description: "Unable to get your current location. Distances will not be shown.",
            variant: "destructive",
          });
        }

        // Try to extract NGO name from token
        try {
          const decodedToken = jwtDecode<DecodedToken & { name?: string }>(token)
          if (decodedToken.name) {
            setNgoName(decodedToken.name)
          } else {
            setNgoName("NGO Dashboard")
          }
        } catch (tokenError) {
          console.error("Error decoding token:", tokenError)
        }

        const decodedToken = jwtDecode<DecodedToken>(token)
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/donations/ngo/${decodedToken.id}`,
          {
            withCredentials: true,
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        const donations = Array.isArray(response.data) 
          ? response.data 
          : (response.data.donations || response.data.data || []);

        // Process donations with distance calculation
        const processedDonations = await Promise.all(donations.map(async (d: any) => {
          let distance: string | undefined;
          if (currentLocation && d.pickupAddress) {
            const donationCoords = await getCoordinates(d.pickupAddress);
            if (donationCoords) {
              const dist = calculateDistance(
                currentLocation.lat,
                currentLocation.lng,
                donationCoords.lat,
                donationCoords.lng
              );
              distance = formatDistance(dist);
            }
          }

          return {
            ...d,
            id: d._id,
            date: d.createdAt,
            donor: d.user ? `${d.user.firstName} ${d.user.lastName}` : 'Unknown',
            location: d.pickupAddress,
            distance: distance || 'Distance unavailable',
            progress: d.progress || 50,
          };
        }));

        const pending = processedDonations.filter((d: Donation) => d.status === 'Pending');
        const accepted = processedDonations.filter((d: Donation) => d.status === 'Accepted');
        const rejected = processedDonations.filter((d: Donation) => d.status === 'Rejected');
        const completed = processedDonations.filter((d: Donation) => d.status === 'Completed');

        setAvailableDonations(pending || []);
        setAcceptedDonations(accepted || []);
        setCompletedDonations(completed || []);
        setRejectedDonations(rejected || []);

      } catch (error) {
        console.error("Failed to fetch donation data:", error)
        toast({
          title: "Error fetching data",
          description: "Please try again later.",
          variant: "destructive",
        })
      }
    }

    fetchDonationsWithLocation();
  }, [])
  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/')
  }
  
  return (
    <div className="min-h-screen flex">
      <div className="hidden md:flex w-64 flex-col border-r bg-muted/40 h-screen sticky top-0">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <Gift className="h-6 w-6 text-primary" />
            <span>DonateConnect</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link href="/">
            <Button variant="ghost" className="w-full justify-start">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
          </Link>
          <Link href="/ngo/dashboard">
            <Button variant="secondary" className="w-full justify-start">
              <Package className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          {/* <Link href="/ngo/profile">
            <Button variant="ghost" className="w-full justify-start">
              <Building className="mr-2 h-4 w-4" />
              NGO Profile
            </Button>
          </Link>
          <Link href="/ngo/beneficiaries">
            <Button variant="ghost" className="w-full justify-start">
              <Users className="mr-2 h-4 w-4" />
              Beneficiaries
            </Button>
          </Link>
          <Link href="/ngo/settings">
            <Button variant="ghost" className="w-full justify-start">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </Link> */}
        </nav>
        <div className="border-t p-4 sticky bottom-0 bg-muted/40">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
          <div className="md:hidden flex items-center gap-2 font-bold">
            <Gift className="h-6 w-6 text-primary" />
            <span>DonateConnect</span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <Button variant="outline" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                3
              </span>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/ngo/profile">
                <User className="mr-2 h-4 w-4" />
                {ngoName}
              </Link>
            </Button>
          </div>
        </header>

        <main className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">NGO Dashboard</h1>
              <p className="text-muted-foreground">Manage donation requests and track pickups</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Available Donations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{availableDonations.length}</div>
                <p className="text-xs text-muted-foreground">Donations waiting for your response</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Accepted Donations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{acceptedDonations.length}</div>
                <p className="text-xs text-muted-foreground">Donations scheduled for pickup</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Completed Donations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{completedDonations.length}</div>
                <p className="text-xs text-muted-foreground">Successfully collected donations</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Rejected Donations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{rejectedDonations.length}</div>
                <p className="text-xs text-muted-foreground">Donations you've declined</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="available" className="space-y-4" onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="available">Available Donations</TabsTrigger>
              <TabsTrigger value="accepted">Accepted Donations</TabsTrigger>
              <TabsTrigger value="completed">Completed Donations</TabsTrigger>
              <TabsTrigger value="rejected">Rejected Donations</TabsTrigger>
            </TabsList>

            <TabsContent value="available" className="space-y-4">
              {availableDonations.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <Package className="h-10 w-10 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">No available donations in your area</p>
                  </CardContent>
                </Card>
              ) : (
                availableDonations.map((donation) => (
                  console.log(donation),
                  <Card key={donation._id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>DON-{donation._id.slice(-4)}</CardTitle>
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">New</span>
                      </div>
                      <CardDescription>Posted on {new Date(donation.createdAt).toLocaleDateString()}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-1">Donor:</p>
                        <p className="text-sm">{donation.user.firstName} {donation.user.lastName}</p>
                        <p className="text-sm">{donation.user.email}</p>
                        <p className="text-sm">{donation.user.mobile}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">Items:</p>
                        <div className="flex flex-wrap gap-2">
                          {donation.items.map((item, i) => (
                            <span key={i} className="bg-muted text-xs px-2 py-1 rounded-full">
                              {typeof item === 'object' ? item.itemName || 'Item' : item}
                              {typeof item === 'object' && item.quantity && ` (${item.quantity})`}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm">{donation.pickupAddress}</p>
                          <p className="text-xs text-muted-foreground">{donation.distance} away</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          Pickup:{" "}
                          {donation.pickupOption === "asap"
                            ? "As soon as possible"
                            : `${new Date(donation.pickupDate).toLocaleDateString()} - ${donation.pickupTime}`}
                        </span>
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-4">
                      <Button 
                        className="flex-1" 
                        onClick={() => handleAcceptDonation(donation._id)}
                        disabled={loadingDonationId === donation._id}
                      >
                        {loadingDonationId === donation._id && actionType === 'accept' ? (
                          <>
                            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                            Accepting...
                          </>
                        ) : 'Accept'}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1" 
                        onClick={() => openRejectionModal(donation._id)}
                        disabled={loadingDonationId === donation._id}
                      >
                        {loadingDonationId === donation._id && actionType === 'reject' ? (
                          <>
                            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                            Declining...
                          </>
                        ) : 'Decline'}
                      </Button>
                      <Button 
                        variant="secondary" 
                        onClick={() => {
                          setSelectedDonation(donation);
                          setDetailsOpen(true);
                        }}
                        disabled={loadingDonationId === donation._id}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="accepted" className="space-y-4">
              {acceptedDonations.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <Clock className="h-10 w-10 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">You don't have any accepted donations</p>
                  </CardContent>
                </Card>
              ) : (
                acceptedDonations.map((donation) => (
                  <Card key={donation._id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>DON-{donation._id.slice(-4)}</CardTitle>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          {donation.status}
                        </span>
                      </div>
                      <CardDescription>Accepted on {new Date(donation.date || donation.createdAt || new Date()).toLocaleDateString()}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-1">Donor:</p>
                        <p className="text-sm">{donation.donor}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">Items:</p>
                        <div className="flex flex-wrap gap-2">
                          {donation.items.map((item, i) => (
                            <span key={i} className="bg-muted text-xs px-2 py-1 rounded-full">
                              {typeof item === 'object' ? item.itemName || 'Item' : item}
                              {typeof item === 'object' && item.quantity && ` (${item.quantity})`}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm">{donation.location}</p>
                          <p className="text-xs text-muted-foreground">{donation.distance} away</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          Scheduled: {new Date(donation.pickupDate || new Date()).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>Progress</span>
                          <span>{donation.progress}%</span>
                        </div>
                        <Progress value={donation.progress} />
                      </div>
                    </CardContent>

                    <CardFooter className="flex gap-4">
                      <Button 
                        className="flex-1" 
                        onClick={() => handleMarkAsCompleted(donation._id)}
                        disabled={loadingDonationId === donation._id}
                      >
                        {loadingDonationId === donation._id && actionType === 'complete' ? (
                          <>
                            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                            Processing...
                          </>
                        ) : 'Mark as Collected'}
                      </Button>
                      <Button variant="outline" className="flex-1">
                        Contact Donor
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {completedDonations.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <CheckCircle className="h-10 w-10 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">You don't have any completed donations yet</p>
                  </CardContent>
                </Card>
              ) : (
                completedDonations.map((donation) => (
                  <Card key={donation._id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>DON-{donation._id.slice(-4)}</CardTitle>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Completed</span>
                      </div>
                      <CardDescription>
                        Collected on {new Date(donation.completedDate || donation.date || new Date()).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-1">Donor:</p>
                        <p className="text-sm">{donation.donor}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">Items:</p>
                        <div className="flex flex-wrap gap-2">
                          {donation.items.map((item, i) => (
                            <span key={i} className="bg-muted text-xs px-2 py-1 rounded-full">
                              {typeof item === 'object' ? item.itemName || 'Item' : item}
                              {typeof item === 'object' && item.quantity && ` (${item.quantity})`}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <p className="text-sm">{donation.location}</p>
                      </div>
                      <div>
                        {/* <p className="text-sm font-medium mb-1">Distributed to:</p>
                        <p className="text-sm">{donation.beneficiaries}</p> */}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>Progress</span>
                          <span>{donation.progress}%</span>
                        </div>
                        <Progress value={donation.progress} />
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-4">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          setSelectedDonation(donation);
                          setDetailsOpen(true);
                        }}
                      >
                        View Details
                      </Button>
                      <Button variant="secondary" className="flex-1">
                        Send Impact Report
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-4">
              {rejectedDonations.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <X className="h-10 w-10 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">You don't have any rejected donations</p>
                  </CardContent>
                </Card>
              ) : (
                rejectedDonations.map((donation) => (
                  <Card key={donation._id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>DON-{donation._id.slice(-4)}</CardTitle>
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Rejected</span>
                      </div>
                      <CardDescription>Rejected on {new Date(donation.createdAt || new Date()).toLocaleDateString()}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-1">Donor:</p>
                        <p className="text-sm">{donation.user?.firstName} {donation.user?.lastName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">Items:</p>
                        <div className="flex flex-wrap gap-2">
                          {donation.items.map((item, i) => (
                            <span key={i} className="bg-muted text-xs px-2 py-1 rounded-full">
                              {item.itemName || 'Item'}
                              {item.quantity && ` (${item.quantity})`}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm">{donation.pickupAddress}</p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-4">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          setSelectedDonation(donation);
                          setDetailsOpen(true);
                        }}
                      >
                        View Details
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Donation Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        {selectedDonation && (
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Donation Details: DON-{selectedDonation._id.slice(-4)}</span>
                <Badge variant={selectedDonation.status === "Pending" ? "outline" : "secondary"}>
                  {selectedDonation.status}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Created on {new Date(selectedDonation.createdAt).toLocaleString()}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div>
                <h3 className="text-lg font-semibold mb-3">Donor Information</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="font-medium">Name</p>
                      {/* <p>{selectedDonation.user.firstName} {selectedDonation.user.lastName}</p> */}
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="font-medium">Email</p>
                      <p>{selectedDonation.user.email}</p>
                    </div>
                  </div>
                  
                  {selectedDonation.user.phone && (
                    <div className="flex items-start gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="font-medium">Phone</p>
                        <p>{selectedDonation.user.phone}</p>
                      </div>
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-semibold mb-3 mt-6">Pickup Information</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="font-medium">Address</p>
                      <p>{selectedDonation.pickupAddress}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="font-medium">Pickup Option</p>
                      <p>{selectedDonation.pickupOption === 'scheduled' 
                          ? 'Scheduled for specific date/time' 
                          : 'As soon as possible'}</p>
                    </div>
                  </div>
                  
                  {selectedDonation.pickupOption === 'scheduled' && (
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="font-medium">Scheduled Date & Time</p>
                        <p>{new Date(selectedDonation.pickupDate || new Date()).toLocaleDateString()} - {selectedDonation.pickupTime || 'Not specified'}</p>
                      </div>
                    </div>
                  )}

                  {selectedDonation.notes && (
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="font-medium">Additional Notes</p>
                        <p>{selectedDonation.notes}</p>
                      </div>
                    </div>
                  )}

                  {selectedDonation.status === "Rejected" && selectedDonation.rejectionReason && (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-1" />
                      <div>
                        <p className="font-medium text-red-700">Rejection Reason</p>
                        <p>{selectedDonation.rejectionReason}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Donated Items</h3>
                <div className="space-y-4">
                  {selectedDonation.items.map((item, index) => (
                    <Card key={index}>
                      <CardHeader className="py-3">
                        <CardTitle className="text-base">{item.itemName}</CardTitle>
                        <CardDescription>Quantity: {item.quantity}</CardDescription>
                      </CardHeader>
                      <CardContent className="py-2">
                        {item.description && (
                          <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                        )}
                        
                        {item.images && item.images.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Images:</p>
                            <div className="grid grid-cols-1 gap-4">
                              {item.images.map((image, imgIndex) => (
                                <div key={imgIndex} className="space-y-2">
                                  <div className="relative aspect-video rounded-md overflow-hidden border">
                                    <img 
                                      src={image.url} 
                                      alt={`${item.itemName} - image ${imgIndex + 1}`}
                                      className="object-cover w-full h-full"
                                    />
                                  </div>
                                  {image.analysis && (
                                    <div className="rounded-md bg-muted p-3">
                                      <p className="text-sm font-medium mb-1">AI Analysis:</p>
                                      <p className="text-sm text-muted-foreground">{image.analysis}</p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              {selectedDonation.status === "Pending" && (
                <>
                  <Button 
                    className="flex-1" 
                    onClick={() => {
                      // Validate if pickup date has passed
                      if (selectedDonation.pickupOption === 'scheduled' && selectedDonation.pickupDate) {
                        const pickupDate = new Date(selectedDonation.pickupDate);
                        const today = new Date();
                        
                        // Set time to beginning of day for comparison
                        today.setHours(0, 0, 0, 0);
                        
                        if (pickupDate < today) {
                          toast({
                            title: "Cannot Accept",
                            description: "The scheduled pickup date has already passed. Please contact the donor to reschedule.",
                            variant: "destructive",
                          });
                          return;
                        }
                      }
                      
                      handleAcceptDonation(selectedDonation._id);
                      setDetailsOpen(false);
                    }}
                    disabled={loadingDonationId === selectedDonation?._id}
                  >
                    {loadingDonationId === selectedDonation?._id && actionType === 'accept' ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                        Accepting...
                      </>
                    ) : 'Accept Donation'}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setDetailsOpen(false); // Close the details dialog first
                      openRejectionModal(selectedDonation._id); // Open the rejection reason modal
                    }}
                    disabled={loadingDonationId === selectedDonation?._id}
                  >
                    {loadingDonationId === selectedDonation?._id && actionType === 'reject' ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                        Declining...
                      </>
                    ) : 'Decline Donation'}
                  </Button>
                </>
              )}
              
              {selectedDonation.status === "Accepted" && (
                <Button 
                  className="flex-1"
                  onClick={() => {
                    handleMarkAsCompleted(selectedDonation._id);
                    setDetailsOpen(false);
                  }}
                  disabled={loadingDonationId === selectedDonation?._id}
                >
                  {loadingDonationId === selectedDonation?._id && actionType === 'complete' ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                      Completing...
                    </>
                  ) : 'Mark as Completed'}
                </Button>
              )}
              
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Rejection Reason Modal */}
      <Dialog open={showRejectionModal} onOpenChange={(open) => !open && closeRejectionModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rejection Reason</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this donation. This will be shared with the donor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Enter rejection reason..."
              className="min-h-[100px]"
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                setIsRejectionReasonValid(e.target.value.trim().length >= 10);
              }}
            />
            <p className="text-xs text-muted-foreground">
              {rejectionReason.trim().length < 10 
                ? `Please provide more details (at least ${10 - rejectionReason.trim().length} more characters)` 
                : "✓ Detailed reason provided"}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeRejectionModal}>Cancel</Button>
            <Button 
              variant="destructive"
              disabled={!isRejectionReasonValid || loadingDonationId === selectedDonationId}
              onClick={() => selectedDonationId && handleRejectDonation(selectedDonationId, rejectionReason)}
            >
              {loadingDonationId === selectedDonationId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Rejecting...
                </>
              ) : (
                "Reject Donation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
