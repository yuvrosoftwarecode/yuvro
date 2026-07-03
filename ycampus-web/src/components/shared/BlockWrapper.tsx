import React from "react";
import { buildBlockStyle } from "./styleEngine";

type BlockWrapperProps = {
  block: {
    metadata?: Record<string, any>;
    [key: string]: any;
  };
  children: React.ReactNode;
  className?: string;
};

export const BlockWrapper: React.FC<BlockWrapperProps> = ({
  block,
  children,
  className,
}) => {
  const style = buildBlockStyle(block.metadata);

  if (!style && !className) {
    return <>{children}</>;
  }

  if (React.isValidElement(children)) {
    const mergedClassName = [children.props.className, className]
      .filter(Boolean)
      .join(" ");
    const mergedStyle = { ...children.props.style, ...style };

    return React.cloneElement(children as React.ReactElement, {
      className: mergedClassName || undefined,
      style: Object.keys(mergedStyle).length > 0 ? mergedStyle : undefined,
    });
  }

  return (
    <div style={style} className={className}>
      {children}
    </div>
  );
};
