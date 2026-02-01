import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import PolicyCrudTable from '../../components/settings/PolicyCrudTable';
import { useTranslation } from '../../hooks/useTranslation';
import { withPermission } from '../../utils/withPermission';

function AlertsSettingsPage() {
  const { t } = useTranslation();

  return (
    <MainLayout>
      <Head>
        <title>{t('settingsAdmin.pages.alerts.title')} - SLMS</title>
      </Head>

      <PolicyCrudTable
        titleKey="settingsAdmin.pages.alerts.title"
        subtitleKey="settingsAdmin.pages.alerts.subtitle"
        viewPermission={'system_policies:view'}
        managePermissions={{
          create: 'system_policies:create',
          edit: 'system_policies:edit',
          delete: 'system_policies:delete',
        }}
        filters={{ category: 'alerts' }}
      />
    </MainLayout>
  );
}

export default withPermission('system_policies:view', AlertsSettingsPage);

const __LEGACY_ALERTS_SETTINGS_PAGE = `

          recipients: [{ type: 'role', value: 'Warehouse Manager' }],
          is_active: true,
          cooldown_minutes: 60,
          last_triggered: '2024-01-15T14:00:00Z',
          trigger_count: 28,
          created_at: '2024-01-03T00:00:00Z',
        },
        {
          id: 4,
          name: 'System Error Alert',
          name_ar: 'تنبيه خطأ النظام',
          description: 'Critical system error notification',
          event_type: 'system_error',
          severity: 'critical',
          channels: ['email', 'sms'],
          recipients: [{ type: 'email', value: 'admin@slms.com' }, { type: 'email', value: 'support@slms.com' }],
          is_active: false,
          cooldown_minutes: 5,
          trigger_count: 3,
          created_at: '2024-01-04T00:00:00Z',
        },
      ]);
    } catch (error) {
      showToast(t('common.fetchError') || 'Failed to fetch alerts', 'error');
    } finally {
      setLoading(false);
    }
  };

      setHistory([
        {
          id: 101,
          rule_id: 1,
          rule_name: 'Shipment Delay Alert',
          rule_name_ar: 'تنبيه تأخر الشحنة',
          event_type: 'shipment_delayed',
          severity: 'warning',
          status: 'sent',
          channel: 'in_app',
          message: 'Shipment SHP-1028 delayed more than 24 hours.',
          triggered_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        },
        {
          id: 102,
          rule_id: 2,
          rule_name: 'Invoice Overdue Alert',
          rule_name_ar: 'تنبيه فاتورة متأخرة',
          event_type: 'invoice_overdue',
          severity: 'critical',
          status: 'sent',
          channel: 'email',
          message: 'Invoice INV-778 is overdue by 14 days.',
          triggered_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
        },
        {
          id: 103,
          rule_id: 3,
          rule_name: 'Low Inventory Alert',
          rule_name_ar: 'تنبيه انخفاض المخزون',
          event_type: 'low_inventory',
          severity: 'warning',
          status: 'suppressed',
          channel: 'in_app',
          message: 'Item ITM-445 below threshold; suppressed due to cooldown.',
          triggered_at: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
        },
        {
          id: 104,
          rule_id: 1,
          rule_name: 'Shipment Delay Alert',
          rule_name_ar: 'تنبيه تأخر الشحنة',
          event_type: 'shipment_delayed',
          severity: 'warning',
          status: 'failed',
          channel: 'email',
          message: 'Email delivery failed (demo).',
          triggered_at: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
        },
      ]);

  const handleOpenModal = (alert?: AlertRule) => {
    if (alert) {
      setSelectedAlert(alert);
      setFormData({
        name: alert.name,

  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return history
      .filter((h) => {
        if (!q) return true;
        return (
          h.rule_name.toLowerCase().includes(q) ||
          h.rule_name_ar.toLowerCase().includes(q) ||
          h.event_type.toLowerCase().includes(q) ||
          h.status.toLowerCase().includes(q) ||
          h.channel.toLowerCase().includes(q) ||
          h.message.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime());
  }, [history, historySearch]);

  const severityBadge = (severity: AlertHistoryItem['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      default:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    }
  };

  const statusBadge = (status: AlertHistoryItem['status']) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'failed':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
    }
  };
        name_ar: alert.name_ar,
        description: alert.description || '',
        event_type: alert.event_type,
        condition: alert.condition || '',
        severity: alert.severity,
        channels: alert.channels,
        cooldown_minutes: alert.cooldown_minutes,
        is_active: alert.is_active,
      });
    } else {
      setSelectedAlert(null);
      setFormData({
        name: '',
        name_ar: '',
        description: '',
        event_type: 'shipment_delayed',
        condition: '',
        severity: 'warning',
        channels: ['in_app', 'email'],
        cooldown_minutes: 60,
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveAlert = async () => {
    try {
      showToast(t('common.saveSuccess') || 'Alert saved successfully', 'success');
      setIsModalOpen(false);
      fetchAlerts();
    } catch (error) {
      showToast(t('common.error') || 'Failed to save alert', 'error');
    }
  };

  const handleDeleteAlert = async () => {
    if (!selectedAlert) return;
    try {
      setAlerts(prev => prev.filter(a => a.id !== selectedAlert.id));
      showToast(t('common.deleteSuccess') || 'Alert deleted successfully', 'success');
    } catch (error) {
      showToast(t('common.error') || 'Failed to delete alert', 'error');
    } finally {
      setConfirmDeleteOpen(false);
      setSelectedAlert(null);
    }
  };

  const handleToggleActive = (alert: AlertRule) => {
    setAlerts(prev => prev.map(a => 
      a.id === alert.id ? { ...a, is_active: !a.is_active } : a
    ));
    showToast(t('common.updated') || 'Status updated', 'success');
  };

  const toggleChannel = (channel: 'email' | 'sms' | 'push' | 'in_app') => {
    setFormData(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel]
    }));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'info': return <CheckCircleIcon className="w-5 h-5 text-blue-500" />;
      case 'warning': return <ExclamationCircleIcon className="w-5 h-5 text-yellow-500" />;
      case 'critical': return <ExclamationCircleIcon className="w-5 h-5 text-red-500" />;
      default: return null;
    }
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('alerts.title') || 'Alerts'} | SLMS</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
              <BellAlertIcon className="w-8 h-8 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {t('alerts.title') || 'Alerts'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('alerts.subtitle') || 'Configure and manage system alerts'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button onClick={() => handleOpenModal()} disabled={!canManage}>
              <PlusIcon className="w-5 h-5 me-2" />
              {t('alerts.createRule') || 'Create Alert Rule'}
            </Button>
            <Button variant="secondary" onClick={fetchAlerts} disabled={loading}>
              <ArrowPathIcon className={clsx('w-5 h-5', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{alerts.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('alerts.totalRules') || 'Total Rules'}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-2xl font-bold text-green-600">{alerts.filter(a => a.is_active).length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('alerts.active') || 'Active'}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-2xl font-bold text-red-600">{alerts.filter(a => a.severity === 'critical').length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('alerts.critical') || 'Critical'}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-2xl font-bold text-blue-600">{alerts.reduce((acc, a) => acc + a.trigger_count, 0)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('alerts.triggered') || 'Times Triggered'}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('rules')}
                className={clsx(
                  'px-6 py-4 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'rules'
                    ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                )}
              >
                {t('alerts.rules') || 'Alert Rules'}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={clsx(
                  'px-6 py-4 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'history'
                    ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                )}
              >
                {t('alerts.history') || 'Alert History'}
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'rules' && (
              <>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="text-center py-12">
                    <BellAlertIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">{t('alerts.noRules') || 'No alert rules configured'}</p>
                    <Button className="mt-4" onClick={() => handleOpenModal()}>
                      {t('alerts.createFirst') || 'Create your first alert'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={clsx(
                          'p-4 rounded-lg border-2 transition-colors',
                          alert.is_active
                            ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                            : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700/50 opacity-60'
                        )}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className={clsx(
                              'p-2 rounded-lg',
                              alert.severity === 'critical' ? 'bg-red-100 dark:bg-red-900/30' :
                              alert.severity === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                              'bg-blue-100 dark:bg-blue-900/30'
                            )}>
                              {getSeverityIcon(alert.severity)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-gray-900 dark:text-white">
                                  {locale === 'ar' ? alert.name_ar : alert.name}
                                </h3>
                                <span className={clsx('px-2 py-0.5 text-xs rounded-full', getSeverityColor(alert.severity))}>
                                  {alert.severity}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {alert.description}
                              </p>
                              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                                <span>{eventTypes.find(e => e.value === alert.event_type)?.label}</span>
                                <span className="flex items-center gap-1">
                                  <ClockIcon className="w-3 h-3" />
                                  {alert.cooldown_minutes} min cooldown
                                </span>
                                <span>{alert.trigger_count} {t('alerts.triggers') || 'triggers'}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              {alert.channels.map((channel) => {
                                const ch = channels.find(c => c.value === channel);
                                return ch ? (
                                  <div key={channel} className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded" title={ch.label}>
                                    <ch.icon className="w-4 h-4 text-gray-500" />
                                  </div>
                                ) : null;
                              })}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleActive(alert)}
                                disabled={!canManage}
                                className={clsx(
                                  'p-2 rounded-lg transition-colors',
                                  alert.is_active
                                    ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-700'
                                )}
                              >
                                {alert.is_active ? <PlayIcon className="w-4 h-4" /> : <StopIcon className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => handleOpenModal(alert)}
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => { setSelectedAlert(alert); setConfirmDeleteOpen(true); }}
                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        {alert.last_triggered && (
                          <p className="text-xs text-gray-400 mt-2">
                            {t('alerts.lastTriggered') || 'Last triggered'}: {new Date(alert.last_triggered).toLocaleString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                  <div className="flex-1">
                    <Input
                      label={t('alerts.searchHistory') || (locale === 'ar' ? 'بحث في السجل' : 'Search history')}
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder={t('alerts.searchPlaceholder') || (locale === 'ar' ? 'ابحث بالاسم/الحدث/الحالة...' : 'Search by name/event/status...')}
                    />
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {t('alerts.historyCount') || (locale === 'ar' ? 'عدد السجلات' : 'Records')}: {filteredHistory.length}
                  </div>
                </div>

                {filteredHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      {t('alerts.noHistory') || (locale === 'ar' ? 'لا توجد سجلات حالياً' : 'No history records yet')}
                    </p>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {t('alerts.triggeredAt') || (locale === 'ar' ? 'وقت التنفيذ' : 'Triggered At')}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {t('alerts.rule') || (locale === 'ar' ? 'القاعدة' : 'Rule')}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {t('alerts.eventType') || (locale === 'ar' ? 'نوع الحدث' : 'Event')}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {t('alerts.severity') || (locale === 'ar' ? 'الأهمية' : 'Severity')}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {t('alerts.status') || (locale === 'ar' ? 'الحالة' : 'Status')}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {t('alerts.channel') || (locale === 'ar' ? 'القناة' : 'Channel')}
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {t('common.actions') || (locale === 'ar' ? 'إجراءات' : 'Actions')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredHistory.map((h) => (
                          <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                              {new Date(h.triggered_at).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                              {locale === 'ar' ? h.rule_name_ar : h.rule_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                              {eventTypes.find((e) => e.value === h.event_type)?.label || h.event_type}
                            </td>
                            <td className="px-4 py-3">
                              <span className={clsx('inline-flex px-2 py-1 rounded-full text-xs font-medium', severityBadge(h.severity))}>
                                {h.severity}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={clsx('inline-flex px-2 py-1 rounded-full text-xs font-medium', statusBadge(h.status))}>
                                {h.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{h.channel}</td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setSelectedHistory(h);
                                  setHistoryDetailsOpen(true);
                                }}
                              >
                                {t('common.view') || (locale === 'ar' ? 'عرض' : 'View')}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={historyDetailsOpen}
        onClose={() => setHistoryDetailsOpen(false)}
        title={t('alerts.historyDetails') || (locale === 'ar' ? 'تفاصيل السجل' : 'History Details')}
        size="md"
      >
        {selectedHistory && (
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('alerts.rule') || (locale === 'ar' ? 'القاعدة' : 'Rule')}</p>
              <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selectedHistory.rule_name_ar : selectedHistory.rule_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('alerts.triggeredAt') || (locale === 'ar' ? 'وقت التنفيذ' : 'Triggered At')}</p>
              <p className="font-medium text-gray-900 dark:text-white">{new Date(selectedHistory.triggered_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('alerts.eventType') || (locale === 'ar' ? 'نوع الحدث' : 'Event')}</p>
              <p className="font-medium text-gray-900 dark:text-white">{eventTypes.find((e) => e.value === selectedHistory.event_type)?.label || selectedHistory.event_type}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={clsx('inline-flex px-2 py-1 rounded-full text-xs font-medium', severityBadge(selectedHistory.severity))}>
                {selectedHistory.severity}
              </span>
              <span className={clsx('inline-flex px-2 py-1 rounded-full text-xs font-medium', statusBadge(selectedHistory.status))}>
                {selectedHistory.status}
              </span>
              <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                {selectedHistory.channel}
              </span>
            </div>
            <div className="pt-2 border-t dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('alerts.message') || (locale === 'ar' ? 'الرسالة' : 'Message')}</p>
              <p className="text-gray-900 dark:text-white">{selectedHistory.message}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Alert Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedAlert 
          ? t('alerts.editRule') || 'Edit Alert Rule' 
          : t('alerts.createRule') || 'Create Alert Rule'
        }
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t('alerts.nameEn') || 'Name (English)'}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label={t('alerts.nameAr') || 'Name (Arabic)'}
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              dir="rtl"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('alerts.description') || 'Description'}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('alerts.eventType') || 'Event Type'}
              </label>
              <select
                value={formData.event_type}
                onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
              >
                {eventTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('alerts.severity') || 'Severity'}
              </label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
              >
                <option value="info">{t('alerts.info') || 'Info'}</option>
                <option value="warning">{t('alerts.warning') || 'Warning'}</option>
                <option value="critical">{t('alerts.critical') || 'Critical'}</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('alerts.condition') || 'Condition (Optional)'}
            </label>
            <Input
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              placeholder="e.g., amount > 10000"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('alerts.channels') || 'Notification Channels'}
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {channels.map((channel) => (
                <label
                  key={channel.value}
                  className={clsx(
                    'flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors',
                    formData.channels.includes(channel.value as any)
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={formData.channels.includes(channel.value as any)}
                    onChange={() => toggleChannel(channel.value as any)}
                    className="sr-only"
                  />
                  <channel.icon className={clsx(
                    'w-5 h-5',
                    formData.channels.includes(channel.value as any)
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-gray-400'
                  )} />
                  <span className="text-sm">{channel.label}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('alerts.cooldown') || 'Cooldown (Minutes)'}
              </label>
              <Input
                type="number"
                value={formData.cooldown_minutes}
                onChange={(e) => setFormData({ ...formData, cooldown_minutes: Number(e.target.value) })}
                min={0}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('alerts.cooldownDesc') || 'Minimum time between repeated alerts'}
              </p>
            </div>
            
            <div className="flex items-center gap-3 mt-8">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-5 h-5 text-rose-600 rounded"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
                {t('alerts.activateImmediately') || 'Activate immediately'}
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleSaveAlert}>
              {t('common.save') || 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteAlert}
        title={t('alerts.deleteRule') || 'Delete Alert Rule'}
        message={t('alerts.deleteConfirm') || 'Are you sure you want to delete this alert rule? This action cannot be undone.'}
        confirmText={t('common.delete') || 'Delete'}
        variant="danger"
      />
    </MainLayout>
  );
}

`;
