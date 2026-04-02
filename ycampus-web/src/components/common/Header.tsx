

interface HeaderProps {
  showMenu?: boolean;
  menuItems?: Array<{ label: string; onClick: () => void; active?: boolean }>;
}

const Header: React.FC<HeaderProps> = () => {
  // Profile, notifications, theme toggle, and logout are now in the sidebar footer.
  // This component is kept as a no-op for backward compatibility.
  return null;
};

export default Header;
