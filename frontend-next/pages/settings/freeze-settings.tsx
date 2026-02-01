export { default } from './freeze';

const __LEGACY_FREEZE_SETTINGS_PAGE = `
        {
          id: 1,
          name: 'Q4 2023',
          start_date: '2023-10-01',
          end_date: '2023-12-31',
          freeze_type: 'full',
          affected_modules: ['invoices', 'expenses', 'payments', 'journal_entries'],
          is_frozen: true,
          frozen_by: 'admin@slms.com',
          frozen_at: '2024-01-05T10:00:00Z',
          reason: 'Year-end closing',
        },
        {
          id: 2,
          name: 'Q1 2024',
          start_date: '2024-01-01',
          end_date: '2024-03-31',
          freeze_type: 'partial',
          affected_modules: ['invoices', 'journal_entries'],
          is_frozen: false,
        },
        {
          id: 3,
          name: 'January 2024',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          freeze_type: 'full',
          affected_modules: ['invoices', 'expenses', 'payments', 'journal_entries', 'shipments'],
          is_frozen: true,
          frozen_by: 'admin@slms.com',
          frozen_at: '2024-02-05T10:00:00Z',
          reason: 'Monthly closing',
        },
      ]);
    } catch (error) {
      showToast(t('common.fetchError') || 'Failed to fetch data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = <K extends keyof FreezeSettings>(key: K, value: FreezeSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      showToast(t('common.saveSuccess') || 'Settings saved successfully', 'success');
      setHasChanges(false);
    } catch (error) {
      showToast(t('common.error') || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenModal = (period?: FreezePeriod) => {
    if (period) {
      setSelectedPeriod(period);
      setFormData({
        name: period.name,
        start_date: period.start_date,
        end_date: period.end_date,
        freeze_type: period.freeze_type,
        affected_modules: period.affected_modules,
        reason: period.reason || '',
      });
    } else {
      setSelectedPeriod(null);
      setFormData({
        name: '',
        start_date: '',
        end_date: '',
        freeze_type: 'full',
        affected_modules: modules.map(m => m.value),
        reason: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSavePeriod = async () => {
    try {
      showToast(t('common.saveSuccess') || 'Period saved successfully', 'success');
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      showToast(t('common.error') || 'Failed to save period', 'error');
    }
  };

  const handleFreeze = async () => {
    if (!selectedPeriod) return;
    try {
      setPeriods(prev => prev.map(p => 
        p.id === selectedPeriod.id 
          ? { ...p, is_frozen: true, frozen_at: new Date().toISOString(), frozen_by: 'Current User' }
          : p
      ));
      showToast(t('freeze.freezeSuccess') || 'Period frozen successfully', 'success');
    } catch (error) {
      showToast(t('common.error') || 'Failed to freeze period', 'error');
    } finally {
      setConfirmFreezeOpen(false);
      setSelectedPeriod(null);
    }
  };

  const handleUnfreeze = async () => {
    if (!selectedPeriod) return;
    try {
      setPeriods(prev => prev.map(p => 
        p.id === selectedPeriod.id 
          ? { ...p, is_frozen: false, frozen_at: undefined, frozen_by: undefined }
          : p
      ));
      showToast(t('freeze.unfreezeSuccess') || 'Period unfrozen successfully', 'success');
    } catch (error) {
      showToast(t('common.error') || 'Failed to unfreeze period', 'error');
    } finally {
      setConfirmUnfreezeOpen(false);
      setSelectedPeriod(null);
    }
  };

  const toggleModule = (moduleValue: string) => {
    setFormData(prev => ({
      ...prev,
      affected_modules: prev.affected_modules.includes(moduleValue)
        ? prev.affected_modules.filter(m => m !== moduleValue)
        : [...prev.affected_modules, moduleValue]
    }));
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('freeze.title') || 'Freeze Settings'} | SLMS</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
              <LockClosedIcon className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {t('freeze.title') || 'Freeze Settings'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('freeze.subtitle') || 'Manage data freeze periods and accounting periods'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Button onClick={handleSaveSettings} loading={saving} disabled={!canManage}>
                <CheckIcon className="w-5 h-5 me-2" />
                {t('common.saveChanges') || 'Save Changes'}
              </Button>
            )}
            <Button onClick={() => handleOpenModal()} disabled={!canManage}>
              <PlusIcon className="w-5 h-5 me-2" />
              {t('freeze.addPeriod') || 'Add Period'}
            </Button>
            <Button variant="secondary" onClick={fetchData} disabled={loading}>
              <ArrowPathIcon className={clsx('w-5 h-5', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Settings Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {t('freeze.autoFreezeSettings') || 'Auto-Freeze Settings'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {t('freeze.enableAutoFreeze') || 'Enable Auto-Freeze'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('freeze.autoFreezeDesc') || 'Automatically freeze periods after closing'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.auto_freeze_enabled}
                  onChange={(e) => handleSettingChange('auto_freeze_enabled', e.target.checked)}
                  disabled={!canManage}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 dark:peer-focus:ring-cyan-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-cyan-600"></div>
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('freeze.freezeAfterDays') || 'Freeze After (Days)'}
              </label>
              <select
                value={settings.auto_freeze_after_days}
                onChange={(e) => handleSettingChange('auto_freeze_after_days', Number(e.target.value))}
                disabled={!canManage || !settings.auto_freeze_enabled}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
              >
                <option value={7}>7 {t('common.days') || 'days'}</option>
                <option value={14}>14 {t('common.days') || 'days'}</option>
                <option value={30}>30 {t('common.days') || 'days'}</option>
                <option value={60}>60 {t('common.days') || 'days'}</option>
                <option value={90}>90 {t('common.days') || 'days'}</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('freeze.notifyBeforeDays') || 'Notify Before (Days)'}
              </label>
              <select
                value={settings.notify_before_freeze_days}
                onChange={(e) => handleSettingChange('notify_before_freeze_days', Number(e.target.value))}
                disabled={!canManage || !settings.auto_freeze_enabled}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
              >
                <option value={3}>3 {t('common.days') || 'days'}</option>
                <option value={7}>7 {t('common.days') || 'days'}</option>
                <option value={14}>14 {t('common.days') || 'days'}</option>
              </select>
            </div>
          </div>
          
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="require_approval"
                checked={settings.require_approval_to_unfreeze}
                onChange={(e) => handleSettingChange('require_approval_to_unfreeze', e.target.checked)}
                disabled={!canManage}
                className="w-5 h-5 text-cyan-600 rounded"
              />
              <label htmlFor="require_approval" className="text-sm text-gray-700 dark:text-gray-300">
                {t('freeze.requireApproval') || 'Require approval to unfreeze periods'}
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="super_admin_bypass"
                checked={settings.allow_super_admin_bypass}
                onChange={(e) => handleSettingChange('allow_super_admin_bypass', e.target.checked)}
                disabled={!canManage}
                className="w-5 h-5 text-cyan-600 rounded"
              />
              <label htmlFor="super_admin_bypass" className="text-sm text-gray-700 dark:text-gray-300">
                {t('freeze.superAdminBypass') || 'Allow super admin to bypass freeze restrictions'}
              </label>
            </div>
          </div>
        </div>

        {/* Periods List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('freeze.periods') || 'Freeze Periods'}
            </h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">{t('common.loading') || 'Loading...'}</p>
            </div>
          ) : periods.length === 0 ? (
            <div className="p-8 text-center">
              <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">{t('freeze.noPeriods') || 'No freeze periods defined'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('freeze.period') || 'Period'}</th>
                    <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('freeze.dateRange') || 'Date Range'}</th>
                    <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('freeze.type') || 'Type'}</th>
                    <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('freeze.modules') || 'Modules'}</th>
                    <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('freeze.status') || 'Status'}</th>
                    <th className="px-6 py-3 text-end text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('common.actions') || 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {periods.map((period) => (
                    <tr key={period.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 dark:text-white">{period.name}</p>
                        {period.reason && (
                          <p className="text-xs text-gray-500 mt-1">{period.reason}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-gray-400" />
                          {new Date(period.start_date).toLocaleDateString()} - {new Date(period.end_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={clsx(
                          'px-2 py-1 text-xs font-medium rounded-full',
                          period.freeze_type === 'full'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        )}>
                          {period.freeze_type === 'full' ? t('freeze.full') || 'Full' : t('freeze.partial') || 'Partial'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {period.affected_modules.slice(0, 3).map((mod) => (
                            <span key={mod} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">
                              {modules.find(m => m.value === mod)?.label || mod}
                            </span>
                          ))}
                          {period.affected_modules.length > 3 && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">
                              +{period.affected_modules.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {period.is_frozen ? (
                            <>
                              <LockClosedIcon className="w-4 h-4 text-cyan-600" />
                              <span className="text-sm text-cyan-600 dark:text-cyan-400 font-medium">
                                {t('freeze.frozen') || 'Frozen'}
                              </span>
                            </>
                          ) : (
                            <>
                              <LockOpenIcon className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-500">
                                {t('freeze.open') || 'Open'}
                              </span>
                            </>
                          )}
                        </div>
                        {period.frozen_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            {period.frozen_by} • {new Date(period.frozen_at).toLocaleDateString()}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-end">
                        <div className="flex items-center justify-end gap-2">
                          {period.is_frozen ? (
                            <button
                              onClick={() => { setSelectedPeriod(period); setConfirmUnfreezeOpen(true); }}
                              disabled={!canManage}
                              className="px-3 py-1.5 text-sm bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <LockOpenIcon className="w-4 h-4 inline me-1" />
                              {t('freeze.unfreeze') || 'Unfreeze'}
                            </button>
                          ) : (
                            <button
                              onClick={() => { setSelectedPeriod(period); setConfirmFreezeOpen(true); }}
                              disabled={!canManage}
                              className="px-3 py-1.5 text-sm bg-cyan-100 text-cyan-600 hover:bg-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <LockClosedIcon className="w-4 h-4 inline me-1" />
                              {t('freeze.freeze') || 'Freeze'}
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenModal(period)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                          >
                            <CalendarIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Warning Info */}
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-900 dark:text-amber-100">
                {t('freeze.warningTitle') || 'Important: Data Freeze'}
              </h4>
              <ul className="text-sm text-amber-800 dark:text-amber-200 mt-2 space-y-1 list-disc list-inside">
                <li>{t('freeze.warning1') || 'Frozen periods prevent any modifications to affected data'}</li>
                <li>{t('freeze.warning2') || 'Unfreezing a period may require additional approvals'}</li>
                <li>{t('freeze.warning3') || 'Consider your audit requirements before unfreezing'}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Period Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedPeriod 
          ? t('freeze.editPeriod') || 'Edit Period' 
          : t('freeze.addPeriod') || 'Add Period'
        }
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label={t('freeze.periodName') || 'Period Name'}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Q1 2024"
            required
          />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('freeze.startDate') || 'Start Date'}
              </label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('freeze.endDate') || 'End Date'}
              </label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('freeze.freezeType') || 'Freeze Type'}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="full"
                  checked={formData.freeze_type === 'full'}
                  onChange={(e) => setFormData({ ...formData, freeze_type: 'full' })}
                  className="w-4 h-4 text-cyan-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('freeze.full') || 'Full Freeze'}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="partial"
                  checked={formData.freeze_type === 'partial'}
                  onChange={(e) => setFormData({ ...formData, freeze_type: 'partial' })}
                  className="w-4 h-4 text-cyan-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('freeze.partial') || 'Partial Freeze'}</span>
              </label>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('freeze.affectedModules') || 'Affected Modules'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {modules.map((mod) => (
                <label key={mod.value} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <input
                    type="checkbox"
                    checked={formData.affected_modules.includes(mod.value)}
                    onChange={() => toggleModule(mod.value)}
                    className="w-4 h-4 text-cyan-600 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{mod.label}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('freeze.reason') || 'Reason (Optional)'}
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
              placeholder={t('freeze.reasonPlaceholder') || 'e.g., Year-end closing'}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleSavePeriod}>
              {t('common.save') || 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Freeze */}
      <ConfirmDialog
        isOpen={confirmFreezeOpen}
        onClose={() => setConfirmFreezeOpen(false)}
        onConfirm={handleFreeze}
        title={t('freeze.confirmFreeze') || 'Freeze Period'}
        message={t('freeze.confirmFreezeMessage') || 'Are you sure you want to freeze this period? Users will not be able to modify data within this period.'}
        confirmText={t('freeze.freeze') || 'Freeze'}
        variant="danger"
      />

      {/* Confirm Unfreeze */}
      <ConfirmDialog
        isOpen={confirmUnfreezeOpen}
        onClose={() => setConfirmUnfreezeOpen(false)}
        onConfirm={handleUnfreeze}
        title={t('freeze.confirmUnfreeze') || 'Unfreeze Period'}
        message={t('freeze.confirmUnfreezeMessage') || 'Are you sure you want to unfreeze this period? This may affect your audit trail.'}
        confirmText={t('freeze.unfreeze') || 'Unfreeze'}
      />
    </MainLayout>
  );
}

`;
