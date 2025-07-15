import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Menu, Home, MessageCircle, User, Info, X, Car } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavigationPage = "home" | "messages" | "profile" | "about";

interface NavigationItem {
  id: NavigationPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface FloatingNavigationProps {
  currentPage: NavigationPage;
  onPageChange: (page: NavigationPage) => void;
  unreadMessageCount?: number;
}

const navigationItems: NavigationItem[] = [
  {
    id: "home",
    label: "Home",
    icon: Home,
    description: "Browse and manage rides",
  },
  {
    id: "messages",
    label: "Messages",
    icon: MessageCircle,
    description: "Your conversations",
  },
  {
    id: "profile",
    label: "Profile",
    icon: User,
    description: "Account settings and your rides",
  },
  {
    id: "about",
    label: "About",
    icon: Info,
    description: "About RideShare Hub",
  },
];

export const FloatingNavigation = ({
  currentPage,
  onPageChange,
  unreadMessageCount = 0,
}: FloatingNavigationProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleItemClick = (page: NavigationPage) => {
    onPageChange(page);
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className={cn(
            "h-14 w-14 rounded-full shadow-lg transition-all duration-200 hover:scale-110",
            "bg-gradient-to-br from-primary to-secondary hover:from-primary/90 hover:to-secondary/90",
            isOpen && "scale-95",
          )}
        >
          <Menu className="h-6 w-6 text-white" />
        </Button>

        {/* Unread messages badge */}
        {unreadMessageCount > 0 && (
          <div className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-bold">
              {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
            </span>
          </div>
        )}
      </div>

      {/* Navigation Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                  <Car className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Navigation
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 py-4">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              const isMessages = item.id === "messages";

              return (
                <Button
                  key={item.id}
                  variant={isActive ? "default" : "ghost"}
                  onClick={() => handleItemClick(item.id)}
                  className={cn(
                    "h-auto p-4 justify-start text-left transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-primary to-secondary text-white shadow-md"
                      : "hover:bg-accent hover:scale-[1.02]",
                  )}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="relative">
                      <Icon className="h-5 w-5" />
                      {isMessages && unreadMessageCount > 0 && (
                        <div className="absolute -top-2 -right-2 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold">
                            {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{item.label}</div>
                      <div
                        className={cn(
                          "text-xs",
                          isActive ? "text-white/80" : "text-muted-foreground",
                        )}
                      >
                        {item.description}
                      </div>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>

          <div className="border-t pt-4">
            <div className="text-center text-xs text-muted-foreground">
              Current:{" "}
              <span className="font-medium capitalize">{currentPage}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
