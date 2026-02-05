/**
 * 🏗️ PROJECT DROPDOWN COMPONENT
 * ==============================
 * Dropdown for selecting projects with real-time API integration
 * 
 * Features:
 * ✅ Real-time project fetching
 * ✅ AR/EN support
 * ✅ Loading states
 * ✅ Active projects only
 */

import { useState, useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import clsx from 'clsx';

interface Project {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  status?: string;
  is_active?: boolean;
}

interface ProjectDropdownProps {
  value: number | string;
  onChange: (projectId: number | null) => void;
  companyId: number;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  allowNull?: boolean;
}

export default function ProjectDropdown({
  value,
  onChange,
  companyId,
  label,
  required = false,
  error,
  disabled = false,
  allowNull = true,
}: ProjectDropdownProps) {
  const { locale } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`/api/finance/projects?company_id=${companyId}&status=active`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const result = await response.json();
          setProjects(result.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
      fetchProjects();
    }
  }, [companyId]);

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        disabled={disabled || loading}
        className={clsx(
          'w-full px-4 py-3 border rounded-lg',
          'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed',
          'dark:bg-gray-800 dark:border-gray-600 dark:text-white',
          error ? 'border-red-500' : 'border-gray-300'
        )}
      >
        <option value="">
          {loading
            ? (locale === 'ar' ? 'جاري التحميل...' : 'Loading...')
            : (locale === 'ar' ? 'اختر المشروع' : 'Select Project')}
        </option>
        {allowNull && (
          <option value="">{locale === 'ar' ? 'بدون مشروع' : 'No Project'}</option>
        )}
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.code} - {locale === 'ar' && project.name_ar ? project.name_ar : project.name}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
