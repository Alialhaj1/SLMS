import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { useTranslation } from '../../hooks/useTranslation';
import {
  CheckIcon,
  MinusIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

/* ──────────── Types ──────────── */

export interface PermissionAction {
  id: number;
  permission_code: string;
  action: string;
  description?: string;
  domain?: string;
}

export interface PermissionResource {
  resource: string;
  actions: PermissionAction[];
}

export interface PermissionModule {
  module_code: string;
  module_name: string;
  module_category?: string;
  module_icon?: string;
  is_core?: boolean;
  resources: PermissionResource[];
}

interface PermissionMatrixProps {
  /** Grouped permissions from API (grouped=true) */
  modules: PermissionModule[];
  /** Currently selected permission codes */
  selected: string[];
  /** Callback when selection changes */
  onChange: (codes: string[]) => void;
  /** Module codes disabled for this tenant (locked columns) */
  disabledModules?: string[];
  /** Read-only mode */
  readOnly?: boolean;
  /** Loading state */
  loading?: boolean;
}

/* ──────────── Helpers ──────────── */

/** Collect all unique actions across all modules */
function collectActions(modules: PermissionModule[]): string[] {
  const actionOrder = ['view', 'create', 'edit', 'delete', 'approve', 'export', 'manage'];
  const set = new Set<string>();
  for (const m of modules) {
    for (const r of m.resources) {
      for (const a of r.actions) {
        set.add(a.action);
      }
    }
  }
  return [...set].sort((a, b) => {
    const ia = actionOrder.indexOf(a);
    const ib = actionOrder.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });
}

/** Find the permission code for a given module+resource+action, or null */
function findCode(
  mod: PermissionModule,
  resource: string,
  action: string,
): string | null {
  const res = mod.resources.find(r => r.resource === resource);
  if (!res) return null;
  const act = res.actions.find(a => a.action === action);
  return act ? act.permission_code : null;
}

/** Flatten all codes from a module */
function allModuleCodes(mod: PermissionModule): string[] {
  return mod.resources.flatMap(r => r.actions.map(a => a.permission_code));
}

/** Flatten all codes for a resource within a module */
function allResourceCodes(mod: PermissionModule, resource: string): string[] {
  const res = mod.resources.find(r => r.resource === resource);
  return res ? res.actions.map(a => a.permission_code) : [];
}

/** Flatten all codes for a given action across all modules */
function allActionCodes(modules: PermissionModule[], action: string): string[] {
  const codes: string[] = [];
  for (const m of modules) {
    for (const r of m.resources) {
      for (const a of r.actions) {
        if (a.action === action) codes.push(a.permission_code);
      }
    }
  }
  return codes;
}

/* ──────────── Component ──────────── */

export default function PermissionMatrix({
  modules,
  selected,
  onChange,
  disabledModules = [],
  readOnly = false,
  loading = false,
}: PermissionMatrixProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Derived data ──
  const filteredModules = useMemo(() => {
    if (!search.trim()) return modules;
    const q = search.toLowerCase();
    return modules
      .map(mod => {
        // Keep module if name matches
        if (mod.module_name.toLowerCase().includes(q) || mod.module_code.toLowerCase().includes(q)) {
          return mod;
        }
        // Otherwise filter resources
        const resources = mod.resources.filter(r =>
          r.resource.toLowerCase().includes(q) ||
          r.actions.some(a => a.description?.toLowerCase().includes(q) || a.permission_code.toLowerCase().includes(q))
        );
        if (resources.length === 0) return null;
        return { ...mod, resources };
      })
      .filter(Boolean) as PermissionModule[];
  }, [modules, search]);

  const allActions = useMemo(() => collectActions(filteredModules), [filteredModules]);

  // ── Selection helpers ──
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = useCallback(
    (code: string) => {
      if (readOnly) return;
      const next = selectedSet.has(code)
        ? selected.filter(c => c !== code)
        : [...selected, code];
      onChange(next);
    },
    [selected, selectedSet, onChange, readOnly],
  );

  const toggleAll = useCallback(
    (codes: string[], forceOn?: boolean) => {
      if (readOnly) return;
      const enabled = codes.filter(c => !disabledModules.some(dm => c.startsWith(dm + ':')));
      const allOn = forceOn ?? !enabled.every(c => selectedSet.has(c));
      if (allOn) {
        onChange([...new Set([...selected, ...enabled])]);
      } else {
        const remove = new Set(enabled);
        onChange(selected.filter(c => !remove.has(c)));
      }
    },
    [selected, selectedSet, onChange, readOnly, disabledModules],
  );

  const toggleModule = useCallback(
    (mod: PermissionModule) => toggleAll(allModuleCodes(mod)),
    [toggleAll],
  );

  const toggleResource = useCallback(
    (mod: PermissionModule, resource: string) => toggleAll(allResourceCodes(mod, resource)),
    [toggleAll],
  );

  const toggleActionRow = useCallback(
    (action: string) => toggleAll(allActionCodes(filteredModules, action)),
    [toggleAll, filteredModules],
  );

  const moduleHeaderState = useCallback(
    (mod: PermissionModule): 'all' | 'some' | 'none' => {
      const codes = allModuleCodes(mod);
      const count = codes.filter(c => selectedSet.has(c)).length;
      if (count === 0) return 'none';
      if (count === codes.length) return 'all';
      return 'some';
    },
    [selectedSet],
  );

  const resourceHeaderState = useCallback(
    (mod: PermissionModule, resource: string): 'all' | 'some' | 'none' => {
      const codes = allResourceCodes(mod, resource);
      const count = codes.filter(c => selectedSet.has(c)).length;
      if (count === 0) return 'none';
      if (count === codes.length) return 'all';
      return 'some';
    },
    [selectedSet],
  );

  const actionRowState = useCallback(
    (action: string): 'all' | 'some' | 'none' => {
      const codes = allActionCodes(filteredModules, action);
      const count = codes.filter(c => selectedSet.has(c)).length;
      if (count === 0) return 'none';
      if (count === codes.length) return 'all';
      return 'some';
    },
    [selectedSet, filteredModules],
  );

  const toggleCollapse = (moduleCode: string) => {
    setCollapsedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleCode)) next.delete(moduleCode);
      else next.add(moduleCode);
      return next;
    });
  };

  /* ── Keyboard navigation ── */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, code: string | null) => {
      if (!code) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggle(code);
      }
    },
    [toggle],
  );

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-10 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (filteredModules.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        {search ? (t('common.noResults') || 'No permissions match your search.') : (t('common.empty') || 'No permissions available.')}
      </div>
    );
  }

  // ── Count columns for each module (= # of resources) ──
  const columnLayout = filteredModules.flatMap(mod =>
    collapsedModules.has(mod.module_code)
      ? [{ moduleCode: mod.module_code, resource: '__collapsed__', mod }]
      : mod.resources.map(r => ({ moduleCode: mod.module_code, resource: r.resource, mod }))
  );

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative max-w-xs">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder={t('settings.roles.searchPermissions') || 'Search permissions...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Selection stats */}
      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <span>{selected.length} / {modules.flatMap(m => allModuleCodes(m)).length} {t('settings.roles.permissionsSelected') || 'permissions selected'}</span>
        {!readOnly && (
          <>
            <button
              onClick={() => toggleAll(modules.flatMap(m => allModuleCodes(m)), true)}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t('common.selectAll') || 'Select All'}
            </button>
            <button
              onClick={() => onChange([])}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:underline"
            >
              {t('common.clearAll') || 'Clear All'}
            </button>
          </>
        )}
      </div>

      {/* Matrix table */}
      <div ref={scrollRef} className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="w-full text-xs border-collapse">
          {/* ── Module header row ── */}
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-700/50">
              <th className="sticky left-0 z-20 bg-gray-50 dark:bg-slate-700/50 px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 border-b border-r border-gray-200 dark:border-gray-600 min-w-[120px]">
                {t('settings.roles.action') || 'Action'}
              </th>
              {filteredModules.map(mod => {
                const disabled = disabledModules.includes(mod.module_code);
                const collapsed = collapsedModules.has(mod.module_code);
                const colSpan = collapsed ? 1 : mod.resources.length;
                const state = moduleHeaderState(mod);
                return (
                  <th
                    key={mod.module_code}
                    colSpan={colSpan}
                    className={clsx(
                      'px-2 py-2 text-center border-b border-r border-gray-200 dark:border-gray-600 font-semibold',
                      disabled
                        ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-500'
                        : 'text-gray-700 dark:text-gray-300',
                    )}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => toggleCollapse(mod.module_code)}
                        className="p-0.5 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
                      >
                        {collapsed
                          ? <ChevronRightIcon className="w-3 h-3" />
                          : <ChevronDownIcon className="w-3 h-3" />}
                      </button>
                      {disabled && <LockClosedIcon className="w-3 h-3 text-gray-400" />}
                      <span className="truncate max-w-[100px]">{mod.module_name}</span>
                      {!readOnly && !disabled && (
                        <HeaderCheckbox
                          state={state}
                          onClick={() => toggleModule(mod)}
                          title={t('common.selectAll') || 'Toggle all'}
                        />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>

            {/* ── Resource sub-header row ── */}
            <tr className="bg-gray-50/70 dark:bg-slate-700/30">
              <th className="sticky left-0 z-20 bg-gray-50 dark:bg-slate-700/50 px-3 py-1.5 text-left text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-r border-gray-200 dark:border-gray-600">
                {t('settings.roles.resource') || 'Resource'}
              </th>
              {columnLayout.map((col, idx) => {
                const disabled = disabledModules.includes(col.moduleCode);
                if (col.resource === '__collapsed__') {
                  return (
                    <th key={`${col.moduleCode}__collapsed`} className="px-2 py-1.5 text-center text-[10px] uppercase tracking-wider text-gray-400 border-b border-r border-gray-200 dark:border-gray-600">
                      ...
                    </th>
                  );
                }
                const state = resourceHeaderState(col.mod, col.resource);
                return (
                  <th
                    key={`${col.moduleCode}:${col.resource}`}
                    className={clsx(
                      'px-2 py-1.5 text-center border-b border-r border-gray-200 dark:border-gray-600',
                      disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400',
                    )}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-[10px] uppercase tracking-wider truncate max-w-[80px]">{col.resource.replace(/_/g, ' ')}</span>
                      {!readOnly && !disabled && (
                        <HeaderCheckbox
                          state={state}
                          onClick={() => toggleResource(col.mod, col.resource)}
                          title={t('common.selectAll') || 'Toggle all'}
                          small
                        />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* ── Action rows ── */}
          <tbody>
            {allActions.map(action => {
              const rowState = actionRowState(action);
              return (
                <tr key={action} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                  {/* Row header = action name */}
                  <td className="sticky left-0 z-10 bg-white dark:bg-slate-800 px-3 py-2 border-b border-r border-gray-200 dark:border-gray-600 font-medium text-gray-700 dark:text-gray-300">
                    <div className="flex items-center gap-1.5">
                      <span className="capitalize">{action.replace(/_/g, ' ')}</span>
                      {!readOnly && (
                        <HeaderCheckbox
                          state={rowState}
                          onClick={() => toggleActionRow(action)}
                          title={`Toggle all ${action}`}
                          small
                        />
                      )}
                    </div>
                  </td>
                  {/* Cells */}
                  {columnLayout.map(col => {
                    const disabled = disabledModules.includes(col.moduleCode);
                    if (col.resource === '__collapsed__') {
                      return (
                        <td key={`${col.moduleCode}__collapsed__${action}`} className="px-2 py-2 text-center border-b border-r border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-slate-800/50">
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        </td>
                      );
                    }
                    const code = findCode(col.mod, col.resource, action);
                    if (!code) {
                      // This action doesn't exist for this resource
                      return (
                        <td key={`${col.moduleCode}:${col.resource}:${action}`} className="px-2 py-2 text-center border-b border-r border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-slate-800/30">
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        </td>
                      );
                    }
                    const checked = selectedSet.has(code);
                    return (
                      <td
                        key={code}
                        className={clsx(
                          'px-2 py-2 text-center border-b border-r border-gray-100 dark:border-gray-700 transition-colors',
                          disabled && 'bg-gray-100 dark:bg-slate-800',
                        )}
                      >
                        {disabled ? (
                          <LockClosedIcon className="w-3.5 h-3.5 mx-auto text-gray-300 dark:text-gray-600" />
                        ) : readOnly ? (
                          checked ? (
                            <CheckIcon className="w-4 h-4 mx-auto text-green-600 dark:text-green-400" />
                          ) : (
                            <span className="text-gray-300">—</span>
                          )
                        ) : (
                          <button
                            role="checkbox"
                            aria-checked={checked}
                            aria-label={code}
                            tabIndex={0}
                            onClick={() => toggle(code)}
                            onKeyDown={e => handleKeyDown(e, code)}
                            className={clsx(
                              'w-5 h-5 rounded border-2 mx-auto flex items-center justify-center transition-all focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                              checked
                                ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                                : 'border-gray-300 dark:border-gray-500 hover:border-blue-400 dark:hover:border-blue-500',
                            )}
                          >
                            {checked && <CheckIcon className="w-3 h-3 stroke-[3]" />}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ──────────── Header Checkbox (tri-state) ──────────── */

function HeaderCheckbox({
  state,
  onClick,
  title,
  small,
}: {
  state: 'all' | 'some' | 'none';
  onClick: () => void;
  title?: string;
  small?: boolean;
}) {
  const size = small ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const iconSize = small ? 'w-2.5 h-2.5' : 'w-3 h-3';

  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      title={title}
      className={clsx(
        'rounded border-2 flex items-center justify-center transition-all flex-shrink-0',
        size,
        state === 'all'
          ? 'bg-blue-600 border-blue-600 text-white'
          : state === 'some'
            ? 'bg-blue-200 border-blue-400 dark:bg-blue-800 dark:border-blue-600 text-blue-700 dark:text-blue-300'
            : 'border-gray-300 dark:border-gray-500 hover:border-blue-400',
      )}
    >
      {state === 'all' && <CheckIcon className={clsx(iconSize, 'stroke-[3]')} />}
      {state === 'some' && <MinusIcon className={clsx(iconSize, 'stroke-[3]')} />}
    </button>
  );
}

export { PermissionMatrix };
