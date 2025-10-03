import { useState, useEffect, useMemo, useCallback } from "react";
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
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";

interface DbMessage {
  id: string;
  vendor_id: string | null;
  sender_user_id: string;
  receiver_user_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface VendorRow {
  id: string;
  store_name: string;
  address?: string | null;
  owner_user_id?: string;
}

interface ConversationSummary {
  id: string; // vendor_id or synthetic other-user id
  type: 'vendor' | 'direct';
  vendor?: VendorRow;
  otherUserId?: string; // when direct message (not implemented extensively)
  lastMessage?: DbMessage;
  unreadCount: number;
  messages: DbMessage[]; // ordered asc
}

const Messages = () => {
  const { session, profile } = useAuth();
  const [rawMessages, setRawMessages] = useState<DbMessage[]>([]);
  const [vendors, setVendors] = useState<Record<string, VendorRow>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [optimistic, setOptimistic] = useState<Record<string, DbMessage>>({});
  const { toast } = useToast();
  const [showNewConv, setShowNewConv] = useState(false);
  const [newVendorId, setNewVendorId] = useState("");

  // Fetch messages involving current user
  useEffect(() => {
    const user = session?.user;
    if (!user) return;
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: rows, error: msgErr } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_user_id.eq.${user.id},receiver_user_id.eq.${user.id}`)
          .order('created_at', { ascending: true }); // ascending so we can display naturally
        if (msgErr) throw msgErr;
        if (!isMounted) return;
        setRawMessages(rows || []);
        // Collect vendor ids
        const vIds = Array.from(new Set((rows || []).map(r => r.vendor_id).filter(Boolean))) as string[];
        if (vIds.length) {
          const { data: vRows, error: vErr } = await supabase
            .from('vendors')
            .select('id,store_name,address,owner_user_id')
            .in('id', vIds);
          if (vErr) throw vErr;
          if (!isMounted) return;
            const map: Record<string, VendorRow> = {};
            (vRows || []).forEach(v => { map[v.id] = v as VendorRow; });
            setVendors(map);
        } else {
          setVendors({});
        }
      } catch (e: any) {
        if (isMounted) setError(e.message || 'Failed to load messages');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();

    // Basic realtime subscription (optional enhancements later)
    const channel = supabase.channel('messages-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
        setRawMessages(prev => {
          const newRow = payload.new as DbMessage | undefined;
          if (!newRow) return prev;
          // Avoid duplicates
          if (prev.find(m => m.id === newRow.id)) return prev;
          // Only add if relevant to this user
          if (newRow.sender_user_id !== user.id && newRow.receiver_user_id !== user.id) return prev;
          return [...prev, newRow].sort((a,b)=> new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        });
      })
      .subscribe();

    return () => { isMounted = false; supabase.removeChannel(channel); };
  }, [session]);

  const conversations: ConversationSummary[] = useMemo(() => {
  const user = session?.user;
  if (!user) return [];
    const groups = new Map<string, ConversationSummary>();
    for (const m of rawMessages) {
      const key = m.vendor_id || (m.sender_user_id === user.id ? m.receiver_user_id : m.sender_user_id);
      let summary = groups.get(key);
      if (!summary) {
        const vendor = m.vendor_id ? vendors[m.vendor_id] : undefined;
        summary = {
          id: key,
            type: vendor ? 'vendor' : 'direct',
            vendor,
            otherUserId: vendor ? undefined : (m.sender_user_id === user.id ? m.receiver_user_id : m.sender_user_id),
            lastMessage: m,
            unreadCount: 0,
            messages: []
        };
        groups.set(key, summary);
      }
      summary.messages.push(m);
      // Update lastMessage (messages are ascending – last iteration wins)
      summary.lastMessage = m;
      if (m.receiver_user_id === user.id && !m.read_at) {
        summary.unreadCount += 1;
      }
    }
    // Ensure messages arrays sorted (already ascending) but keep safety
    const list = Array.from(groups.values());
    return list.sort((a,b) => {
      const at = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
      const bt = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
      return bt - at; // desc by last message
    });
  }, [rawMessages, vendors, session]);

  // Filtered conversations by search
  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;
    return conversations.filter(c => {
      const name = c.vendor ? c.vendor.store_name : c.otherUserId || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [conversations, searchQuery]);

  // Selected conversation details
  const currentConversation = useMemo(() => conversations.find(c => c.id === selectedChat) || null, [conversations, selectedChat]);

  // Mark unread messages as read when opening
  useEffect(() => {
    const user = session?.user;
    if (!user || !currentConversation) return;
    const unread = currentConversation.messages.filter(m => m.receiver_user_id === user.id && !m.read_at);
    if (!unread.length) return;
    const ids = unread.map(m => m.id);
    supabase.from('messages').update({ read_at: new Date().toISOString() }).in('id', ids).then();
  }, [currentConversation, session]);

  const sendMessage = useCallback(async () => {
    const user = session?.user;
    if (!user || !newMessage.trim() || !currentConversation) return;
    try {
      setSending(true);
      let receiver: string | null = null;
      if (currentConversation.vendor?.owner_user_id) receiver = currentConversation.vendor.owner_user_id;
      else if (currentConversation.otherUserId) receiver = currentConversation.otherUserId;
      if (!receiver) return;
      const trimmed = newMessage.trim();
      const tempId = `temp-${Date.now()}`;
      const optimisticMsg: DbMessage = {
        id: tempId,
        vendor_id: currentConversation.vendor ? currentConversation.vendor.id : null,
        sender_user_id: user.id,
        receiver_user_id: receiver,
        content: trimmed,
        created_at: new Date().toISOString(),
        read_at: null
      };
      setOptimistic(prev => ({ ...prev, [tempId]: optimisticMsg }));
      setNewMessage("");
      const { data, error: insErr } = await supabase
        .from('messages')
        .insert({ vendor_id: optimisticMsg.vendor_id, sender_user_id: user.id, receiver_user_id: receiver, content: trimmed })
        .select()
        .single();
      if (insErr) throw insErr;
      if (data) {
        setRawMessages(prev => [...prev, data as DbMessage]);
        setOptimistic(prev => { const cp = { ...prev }; delete cp[tempId]; return cp; });
      }
    } catch (e) {
      console.error('Send message failed', e);
      toast({ title: 'Message not sent', description: 'We could not deliver your message. Please retry.', variant: 'destructive' });
      setOptimistic(prev => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith('temp-'))));
    } finally {
      setSending(false);
    }
  }, [session, newMessage, currentConversation]);

  const formatRelative = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return diffMin + 'm';
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return diffHr + 'h';
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay === 1) return '1d';
    return diffDay + 'd';
  };

  // Auto-select first conversation when loaded
  useEffect(() => {
    if (!selectedChat && conversations.length) {
      setSelectedChat(conversations[0].id);
    }
  }, [conversations, selectedChat]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Messages</CardTitle>
                {loading ? (
                  <Skeleton className="h-5 w-16" />
                ) : (
                  <Badge variant="secondary">
                    {conversations.filter(c => c.unreadCount > 0).length} unread
                  </Badge>
                )}
              </div>
              <div className="relative space-y-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" type="button" onClick={()=> setShowNewConv(s=>!s)}>New</Button>
                </div>
                {showNewConv && (
                  <div className="flex gap-2">
                    <Input placeholder="Vendor ID" value={newVendorId} onChange={e=>setNewVendorId(e.target.value)} />
                    <Button size="sm" type="button" disabled={!newVendorId.trim()} onClick={async ()=>{
                      const id = newVendorId.trim();
                      if (!id) return;
                      if (!vendors[id]) {
                        const { data: vRow } = await supabase.from('vendors').select('id,store_name,address,owner_user_id').eq('id', id).maybeSingle();
                        if (vRow) setVendors(prev => ({ ...prev, [vRow.id]: vRow as VendorRow }));
                      }
                      setSelectedChat(id);
                      setShowNewConv(false);
                      setNewVendorId('');
                    }}>Open</Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {loading && (
                  <div className="p-4 space-y-4">
                    {[...Array(4)].map((_,i)=>(
                      <div key={i} className="flex space-x-3">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-1/2" />
                          <Skeleton className="h-3 w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!loading && !conversations.length && (
                  <div className="p-6 text-sm text-muted-foreground">No messages yet.</div>
                )}
                {!loading && filteredConversations.map((conversation, index) => {
                  const vendor = conversation.vendor;
                  const name = vendor ? vendor.store_name : 'Direct chat';
                  const initials = vendor ? vendor.store_name.slice(0,2).toUpperCase() : 'DM';
                  const lastContent = conversation.lastMessage?.content || 'No messages';
                  const time = formatRelative(conversation.lastMessage?.created_at);
                  return (
                    <div key={conversation.id}>
                      <div
                        className={`p-4 cursor-pointer hover:bg-accent transition-colors ${selectedChat === conversation.id ? 'bg-accent' : ''}`}
                        onClick={() => setSelectedChat(conversation.id)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="relative">
                            <Avatar className="h-12 w-12">
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium truncate">{name}</h4>
                              <span className="text-xs text-muted-foreground">{time}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground truncate pr-2">{lastContent}</p>
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
                  );
                })}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2 flex flex-col">
            {currentConversation ? (
              <>
                <CardHeader className="pb-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {currentConversation.vendor ? currentConversation.vendor.store_name.slice(0,2).toUpperCase() : 'DM'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{currentConversation.vendor ? currentConversation.vendor.store_name : 'Conversation'}</h3>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          Updated {formatRelative(currentConversation.lastMessage?.created_at)}
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
                </CardHeader>
                <CardContent className="flex-1 p-0">
                  <ScrollArea className="h-[400px] p-4">
                    <div className="space-y-4">
                      {[...currentConversation.messages, ...Object.values(optimistic).filter(o => (o.vendor_id || '') === (currentConversation.vendor?.id || ''))]
                        .sort((a,b)=> new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                        .map(m => {
                        const mine = m.sender_user_id === session?.user?.id;
                        const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        return (
                          <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] p-3 rounded-lg ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                              <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                              <div className={`flex items-center justify-between mt-2 text-xs ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                <span>{time}</span>
                                {mine && <CheckCheck className={`h-3 w-3 ml-2 ${m.id.startsWith('temp-') ? 'opacity-20 animate-pulse' : m.read_at ? 'opacity-100' : 'opacity-40'}`} />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {!currentConversation.messages.length && (
                        <div className="text-center text-xs text-muted-foreground">No messages yet. Say hello 👋</div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
                <div className="p-4 border-t">
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      className="flex-1"
                    />
                    <Button onClick={sendMessage} disabled={!newMessage.trim() || sending}>
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
                    Choose a conversation to start messaging
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