import React from 'react';
import { buildBlockStyle } from './styleEngine';

type BlockWrapperProps = {
  block: {
    metadata?: Record<string, any>;
    [key: string]: any;
  };
  children: React.ReactNode;
  className?: string;
};

/**
 * A reusable wrapper component for all study material blocks.
 * It uses the centralized style engine to generate CSS properties from block metadata
 * and applies them to an outer div container.
 */
export const BlockWrapper: React.FC<BlockWrapperProps> = ({ block, children, className }) => {
  const style = buildBlockStyle(block.metadata);

  if (!style && !className) {
    return <>{children}</>;
  }

  // If there's exactly one valid React element child, we can inject styles directly into it.
  // This allows overriding the child's default tailwind classes (like bg-blue-50) directly 
  // without creating an unnecessary wrapper div that causes visual bugs.
  if (React.isValidElement(children)) {
    const mergedClassName = [children.props.className, className].filter(Boolean).join(' ');
    const mergedStyle = { ...children.props.style, ...style };

    return React.cloneElement(children as React.ReactElement, {
      className: mergedClassName || undefined,
      style: Object.keys(mergedStyle).length > 0 ? mergedStyle : undefined,
    });
  }

  // Fallback if there are multiple children or raw text nodes
  return (
    <div style={style} className={className}>
      {children}
    </div>
  );
};
