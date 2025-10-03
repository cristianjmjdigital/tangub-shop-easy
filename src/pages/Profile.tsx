import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Package, 
  Clock,
  Star,
  Edit,
  Settings,
  LogOut,
  Store,
  CreditCard
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Profile = () => {
  const { toast } = useToast();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [userInfo, setUserInfo] = useState({
    name: profile?.full_name || "", 
    email: profile?.email || "", 
    phone: profile?.phone || "", 
    address: profile?.barangay ? `${profile.barangay}, Tangub City` : "Tangub City"
  });

  const recentOrders = [
    {
      id: "#ORD-001",
      business: "Tangub Delicacies",
      items: "Fresh Buko Pie (2x)",
      total: 500,
      status: "Ready for Pickup",
      date: "2024-01-15",
      rating: 5
    },
    {
      id: "#ORD-002",
      business: "Mountain Coffee",
      items: "Tangub Coffee Beans (1x)",
      total: 380,
      status: "Delivered",
      date: "2024-01-14",
      rating: 5
    },
    {
      id: "#ORD-003",
      business: "Local Crafts Co.",
      items: "Handwoven Banig Mat (1x)",
      total: 450,
      status: "Processing",
      date: "2024-01-13",
      rating: null
    }
  ];

  const favoriteBusinesses = [
    {
      name: "Tangub Delicacies",
      category: "Food & Beverage",
      rating: 4.8,
      orders: 12
    },
    {
      name: "Mountain Coffee",
      category: "Food & Beverage", 
      rating: 4.7,
      orders: 8
    },
    {
      name: "Eco Crafts",
      category: "Electronics",
      rating: 4.5,
      orders: 3
    }
  ];

  const handleSaveProfile = () => {
    setIsEditing(false);
    toast({
      title: "Profile Updated",
      description: "Your profile has been successfully updated.",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered": return "bg-green-500";
      case "Ready for Pickup": return "bg-blue-500";
      case "Processing": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <Card className="mb-8">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {userInfo.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-3xl font-bold mb-2">{userInfo.name}</h1>
                  <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4 text-muted-foreground">
                    <div className="flex items-center justify-center md:justify-start">
                      <Mail className="h-4 w-4 mr-2" />
                      {userInfo.email}
                    </div>
                    <div className="flex items-center justify-center md:justify-start">
                      <Phone className="h-4 w-4 mr-2" />
                      {userInfo.phone}
                    </div>
                  </div>
                  <div className="flex items-center justify-center md:justify-start mt-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span className="text-sm">{userInfo.address}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="orders" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="favorites">Favorites</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="business">My Business</TabsTrigger>
            </TabsList>

            {/* Orders Tab */}
            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Recent Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentOrders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-3 md:space-y-0">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="font-semibold">{order.id}</span>
                              <Badge className={`${getStatusColor(order.status)} text-white`}>
                                {order.status}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground text-sm mb-1">{order.business}</p>
                            <p className="text-sm">{order.items}</p>
                            <div className="flex items-center text-sm text-muted-foreground mt-2">
                              <Clock className="h-3 w-3 mr-1" />
                              {order.date}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="font-bold text-lg">₱{order.total.toLocaleString()}</p>
                            {order.rating ? (
                              <div className="flex items-center mt-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="ml-1 text-sm">{order.rating}</span>
                              </div>
                            ) : (
                              <Button variant="outline" size="sm" className="mt-1">
                                Rate Order
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="text-center mt-6">
                      <Button variant="outline" asChild>
                        <Link to="/orders">View All Orders</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Favorites Tab */}
            <TabsContent value="favorites">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Star className="h-5 w-5 mr-2" />
                    Favorite Businesses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {favoriteBusinesses.map((business, index) => (
                      <Card key={index} className="hover:shadow-elegant transition-shadow">
                        <CardContent className="p-4">
                          <h3 className="font-semibold mb-2">{business.name}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{business.category}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="ml-1 text-sm">{business.rating}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {business.orders} orders
                            </span>
                          </div>
                          <Button variant="outline" size="sm" className="w-full mt-3" asChild>
                            <Link to="/businesses">Visit Store</Link>
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isEditing ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            value={userInfo.name}
                            onChange={(e) => setUserInfo(prev => ({ ...prev, name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={userInfo.email}
                            onChange={(e) => setUserInfo(prev => ({ ...prev, email: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            value={userInfo.phone}
                            onChange={(e) => setUserInfo(prev => ({ ...prev, phone: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={userInfo.address}
                          onChange={(e) => setUserInfo(prev => ({ ...prev, address: e.target.value }))}
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button onClick={handleSaveProfile}>Save Changes</Button>
                        <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                          <p className="text-lg">{userInfo.name}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                          <p className="text-lg">{userInfo.email}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                          <p className="text-lg">{userInfo.phone}</p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                        <p className="text-lg">{userInfo.address}</p>
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Account Actions</h3>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Payment Methods
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Settings className="h-4 w-4 mr-2" />
                        Privacy Settings
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start text-destructive hover:text-destructive"
                        onClick={async () => { await signOut(); navigate('/'); }}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Log Out
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Business Tab */}
            <TabsContent value="business">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Store className="h-5 w-5 mr-2" />
                    Business Account
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-12">
                  <Store className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-4">Start Your Business</h3>
                  <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                    Join our community of local entrepreneurs and start selling your products to customers in Tangub City.
                  </p>
                  <Button size="lg" asChild>
                    <Link to="/register-business">
                      Register Your Business
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Profile;