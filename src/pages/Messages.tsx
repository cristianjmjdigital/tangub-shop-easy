import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Send, 
  Search, 
  Phone, 
  MoreVertical,
  Store,
  Package,
  Clock,
  CheckCheck
} from "lucide-react";

const Messages = () => {
  const [selectedChat, setSelectedChat] = useState(1);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const conversations = [
    {
      id: 1,
      businessName: "Tangub Delicacies",
      businessAvatar: "TD",
      lastMessage: "Your buko pie order is ready for pickup!",
      timestamp: "2 min ago",
      unreadCount: 2,
      isOnline: true,
      orderNumber: "#ORD-001",
      orderStatus: "Ready for Pickup"
    },
    {
      id: 2,
      businessName: "Mountain Coffee",
      businessAvatar: "MC",
      lastMessage: "Thank you for your purchase! How was the coffee?",
      timestamp: "1 hour ago",
      unreadCount: 0,
      isOnline: false,
      orderNumber: "#ORD-002",
      orderStatus: "Delivered"
    },
    {
      id: 3,
      businessName: "Local Crafts Co.",
      businessAvatar: "LC",
      lastMessage: "The banig mat you ordered will be ready tomorrow",
      timestamp: "3 hours ago",
      unreadCount: 1,
      isOnline: true,
      orderNumber: "#ORD-003",
      orderStatus: "Processing"
    },
    {
      id: 4,
      businessName: "Eco Crafts",
      businessAvatar: "EC",
      lastMessage: "Hi! Do you have other bamboo products available?",
      timestamp: "Yesterday",
      unreadCount: 0,
      isOnline: false,
      orderNumber: null,
      orderStatus: null
    }
  ];

  const messages = {
    1: [
      {
        id: 1,
        content: "Hi! I'd like to order 2 buko pies for pickup tomorrow.",
        sender: "customer",
        timestamp: "10:30 AM",
        status: "delivered"
      },
      {
        id: 2,
        content: "Hello! Yes, we can prepare 2 buko pies for you. What time would you like to pick them up?",
        sender: "business",
        timestamp: "10:32 AM",
        status: "delivered"
      },
      {
        id: 3,
        content: "Around 2 PM would be perfect. How much is the total?",
        sender: "customer",
        timestamp: "10:35 AM",
        status: "delivered"
      },
      {
        id: 4,
        content: "That's ₱500 for 2 buko pies. We'll have them ready by 2 PM tomorrow.",
        sender: "business",
        timestamp: "10:36 AM",
        status: "delivered"
      },
      {
        id: 5,
        content: "Perfect! See you tomorrow at 2 PM.",
        sender: "customer",
        timestamp: "10:37 AM",
        status: "delivered"
      },
      {
        id: 6,
        content: "Your buko pie order is ready for pickup!",
        sender: "business",
        timestamp: "1:55 PM",
        status: "delivered"
      }
    ]
  };

  const currentConversation = conversations.find(c => c.id === selectedChat);
  const currentMessages = messages[selectedChat as keyof typeof messages] || [];

  const filteredConversations = conversations.filter(conv =>
    conv.businessName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sendMessage = () => {
    if (newMessage.trim()) {
      // Add message logic here
      setNewMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Messages</CardTitle>
                <Badge variant="secondary">
                  {conversations.filter(c => c.unreadCount > 0).length} unread
                </Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {filteredConversations.map((conversation, index) => (
                  <div key={conversation.id}>
                    <div
                      className={`p-4 cursor-pointer hover:bg-accent transition-colors ${
                        selectedChat === conversation.id ? "bg-accent" : ""
                      }`}
                      onClick={() => setSelectedChat(conversation.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="relative">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {conversation.businessAvatar}
                            </AvatarFallback>
                          </Avatar>
                          {conversation.isOnline && (
                            <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-background"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium truncate">{conversation.businessName}</h4>
                            <span className="text-xs text-muted-foreground">{conversation.timestamp}</span>
                          </div>
                          {conversation.orderNumber && (
                            <div className="flex items-center mb-1">
                              <Package className="h-3 w-3 mr-1 text-primary" />
                              <span className="text-xs text-primary font-medium">{conversation.orderNumber}</span>
                              <Badge variant="outline" className="ml-2 text-xs">
                                {conversation.orderStatus}
                              </Badge>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground truncate pr-2">
                              {conversation.lastMessage}
                            </p>
                            {conversation.unreadCount > 0 && (
                              <Badge variant="destructive" className="text-xs min-w-[20px] h-5">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {index < filteredConversations.length - 1 && <Separator />}
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2 flex flex-col">
            {currentConversation ? (
              <>
                {/* Chat Header */}
                <CardHeader className="pb-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {currentConversation.businessAvatar}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{currentConversation.businessName}</h3>
                        <div className="flex items-center text-sm text-muted-foreground">
                          {currentConversation.isOnline ? (
                            <>
                              <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                              Online
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 mr-1" />
                              Last seen 1 hour ago
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Store className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {currentConversation.orderNumber && (
                    <div className="flex items-center mt-3 p-3 bg-accent rounded-lg">
                      <Package className="h-4 w-4 mr-2 text-primary" />
                      <span className="text-sm font-medium">Order {currentConversation.orderNumber}</span>
                      <Badge variant="outline" className="ml-2">
                        {currentConversation.orderStatus}
                      </Badge>
                    </div>
                  )}
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 p-0">
                  <ScrollArea className="h-[400px] p-4">
                    <div className="space-y-4">
                      {currentMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.sender === "customer" ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[70%] p-3 rounded-lg ${
                              message.sender === "customer"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <div className={`flex items-center justify-between mt-2 text-xs ${
                              message.sender === "customer" 
                                ? "text-primary-foreground/70" 
                                : "text-muted-foreground"
                            }`}>
                              <span>{message.timestamp}</span>
                              {message.sender === "customer" && (
                                <CheckCheck className="h-3 w-3 ml-2" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                      className="flex-1"
                    />
                    <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
                  <p className="text-muted-foreground">
                    Choose a business conversation to start messaging
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Messages;