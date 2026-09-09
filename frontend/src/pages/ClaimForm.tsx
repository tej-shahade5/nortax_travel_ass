import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { claimApi } from '../services/claim';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import { Breadcrumb } from '../components/Breadcrumb';
import { Badge, getStatusVariant, getCategoryVariant } from '../components/ui/Badge';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import {
  Send,
  CheckCircle,
  IndianRupee,
  FileText,
  CreditCard,
} from 'lucide-react';

const ClaimForm = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  const { data: claim, isLoading } = useQuery({
    queryKey: ['claim', id],
    queryFn: () => claimApi.get(id!),
    enabled: !!id,
  });

  const submitMutation = useMutation({
    mutationFn: claimApi.submit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', id] });
      toast.success('Claim submitted successfully!');
      setShowSubmitModal(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to submit claim');
    },
  });

  const financeVerifyMutation = useMutation({
    mutationFn: claimApi.financeVerify,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', id] });
      toast.success('Claim verified and payment scheduled!');
      setShowVerifyModal(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to verify claim');
    },
  });

  if (isLoading) return <DashboardSkeleton />;
  if (!claim) return <div className="text-center py-12 text-gray-500 dark:text-gray-400">Claim not found</div>;

  const isOwner = employee?.emp_code === claim.employee_id;
  const isAdmin = employee?.role === 'Admin';
  const canSubmit = isOwner && claim.status === 'draft';
  const canVerify = isAdmin && claim.status === 'submitted';

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Claims' },
        { label: `Claim ${claim.id.slice(0, 8)}...` },
      ]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Claim Details</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Travel Request: {claim.travel_request_id_ref || claim.travel_request_id}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canSubmit && (
            <button
              onClick={() => setShowSubmitModal(true)}
              disabled={submitMutation.isPending}
              className="btn-primary"
            >
              <Send className="w-4 h-4 mr-1.5" />
              Submit Claim
            </button>
          )}
          {canVerify && (
            <button
              onClick={() => setShowVerifyModal(true)}
              disabled={financeVerifyMutation.isPending}
              className="btn-success"
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Verify & Schedule Payment
            </button>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Status:</span>
          <Badge variant={getStatusVariant(claim.status)} className="text-sm px-3 py-1">
            {claim.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Claim Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Claimed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{claim.total_claimed.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Advance Adjusted</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{claim.advance_adjusted.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Net Payable</p>
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">₹{claim.net_payable.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-400" />
            Line Items
          </h2>
        </div>

        {claim.lines.length === 0 ? (
          <EmptyState
            title="No line items yet"
            description="Upload .eml files above to extract receipts"
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                    <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Merchant</th>
                    <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Claimed</th>
                    <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Allowed</th>
                    <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Disallowed</th>
                    <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {claim.lines.map((line) => (
                    <tr key={line.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="table-cell">
                        <Badge variant={getCategoryVariant(line.category)}>
                          {line.category.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="table-cell text-gray-900 dark:text-gray-100">{line.receipt?.merchant || '—'}</td>
                      <td className="table-cell font-medium text-gray-900 dark:text-gray-100">₹{line.claimed_amount.toLocaleString()}</td>
                      <td className="table-cell text-gray-900 dark:text-gray-100">₹{line.allowed_amount.toLocaleString()}</td>
                      <td className="table-cell">
                        {line.disallowed_amount > 0 ? (
                          <span className="text-red-600 dark:text-red-400 font-medium">₹{line.disallowed_amount.toLocaleString()}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="table-cell text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate">{line.disallow_reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {claim.lines.map((line) => (
                <div key={line.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={getCategoryVariant(line.category)}>
                      {line.category.replace('_', ' ')}
                    </Badge>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">₹{line.claimed_amount.toLocaleString()}</span>
                  </div>
                  {line.receipt?.merchant && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">{line.receipt.merchant}</p>
                  )}
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Allowed: ₹{line.allowed_amount.toLocaleString()}</span>
                    {line.disallowed_amount > 0 && (
                      <span className="text-red-600 dark:text-red-400">Disallowed: ₹{line.disallowed_amount.toLocaleString()}</span>
                    )}
                  </div>
                  {line.disallow_reason && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">{line.disallow_reason}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Payment Info */}
      {claim.payment_run_date && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gray-400" />
            Payment
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment Run Date</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{claim.payment_run_date}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</dt>
              <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">₹{claim.net_payable.toLocaleString()}</dd>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ConfirmModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onConfirm={() => submitMutation.mutate(claim.id)}
        title="Submit Claim"
        message="This will submit your claim for Finance verification. You won't be able to make changes after submission. Continue?"
        confirmLabel="Submit Claim"
        loading={submitMutation.isPending}
      />

      <ConfirmModal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        onConfirm={() => financeVerifyMutation.mutate(claim.id)}
        title="Verify & Schedule Payment"
        message="This will verify the claim and schedule it for the next payment run (10th or 25th). Continue?"
        confirmLabel="Verify & Schedule"
        loading={financeVerifyMutation.isPending}
      />
    </div>
  );
};

export default ClaimForm;
