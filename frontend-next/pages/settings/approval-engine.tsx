import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import PolicyCrudTable from '../../components/settings/PolicyCrudTable';
import { useTranslation } from '../../hooks/useTranslation';
import { withPermission } from '../../utils/withPermission';

function ApprovalEngineSettingsPage() {
  const { t } = useTranslation();

  return (
    <MainLayout>
      <Head>
        <title>{t('settingsAdmin.pages.approvalEngine.title')} - SLMS</title>
      </Head>

      <PolicyCrudTable
        titleKey="settingsAdmin.pages.approvalEngine.title"
        subtitleKey="settingsAdmin.pages.approvalEngine.subtitle"
        viewPermission={'system_policies:view'}
        managePermissions={{
          create: 'system_policies:create',
          edit: 'system_policies:edit',
          delete: 'system_policies:delete',
        }}
        filters={{ category: 'approval_engine' }}
      />
    </MainLayout>
  );
}

export default withPermission('system_policies:view', ApprovalEngineSettingsPage);

const __LEGACY_APPROVAL_ENGINE_PAGE = `

import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import PolicyCrudTable from '../../components/settings/PolicyCrudTable';
import { useTranslation } from '../../hooks/useTranslation';
import { withPermission } from '../../utils/withPermission';

function ApprovalEnginePage() {

          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-2xl font-bold text-amber-600">12</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('approval.pending') || 'Pending Approvals'}</p>
          </div>
        </div>

        {/* Workflows List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">{t('common.loading') || 'Loading...'}</p>
            </div>
          ) : workflows.length === 0 ? (
            <div className="p-8 text-center">
              <CheckBadgeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">{t('approval.noWorkflows') || 'No workflows configured'}</p>
              <Button className="mt-4" onClick={() => handleOpenModal()}>
                {t('approval.createFirst') || 'Create your first workflow'}
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="p-4 md:p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={clsx(
                        'p-3 rounded-lg',
                        workflow.is_active 
                          ? 'bg-green-100 dark:bg-green-900/30' 
                          : 'bg-gray-100 dark:bg-gray-700'
                      )}>
                        <DocumentCheckIcon className={clsx(
                          'w-6 h-6',
                          workflow.is_active 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-gray-400'
                        )} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {locale === 'ar' ? workflow.name_ar : workflow.name}
                          </h3>
                          <span className={clsx(
                            'px-2 py-0.5 text-xs rounded-full',
                            workflow.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          )}>
                            {workflow.is_active ? t('common.active') || 'Active' : t('common.inactive') || 'Inactive'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {workflow.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <DocumentCheckIcon className="w-4 h-4" />
                            {resourceTypes.find(r => r.value === workflow.resource_type)?.label}
                          </span>
                          <span className="flex items-center gap-1">
                            <ArrowsUpDownIcon className="w-4 h-4" />
                            {workflow.steps.length} {t('approval.steps') || 'steps'}
                          </span>
                          {workflow.condition && (
                            <span className="flex items-center gap-1 text-amber-600">
                              <ExclamationCircleIcon className="w-4 h-4" />
                              {t('approval.conditional') || 'Conditional'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(workflow)}
                        disabled={!canManage}
                        className={clsx(
                          'px-3 py-1.5 text-sm rounded-lg transition-colors',
                          workflow.is_active
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                            : 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                        )}
                      >
                        {workflow.is_active ? t('common.deactivate') || 'Deactivate' : t('common.activate') || 'Activate'}
                      </button>
                      <button
                        onClick={() => handleOpenModal(workflow)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setSelectedWorkflow(workflow); setConfirmDeleteOpen(true); }}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Workflow Steps */}
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      {workflow.steps.map((step, index) => (
                        <div key={step.id} className="flex items-center">
                          <div className="flex-shrink-0 px-3 py-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-violet-200 dark:bg-violet-800 text-violet-700 dark:text-violet-300 text-xs flex items-center justify-center font-medium">
                                {step.order}
                              </span>
                              <span className="text-sm font-medium text-violet-700 dark:text-violet-300 whitespace-nowrap">
                                {step.name}
                              </span>
                            </div>
                            <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
                              {step.approver_name}
                            </p>
                          </div>
                          {index < workflow.steps.length - 1 && (
                            <ChevronRightIcon className="w-5 h-5 text-gray-400 mx-2 flex-shrink-0" />
                          )}
                        </div>
                      ))}
                      {canManage && (
                        <button
                          onClick={() => { setSelectedWorkflow(workflow); handleAddStep(); }}
                          className="flex-shrink-0 p-2 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg border-2 border-dashed border-violet-300 dark:border-violet-700"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Workflow Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedWorkflow 
          ? t('approval.editWorkflow') || 'Edit Workflow' 
          : t('approval.createWorkflow') || 'Create Workflow'
        }
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t('approval.nameEn') || 'Name (English)'}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label={t('approval.nameAr') || 'Name (Arabic)'}
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              dir="rtl"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('approval.description') || 'Description'}
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
                {t('approval.resourceType') || 'Resource Type'}
              </label>
              <select
                value={formData.resource_type}
                onChange={(e) => setFormData({ ...formData, resource_type: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
              >
                {resourceTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('approval.condition') || 'Condition (Optional)'}
              </label>
              <Input
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                placeholder="e.g., amount > 10000"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 text-violet-600 rounded"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
              {t('approval.activateImmediately') || 'Activate workflow immediately'}
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleSaveWorkflow}>
              {t('common.save') || 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Step Modal */}
      <Modal
        isOpen={isStepModalOpen}
        onClose={() => setIsStepModalOpen(false)}
        title={editingStep 
          ? t('approval.editStep') || 'Edit Step' 
          : t('approval.addStep') || 'Add Step'
        }
      >
        <div className="space-y-4">
          <Input
            label={t('approval.stepName') || 'Step Name'}
            value={stepData.name}
            onChange={(e) => setStepData({ ...stepData, name: e.target.value })}
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('approval.approverType') || 'Approver Type'}
            </label>
            <select
              value={stepData.approver_type}
              onChange={(e) => setStepData({ ...stepData, approver_type: e.target.value as any })}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
            >
              {approverTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('approval.requiredApprovals') || 'Required Approvals'}
              </label>
              <Input
                type="number"
                value={stepData.required_approvals}
                onChange={(e) => setStepData({ ...stepData, required_approvals: Number(e.target.value) })}
                min={1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('approval.timeout') || 'Timeout (Hours)'}
              </label>
              <Input
                type="number"
                value={stepData.timeout_hours}
                onChange={(e) => setStepData({ ...stepData, timeout_hours: Number(e.target.value) })}
                min={1}
              />
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="can_reject"
                checked={stepData.can_reject}
                onChange={(e) => setStepData({ ...stepData, can_reject: e.target.checked })}
                className="w-5 h-5 text-violet-600 rounded"
              />
              <label htmlFor="can_reject" className="text-sm text-gray-700 dark:text-gray-300">
                {t('approval.canReject') || 'Can reject at this step'}
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="can_delegate"
                checked={stepData.can_delegate}
                onChange={(e) => setStepData({ ...stepData, can_delegate: e.target.checked })}
                className="w-5 h-5 text-violet-600 rounded"
              />
              <label htmlFor="can_delegate" className="text-sm text-gray-700 dark:text-gray-300">
                {t('approval.canDelegate') || 'Can delegate approval'}
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={() => setIsStepModalOpen(false)}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleSaveStep}>
              {t('common.save') || 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteWorkflow}
        title={t('approval.deleteWorkflow') || 'Delete Workflow'}
        message={t('approval.deleteConfirm') || 'Are you sure you want to delete this workflow? This action cannot be undone.'}
        confirmText={t('common.delete') || 'Delete'}
        variant="danger"
      />
    </MainLayout>
  );
}

`;
