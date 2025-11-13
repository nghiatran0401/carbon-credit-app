"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select";
import { apiPost } from "@/lib/api";

const forests = [
	{ id: 1, name: "Cần Giờ Forest" },
	{ id: 2, name: "Bạch Mã Forest" },
	{ id: 3, name: "Cát Tiên Forest" },
];

export default function UploadAssetsPage() {
	const { user } = useAuth();
	const [carbonCreditAmount, setCarbonCreditAmount] = useState("");
	const [forestName, setForestName] = useState("");
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState("");
	const [error, setError] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");
		setSuccess("");
		try {
			if (!user) throw new Error("User not authenticated");
			if (!carbonCreditAmount || !forestName) throw new Error("All fields required");
			await apiPost("/api/upload-assets", {
				userId: user.id,
				carbonCreditAmount: Number(carbonCreditAmount),
				forestName: forestName,
			});
			setSuccess("Asset uploaded successfully!");
			setCarbonCreditAmount("");
			setForestName("");
		} catch (err: any) {
			setError(err.message || "Failed to upload asset");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
			<h1 className="text-2xl font-bold mb-6">Upload Forest Asset</h1>
			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<Label htmlFor="carbonCreditAmount">Carbon Credit Amount</Label>
					<Input
						id="carbonCreditAmount"
						type="number"
						min={1}
						value={carbonCreditAmount}
						onChange={e => setCarbonCreditAmount(e.target.value)}
						required
					/>
				</div>
				<div>
					<Label htmlFor="forest">Forest Origin</Label>
					<Select value={forestName} onValueChange={setForestName} required>
						<SelectTrigger id="forest">
							<SelectValue placeholder="Select a forest" />
						</SelectTrigger>
						<SelectContent>
							{forests.map(forest => (
								<SelectItem key={forest.id} value={forest.name}>
									{forest.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<Button type="submit" disabled={loading}>
					{loading ? "Uploading..." : "Upload"}
				</Button>
				{success && <div className="text-green-600 mt-2">{success}</div>}
				{error && <div className="text-red-600 mt-2">{error}</div>}
			</form>
		</div>
	);
}
