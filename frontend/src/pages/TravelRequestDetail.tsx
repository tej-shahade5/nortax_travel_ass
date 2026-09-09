import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { travelRequestApi } from '../services/travelRequest';
import { claimApi } from '../services/claim';
import { receiptApi } from '../services/receipt';
import type { Receipt as ReceiptType } from '../types';
import { adminApi } from '../services/admin';
import { useAuth } from '../contexts/AuthContext';
import { Breadcrumb } from '../components/Breadcrumb';
import { Badge, getStatusVariant, getCategoryVariant } from '../components/ui/Badge';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Send,
  FileText,
  Calendar,
  MapPin,
  IndianRupee,
  Receipt,
  CheckCircle,
  Clock,
  Copy,
  Upload,
  Loader2,
  Mail,
  Trash2,
  Edit2,
  Save,
  X,
} from 'lucide-react';

const TravelRequestDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ category: string; amount: string; attendee_names: string; attendee_org: string }>({ category: '', amount: '', attendee_names: '', attendee_org: '' });

  const { data: travelRequest, isLoading } = useQuery({
    queryKey: ['travelRequest', id],
    queryFn: () => travelRequestApi.get(id!),
    enabled: !!id,
  });

  const { data: receipts = [] } = useQuery<ReceiptType[]>({
    queryKey: ['receipts', travelRequest?.id],
    queryFn: () => receiptApi.list(travelRequest!.id),
    enabled: !!travelRequest?.id,
  });

  const submitMutation = useMutation({
    mutationFn: travelRequestApi.submit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travelRequest', id] });
      toast.success('Travel request submitted for approval!');
      setShowSubmitModal(false);
    },
    onError: (error: any) => toast.error(error.response?.data?.detail || 'Failed to submit'),
  });

  const generateClaimMutation = useMutation({
    mutationFn: claimApi.generate,
    onSuccess: (data) => {
      toast.success('Claim generated successfully!');
      navigate(`/claims/${data.id}`);
    },
    onError: (error: any) => toast.error(error.response?.data?.detail || 'Failed to generate claim'),
  });

  const updateReceiptMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => receiptApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts', travelRequest?.id] });
      toast.success('Receipt updated!');
      setEditingReceipt(null);
    },
    onError: () => toast.error('Failed to update receipt'),
  });

  const deleteReceiptMutation = useMutation({
    mutationFn: receiptApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts', travelRequest?.id] });
      queryClient.invalidateQueries({ queryKey: ['travelRequest', id] });
      toast.success('Receipt marked as noise');
    },
    onError: () => toast.error('Failed to delete receipt'),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !travelRequest) return;

    setUploading(true);
    try {
      const result = await adminApi.batchIngestEmails(travelRequest.id, Array.from(files));
      toast.success(`${result.success_count} email(s) processed!${result.error_count > 0 ? ` ${result.error_count} failed` : ''}`);
      queryClient.invalidateQueries({ queryKey: ['receipts', travelRequest.id] });
      queryClient.invalidateQueries({ queryKey: ['travelRequest', id] });
    } catch (error) {
      toast.error('Failed to process emails');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const startEdit = (receipt: ReceiptType) => {
    setEditingReceipt(receipt.id);
    setEditData({
      category: receipt.category || 'other',
      amount: String(receipt.amount || ''),
      attendee_names: receipt.attendee_names || '',
      attendee_org: receipt.attendee_org || '',
    });
  };

  const saveEdit = (receiptId: string) => {
    updateReceiptMutation.mutate({
      id: receiptId,
      data: {
        category: editData.category,
        amount: parseFloat(editData.amount) || 0,
        attendee_names: editData.attendee_names || undefined,
        attendee_org: editData.attendee_org || undefined,
      },
    });
  };

  const copyId = () => {
    navigator.clipboard.writeText(travelRequest?.travel_request_id || '');
    toast.success('Travel Request ID copied!');
  };

  if (isLoading) return <DashboardSkeleton />;
  if (!travelRequest) return <div className="text-center py-12 text-gray-500 dark:text-gray-400">Travel request not found</div>;

  const isOwner = employee?.emp_code === travelRequest.employee_id;
  const isAdmin = employee?.role === 'Admin';
  const canSubmit = isOwner && travelRequest.status === 'draft';
  const canUploadEmails = isOwner && ['draft', 'submitted', 'approved'].includes(travelRequest.status);
  const canGenerateClaim = isOwner && ['approved', 'advance_disbursed'].includes(travelRequest.status);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Travel Requests', to: isAdmin ? '/admin/travel-requests' : '/travel-requests' },
        { label: travelRequest.travel_request_id },
      ]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{travelRequest.travel_request_id}</h1>
            <button onClick={copyId} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" aria-label="Copy ID">
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Created by {travelRequest.employee_name} ({travelRequest.employee_id})
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canSubmit && (
            <button onClick={() => setShowSubmitModal(true)} disabled={submitMutation.isPending} className="btn-primary">
              <Send className="w-4 h-4 mr-1.5" /> Submit for Approval
            </button>
          )}
          {canGenerateClaim && (
            <button onClick={() => setShowClaimModal(true)} disabled={generateClaimMutation.isPending} className="btn-success">
              <FileText className="w-4 h-4 mr-1.5" /> Generate Claim
            </button>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Status:</span>
          <Badge variant={getStatusVariant(travelRequest.status)} className="text-sm px-3 py-1">
            {travelRequest.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Travel Details */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-gray-400" /> Travel Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DetailItem label="Purpose" value={travelRequest.purpose} />
          <DetailItem label="Destination" value={`${travelRequest.destination} (${travelRequest.city_tier})`} />
          <DetailItem label="Travel Dates" value={<span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{travelRequest.start_date} to {travelRequest.end_date}</span>} />
          <DetailItem label="Estimated Amount" value={<span className="flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" />{travelRequest.estimated_amount.toLocaleString()}</span>} />
          <DetailItem label="Advance Requested" value={<span className="flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" />{travelRequest.advance_requested.toLocaleString()}</span>} />
          <DetailItem label="Receipts" value={<span className="flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5" />{receipts.length} receipts</span>} />
        </div>
      </div>

      {/* EMAIL UPLOAD — This is where it belongs */}
      {canUploadEmails && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Mail className="w-5 h-5 text-gray-400" /> Upload Email Receipts
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Upload .eml files from your email. Receipts will be extracted automatically (Uber, MakeMyTrip, hotels, dinner bills).
          </p>
          <label className="cursor-pointer inline-flex items-center btn-secondary">
            {uploading ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Processing...</>
            ) : (
              <><Upload className="w-4 h-4 mr-1.5" /> Select .eml files</>
            )}
            <input type="file" accept=".eml" multiple onChange={handleFileUpload} disabled={uploading} className="hidden" />
          </label>
        </div>
      )}

      {/* RECEIPT LIST — View, Edit, Delete */}
      {receipts.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-gray-400" /> Extracted Receipts ({receipts.length})
            </h2>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Category</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Merchant</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Source</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Attendees</th>
                  {isOwner && <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {receipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="table-cell">
                      {editingReceipt === receipt.id ? (
                        <select value={editData.category} onChange={(e) => setEditData({ ...editData, category: e.target.value })} className="select text-xs py-1 px-2">
                          <option value="lodging">Lodging</option>
                          <option value="meals">Meals</option>
                          <option value="local_conveyance">Local Conveyance</option>
                          <option value="business_entertainment">Business Entertainment</option>
                          <option value="air_travel">Air Travel</option>
                          <option value="other">Other</option>
                        </select>
                      ) : (
                        <Badge variant={getCategoryVariant(receipt.category || 'other')}>{(receipt.category || 'other').replace('_', ' ')}</Badge>
                      )}
                    </td>
                    <td className="table-cell text-sm text-gray-900 dark:text-gray-100">{receipt.merchant || '—'}</td>
                    <td className="table-cell">
                      {editingReceipt === receipt.id ? (
                        <input type="number" value={editData.amount} onChange={(e) => setEditData({ ...editData, amount: e.target.value })} className="input text-xs py-1 px-2 w-24" />
                      ) : (
                        <span className="font-medium text-gray-900 dark:text-gray-100">{receipt.amount != null ? `₹${receipt.amount.toLocaleString()}` : '—'}</span>
                      )}
                    </td>
                    <td className="table-cell text-sm text-gray-700 dark:text-gray-300">{receipt.receipt_date || '—'}</td>
                    <td className="table-cell text-xs text-gray-500 dark:text-gray-400">{receipt.source_email_id ? 'Email' : 'Manual'}</td>
                    <td className="table-cell">
                      {editingReceipt === receipt.id && editData.category === 'business_entertainment' ? (
                        <div className="space-y-1">
                          <input type="text" value={editData.attendee_names} onChange={(e) => setEditData({ ...editData, attendee_names: e.target.value })} placeholder="Names" className="input text-xs py-1 px-2 w-32" />
                          <input type="text" value={editData.attendee_org} onChange={(e) => setEditData({ ...editData, attendee_org: e.target.value })} placeholder="Organization" className="input text-xs py-1 px-2 w-32" />
                        </div>
                      ) : receipt.category === 'business_entertainment' ? (
                        <span className="text-xs text-gray-600 dark:text-gray-300">
                          {receipt.attendee_names ? `${receipt.attendee_names}${receipt.attendee_org ? ` (${receipt.attendee_org})` : ''}` : <span className="text-red-500 italic">Required</span>}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    {isOwner && (
                      <td className="table-cell">
                        {editingReceipt === receipt.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => saveEdit(receipt.id)} className="p-1 text-green-600 hover:text-green-700"><Save className="w-4 h-4" /></button>
                            <button onClick={() => setEditingReceipt(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button onClick={() => startEdit(receipt)} className="p-1 text-gray-400 hover:text-primary-600"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => { if (confirm('Mark this receipt as noise?')) deleteReceiptMutation.mutate(receipt.id); }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
            {receipts.map((receipt) => (
              <div key={receipt.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant={getCategoryVariant(receipt.category || 'other')}>{(receipt.category || 'other').replace('_', ' ')}</Badge>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{receipt.amount != null ? `₹${receipt.amount.toLocaleString()}` : '—'}</span>
                </div>
                {receipt.merchant && <p className="text-sm text-gray-600 dark:text-gray-300">{receipt.merchant}</p>}
                {receipt.receipt_date && <p className="text-xs text-gray-500 dark:text-gray-400">{receipt.receipt_date}</p>}
                {receipt.category === 'business_entertainment' && (
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    Attendees: {receipt.attendee_names ? `${receipt.attendee_names}${receipt.attendee_org ? ` (${receipt.attendee_org})` : ''}` : <span className="text-red-500 italic">Required (policy 3.5)</span>}
                  </p>
                )}
                {isOwner && (
                  <div className="flex items-center gap-2 pt-1">
                    <button onClick={() => startEdit(receipt)} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">Edit</button>
                    <button onClick={() => { if (confirm('Mark as noise?')) deleteReceiptMutation.mutate(receipt.id); }} className="text-xs text-red-600 dark:text-red-400 hover:underline">Remove</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advance */}
      {travelRequest.advance && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-gray-400" /> Advance
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailItem label="Reference" value={travelRequest.advance.reference} />
            <DetailItem label="Amount" value={`₹${travelRequest.advance.amount.toLocaleString()}`} />
            <DetailItem label="Status" value={travelRequest.advance.status} />
            <DetailItem label="Disbursed At" value={travelRequest.advance.disbursed_at ? new Date(travelRequest.advance.disbursed_at).toLocaleDateString() : 'N/A'} />
          </div>
        </div>
      )}

      {/* Approval History */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-gray-400" /> Approval History
        </h2>
        {travelRequest.approvals.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No approvals yet</p>
        ) : (
          <div className="space-y-3">
            {travelRequest.approvals.map((approval) => (
              <div key={approval.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/30">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Level {approval.level} — {approval.approver_name || approval.approver_id}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {approval.decided_at ? new Date(approval.decided_at).toLocaleString() : 'Pending'}
                    </p>
                  </div>
                  <Badge variant={getStatusVariant(approval.status)}>{approval.status}</Badge>
                </div>
                {approval.remarks && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 rounded p-2">{approval.remarks}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Claim */}
      {travelRequest.claim && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-400" /> Claim
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <DetailItem label="Total Claimed" value={`₹${travelRequest.claim.total_claimed.toLocaleString()}`} />
            <DetailItem label="Advance Adjusted" value={`₹${travelRequest.claim.advance_adjusted.toLocaleString()}`} />
            <DetailItem label="Net Payable" value={<span className="text-primary-600 dark:text-primary-400 font-semibold">₹{travelRequest.claim.net_payable.toLocaleString()}</span>} />
          </div>
          <div className="mt-4">
            <button onClick={() => navigate(`/claims/${travelRequest.claim!.id}`)} className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 text-sm font-medium transition-colors">
              View Claim Details →
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <ConfirmModal isOpen={showSubmitModal} onClose={() => setShowSubmitModal(false)} onConfirm={() => submitMutation.mutate(travelRequest.id)} title="Submit for Approval" message="This will submit your travel request for approval. Continue?" confirmLabel="Submit Request" loading={submitMutation.isPending} />
      <ConfirmModal isOpen={showClaimModal} onClose={() => setShowClaimModal(false)} onConfirm={() => generateClaimMutation.mutate(travelRequest.id)} title="Generate Claim" message="This will generate a claim from your uploaded receipts. Continue?" confirmLabel="Generate Claim" loading={generateClaimMutation.isPending} />
    </div>
  );
};

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{value}</dd>
    </div>
  );
}

export default TravelRequestDetail;
