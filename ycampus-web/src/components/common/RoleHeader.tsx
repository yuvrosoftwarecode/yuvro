import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Bell, ChevronDown } from 'lucide-react';

interface RoleHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

const RoleHeader: React.FC<RoleHeaderProps> = ({
  title,
  subtitle,
  actions,
  className = ''
}) => {
  return null;
};

export default RoleHeader;