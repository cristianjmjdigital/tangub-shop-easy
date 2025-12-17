import Messages from "./Messages";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, MessageSquare, Package, Settings, ShoppingCart, Store } from "lucide-react";

const navItems = [
  { key: "overview", label: "Overview", icon: Store },
  { key: "products", label: "Products", icon: Package },
  { key: "orders", label: "Orders", icon: ShoppingCart },
  { key: "settings", label: "Settings", icon: Settings },
  { key: "messages", label: "Messages", icon: MessageSquare },
];

const vendorTabKey = "vendor-dashboard-tab";

const VendorMessages = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const jumpToTab = (key: string) => {
    try {
      localStorage.setItem(vendorTabKey, key);
    } catch (_e) {
      // ignore storage issues
    }
    navigate("/vendor");
  };

  return (
    <DashboardShell
      roleLabel="Vendor"
      title="Vendor Console"
      navItems={navItems}
      activeKey="messages"
      onSelect={(key) => {
        if (key === "messages") return;
        jumpToTab(key);
      }}
      footerAction={
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={async () => {
            await signOut();
            navigate("/login/vendor");
          }}
        >
          <LogOut className="h-4 w-4 mr-1" /> Logout
        </Button>
      }
    >
      <div className="p-3 sm:p-4">
        <Messages />
      </div>
    </DashboardShell>
  );
};

export default VendorMessages;
