import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  CheckCheck,
  ArrowLeft
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
  participantUserId?: string; // for vendor owner: the specific customer user id in this vendor conversation
  lastMessage?: DbMessage;
  unreadCount: number;
  messages: DbMessage[]; // ordered asc
}

const Messages = () => {
  const { session, profile } = useAuth();
  const [rawMessages, setRawMessages] = useState<DbMessage[]>([]);
  const [vendors, setVendors] = useState<Record<string, VendorRow>>({});
  const [participants, setParticipants] = useState<Record<string, { id: string; full_name?: string | null }>>({});
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
  const [vendorOptions, setVendorOptions] = useState<VendorRow[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [showList, setShowList] = useState(true); // mobile: list vs chat
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [ephemeral, setEphemeral] = useState<Record<string, DbMessage>>({});

  // Fetch messages involving current user (must use users.id = profile.id; session.user.id is auth id)
  useEffect(() => {
    const userId = profile?.id; // only proceed when profile row resolved
    if (!userId) return;
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: rows, error: msgErr } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_user_id.eq.${userId},receiver_user_id.eq.${userId}`)
          .order('created_at', { ascending: true });
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
        const newRow = payload.new as DbMessage | undefined;
        if (!newRow) return;
        const userId = profile?.id;
        if (newRow.sender_user_id !== userId && newRow.receiver_user_id !== userId) return;
        setRawMessages(prev => {
          const idx = prev.findIndex(m => m.id === newRow.id);
          let next: DbMessage[];
          if (idx >= 0) {
            next = [...prev];
            next[idx] = { ...next[idx], ...newRow };
          } else {
            next = [...prev, newRow].sort((a,b)=> new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          }
          return next;
        });
        // Prune ephemeral duplicates (same sender, receiver, content, vendor within 10s window)
        setEphemeral(prev => {
          const cutoff = 10000; // 10s
          const entries = Object.entries(prev);
            let changed = false;
            const filtered = entries.filter(([_, msg]) => {
              if (msg.sender_user_id === newRow.sender_user_id && msg.receiver_user_id === newRow.receiver_user_id && msg.content === newRow.content && msg.vendor_id === newRow.vendor_id) {
                const dt = Math.abs(new Date(newRow.created_at).getTime() - new Date(msg.created_at).getTime());
                if (dt < cutoff) { changed = true; return false; }
              }
              return true;
            });
          if (!changed) return prev;
          return Object.fromEntries(filtered);
        });
      })
      .subscribe();
    return () => { isMounted = false; supabase.removeChannel(channel); };
  }, [profile?.id]);

  // Prefetch vendor directory for new conversations (dropdown instead of raw ID)
  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('id,store_name,address,owner_user_id')
        .order('store_name', { ascending: true })
        .limit(200);
      if (!active) return;
      if (!error && data) setVendorOptions(data as VendorRow[]);
    })();
    return () => { active = false; };
  }, []);

  // Low-latency broadcast (ephemeral) so the other party sees message instantly (<250ms) before DB row arrives
  useEffect(() => {
    if (!profile?.id) return;
    // create or reuse channel
    const chan = supabase.channel('messages-ephemeral', { config: { broadcast: { self: false } } });
    broadcastChannelRef.current = chan;
    chan.on('broadcast', { event: 'message' }, (payload: any) => {
      const msg = payload.payload as DbMessage;
      if (!msg) return;
      // Skip if it's our own message (optimistic already shown)
      if (msg.sender_user_id === profile?.id) return;
      // Only add ephemeral if DB version not yet present
      setRawMessages(prev => (prev.find(m => m.id === msg.id) ? prev : prev));
      setEphemeral(prev => prev[msg.id] ? prev : ({ ...prev, [msg.id]: msg }));
    }).subscribe();
    return () => { supabase.removeChannel(chan); };
  }, [profile?.id]);

  const unreadTotal = useMemo(() => {
    const userId = profile?.id;
    if (!userId) return 0;
    return rawMessages.reduce((sum, m) => sum + (m.receiver_user_id === userId && !m.read_at ? 1 : 0), 0);
  }, [rawMessages, profile?.id]);

  const baseConversations: ConversationSummary[] = useMemo(() => {
    const userId = profile?.id;
    if (!userId) return [];
    const groups = new Map<string, ConversationSummary>();
    for (const m of rawMessages) {
      const vendor = m.vendor_id ? vendors[m.vendor_id] : undefined;
      const isVendorOwner = vendor?.owner_user_id === userId;
      // For vendor owners: split conversations per customer (vendor_id + customer_user_id)
      let key: string;
      let participantUserId: string | undefined;
      if (vendor) {
        if (isVendorOwner) {
          participantUserId = m.sender_user_id === userId ? m.receiver_user_id : m.sender_user_id;
          key = `${vendor.id}::${participantUserId}`; // composite key
        } else {
          key = vendor.id; // customer side groups by vendor only
        }
      } else {
        // direct (not heavily used yet) key by counterpart user id
        key = m.sender_user_id === userId ? m.receiver_user_id : m.sender_user_id;
      }
      let summary = groups.get(key);
      if (!summary) {
        summary = {
          id: key,
          type: vendor ? 'vendor' : 'direct',
          vendor,
          otherUserId: !vendor ? (m.sender_user_id === userId ? m.receiver_user_id : m.sender_user_id) : undefined,
          participantUserId,
          lastMessage: m,
          unreadCount: 0,
          messages: []
        };
        groups.set(key, summary);
      }
      summary.messages.push(m);
      summary.lastMessage = m;
      if (m.receiver_user_id === userId && !m.read_at) summary.unreadCount += 1;
    }
    const list = Array.from(groups.values());
    return list.sort((a,b) => {
      const at = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
      const bt = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
      return bt - at;
    });
  }, [rawMessages, vendors, profile?.id]);

  // Synthetic conversation when user opens a vendor with no history yet
  const syntheticConversation: ConversationSummary | null = useMemo(() => {
    if (!selectedChat) return null;
    const vendor = vendors[selectedChat] || vendorOptions.find(v => String(v.id) === selectedChat);
    if (!vendor) return null;
    return {
      id: String(vendor.id),
      type: 'vendor',
      vendor,
      otherUserId: undefined,
      participantUserId: undefined,
      lastMessage: undefined,
      unreadCount: 0,
      messages: []
    };
  }, [selectedChat, vendors, vendorOptions]);

  const conversations: ConversationSummary[] = useMemo(() => {
    if (syntheticConversation && !baseConversations.find(c => c.id === syntheticConversation.id)) {
      return [...baseConversations, syntheticConversation];
    }
    return baseConversations;
  }, [baseConversations, syntheticConversation]);

  // Fetch participant (customer) names for vendor-side conversations
  useEffect(() => {
    const userId = profile?.id;
    if (!userId) return;
    const needed: string[] = [];
    conversations.forEach(conv => {
      if (conv.vendor?.owner_user_id === userId && conv.participantUserId && !participants[conv.participantUserId]) {
        needed.push(conv.participantUserId);
      }
    });
    if (!needed.length) return;
    (async () => {
      const { data } = await supabase.from('users').select('id,full_name').in('id', needed);
      if (data) {
        setParticipants(prev => {
          const next = { ...prev };
          data.forEach((u: any) => { next[u.id] = { id: u.id, full_name: u.full_name }; });
          return next;
        });
      }
    })();
  }, [conversations, profile?.id]);

  // Filtered conversations by search
  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(c => {
      const participantLabel = c.participantUserId ? String(c.participantUserId).slice(0,8) : '';
      const displayName = c.vendor
        ? (c.vendor.owner_user_id === profile?.id && c.participantUserId
            ? (participants[c.participantUserId]?.full_name || `Customer ${participantLabel}`)
            : c.vendor.store_name)
        : (c.otherUserId || '');
      return displayName.toLowerCase().includes(q);
    });
  }, [conversations, searchQuery, participants, profile?.id]);

  // Ensure selectedChat remains valid if grouping keys change (e.g., after vendors load)
  useEffect(() => {
    if (!selectedChat && conversations.length) {
      setSelectedChat(conversations[0].id);
      return;
    }
    if (selectedChat && !conversations.find(c => c.id === selectedChat)) {
      // fallback to first available conversation
      if (conversations.length) setSelectedChat(conversations[0].id);
      else setSelectedChat(null);
    }
  }, [conversations, selectedChat]);

  // Selected conversation details
  const currentConversation = useMemo(() => conversations.find(c => c.id === selectedChat) || null, [conversations, selectedChat]);

  // Mark unread messages as read when opening (optimistic local update + DB)
  useEffect(() => {
    if (!profile?.id || !currentConversation) return;
    const unread = currentConversation.messages.filter(m => m.receiver_user_id === profile.id && !m.read_at);
    if (!unread.length) return;
    const ids = unread.map(m => m.id);
    const now = new Date().toISOString();
    // Optimistic local mark-read so badges update instantly
    setRawMessages(prev => prev.map(m => ids.includes(m.id) ? { ...m, read_at: now } : m));
    supabase
      .from('messages')
      .update({ read_at: now })
      .in('id', ids)
      .eq('receiver_user_id', profile.id)
      .then(({ error }) => {
        if (error) {
          console.warn('Failed to mark messages read', error.message);
        }
      });
  }, [currentConversation, profile?.id]);

  const sendMessage = useCallback(async () => {
    // Always use profile.id because messages.sender_user_id FK points to users.id (NOT auth user id)
    if (!profile?.id || !newMessage.trim() || !currentConversation) {
      if (!profile?.id) {
        toast({ title: 'Profile not ready', description: 'Please wait for your profile to finish loading before sending messages.' });
      }
      return;
    }
    try {
      setSending(true);
      let receiver: string | null = null;
      // If this is a vendor conversation and the current user is the vendor owner, receiver must be the participant (customer)
      if (currentConversation.vendor) {
        if (currentConversation.vendor.owner_user_id === profile.id) {
          // vendor replying to customer
          receiver = currentConversation.participantUserId || null;
        } else {
          // customer sending to vendor
          receiver = currentConversation.vendor.owner_user_id || null;
        }
      } else if (currentConversation.otherUserId) {
        receiver = currentConversation.otherUserId;
      }
      if (!receiver) return;
      const trimmed = newMessage.trim();
      const tempId = `temp-${Date.now()}`;
      const optimisticMsg: DbMessage = {
        id: tempId,
        vendor_id: currentConversation.vendor ? currentConversation.vendor.id : null,
        sender_user_id: profile.id,
        receiver_user_id: receiver,
        content: trimmed,
        created_at: new Date().toISOString(),
        read_at: null
      };
      setOptimistic(prev => ({ ...prev, [tempId]: optimisticMsg }));
      setNewMessage("");
      const { data, error: insErr } = await supabase
        .from('messages')
        .insert({
          vendor_id: optimisticMsg.vendor_id,
          sender_user_id: profile.id,
          receiver_user_id: receiver,
          content: trimmed
        })
        .select()
        .single();
      if (insErr) throw insErr;
      if (data) {
        setRawMessages(prev => [...prev, data as DbMessage]);
        setOptimistic(prev => { const cp = { ...prev }; delete cp[tempId]; return cp; });
        // remove ephemeral placeholder if any
        setEphemeral(prev => { const cp = { ...prev }; delete cp[tempId]; return cp; });
        toast({ title: 'Sent to Inbox', description: 'Your message was delivered to this conversation.' });
      }
    } catch (e) {
      console.error('Send message failed', e);
      toast({ title: 'Message not sent', description: 'We could not deliver your message. Please retry.', variant: 'destructive' });
      setOptimistic(prev => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith('temp-'))));
    } finally {
      setSending(false);
    }
  }, [profile?.id, newMessage, currentConversation, toast]);

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

  // mobile: resize listener
  useEffect(()=>{
    const calc = () => setIsMobile(window.innerWidth < 1024); // lg breakpoint
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  // scroll to bottom on conversation change or new message
  useEffect(()=>{
    if (!currentConversation) return;
    setTimeout(()=>{ scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior:'smooth'}); }, 50);
  }, [currentConversation, currentConversation?.messages.length]);

  useEffect(()=>{
    if (isMobile) {
      // when selecting a chat on mobile, hide list
      if (selectedChat) setShowList(false);
    } else {
      // desktop always show both
      setShowList(true);
    }
  }, [selectedChat, isMobile]);

  const backToList = () => { if (isMobile) setShowList(true); };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-0 lg:px-4 py-0 lg:py-6">
        <div className="lg:grid lg:grid-cols-3 gap-6 h-[calc(100vh-120px)] lg:h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <div className={`${showList ? 'block' : 'hidden'} lg:block h-full lg:rounded-md lg:border bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40`}> 
            <Card className="h-full flex flex-col lg:border-0 shadow-none">
              <CardHeader className="pb-4 border-b sticky top-0 z-10 bg-background/80 backdrop-blur">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg lg:text-xl">Messages</CardTitle>
                  {loading ? (
                    <Skeleton className="h-5 w-16" />
                  ) : (
                    <Badge variant="secondary" className="hidden lg:inline-flex">
                      {unreadTotal} unread
                    </Badge>
                  )}
                </div>
                <div className="relative space-y-2 mt-2">
                  <Search className="absolute left-3 top-3 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 text-sm"
                  />
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" type="button" className="h-8" onClick={()=> setShowNewConv(s=>!s)}>New</Button>
                  </div>
                  {showNewConv && (
                    <div className="flex gap-2 items-center">
                      <Select value={newVendorId} onValueChange={(val)=>setNewVendorId(val ?? '')}>
                        <SelectTrigger className="h-9 text-xs w-full">
                          <SelectValue placeholder="Select a vendor" />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          {vendorOptions.map(v => (
                            <SelectItem key={v.id} value={String(v.id)}>{v.store_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" type="button" className="h-9" disabled={!String(newVendorId || '').trim()} onClick={async ()=>{
                        const id = String(newVendorId || '').trim();
                        if (!id) return;
                        if (!vendors[id]) {
                          const found = vendorOptions.find(v => String(v.id) === id);
                          if (found) setVendors(prev => ({ ...prev, [String(found.id)]: found }));
                          else {
                            const { data: vRow } = await supabase.from('vendors').select('id,store_name,address,owner_user_id').eq('id', id).maybeSingle();
                            if (vRow) setVendors(prev => ({ ...prev, [String(vRow.id)]: vRow as VendorRow }));
                          }
                        }
                        setSelectedChat(id);
                        setShowNewConv(false);
                        setNewVendorId('');
                        if (isMobile) setShowList(false);
                      }}>Open</Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                <ScrollArea className="h-full">
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
                  {!loading && !filteredConversations.length && (
                    <div className="p-6 text-sm text-muted-foreground">No messages yet.</div>
                  )}
                  {!loading && filteredConversations.map((conversation, index) => {
                    const vendor = conversation.vendor;
                    let name = vendor ? vendor.store_name : 'Direct chat';
                    if (vendor && vendor.owner_user_id === profile?.id && conversation.participantUserId) {
                      const participant = participants[conversation.participantUserId];
                      name = participant?.full_name || `Customer ${String(conversation.participantUserId).slice(0,8)}`;
                    }
                    const initials = vendor ? vendor.store_name.slice(0,2).toUpperCase() : 'DM';
                    const lastContent = conversation.lastMessage?.content || 'No messages';
                    const time = formatRelative(conversation.lastMessage?.created_at);
                    const active = selectedChat === conversation.id;
                    return (
                      <div key={conversation.id}>
                        <button
                          className={`w-full text-left p-4 hover:bg-accent transition-colors ${active ? 'bg-accent' : ''}`}
                          onClick={() => { setSelectedChat(conversation.id); if (isMobile) setShowList(false); }}
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
                                <h4 className="font-medium truncate text-sm lg:text-base">{name}</h4>
                                <span className="text-[10px] lg:text-xs text-muted-foreground">{time}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-xs lg:text-sm text-muted-foreground truncate pr-2">{lastContent}</p>
                                {conversation.unreadCount > 0 && (
                                  <Badge variant="destructive" className="text-[10px] h-5 px-1">
                                    {conversation.unreadCount}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                        {index < filteredConversations.length - 1 && <Separator />}
                      </div>
                    );
                  })}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
          {/* Chat Area */}
          <div className={`${showList && isMobile ? 'hidden' : 'block'} lg:block lg:col-span-2 h-full flex flex-col border-l lg:border rounded-md bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40`}>
            <Card className="h-full flex flex-col lg:border-0 shadow-none">
              {currentConversation ? (
                <>
                  <CardHeader className="pb-3 border-b sticky top-0 z-10 bg-background/80 backdrop-blur">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {isMobile && (
                          <Button variant="ghost" size="icon" onClick={backToList} className="-ml-2 h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
                        )}
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {currentConversation.vendor ? (currentConversation.vendor.owner_user_id === profile?.id && currentConversation.participantUserId ? (participants[currentConversation.participantUserId]?.full_name || 'CU').slice(0,2).toUpperCase() : currentConversation.vendor.store_name.slice(0,2).toUpperCase()) : 'DM'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-sm lg:text-base">{currentConversation.vendor ? (currentConversation.vendor.owner_user_id === profile?.id && currentConversation.participantUserId ? (participants[currentConversation.participantUserId]?.full_name || `Customer ${String(currentConversation.participantUserId).slice(0,8)}`) : currentConversation.vendor.store_name) : 'Conversation'}</h3>
                          <div className="flex items-center text-[10px] lg:text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" /> Updated {formatRelative(currentConversation.lastMessage?.created_at)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" className="h-8 px-2 text-xs hidden lg:inline-flex">
                          Details
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 p-0">
                    <div ref={scrollRef} className="h-[calc(100vh-260px)] lg:h-[calc(100vh-310px)] overflow-y-auto px-3 py-4 space-y-4 scroll-smooth">
                      {[...currentConversation.messages,
                        ...Object.values(ephemeral).filter(o => {
                          if ((o.vendor_id || '') !== (currentConversation.vendor?.id || '')) return false;
                          if (currentConversation.vendor?.owner_user_id === profile?.id && currentConversation.participantUserId) {
                            return o.sender_user_id === currentConversation.participantUserId || o.receiver_user_id === currentConversation.participantUserId || o.sender_user_id === profile?.id;
                          }
                          return true;
                        }),
                        ...Object.values(optimistic).filter(o => {
                        if ((o.vendor_id || '') !== (currentConversation.vendor?.id || '')) return false;
                        // If vendor owner view with participant segmentation, restrict optimistic to same participant
                        if (currentConversation.vendor?.owner_user_id === profile?.id && currentConversation.participantUserId) {
                          // optimistic sender or receiver must match participant
                          return o.sender_user_id === currentConversation.participantUserId || o.receiver_user_id === currentConversation.participantUserId;
                        }
                        return true;
                      })]
                        .sort((a,b)=> new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                        .map(m => {
                          const mine = m.sender_user_id === profile?.id || m.sender_user_id === session?.user?.id; // prefer profile id
                          const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          const isTemp = String(m.id).startsWith('temp-');
                          return (
                            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[78%] lg:max-w-[70%] p-3 rounded-2xl relative ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted'} shadow-sm`}>
                                <div className={`text-[10px] mb-1 ${mine ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                  {mine ? 'You sent' : 'New message'}
                                </div>
                                <p className="text-xs lg:text-sm whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
                                <div className={`flex items-center justify-end mt-1 gap-2 text-[10px] ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                  <span>{time}</span>
                                  {mine && <CheckCheck className={`h-3 w-3 ${isTemp ? 'opacity-20 animate-pulse' : m.read_at ? 'opacity-100' : 'opacity-40'}`} />}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      {!currentConversation.messages.length && (
                        <div className="text-center text-xs text-muted-foreground">No messages yet. Say hello 👋</div>
                      )}
                    </div>
                  </CardContent>
                  <div className="p-3 border-t bg-background/90 backdrop-blur sticky bottom-0">
                    <div className="flex items-center space-x-2">
                      <Input
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        className="flex-1 h-10 text-sm"
                      />
                      <Button onClick={async () => {
                        // Broadcast only (no local ephemeral add; sender already sees optimistic bubble)
                        if (profile?.id && currentConversation && newMessage.trim()) {
                          let receiver: string | null = null;
                          if (currentConversation.vendor) {
                            receiver = currentConversation.vendor.owner_user_id === profile.id
                              ? currentConversation.participantUserId || null
                              : currentConversation.vendor.owner_user_id || null;
                          } else if (currentConversation.otherUserId) receiver = currentConversation.otherUserId;
                          if (receiver) {
                            const payloadMsg: DbMessage = { id: `broadcast-${Date.now()}`, vendor_id: currentConversation.vendor ? currentConversation.vendor.id : null, sender_user_id: profile.id, receiver_user_id: receiver, content: newMessage.trim(), created_at: new Date().toISOString(), read_at: null };
                            broadcastChannelRef.current?.send({ type: 'broadcast', event: 'message', payload: payloadMsg });
                          }
                        }
                        await sendMessage();
                      }} disabled={!newMessage.trim() || sending} className="h-10 px-4 text-sm">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center max-w-xs">
                    <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Send className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-base font-semibold mb-2">Select a conversation</h3>
                    <p className="text-muted-foreground text-sm">
                      Choose or start a conversation to begin messaging.
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

// Provide computed unread count (exported accessor pattern) if needed elsewhere.
export const computeUnreadForUser = (messages: DbMessage[], currentUserId: string) => messages.filter(m => m.receiver_user_id === currentUserId && !m.read_at).length;

export default Messages;