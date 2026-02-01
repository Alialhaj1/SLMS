/**
 * 🛠 PERMISSION DEBUG MODE
 * =====================================================
 * Developer tool to show permission codes on hover
 * 
 * Usage:
 * 1. Add <PermissionDebugProvider> in _app.tsx
 * 2. Press Ctrl+Shift+P to toggle debug mode
 * 3. Hover over any permission-protected element
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface DebugContextType {
  debugMode: boolean;
  toggleDebugMode: () => void;
  showPermission: (permission: string, element: HTMLElement) => void;
  hidePermission: () => void;
}

const DebugContext = createContext<DebugContextType | null>(null);

// Tooltip component
function PermissionTooltip({ permission, position }: { permission: string; position: { x: number; y: number } }) {
  if (!permission) return null;
  
  return (
    <div
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y - 30,
        backgroundColor: '#1f2937',
        color: '#10b981',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 99999,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      🔐 {permission}
    </div>
  );
}

// Debug indicator
function DebugIndicator({ active }: { active: boolean }) {
  if (!active) return null;
  
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: '#10b981',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: 'bold',
        zIndex: 99998,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      🛠 Permission Debug Mode
      <span style={{ opacity: 0.7 }}>(Ctrl+Shift+P to toggle)</span>
    </div>
  );
}

export function PermissionDebugProvider({ children }: { children: React.ReactNode }) {
  const [debugMode, setDebugMode] = useState(false);
  const [tooltip, setTooltip] = useState<{ permission: string; position: { x: number; y: number } } | null>(null);
  
  // Toggle with keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setDebugMode(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Add debug styles when active
  useEffect(() => {
    if (debugMode) {
      const style = document.createElement('style');
      style.id = 'permission-debug-styles';
      style.textContent = `
        [data-permission] {
          outline: 2px dashed #10b981 !important;
          outline-offset: 2px;
        }
        [data-permission]:hover {
          outline: 2px solid #10b981 !important;
          background-color: rgba(16, 185, 129, 0.1) !important;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.getElementById('permission-debug-styles')?.remove();
      };
    }
  }, [debugMode]);
  
  // Track hover on permission elements
  useEffect(() => {
    if (!debugMode) return;
    
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const permElement = target.closest('[data-permission]') as HTMLElement;
      
      if (permElement) {
        const permission = permElement.getAttribute('data-permission');
        if (permission) {
          setTooltip({
            permission,
            position: { x: e.clientX, y: e.clientY },
          });
        }
      } else {
        setTooltip(null);
      }
    };
    
    document.addEventListener('mouseover', handleMouseOver);
    return () => document.removeEventListener('mouseover', handleMouseOver);
  }, [debugMode]);
  
  const toggleDebugMode = useCallback(() => {
    setDebugMode(prev => !prev);
  }, []);
  
  const showPermission = useCallback((permission: string, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    setTooltip({
      permission,
      position: { x: rect.left, y: rect.top },
    });
  }, []);
  
  const hidePermission = useCallback(() => {
    setTooltip(null);
  }, []);
  
  return (
    <DebugContext.Provider value={{ debugMode, toggleDebugMode, showPermission, hidePermission }}>
      {children}
      <DebugIndicator active={debugMode} />
      {tooltip && <PermissionTooltip {...tooltip} />}
    </DebugContext.Provider>
  );
}

export function useDebugMode() {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error('useDebugMode must be used within PermissionDebugProvider');
  }
  return context;
}

/**
 * HOC to add data-permission attribute for debug mode
 */
export function withPermissionDebug<P extends object>(
  Component: React.ComponentType<P>,
  permission: string
) {
  return function WrappedComponent(props: P) {
    const { debugMode } = useDebugMode();
    
    return (
      <div data-permission={debugMode ? permission : undefined}>
        <Component {...props} />
      </div>
    );
  };
}

export default PermissionDebugProvider;
