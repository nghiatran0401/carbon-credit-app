"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import useSWR from "swr";
import { Button } from "@/components/ui/button";

export default function ForestsAdmin() {
  const fetcher = (url: string) => apiGet<any[]>(url);
  const { data: forests, error, isLoading, mutate } = useSWR("/api/forests", fetcher);
  const [selectedForest, setSelectedForest] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<any>({ name: "", location: "", type: "", area: "", description: "", status: "Active", lastUpdated: new Date().toISOString().slice(0, 10) });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { toast } = useToast();

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
    setForm({ name: "", location: "", type: "", area: "", description: "", status: "Active", lastUpdated: new Date().toISOString().slice(0, 10) });
    setShowModal(true);
  };
  const openEditModal = (forest: any) => {
    setEditMode(true);
    setForm({ ...forest, lastUpdated: forest.lastUpdated?.slice(0, 10) });
    setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false);
    setFormError(null);
  };
  const handleFormChange = (e: React.ChangeEvent<any>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    // Validation
    if (!form.name || !form.location || !form.type || !form.area || !form.status || !form.lastUpdated || !form.description) {
      setFormError("All fields are required.");
      toast({ title: "Validation", description: "All fields are required.", variant: "info" });
      setFormLoading(false);
      return;
    }
    if (isNaN(Number(form.area)) || Number(form.area) <= 0) {
      setFormError("Area must be a positive number.");
      toast({ title: "Validation", description: "Area must be a positive number.", variant: "info" });
      setFormLoading(false);
      return;
    }
    try {
      if (editMode) {
        await apiPut("/api/forests", { ...form, id: form.id });
        toast({ title: "Forest updated", description: `${form.name} was updated successfully.`, variant: "default" });
      } else {
        await apiPost("/api/forests", form);
        toast({ title: "Forest created", description: `${form.name} was created successfully.`, variant: "default" });
      }
      setShowModal(false);
      mutate(); // Refetch forests
    } catch (err: any) {
      setFormError(err.message);
      toast({ title: "Error", description: err.message, variant: "destructive" });
      console.error("Forest CRUD error:", err);
    } finally {
      setFormLoading(false);
    }
  };
  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this forest? This will also delete all related credits.")) {
      toast({ title: "Delete cancelled", description: "Forest deletion was cancelled.", variant: "warning" });
      return;
    }
    try {
      await apiDelete("/api/forests", { id });
      if (selectedForest && selectedForest.id === id) setSelectedForest(forests[0] || null);
      toast({ title: "Forest deleted", description: `Forest was deleted successfully.`, variant: "default" });
      mutate(); // Refetch forests
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      console.error("Forest delete error:", err);
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={openCreateModal}>Add Forest</Button>
      </div>
      <div className="space-y-2">
        {forests.map((forest) => (
          <div key={forest.id} className="flex items-center justify-between border-b py-2">
            <span onClick={() => setSelectedForest(forest)} className="cursor-pointer hover:underline">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editMode ? "Edit Forest" : "Add Forest"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Name
              </label>
              <Input id="name" name="name" value={form.name} onChange={handleFormChange} placeholder="Name" required />
              <p className="text-xs text-gray-500 mt-1">The official name of the forest.</p>
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-medium mb-1">
                Location
              </label>
              <Input id="location" name="location" value={form.location} onChange={handleFormChange} placeholder="Location" required />
              <p className="text-xs text-gray-500 mt-1">E.g., province, district, or coordinates.</p>
            </div>
            <div>
              <label htmlFor="type" className="block text-sm font-medium mb-1">
                Type
              </label>
              <select id="type" name="type" value={form.type} onChange={handleFormChange} required className="w-full border rounded p-2">
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
              <p className="text-xs text-gray-500 mt-1">Choose the forest's ecological type.</p>
            </div>
            <div>
              <label htmlFor="area" className="block text-sm font-medium mb-1">
                Area (hectares)
              </label>
              <Input id="area" name="area" value={form.area} onChange={handleFormChange} placeholder="Area (hectares)" type="number" min="1" step="any" required />
              <p className="text-xs text-gray-500 mt-1">Total protected area in hectares.</p>
              {formError && formError.toLowerCase().includes("area") && <div className="text-xs text-red-600 mt-1">{formError}</div>}
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium mb-1">
                Status
              </label>
              <select id="status" name="status" value={form.status} onChange={handleFormChange} required className="w-full border rounded p-2">
                <option value="Active">Active</option>
                <option value="Monitoring">Monitoring</option>
                <option value="Inactive">Inactive</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Is the forest actively protected, monitored, or inactive?</p>
            </div>
            <div>
              <label htmlFor="lastUpdated" className="block text-sm font-medium mb-1">
                Last Updated
              </label>
              <Input id="lastUpdated" name="lastUpdated" value={form.lastUpdated} onChange={handleFormChange} type="date" required />
              <p className="text-xs text-gray-500 mt-1">Date of the last update to this record.</p>
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea id="description" name="description" value={form.description} onChange={handleFormChange} placeholder="Description" className="w-full border rounded p-2" required />
              <p className="text-xs text-gray-500 mt-1">Briefly describe the forest, its significance, or unique features.</p>
            </div>
            {formError && !formError.toLowerCase().includes("area") && <div className="text-red-600 text-sm">{formError}</div>}
            <Button type="submit" disabled={formLoading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded shadow">
              {formLoading ? "Saving..." : editMode ? "Update Forest" : "Create Forest"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
