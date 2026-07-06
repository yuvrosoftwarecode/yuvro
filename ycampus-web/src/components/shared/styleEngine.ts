import React from "react";

export const buildBlockStyle = (
  meta: Record<string, any> | undefined,
): React.CSSProperties | undefined => {
  if (!meta) return undefined;

  const styles: React.CSSProperties = {};

  if (meta.bgColor) styles.backgroundColor = meta.bgColor;
  if (meta.borderColor) styles.borderColor = meta.borderColor;

  if (meta.marginTop !== undefined) styles.marginTop = meta.marginTop;
  if (meta.marginBottom !== undefined) styles.marginBottom = meta.marginBottom;
  if (meta.marginLeft !== undefined) styles.marginLeft = meta.marginLeft;
  if (meta.marginRight !== undefined) styles.marginRight = meta.marginRight;

  if (meta.paddingTop !== undefined) styles.paddingTop = meta.paddingTop;
  if (meta.paddingBottom !== undefined)
    styles.paddingBottom = meta.paddingBottom;
  if (meta.paddingLeft !== undefined) styles.paddingLeft = meta.paddingLeft;
  if (meta.paddingRight !== undefined) styles.paddingRight = meta.paddingRight;

  if (meta.borderWidth !== undefined) styles.borderWidth = meta.borderWidth;
  if (meta.borderStyle) styles.borderStyle = meta.borderStyle;
  if (meta.borderRadius !== undefined) styles.borderRadius = meta.borderRadius;

  if (meta.width !== undefined) styles.width = meta.width;
  if (meta.maxWidth !== undefined) styles.maxWidth = meta.maxWidth;
  if (meta.minWidth !== undefined) styles.minWidth = meta.minWidth;
  if (meta.alignSelf) styles.alignSelf = meta.alignSelf;

  return Object.keys(styles).length > 0 ? styles : undefined;
};
