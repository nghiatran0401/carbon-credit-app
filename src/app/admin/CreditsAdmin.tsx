"use client";
import useSWR from "swr";
import { useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import type { CarbonCredit, Forest } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface CreditForm {
  id?: number;
  forestId: number;
  vintage: number;
  certification: string;
  totalCredits: number;
  availableCredits: number;
  pricePerCredit: number;
  symbol: string;
}

export default function CreditsAdmin() {
  const fetcher = (url: string) => apiGet<any[]>(url);
  const { data: credits, error, isLoading, mutate } = useSWR("/api/credits", fetcher);
  const { data: forests } = useSWR("/api/forests", fetcher);
  const [selectedForest, setSelectedForest] = useState<string>("");
  const [selectedCredits, setSelectedCredits] = useState<number[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<CreditForm>({
    forestId: 0,
    vintage: new Date().getFullYear(),
    certification: "",
    totalCredits: 0,
    availableCredits: 0,
    pricePerCredit: 0,
    symbol: "tCO₂",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { toast } = useToast();

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error.message}</div>;
  if (!credits?.length) return <div className="p-8 text-center">No credits available.</div>;

  const filteredCredits = selectedForest ? credits.filter((c) => c.forestId === Number(selectedForest)) : credits;

  const totalCredits = filteredCredits.reduce((sum, c) => sum + (c.totalCredits || 0), 0);
  const totalValue = filteredCredits.reduce((sum, c) => sum + (c.totalCredits * c.pricePerCredit || 0), 0);

  const handleSelect = (id: number) => {
    setSelectedCredits((prev) => (prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]));
  };

  const openCreateModal = () => {
    setEditMode(false);
    setForm({
      forestId: 0,
      vintage: new Date().getFullYear(),
      certification: "",
      totalCredits: 0,
      availableCredits: 0,
      pricePerCredit: 0,
      symbol: "tCO₂",
    });
    setShowModal(true);
  };

  const openEditModal = (credit: CarbonCredit) => {
    setEditMode(true);
    setForm({
      id: credit.id,
      forestId: credit.forestId,
      vintage: credit.vintage,
      certification: credit.certification,
      totalCredits: credit.totalCredits,
      availableCredits: credit.availableCredits,
      pricePerCredit: credit.pricePerCredit,
      symbol: credit.symbol || "tCO₂",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormError(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: name === "forestId" || name === "vintage" || name === "totalCredits" || name === "availableCredits" || name === "pricePerCredit" ? Number(value) : value });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    // Validation
    if (!form.forestId || !form.certification || form.totalCredits <= 0 || form.availableCredits <= 0 || form.pricePerCredit <= 0) {
      setFormError("All fields are required and must be positive numbers.");
      toast({ title: "Validation Error", description: "All fields are required and must be positive numbers.", variant: "destructive" });
      setFormLoading(false);
      return;
    }

    if (form.availableCredits > form.totalCredits) {
      setFormError("Available credits cannot exceed total credits.");
      toast({ title: "Validation Error", description: "Available credits cannot exceed total credits.", variant: "destructive" });
      setFormLoading(false);
      return;
    }

    try {
      if (editMode) {
        await apiPut("/api/credits", form);
        toast({ title: "Credit Updated", description: "Carbon credit was updated successfully.", variant: "default" });
      } else {
        await apiPost("/api/credits", form);
        toast({ title: "Credit Created", description: "Carbon credit was created successfully.", variant: "default" });
      }
      setShowModal(false);
      mutate();
    } catch (err: any) {
      setFormError(err.message);
      toast({ title: "Error", description: err.message, variant: "destructive" });
      console.error("Credit CRUD error:", err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this carbon credit? This action cannot be undone.")) {
      return;
    }
    try {
      await apiDelete("/api/credits", { id });
      toast({ title: "Credit Deleted", description: "Carbon credit was deleted successfully.", variant: "default" });
      mutate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      console.error("Credit delete error:", err);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedCredits.length} selected credits? This cannot be undone.`)) return;

    try {
      for (const id of selectedCredits) {
        await apiDelete("/api/credits", { id });
      }
      setSelectedCredits([]);
      toast({ title: "Bulk Delete", description: `${selectedCredits.length} credits were deleted successfully.`, variant: "default" });
      mutate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      console.error("Bulk delete error:", err);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <label htmlFor="forestFilter" className="mr-2 text-sm">
            Filter by Forest:
          </label>
          <select id="forestFilter" value={selectedForest} onChange={(e) => setSelectedForest(e.target.value)} className="border rounded p-1">
            <option value="">All</option>
            {forests?.map((f: Forest) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Button onClick={openCreateModal}>Add Credit</Button>
          <Button variant="destructive" onClick={handleBulkDelete} disabled={selectedCredits.length === 0}>
            Delete Selected ({selectedCredits.length})
          </Button>
        </div>
      </div>
      <div className="mb-4 p-4 bg-gray-100 rounded flex gap-8">
        <div>
          <b>Total Credits:</b> {totalCredits.toLocaleString()}
        </div>
        <div>
          <b>Total Value:</b> ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th></th>
              <th>ID</th>
              <th>Forest</th>
              <th>Vintage</th>
              <th>Certification</th>
              <th>Total Credits</th>
              <th>Available</th>
              <th>Price/Credit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCredits.map((credit) => (
              <tr key={credit.id} className="border-b">
                <td>
                  <input type="checkbox" checked={selectedCredits.includes(credit.id)} onChange={() => handleSelect(credit.id)} />
                </td>
                <td>{credit.id}</td>
                <td>{credit.forest?.name || credit.forestId}</td>
                <td>{credit.vintage}</td>
                <td>{credit.certification}</td>
                <td>{credit.totalCredits.toLocaleString()}</td>
                <td>{credit.availableCredits.toLocaleString()}</td>
                <td>${credit.pricePerCredit.toFixed(2)}</td>
                <td>
                  <Button size="sm" variant="outline" onClick={() => openEditModal(credit)} className="mr-1">
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(credit.id)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={closeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editMode ? "Edit Carbon Credit" : "Add Carbon Credit"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label htmlFor="forestId" className="block text-sm font-medium mb-1">
                Forest
              </label>
              <select id="forestId" name="forestId" value={form.forestId} onChange={handleFormChange} required className="w-full border rounded p-2">
                <option value="">Select Forest</option>
                {forests?.map((f: Forest) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="vintage" className="block text-sm font-medium mb-1">
                Vintage Year
              </label>
              <Input id="vintage" name="vintage" type="number" value={form.vintage} onChange={handleFormChange} min="2000" max={new Date().getFullYear() + 10} required />
            </div>
            <div>
              <label htmlFor="certification" className="block text-sm font-medium mb-1">
                Certification
              </label>
              <Input id="certification" name="certification" value={form.certification} onChange={handleFormChange} placeholder="e.g., VCS, GS, CCB" required />
            </div>
            <div>
              <label htmlFor="totalCredits" className="block text-sm font-medium mb-1">
                Total Credits
              </label>
              <Input id="totalCredits" name="totalCredits" type="number" value={form.totalCredits} onChange={handleFormChange} min="1" required />
            </div>
            <div>
              <label htmlFor="availableCredits" className="block text-sm font-medium mb-1">
                Available Credits
              </label>
              <Input id="availableCredits" name="availableCredits" type="number" value={form.availableCredits} onChange={handleFormChange} min="1" max={form.totalCredits} required />
            </div>
            <div>
              <label htmlFor="pricePerCredit" className="block text-sm font-medium mb-1">
                Price per Credit ($)
              </label>
              <Input id="pricePerCredit" name="pricePerCredit" type="number" value={form.pricePerCredit} onChange={handleFormChange} min="0.01" step="0.01" required />
            </div>
            <div>
              <label htmlFor="symbol" className="block text-sm font-medium mb-1">
                Symbol
              </label>
              <Input id="symbol" name="symbol" value={form.symbol} onChange={handleFormChange} placeholder="e.g., tCO₂" required />
            </div>
            {formError && <div className="text-red-600 text-sm">{formError}</div>}
            <Button type="submit" disabled={formLoading} className="w-full">
              {formLoading ? "Saving..." : editMode ? "Update Credit" : "Create Credit"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
