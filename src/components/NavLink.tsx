
import { NavLink as RouterNavLink } from "react-router-dom";

import { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface NavLinkProps {

  to: string;

  icon: LucideIcon;

  collapsed: boolean;

  children: React.ReactNode;

}

export function NavLink({ to, icon: Icon, collapsed, children }: NavLinkProps) {

  return (

    <RouterNavLink

      to={to}

      className={({ isActive }) =>

        cn(

          "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",

          "hover:bg-sidebar-accent",

          isActive 

            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 

            : "text-sidebar-foreground/70 hover:text-sidebar-foreground",

          collapsed && "justify-center px-2"

        )

      }

    >

      <Icon className="w-5 h-5 shrink-0" />

      {!collapsed && <span className="truncate">{children}</span>}

    </RouterNavLink>

  );

}

