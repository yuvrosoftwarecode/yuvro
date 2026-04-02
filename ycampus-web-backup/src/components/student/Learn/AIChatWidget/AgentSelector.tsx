import React from 'react';

export type Agent = {
  id: string;
  name: string;
  provider?: string;
};

const AgentSelector: React.FC<{ agents: Agent[]; selected?: string | null; onSelect: (id: string | null) => void }> = ({ agents, selected, onSelect }) => {
  return (
    <div className="mt-2">
      <select
        className="text-xs border rounded px-2 py-1"
        value={selected ?? ''}
        onChange={(e) => onSelect(e.target.value || null)}
      >
        <option value="">Default</option>
        {agents.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
    </div>
  );
};

export default AgentSelector;
