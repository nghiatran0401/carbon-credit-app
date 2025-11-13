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
	const [transactionHash, setTransactionHash] = useState("");
	const [tokenId, setTokenId] = useState<number | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");
		setSuccess("");
		setTransactionHash("");
		setTokenId(null);
		try {
			if (!user) throw new Error("User not authenticated");
			if (!carbonCreditAmount || !forestName) throw new Error("All fields required");
			const result: any = await apiPost("/api/upload-assets", {
				userId: user.email,
				carbonCreditAmount: Number(carbonCreditAmount),
				forestName: forestName,
			});
			
			if (result.blockchainWarning) {
				setError(result.blockchainWarning);
			} else if (result.blockchain) {
				setSuccess("Asset uploaded successfully!");
				setTransactionHash(result.blockchain.transactionHash);
				setTokenId(result.blockchain.tokenId);
			} else {
				setSuccess("Asset uploaded successfully!");
			}
			
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
				{success && (
					<div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
						<p className="text-green-600 font-semibold">{success}</p>
						{transactionHash && (
							<div className="mt-2 text-sm">
								<p className="text-gray-700">
									<span className="font-medium">Transaction Hash:</span>
								</p>
								<p className="text-gray-600 break-all font-mono text-xs mt-1">
									{transactionHash}
								</p>
							</div>
						)}
						{tokenId !== null && (
							<p className="text-gray-700 text-sm mt-2">
								<span className="font-medium">Token ID:</span> {tokenId}
							</p>
						)}
					</div>
				)}
				{error && <div className="text-red-600 mt-2">{error}</div>}
			</form>
		</div>
	);
}
