import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approvalApi } from '../services/approval';
import { Approval } from '../types';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import toast from 'react-hot-toast';
import { Loader2, CheckCircle, XCircle, RotateCcw } from 'lucide-react';

const ApprovalQueue = () => {
  const queryClient = useQueryClient();
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [remarks, setRemarks] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'return' | 'reject'>('approve');
  const remarksRef = useRef<HTMLTextAreaElement>(null);

  const { data: approvals, isLoading } = useQuery({
    queryKey: ['approvals', 'queue'],
    queryFn: approvalApi.getQueue,
  });

  const approveMutation = useMutation({
    mutationFn: approvalApi.approve,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals', 'queue'] });
      toast.success('Approval submitted successfully!');
      setSelectedApproval(null);
      setRemarks('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to approve');
    },
  });

  const returnMutation = useMutation({
    mutationFn: (id: string) => approvalApi.return(id, { remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals', 'queue'] });
      toast.success('Request returned to employee');
      setSelectedApproval(null);
      setRemarks('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to return');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => approvalApi.reject(id, { remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals', 'queue'] });
      toast.success('Request rejected');
      setSelectedApproval(null);
      setRemarks('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to reject');
    },
  });

  // Focus remarks textarea when return/reject is selected
  useEffect(() => {
    if (selectedApproval && (actionType === 'return' || actionType === 'reject')) {
      setTimeout(() => remarksRef.current?.focus(), 100);
    }
  }, [selectedApproval, actionType]);

  // ESC to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedApproval) {
        setSelectedApproval(null);
        setRemarks('');
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedApproval]);

  const handleAction = () => {
    if (!selectedApproval) return;

    if ((actionType === 'return' || actionType === 'reject') && !remarks.trim()) {
      toast.error('Remarks are required for this action');
      return;
    }

    switch (actionType) {
      case 'approve':
        approveMutation.mutate(selectedApproval.id);
        break;
      case 'return':
        returnMutation.mutate(selectedApproval.id);
        break;
      case 'reject':
        rejectMutation.mutate(selectedApproval.id);
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Approval Queue</h1>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                </div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Approval Queue</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Review and act on pending travel request approvals
        </p>
      </div>

      {/* Approvals List */}
      {approvals?.length === 0 ? (
        <EmptyState
          icon={<CheckCircle className="w-6 h-6 text-green-500" />}
          title="All caught up!"
          description="No pending approvals to review"
        />
      ) : (
        <div className="space-y-3">
          {approvals?.map((approval) => (
            <div
              key={approval.id}
              className="card p-4 sm:p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedApproval(approval);
                setActionType('approve');
                setRemarks('');
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedApproval(approval);
                  setActionType('approve');
                  setRemarks('');
                }
              }}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Travel Request: {approval.travel_request_id}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Level {approval.level} Approval
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="warning">Pending</Badge>
                  <span className="text-sm text-primary-600 dark:text-primary-400 font-medium hidden sm:inline">
                    Review →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approval Modal */}
      {selectedApproval && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex min-h-full items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity"
              onClick={() => { setSelectedApproval(null); setRemarks(''); }}
              aria-hidden="true"
            />

            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>

            {/* Modal panel */}
            <div className="relative inline-block transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white" id="modal-title">
                  Review Approval
                </h3>
              </div>

              <div className="px-6 py-5 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Travel Request</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{selectedApproval.travel_request_id}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Level</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">Level {selectedApproval.level}</p>
                  </div>
                </div>

                {/* Action Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Select Action</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'approve' as const, label: 'Approve', icon: <CheckCircle className="w-4 h-4" />, color: 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300', activeColor: 'ring-2 ring-green-500' },
                      { value: 'return' as const, label: 'Return', icon: <RotateCcw className="w-4 h-4" />, color: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300', activeColor: 'ring-2 ring-yellow-500' },
                      { value: 'reject' as const, label: 'Reject', icon: <XCircle className="w-4 h-4" />, color: 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300', activeColor: 'ring-2 ring-red-500' },
                    ].map(({ value, label, icon, color, activeColor }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setActionType(value)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                          actionType === value
                            ? `${color} ${activeColor}`
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        {icon}
                        <span className="text-sm font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Remarks */}
                {(actionType === 'return' || actionType === 'reject') && (
                  <div>
                    <label htmlFor="remarks" className="label">
                      Remarks {actionType === 'return' && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                      ref={remarksRef}
                      id="remarks"
                      rows={3}
                      className="input mt-1"
                      placeholder={`Enter reason for ${actionType}ing...`}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setSelectedApproval(null); setRemarks(''); }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAction}
                  disabled={approveMutation.isPending || returnMutation.isPending || rejectMutation.isPending}
                  className={`px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                    actionType === 'approve'
                      ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                      : actionType === 'return'
                      ? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
                      : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  }`}
                >
                  {(approveMutation.isPending || returnMutation.isPending || rejectMutation.isPending) ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    actionType === 'approve' ? 'Approve' : actionType === 'return' ? 'Return' : 'Reject'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalQueue;
