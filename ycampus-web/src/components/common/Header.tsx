import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Bell, LogOut, User, Menu, ChevronDown, LayoutDashboard, Award } from 'lucide-react';

interface HeaderProps {
  showMenu?: boolean;
  menuItems?: Array<{ 
    label: string; 
    onClick?: () => void; 
    active?: boolean;
    dropdown?: Array<{
      label: string;
      onClick: () => void;
    }>;
  }>;
}

const Header: React.FC<HeaderProps> = ({ showMenu = false, menuItems = [] }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 h-16 border-b bg-card flex items-center justify-between px-6">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-xl font-bold text-foreground">Yuvro</span>
        </div>
        
        {showMenu && menuItems.length > 0 && !isMobile && (
          <nav className="flex items-center space-x-1">
            {menuItems.map((item, index) => (
              item.dropdown ? (
                <DropdownMenu key={index}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={item.active ? "default" : "ghost"}
                    >
                      {item.label}
                      <ChevronDown className="ml-1 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-card">
                    {item.dropdown.map((subItem, subIndex) => (
                      <DropdownMenuItem key={subIndex} onClick={subItem.onClick}>
                        {subItem.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  key={index}
                  variant={item.active ? "default" : "ghost"}
                  onClick={item.onClick}
                >
                  {item.label}
                </Button>
              )
            ))}
          </nav>
        )}
      </div>

      <div className="flex items-center space-x-4">
        {showMenu && menuItems.length > 0 && isMobile && (
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <nav className="flex flex-col space-y-2 mt-6">
                {menuItems.map((item, index) => (
                  item.dropdown ? (
                    <div key={index} className="space-y-1">
                      <div className="px-3 py-2 text-sm font-medium text-muted-foreground">
                        {item.label}
                      </div>
                      {item.dropdown.map((subItem, subIndex) => (
                        <Button
                          key={subIndex}
                          variant="ghost"
                          onClick={() => {
                            subItem.onClick();
                            setMobileMenuOpen(false);
                          }}
                          className="justify-start w-full pl-6"
                        >
                          {subItem.label}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <Button
                      key={index}
                      variant={item.active ? "default" : "ghost"}
                      onClick={() => {
                        item.onClick?.();
                        setMobileMenuOpen(false);
                      }}
                      className="justify-start"
                    >
                      {item.label}
                    </Button>
                  )
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        )}
        
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {(user?.name || user?.username || user?.email || "U")
                    .split(" ")[0][0]
                    .toUpperCase()}
                </AvatarFallback>

              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium">{user?.name}</p>
                <Badge variant="secondary" className="text-xs">
                  {user?.role}
                </Badge>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate('/dashboard')}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/student/certifications')}>
              <Award className="mr-2 h-4 w-4" />
              Certifications
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/student/profile')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;