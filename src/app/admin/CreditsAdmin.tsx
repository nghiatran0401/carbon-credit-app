"use client";
import useSWR from "swr";
import { useState } from "react";
import { apiGet, apiDelete } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function CreditsAdmin() {
  const fetcher = (url: string) => apiGet<any[]>(url);
  const { data: credits, error, isLoading, mutate } = useSWR("/api/credits", fetcher);
  const { data: forests } = useSWR("/api/forests", fetcher);
  const [selectedForest, setSelectedForest] = useState<string>("");
  const [selectedCredits, setSelectedCredits] = useState<number[]>([]);

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error.message}</div>;
  if (!credits?.length) return <div className="p-8 text-center">No credits available.</div>;

  const filteredCredits = selectedForest ? credits.filter((c) => c.forestId === Number(selectedForest)) : credits;

  const totalCredits = filteredCredits.reduce((sum, c) => sum + (c.totalCredits || 0), 0);
  const totalValue = filteredCredits.reduce((sum, c) => sum + (c.totalCredits * c.pricePerCredit || 0), 0);

  const handleSelect = (id: number) => {
    setSelectedCredits((prev) => (prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]));
  };

  const handleBulkDelete = async () => {
    if (!window.confirm("Delete selected credits? This cannot be undone.")) return;
    for (const id of selectedCredits) {
      await apiDelete("/api/credits", { id });
    }
    setSelectedCredits([]);
    mutate();
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
            {forests?.map((f: any) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <Button variant="destructive" onClick={handleBulkDelete} disabled={selectedCredits.length === 0}>
          Delete Selected
        </Button>
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
                <td>{credit.totalCredits}</td>
                <td>{credit.availableCredits}</td>
                <td>${credit.pricePerCredit}</td>
                <td>
                  <Button size="sm" variant="outline" disabled>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" disabled>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-8 text-gray-400 text-xs">[Create/Edit Credit functionality coming soon]</div>
    </div>
  );
}
