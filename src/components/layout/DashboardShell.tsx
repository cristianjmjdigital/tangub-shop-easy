import { type ComponentType, type ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export type DashboardNavItem = {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  badge?: ReactNode;
  onSelect?: (key: string) => void;
  disabled?: boolean;
};

interface DashboardShellProps {
  roleLabel: string;
  title: string;
  navItems: DashboardNavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  topRight?: ReactNode;
  note?: ReactNode;
  footerAction?: ReactNode;
  children: ReactNode;
}

export function DashboardShell({
  roleLabel,
  title,
  navItems,
  activeKey,
  onSelect,
  topRight,
  note,
  footerAction,
  children,
}: DashboardShellProps) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="bg-sidebar">
        <SidebarHeader className="px-3 py-4">
          <div className="flex items-center gap-2 px-1">
            <div className="h-7 w-7 rounded bg-primary/90" />
            <span className="font-semibold tracking-wide">{roleLabel}</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Overview</SidebarGroupLabel>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    disabled={item.disabled}
                    isActive={activeKey === item.key}
                    onClick={() => {
                      if (item.disabled) return;
                      item.onSelect?.(item.key);
                      onSelect(item.key);
                    }}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                    {item.badge}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        {footerAction ? (
          <SidebarFooter className={cn("px-2 pb-3", "flex")}>{footerAction}</SidebarFooter>
        ) : null}
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <div className="flex items-center h-14 px-4 gap-3 border-b bg-background/80 supports-[backdrop-filter]:backdrop-blur">
          <SidebarTrigger />
          <div className="font-semibold">{title}</div>
          {topRight ? <div className="ml-auto w-full max-w-xs">{topRight}</div> : null}
        </div>
        <div className="px-4 py-6 space-y-4">
          {note}
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default DashboardShell;
