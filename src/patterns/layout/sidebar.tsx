import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Home, Settings, Users, BarChart2, FileText } from "lucide-react";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  children?: { label: string }[];
}

const NAV: NavItem[] = [
  { label: "Dashboard", icon: <Home className="size-4" /> },
  {
    label: "Users",
    icon: <Users className="size-4" />,
    children: [{ label: "All Users" }, { label: "Roles" }, { label: "Invitations" }],
  },
  {
    label: "Reports",
    icon: <BarChart2 className="size-4" />,
    children: [{ label: "Overview" }, { label: "Revenue" }, { label: "Engagement" }],
  },
  { label: "Documents", icon: <FileText className="size-4" /> },
  { label: "Settings", icon: <Settings className="size-4" /> },
];

function NavGroup({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);
  if (!item.children) {
    return (
      <button className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
        {item.icon}
        {item.label}
      </button>
    );
  }
  return (
    <div>
      <button className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" onClick={() => setOpen((v) => !v)}>
        {item.icon}
        <span className="flex-1 text-left">{item.label}</span>
        {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
      </button>
      {open && (
        <div className="ml-6 mt-0.5 space-y-0.5 border-l border-border pl-3">
          {item.children.map((child) => (
            <button key={child.label} className="flex w-full items-center px-2 py-1.5 text-sm rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              {child.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SidebarShell() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-lg border border-border overflow-hidden flex" style={{ height: 380 }}>
      {/* Sidebar */}
      <aside className={`border-r border-border flex flex-col transition-all duration-200 ${collapsed ? "w-12" : "w-48"}`}>
        <div className="h-12 flex items-center justify-between px-3 border-b border-border shrink-0">
          {!collapsed && <span className="text-sm font-semibold">Acme</span>}
          <Button variant="ghost" size="icon" onClick={() => setCollapsed((v) => !v)} className="shrink-0">
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4 rotate-90" />}
          </Button>
        </div>
        {!collapsed && (
          <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {NAV.map((item) => (
              <NavGroup key={item.label} item={item} />
            ))}
          </nav>
        )}
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <header className="h-12 flex items-center px-4 border-b border-border shrink-0">
          <span className="text-sm font-medium">Dashboard</span>
        </header>
        <div className="flex-1 p-4 text-sm text-muted-foreground">Main content area. Click items in the sidebar to see collapsible groups.</div>
      </div>
    </div>
  );
}
