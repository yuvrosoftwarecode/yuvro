import React from "react";

export interface OwnerOnlyProps {
  isOwner?: boolean;
  children: React.ReactNode;
}

export const OwnerOnly: React.FC<OwnerOnlyProps> = ({ isOwner = true, children }) => {
  if (!isOwner) return null;
  return <>{children}</>;
};

OwnerOnly.displayName = "OwnerOnly";
