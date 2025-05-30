"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Calendar,
  Gift,
  Package,
  CheckCircle,
  Home,
  LogOut,
  User,
  X,
  AlertCircle,
} from "lucide-react"
import axios from "axios"
import { useToast } from "@/hooks/use-toast"
import { jwtDecode } from "jwt-decode"
import { useRouter } from "next/navigation"
import DonorRoute from "@/components/auth/donor-route"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Donation {
  _id: string;
  items: Array<{
    itemName: string;
    quantity: number;
    description: string;
    images: Array<{
      url: string;
      analysis: string;
    }>;
  }>;
  ngo: {
    name: string;
  };
  status: "Pending" | "Accepted" | "Rejected" | "Completed";
  pickupOption: "scheduled" | "asap";
  pickupDate?: string;
  pickupTime?: string;
  createdAt: string;
  completedDate?: string;
  rejectionReason?: string;
}

interface DecodedToken {
  id: string
  type: string
  iat: number
  exp: number
}

export default function DonorDashboardPage() {
  return (
    <DonorRoute>
      <DonorDashboard />
    </DonorRoute>
  )
}

function DonorDashboard() {
  const [activeTab, setActiveTab] = useState("pending")
  const [donations, setDonations] = useState<Donation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()
  const [userName, setUserName] = useState<string>("User")

  useEffect(() => {
    const fetchDonations = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          router.push('/login')
          return
        }
        
        const decodedToken = jwtDecode<DecodedToken & { name?: string, lastName?: string }>(token)
        const userId = decodedToken.id
        
        // Try to get name from token first
        if (decodedToken.name) {
          const fullName = decodedToken.lastName 
            ? `${decodedToken.name} ${decodedToken.lastName}` 
            : decodedToken.name;
          setUserName(fullName);
        } else {
          // Fallback to API request for name
          try {
            const response = await axios.get(
              `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/${decodedToken.id}`, {
                headers: {
                  Authorization: `Bearer ${token}`
                }
              }
            )
            
            if (response.data && response.data.data) {
              const user = response.data.data
              setUserName(user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.email || 'User')
            }
          } catch (userError) {
            console.error('Error fetching user details:', userError);
          }
        }

        const donationsResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/donations/user/${decodedToken.id}`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )

        
        console.log('Donations:', donationsResponse.data.data)
        setDonations(donationsResponse.data.data)
      } catch (error) {
        console.error('Error fetching donations:', error)
        toast({
          title: "Error",
          description: "Failed to fetch donations",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDonations()
  }, [toast, router])

  const pendingDonations = donations.filter(d => d.status === "Pending" || d.status === "Accepted")
  const completedDonations = donations.filter(d => d.status === "Completed")
  const rejectedDonations = donations.filter(d => d.status === "Rejected")

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        // Call the logout API endpoint
        await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/logout`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          withCredentials: true
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear token from localStorage
      localStorage.removeItem("token");
      
      // Clear token from cookies
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
      // Redirect to home
      router.push("/");
    }
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex-1">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
        <div className="md:hidden flex items-center gap-2 font-bold">
          <Gift className="h-6 w-6 text-primary" />
          <span>DonateConnect</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <Button variant="ghost" size="sm">
            <User className="mr-2 h-4 w-4" />
            {userName}
          </Button>
        </div>
      </header>

      <main className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Donor Dashboard</h1>
            <p className="text-muted-foreground">Manage your donations and view your contribution impact</p>
          </div>
          <Button asChild className="mt-4 md:mt-0">
            <Link href="/donate">
              <Gift className="mr-2 h-4 w-4" />
              Start New Donation
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{donations.length}</div>
              <p className="text-xs text-muted-foreground">Donations you've made</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Donations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{pendingDonations.length}</div>
              <p className="text-xs text-muted-foreground">Donations being processed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed Donations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{completedDonations.length}</div>
              <p className="text-xs text-muted-foreground">Successfully delivered donations</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Rejected Donations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{rejectedDonations.length}</div>
              <p className="text-xs text-muted-foreground">Donations declined by NGOs</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="space-y-4" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending">Pending Donations</TabsTrigger>
            <TabsTrigger value="completed">Completed Donations</TabsTrigger>
            <TabsTrigger value="rejected">Rejected Donations</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingDonations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <Package className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">You don't have any pending donations</p>
                  <Button asChild>
                    <Link href="/donate">Start a Donation</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              pendingDonations.map((donation) => (
                <Card key={donation._id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>DON-{donation._id.slice(-4)}</CardTitle>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          donation.status === "Pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {donation.status}
                      </span>
                    </div>
                    <CardDescription>Created on {new Date(donation.createdAt).toLocaleDateString()}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-1">Items:</p>
                      <div className="flex flex-wrap gap-2">
                        {donation.items.map((item, i) => (
                          <span key={i} className="bg-muted text-xs px-2 py-1 rounded-full">
                            {item.quantity} {item.itemName}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">NGO:</p>
                      <p className="text-sm">{donation.ngo.name}</p>
                    </div>
                    {donation.pickupDate && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Pickup on {new Date(donation.pickupDate).toLocaleDateString()} at {donation.pickupTime}
                        </span>
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span>{donation.status === "Pending" ? "25%" : "50%"}</span>
                      </div>
                      <Progress value={donation.status === "Pending" ? 25 : 50} />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full" asChild>
                      <Link href={`/donor/donations/${donation._id}`}>
                        View Details <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
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
                      Completed on {new Date(donation.completedDate || donation.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-1">Items:</p>
                      <div className="flex flex-wrap gap-2">
                        {donation.items.map((item, i) => (
                          <span key={i} className="bg-muted text-xs px-2 py-1 rounded-full">
                            {item.quantity} {item.itemName}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">NGO:</p>
                      <p className="text-sm">{donation.ngo.name}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span>100%</span>
                      </div>
                      <Progress value={100} />
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-4">
                    <Button variant="outline" className="flex-1" asChild>
                      <Link href={`/donor/donations/${donation._id}`}>
                        View Details
                      </Link>
                    </Button>
                    <Button variant="outline" className="flex-1" asChild>
                    <Link href={`/feedback?donationId=${donation.ngo._id}`}>
                      Leave Feedback
                      </Link>
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
                    <CardDescription>
                      Rejected on {new Date(donation.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-1">Items:</p>
                      <div className="flex flex-wrap gap-2">
                        {donation.items.map((item, i) => (
                          <span key={i} className="bg-muted text-xs px-2 py-1 rounded-full">
                            {item.quantity} {item.itemName}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">NGO:</p>
                      <p className="text-sm">{donation.ngo.name}</p>
                    </div>
                    <div className="mt-2 p-3 bg-red-50 rounded-md border border-red-200">
                      <p className="text-sm text-red-800 font-medium">This donation was declined by the NGO.</p>
                      {donation.rejectionReason ? (
                        <div className="mt-2">
                          <p className="text-sm text-red-800 font-medium">Reason:</p>
                          <p className="text-sm text-red-700 mt-1">{donation.rejectionReason}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-red-700 mt-1">You can try donating to another organization.</p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-4">
                    <Button variant="outline" className="flex-1" asChild>
                      <Link href={`/donor/donations/${donation._id}`}>
                        View Details
                      </Link>
                    </Button>
                    <Button variant="secondary" className="flex-1" asChild>
                      <Link href="/donor/ngos">
                        Try Another NGO
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}