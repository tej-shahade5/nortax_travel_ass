import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { travelRequestApi } from '../services/travelRequest';
import { TravelRequestCreate } from '../types';
import { Breadcrumb } from '../components/Breadcrumb';
import { Loader2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const TravelRequestForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<TravelRequestCreate>({
    purpose: '',
    destination: '',
    city_tier: 'Tier 1',
    start_date: '',
    end_date: '',
    estimated_amount: 0,
    advance_requested: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: travelRequestApi.create,
    onSuccess: (data) => {
      toast.success('Travel request created successfully!');
      navigate(`/travel-requests/${data.id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create travel request');
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.purpose.trim()) newErrors.purpose = 'Purpose is required';
    if (!formData.destination.trim()) newErrors.destination = 'Destination is required';
    if (!formData.start_date) newErrors.start_date = 'Start date is required';
    if (!formData.end_date) newErrors.end_date = 'End date is required';
    if (formData.start_date && formData.end_date && formData.end_date < formData.start_date) {
      newErrors.end_date = 'End date must be on or after start date';
    }
    if (formData.estimated_amount <= 0) newErrors.estimated_amount = 'Amount must be greater than 0';
    if (formData.advance_requested < 0) newErrors.advance_requested = 'Advance cannot be negative';
    if (formData.advance_requested > formData.estimated_amount * 0.6) {
      newErrors.advance_requested = 'Advance cannot exceed 60% of estimated amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      createMutation.mutate(formData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'estimated_amount' || name === 'advance_requested' ? parseFloat(value) || 0 : value,
    }));
    // Clear error on change
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const maxAdvance = Math.floor(formData.estimated_amount * 0.6);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Breadcrumb items={[
        { label: 'Travel Requests', to: '/travel-requests' },
        { label: 'New Request' },
      ]} />

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Travel Request</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Submit a new travel request for manager approval
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        {/* Purpose */}
        <div>
          <label htmlFor="purpose" className="label">
            Purpose of Travel <span className="text-red-500">*</span>
          </label>
          <textarea
            id="purpose"
            name="purpose"
            rows={3}
            required
            className={`input mt-1 ${errors.purpose ? 'border-red-500 focus:ring-red-500' : ''}`}
            placeholder="e.g., Customer meeting + site visit for Project Alpha"
            value={formData.purpose}
            onChange={handleChange}
          />
          {errors.purpose && <p className="mt-1 text-sm text-red-500">{errors.purpose}</p>}
        </div>

        {/* Destination & City Tier */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="destination" className="label">
              Destination <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="destination"
              name="destination"
              required
              className={`input mt-1 ${errors.destination ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="e.g., Bengaluru"
              value={formData.destination}
              onChange={handleChange}
            />
            {errors.destination && <p className="mt-1 text-sm text-red-500">{errors.destination}</p>}
          </div>

          <div>
            <label htmlFor="city_tier" className="label">
              City Tier <span className="text-red-500">*</span>
            </label>
            <select
              id="city_tier"
              name="city_tier"
              required
              className="select mt-1"
              value={formData.city_tier}
              onChange={handleChange}
            >
              <option value="Tier 1">Tier 1 (Bengaluru, Mumbai, Delhi, etc.)</option>
              <option value="Tier 2">Tier 2</option>
              <option value="Tier 3">Tier 3 and others</option>
            </select>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="start_date" className="label">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="start_date"
              name="start_date"
              required
              className={`input mt-1 ${errors.start_date ? 'border-red-500 focus:ring-red-500' : ''}`}
              value={formData.start_date}
              onChange={handleChange}
            />
            {errors.start_date && <p className="mt-1 text-sm text-red-500">{errors.start_date}</p>}
          </div>

          <div>
            <label htmlFor="end_date" className="label">
              End Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="end_date"
              name="end_date"
              required
              className={`input mt-1 ${errors.end_date ? 'border-red-500 focus:ring-red-500' : ''}`}
              value={formData.end_date}
              onChange={handleChange}
            />
            {errors.end_date && <p className="mt-1 text-sm text-red-500">{errors.end_date}</p>}
          </div>
        </div>

        {/* Amounts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="estimated_amount" className="label">
              Estimated Amount (INR) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="estimated_amount"
              name="estimated_amount"
              required
              min="0"
              step="0.01"
              className={`input mt-1 ${errors.estimated_amount ? 'border-red-500 focus:ring-red-500' : ''}`}
              value={formData.estimated_amount || ''}
              onChange={handleChange}
            />
            {errors.estimated_amount && <p className="mt-1 text-sm text-red-500">{errors.estimated_amount}</p>}
          </div>

          <div>
            <label htmlFor="advance_requested" className="label">
              Advance Requested (INR)
            </label>
            <input
              type="number"
              id="advance_requested"
              name="advance_requested"
              min="0"
              step="0.01"
              className={`input mt-1 ${errors.advance_requested ? 'border-red-500 focus:ring-red-500' : ''}`}
              value={formData.advance_requested || ''}
              onChange={handleChange}
            />
            {errors.advance_requested ? (
              <p className="mt-1 text-sm text-red-500">{errors.advance_requested}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Max 60% of estimated amount (₹{maxAdvance.toLocaleString()})
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => navigate('/travel-requests')}
            className="btn-secondary"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn-primary"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Request'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TravelRequestForm;
