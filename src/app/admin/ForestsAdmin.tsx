'use client';
import { useEffect, useState, useRef } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { CheckCircle, TreePine, MapPin, Scale, Hexagon, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import type { Forest, CarbonCredit } from '@/types';

// Define a ForestForm type for form state
interface ForestForm {
  id?: number;
  name: string;
  location: string;
  type: string;
  area: string;
  description: string;
  status: string;
  lastUpdated: string;
  initialCreditsToMint: string;
}

export default function ForestsAdmin() {
  const fetcher = (url: string) => apiGet<Forest[]>(url);
  const { data: forests, error, isLoading, mutate } = useSWR('/api/forests', fetcher);
  const [selectedForest, setSelectedForest] = useState<Forest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  // Use ForestForm for form state
  const [form, setForm] = useState<ForestForm>({
    name: '',
    location: '',
    type: '',
    area: '',
    description: '',
    status: 'Active',
    lastUpdated: new Date().toISOString().slice(0, 10),
    initialCreditsToMint: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirmCallbackRef = useRef<(() => void) | null>(null);
  const { toast } = useToast();
  const [successForest, setSuccessForest] = useState<(Forest & { mintedAmount?: number }) | null>(
    null,
  );

  useEffect(() => {
    if (forests && forests.length && !selectedForest) {
      setSelectedForest(forests[0]);
    }
  }, [forests, selectedForest]);

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error.message}</div>;
  if (!forests?.length) return <div className="p-8 text-center">No forest data available.</div>;

  const openCreateModal = () => {
    setEditMode(false);
    setForm({
      name: '',
      location: '',
      type: '',
      area: '',
      description: '',
      status: 'Active',
      lastUpdated: new Date().toISOString().slice(0, 10),
      initialCreditsToMint: '',
    });
    setShowModal(true);
  };
  const openEditModal = (forest: Forest) => {
    setEditMode(true);
    setForm({
      ...forest,
      area: String(forest.area),
      lastUpdated: forest.lastUpdated?.slice(0, 10),
      initialCreditsToMint: '',
    });
    setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false);
    setFormError(null);
  };
  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    // Validation
    if (
      !form.name ||
      !form.location ||
      !form.type ||
      !form.area ||
      !form.status ||
      !form.lastUpdated ||
      !form.description
    ) {
      setFormError('All fields are required.');
      toast({ title: 'Validation', description: 'All fields are required.', variant: 'info' });
      setFormLoading(false);
      return;
    }
    if (isNaN(Number(form.area)) || Number(form.area) <= 0) {
      setFormError('Area must be a positive number.');
      toast({
        title: 'Validation',
        description: 'Area must be a positive number.',
        variant: 'info',
      });
      setFormLoading(false);
      return;
    }

    if (
      form.initialCreditsToMint !== '' &&
      (!Number.isInteger(Number(form.initialCreditsToMint)) ||
        Number(form.initialCreditsToMint) <= 0)
    ) {
      setFormError('Initial credits to mint must be a positive integer.');
      toast({
        title: 'Validation',
        description: 'Initial credits to mint must be a positive integer.',
        variant: 'info',
      });
      setFormLoading(false);
      return;
    }

    if (!editMode && form.status.toLowerCase() === 'active' && form.initialCreditsToMint === '') {
      setFormError('Initial credits to mint is required when status is Active.');
      toast({
        title: 'Validation',
        description:
          'Provide Initial credits to mint so this forest is purchasable in marketplace.',
        variant: 'info',
      });
      setFormLoading(false);
      return;
    }

    try {
      if (editMode) {
        await apiPut('/api/forests', {
          id: form.id,
          name: form.name,
          location: form.location,
          type: form.type,
          area: Number(form.area),
          description: form.description,
          status: form.status,
          lastUpdated: form.lastUpdated,
        });
        toast({
          title: 'Forest updated',
          description: `${form.name} was updated successfully.`,
          variant: 'default',
        });
        setShowModal(false);
        mutate(); // Refetch forests
      } else {
        const result = await apiPost<Forest>('/api/forests', {
          ...form,
          area: Number(form.area),
          initialCreditsToMint:
            form.initialCreditsToMint === '' ? undefined : Number(form.initialCreditsToMint),
        });
        toast({
          title: 'Forest created',
          description: `${form.name} was created successfully.`,
          variant: 'default',
        });
        setShowModal(false);
        setSuccessForest({
          ...result,
          mintedAmount: form.initialCreditsToMint ? Number(form.initialCreditsToMint) : undefined,
        });
        mutate(); // Refetch forests
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Request failed';
      setFormError(message);
      toast({ title: 'Error', description: message, variant: 'destructive' });
      console.error('Forest CRUD error:', err);
    } finally {
      setFormLoading(false);
    }
  };
  const handleDelete = (id: number) => {
    confirmCallbackRef.current = async () => {
      try {
        await apiDelete('/api/forests', { id });
        if (selectedForest && selectedForest.id === id) setSelectedForest(forests?.[0] ?? null);
        toast({
          title: 'Forest deleted',
          description: 'Forest was deleted successfully.',
          variant: 'default',
        });
        mutate();
      } catch (err: unknown) {
        toast({
          title: 'Error',
          description: err instanceof Error ? err.message : 'Delete failed',
          variant: 'destructive',
        });
        console.error('Forest delete error:', err);
      }
    };
    setConfirmOpen(true);
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={openCreateModal}>Add Forest</Button>
      </div>
      <div className="space-y-2">
        {forests.map((forest) => (
          <div key={forest.id} className="flex items-center justify-between border-b py-2">
            <span
              onClick={() => setSelectedForest(forest)}
              className="cursor-pointer hover:underline"
            >
              {forest.name}
            </span>
            <div className="space-x-2">
              <Button size="sm" variant="outline" onClick={() => openEditModal(forest)}>
                Edit
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleDelete(forest.id)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={showModal} onOpenChange={closeModal}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto w-11/12 sm:w-full">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Forest' : 'Add Forest'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Name
              </label>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={handleFormChange}
                placeholder="Name"
                required
              />
              <p className="text-xs text-gray-500 mt-1">The official name of the forest.</p>
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-medium mb-1">
                Location
              </label>
              <Input
                id="location"
                name="location"
                value={form.location}
                onChange={handleFormChange}
                placeholder="Location"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                E.g., province, district, or coordinates.
              </p>
            </div>
            <div>
              <label htmlFor="type" className="block text-sm font-medium mb-1">
                Type
              </label>
              <select
                id="type"
                name="type"
                value={form.type}
                onChange={handleFormChange}
                required
                className="w-full border rounded p-2"
                aria-label="Forest type"
              >
                <option value="">Select type</option>
                <option value="Mangrove">Mangrove</option>
                <option value="Wetland">Wetland</option>
                <option value="Tropical Evergreen">Tropical Evergreen</option>
                <option value="Tropical Montane">Tropical Montane</option>
                <option value="Dry Dipterocarp">Dry Dipterocarp</option>
                <option value="Pine">Pine</option>
                <option value="Mountain">Mountain</option>
                <option value="Other">Other</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Choose the forest&apos;s ecological type.
              </p>
            </div>
            <div>
              <label htmlFor="area" className="block text-sm font-medium mb-1">
                Area (hectares)
              </label>
              <Input
                id="area"
                name="area"
                value={form.area}
                onChange={handleFormChange}
                placeholder="Area (hectares)"
                type="number"
                min="1"
                step="any"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Total protected area in hectares.</p>
              {formError && formError.toLowerCase().includes('area') && (
                <div className="text-xs text-red-600 mt-1">{formError}</div>
              )}
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium mb-1">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleFormChange}
                required
                className="w-full border rounded p-2"
                aria-label="Forest status"
              >
                <option value="Active">Active</option>
                <option value="Monitoring">Monitoring</option>
                <option value="Inactive">Inactive</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Is the forest actively protected, monitored, or inactive?
              </p>
            </div>
            <div>
              <label htmlFor="lastUpdated" className="block text-sm font-medium mb-1">
                Last Updated
              </label>
              <Input
                id="lastUpdated"
                name="lastUpdated"
                value={form.lastUpdated}
                onChange={handleFormChange}
                type="date"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Date of the last update to this record.</p>
            </div>
            <div>
              <label htmlFor="initialCreditsToMint" className="block text-sm font-medium mb-1">
                Initial Credits To Mint (optional)
              </label>
              <Input
                id="initialCreditsToMint"
                name="initialCreditsToMint"
                value={form.initialCreditsToMint}
                onChange={handleFormChange}
                placeholder="e.g. 1000"
                type="number"
                min="1"
                step="1"
                disabled={editMode}
              />
              <p className="text-xs text-gray-500 mt-1">
                Required for Active forests. This amount is listed in marketplace and minted
                on-chain using forest ID as ERC-1155 token ID.
              </p>
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleFormChange}
                placeholder="Description"
                className="w-full border rounded p-2"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Briefly describe the forest, its significance, or unique features.
              </p>
            </div>
            {formError && !formError.toLowerCase().includes('area') && (
              <div className="text-red-600 text-sm">{formError}</div>
            )}
            <Button
              type="submit"
              disabled={formLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded shadow"
            >
              {formLoading ? 'Saving...' : editMode ? 'Update Forest' : 'Create Forest'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) confirmCallbackRef.current = null;
        }}
        title="Delete forest"
        description="Are you sure you want to delete this forest? This will also delete all related credits."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => confirmCallbackRef.current?.()}
      />

      {/* Success Dialog */}
      <Dialog open={!!successForest} onOpenChange={(open) => !open && setSuccessForest(null)}>
        <DialogContent className="sm:max-w-[600px] bg-white border-emerald-100 shadow-xl overflow-hidden p-0">
          <div className="bg-emerald-50/70 p-6 text-center border-b border-emerald-100">
            <div className="mx-auto bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-sm border border-emerald-200">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <DialogTitle className="text-2xl text-emerald-800 mb-1">Forest Created</DialogTitle>
            <p className="text-sm text-emerald-700 font-medium">
              {successForest?.contractAddress && successForest?.mintTxHash
                ? 'Your forest has been successfully created and tokenized on the blockchain.'
                : 'Your forest has been safely saved in the system.'}
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Details */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm flex items-center gap-2 text-gray-800 pb-2 border-b">
                  <TreePine className="h-4 w-4 text-emerald-600" />
                  Forest Identity
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Name</div>
                    <div className="font-semibold text-gray-900">{successForest?.name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">
                      Location & Area
                    </div>
                    <div className="font-medium text-gray-800 flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-gray-400" /> {successForest?.location}
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="flex items-center gap-1">
                        <Scale className="h-3 w-3 text-gray-400" /> {successForest?.area} ha
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">Type</div>
                      <div className="font-medium text-gray-800">{successForest?.type}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">Status</div>
                      <div className="mt-1">
                        <Badge
                          variant={successForest?.status === 'ACTIVE' ? 'default' : 'secondary'}
                          className={
                            successForest?.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ''
                          }
                        >
                          {successForest?.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Blockchain */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm flex items-center gap-2 text-gray-800 pb-2 border-b">
                  <Hexagon className="h-4 w-4 text-indigo-600" />
                  Blockchain Details
                </h3>
                {successForest?.contractAddress && successForest?.mintTxHash ? (
                  <div className="bg-indigo-50/50 p-3 rounded-md border border-indigo-100 text-xs space-y-3 font-mono">
                    <div>
                      <div className="text-indigo-900/60 uppercase font-sans font-semibold mb-1 text-[10px]">
                        Contract Address
                      </div>
                      <div className="break-all tracking-tight text-indigo-950">
                        {successForest.contractAddress}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-indigo-900/60 uppercase font-sans font-semibold mb-1 text-[10px]">
                          Token ID
                        </div>
                        <Badge variant="outline" className="bg-white">
                          {successForest.onChainTokenId}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-indigo-900/60 uppercase font-sans font-semibold mb-1 text-[10px]">
                          Initial Mint
                        </div>
                        <div className="font-bold text-emerald-700">
                          {successForest.mintedAmount} credits
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-indigo-100/50">
                      <a
                        href={
                          successForest.mintChainId === 8453
                            ? `https://etherscan.io/tx/${successForest.mintTxHash}`
                            : `https://sepolia.etherscan.io/tx/${successForest.mintTxHash}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-sans font-medium"
                      >
                        View on Explorer <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs bg-amber-50 rounded-md border border-amber-200 p-3 text-amber-800">
                    <p>This forest is not minted on-chain yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="bg-gray-50 border-t p-4 px-6 flex justify-between items-center sm:justify-between">
            <span className="text-xs text-gray-500">Record successfully created</span>
            <Button
              onClick={() => setSuccessForest(null)}
              className="bg-gray-900 text-white hover:bg-gray-800"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
