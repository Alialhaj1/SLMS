/**
 * CompanyTree Component
 * Displays company/branch hierarchy as a tree visualization
 */

import { useState } from 'react';
import {
  BuildingOffice2Icon,
  BuildingStorefrontIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

export interface CompanyNode {
  id: number;
  name: string;
  code: string;
  type: 'company' | 'branch';
  parent_id?: number | null;
  children?: CompanyNode[];
  status?: string;
  is_active?: boolean;
}

interface CompanyTreeProps {
  nodes: CompanyNode[];
  onSelect?: (node: CompanyNode) => void;
  selectedId?: number | null;
}

function TreeNode({ 
  node, 
  depth = 0, 
  onSelect, 
  selectedId 
}: { 
  node: CompanyNode; 
  depth?: number; 
  onSelect?: (node: CompanyNode) => void; 
  selectedId?: number | null;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = node.id === selectedId;

  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          onSelect?.(node);
        }}
        className={clsx(
          'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-start',
          isSelected
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
            : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
        )}
        style={{ paddingInlineStart: `${depth * 24 + 12}px` }}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDownIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
          )
        ) : (
          <span className="w-4" />
        )}
        
        {node.type === 'company' ? (
          <BuildingOffice2Icon className="w-5 h-5 text-blue-500 flex-shrink-0" />
        ) : (
          <BuildingStorefrontIcon className="w-5 h-5 text-emerald-500 flex-shrink-0" />
        )}
        
        <span className="truncate">{node.name}</span>
        <span className="text-xs text-slate-400 ms-auto">{node.code}</span>
        
        {node.is_active === false && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
            Inactive
          </span>
        )}
      </button>

      {expanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CompanyTree({ nodes, onSelect, selectedId }: CompanyTreeProps) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        <BuildingOffice2Icon className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No companies found</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          onSelect={onSelect}
          selectedId={selectedId}
        />
      ))}
    </div>
  );
}
