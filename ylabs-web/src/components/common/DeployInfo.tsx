import React from 'react';

interface DeployInfoProps {
  collapsed?: boolean;
  visible?: boolean;
  className?: string;
}

export const DeployInfo: React.FC<DeployInfoProps> = ({
  collapsed = false,
  visible = true,
  className = '',
}) => {
  if (collapsed || !visible) return null;

  const branch = import.meta.env.VITE_DEPLOY_BRANCH || 'local';
  const commit = import.meta.env.VITE_DEPLOY_COMMIT_SHA || 'dev';
  const version = import.meta.env.VITE_DEPLOY_APP_VERSION || '0.0.0';
  const short = commit.length > 7 ? commit.slice(0, 7) : commit;

  return (
    <p
      className={`px-2 pt-1 pb-0.5 text-[10px] text-muted-foreground/40 font-mono truncate ${className}`}
      title={`v${version} · ⎇ ${branch} · ${short}`}
    >
      v{version} · ⎇ {branch} · {short}
    </p>
  );
};

export default DeployInfo;
