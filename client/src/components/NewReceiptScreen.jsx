import React, { useState, useEffect } from 'react';
import {
    ChevronLeft, Plus, CheckCircle2, FileDown, X, Trash2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toast } from 'react-toastify';

const API_BASE = 'http://localhost:5000';

const readApiResponse = async (res) => {
    let data = null;
    try {
        data = await res.json();
    } catch {
        data = null;
    }

    if (!res.ok) {
        const message = (typeof data === 'string' ? data : data?.message || data?.error) || 'Request failed';
        throw new Error(message);
    }

    if (!data || typeof data !== 'object') {
        throw new Error('Unexpected server response');
    }

    return data;
};

const NewReceiptScreen = ({ onBack }) => {
    const [dropdowns, setDropdowns] = useState({ products: [], suppliers: [], warehouses: [], users: [] });
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('Draft'); // Draft | Ready | Done
    const [referenceNumber, setReferenceNumber] = useState('—');
    const [form, setForm] = useState({
        supplier_id: '',
        warehouse_id: '',
        responsible_id: '',
        schedule_date: new Date().toISOString().slice(0, 10),
    });
    const [lines, setLines] = useState([{ product_id: '', quantity: '' }]);
    const [validatedLines, setValidatedLines] = useState([]);
    const [generatedData, setGeneratedData] = useState(null);
    const [validating, setValidating] = useState(false);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        const fetchDropdowns = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_BASE}/api/receipts/dropdowns`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await readApiResponse(res);
                setDropdowns(data);
            } catch (err) {
                toast.error(err.message || 'Failed to load dropdowns');
            } finally {
                setLoading(false);
            }
        };
        fetchDropdowns();
    }, []);

    const updateForm = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const addLine = () => setLines((l) => [...l, { product_id: '', quantity: '' }]);

    const updateLine = (idx, k, v) => {
        setLines((l) => {
            const n = [...l];
            n[idx] = { ...n[idx], [k]: v };
            return n;
        });
    };

    const removeLine = (idx) => {
        if (lines.length <= 1) return;
        setLines((l) => l.filter((_, i) => i !== idx));
    };

    const handleValidate = async () => {
        const filtered = lines.filter((l) => l.product_id && l.quantity && parseInt(l.quantity) > 0);
        if (!form.supplier_id || !form.warehouse_id || filtered.length === 0) {
            toast.error('Select supplier, warehouse, and add at least one product with quantity.');
            return;
        }
        setValidating(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/receipts/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    supplier_id: form.supplier_id,
                    warehouse_id: form.warehouse_id,
                    lines: filtered.map((l) => ({ product_id: parseInt(l.product_id), quantity: parseInt(l.quantity) })),
                }),
            });
            const data = await readApiResponse(res);
            if (!Array.isArray(data.lines)) {
                throw new Error('Unexpected validation payload');
            }
            setValidatedLines(data.lines);
            setStatus('Ready');
            toast.success('Receipt validated. Prices fetched.');
        } catch (err) {
            toast.error(err.message || 'Validation failed');
        } finally {
            setValidating(false);
        }
    };

    const handleGenerate = async () => {
        if (validatedLines.length === 0) {
            toast.error('Validate the receipt first.');
            return;
        }
        setGenerating(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/receipts/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    supplier_id: form.supplier_id,
                    warehouse_id: form.warehouse_id,
                    schedule_date: form.schedule_date,
                    received_by: form.responsible_id || null,
                    lines: validatedLines.map((l) => ({
                        product_id: l.product_id,
                        quantity: l.quantity,
                        unit_price: l.unit_price,
                        name: l.name,
                        sku: l.sku,
                        unit: l.unit,
                    })),
                }),
            });
            const data = await readApiResponse(res);
            if (!Array.isArray(data.lines) || !data.reference_number) {
                throw new Error('Unexpected generate payload');
            }
            setGeneratedData(data);
            setReferenceNumber(data.reference_number);
            setStatus('Done');
            toast.success('Receipt generated. Database and ledger updated.');
        } catch (err) {
            toast.error(err.message || 'Generate failed');
        } finally {
            setGenerating(false);
        }
    };

    const handleDownloadPDF = () => {
        if (!generatedData) return;
        const doc = new jsPDF();
        const margin = 20;
        const pageW = doc.internal.pageSize.getWidth();
        let y = margin;

        doc.setFontSize(18);
        doc.text('Receipt', margin, y);
        y += 10;

        doc.setFontSize(10);
        doc.text(`Reference: ${generatedData.reference_number}`, margin, y);
        y += 6;
        doc.text(`Date: ${generatedData.schedule_date}`, margin, y);
        y += 6;
        doc.text(`Responsible: ${generatedData.responsible || '—'}`, margin, y);
        y += 12;

        doc.setFontSize(11);
        doc.text('Supplier Details', margin, y);
        y += 6;
        doc.setFontSize(9);
        const s = generatedData.supplier || {};
        doc.text(`Name: ${s.name || ''}`, margin, y);
        y += 5;
        doc.text(`Contact: ${s.contact_person || ''} | ${s.email || ''} | ${s.phone || ''}`, margin, y);
        y += 5;
        doc.text(`Address: ${s.address || '—'}`, margin, y);
        y += 12;

        doc.setFontSize(11);
        doc.text('Warehouse', margin, y);
        y += 6;
        doc.setFontSize(9);
        const w = generatedData.warehouse || {};
        doc.text(`${w.name || ''} - ${w.location || ''}`, margin, y);
        y += 12;

        doc.setFontSize(11);
        doc.text('Products', margin, y);
        y += 8;

        const colW = [20, 60, 25, 25, 30, 30];
        const headers = ['#', 'Product', 'SKU', 'Qty', 'Unit Price', 'Total'];
        doc.setFont(undefined, 'bold');
        doc.setFontSize(9);
        doc.text(headers[0], margin, y);
        doc.text(headers[1], margin + colW[0], y);
        doc.text(headers[2], margin + colW[0] + colW[1], y);
        doc.text(headers[3], margin + colW[0] + colW[1] + colW[2], y);
        doc.text(headers[4], margin + colW[0] + colW[1] + colW[2] + colW[3], y);
        doc.text(headers[5], margin + colW[0] + colW[1] + colW[2] + colW[3] + colW[4], y);
        y += 6;
        doc.setDrawColor(200);
        doc.line(margin, y, pageW - margin, y);
        y += 6;

        doc.setFont(undefined, 'normal');
        generatedData.lines.forEach((line, i) => {
            if (y > 270) {
                doc.addPage();
                y = margin;
            }
            const lineTotal = (line.quantity * (line.unit_price || 0)).toFixed(2);
            doc.text(String(i + 1), margin, y);
            doc.text(line.name || '', margin + colW[0], y);
            doc.text(line.sku || '', margin + colW[0] + colW[1], y);
            doc.text(String(line.quantity) + ' ' + (line.unit || ''), margin + colW[0] + colW[1] + colW[2], y);
            doc.text(String(line.unit_price || 0), margin + colW[0] + colW[1] + colW[2] + colW[3], y);
            doc.text(lineTotal, margin + colW[0] + colW[1] + colW[2] + colW[3] + colW[4], y);
            y += 6;
        });

        y += 6;
        doc.setDrawColor(200);
        doc.line(margin, y, pageW - margin, y);
        y += 8;
        doc.setFont(undefined, 'bold');
        const grandTotal = Number(generatedData.grand_total) || 0;
        doc.text(`Grand Total: ${grandTotal.toFixed(2)}`, margin + colW[0] + colW[1] + colW[2] + colW[3], y);

        doc.save(`Receipt_${generatedData.reference_number.replace(/\//g, '-')}.pdf`);
        toast.success('PDF downloaded');
    };

    const handleCancel = () => {
        if (status === 'Done') {
            onBack?.();
            return;
        }
        setStatus('Draft');
        setValidatedLines([]);
        setGeneratedData(null);
        setReferenceNumber('—');
        setLines([{ product_id: '', quantity: '' }]);
        toast.info('Receipt reset');
    };

    const handleNewReceipt = () => {
        setStatus('Draft');
        setReferenceNumber('—');
        setValidatedLines([]);
        setGeneratedData(null);
        setLines([{ product_id: '', quantity: '' }]);
        setForm((f) => ({ ...f, supplier_id: '', warehouse_id: '', responsible_id: '' }));
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#0a0f1c]">
                <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            </div>
        );
    }

    const supplier = dropdowns.suppliers.find((s) => String(s.supplier_id) === String(form.supplier_id));
    const warehouse = dropdowns.warehouses.find((w) => String(w.warehouse_id) === String(form.warehouse_id));

    return (
        <div className="flex-1 bg-[#0a0f1c] overflow-y-auto animate-[fade-in_0.5s_ease-out]">
            <div className="sticky top-0 z-30 bg-[#0a0f1c]/80 backdrop-blur-xl border-b border-[#1e293b] px-8 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {onBack && (
                            <button onClick={onBack} className="p-2 rounded-xl bg-[#1e293b]/60 border border-[#334155]/50 text-slate-400 hover:text-white transition-all cursor-pointer">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        )}
                        <button
                            onClick={handleNewReceipt}
                            className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold text-sm hover:bg-emerald-500/30 transition-all cursor-pointer"
                        >
                            New
                        </button>
                        <h2 className="text-xl font-bold text-white">Receipt</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleValidate}
                            disabled={validating || status === 'Done'}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-semibold text-sm hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Validate
                        </button>
                        <button
                            onClick={handleGenerate}
                            disabled={generating || status !== 'Ready'}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold text-sm hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                            Generate Receipt
                        </button>
                        <button
                            onClick={handleDownloadPDF}
                            disabled={!generatedData}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 font-semibold text-sm hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                            <FileDown className="w-4 h-4" />
                            Download PDF
                        </button>
                        <button
                            onClick={handleCancel}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 font-semibold text-sm hover:bg-rose-500/30 transition-all cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                            Cancel
                        </button>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <span className={`font-semibold ${status === 'Draft' ? 'text-amber-400' : status === 'Ready' ? 'text-cyan-400' : 'text-emerald-400'}`}>
                            {status === 'Draft' && 'Draft'}
                            {status === 'Ready' && 'Ready'}
                            {status === 'Done' && 'Done'}
                        </span>
                        <span className="text-slate-500">|</span>
                        <span className="text-slate-400">Draft → Ready → Done</span>
                    </div>
                </div>
            </div>

            <div className="px-8 py-6 max-w-4xl">
                <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-6 space-y-6">
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Reference</p>
                        <p className="text-lg font-mono text-cyan-400">{referenceNumber}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Receive From (Supplier)</label>
                            <select
                                value={form.supplier_id}
                                onChange={(e) => updateForm('supplier_id', e.target.value)}
                                disabled={status === 'Done'}
                                className="w-full px-4 py-2.5 bg-[#1e293b] border border-[#334155] rounded-xl text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 disabled:opacity-60"
                            >
                                <option value="">Select supplier</option>
                                {dropdowns.suppliers.map((s) => (
                                    <option key={s.supplier_id} value={s.supplier_id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                            {supplier && (
                                <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                                    <p>{supplier.contact_person && `Contact: ${supplier.contact_person}`}</p>
                                    <p>{supplier.email}</p>
                                    <p>{supplier.phone}</p>
                                    <p>{supplier.address}</p>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Responsible</label>
                            <select
                                value={form.responsible_id}
                                onChange={(e) => updateForm('responsible_id', e.target.value)}
                                disabled={status === 'Done'}
                                className="w-full px-4 py-2.5 bg-[#1e293b] border border-[#334155] rounded-xl text-white focus:ring-2 focus:ring-cyan-500/50"
                            >
                                <option value="">Select</option>
                                {dropdowns.users.map((u) => (
                                    <option key={u.user_id} value={u.user_id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Schedule Date</label>
                            <input
                                type="date"
                                value={form.schedule_date}
                                onChange={(e) => updateForm('schedule_date', e.target.value)}
                                disabled={status === 'Done'}
                                className="w-full px-4 py-2.5 bg-[#1e293b] border border-[#334155] rounded-xl text-white focus:ring-2 focus:ring-cyan-500/50"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Warehouse (To)</label>
                        <select
                            value={form.warehouse_id}
                            onChange={(e) => updateForm('warehouse_id', e.target.value)}
                            disabled={status === 'Done'}
                            className="w-full px-4 py-2.5 bg-[#1e293b] border border-[#334155] rounded-xl text-white focus:ring-2 focus:ring-cyan-500/50"
                        >
                            <option value="">Select warehouse</option>
                            {dropdowns.warehouses.map((w) => (
                                <option key={w.warehouse_id} value={w.warehouse_id}>
                                    {w.name} — {w.location}
                                </option>
                            ))}
                        </select>
                        {warehouse && <p className="mt-1 text-xs text-slate-500">{warehouse.location}</p>}
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-semibold text-white">Products</h3>
                            {status !== 'Done' && (
                                <button onClick={addLine} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-sm hover:bg-cyan-500/30 cursor-pointer">
                                    <Plus className="w-4 h-4" />
                                    Add Product
                                </button>
                            )}
                        </div>

                        {status === 'Done' && generatedData ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[#334155] text-slate-500 text-left">
                                            <th className="py-3 pr-4">Product</th>
                                            <th className="py-3 pr-4">SKU</th>
                                            <th className="py-3 pr-4">Qty</th>
                                            <th className="py-3 pr-4">Unit Price</th>
                                            <th className="py-3">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {generatedData.lines.map((l, i) => (
                                            <tr key={i} className="border-b border-[#1e293b]">
                                                <td className="py-3 pr-4 text-white">{l.name}</td>
                                                <td className="py-3 pr-4 text-slate-400">{l.sku}</td>
                                                <td className="py-3 pr-4 text-slate-300">{l.quantity} {l.unit}</td>
                                                <td className="py-3 pr-4 text-slate-300">{l.unit_price}</td>
                                                <td className="py-3 text-emerald-400">{(l.quantity * (l.unit_price || 0)).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <p className="mt-4 text-right font-bold text-emerald-400">Grand Total: {(Number(generatedData.grand_total) || 0).toFixed(2)}</p>
                            </div>
                        ) : validatedLines.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[#334155] text-slate-500 text-left">
                                            <th className="py-3 pr-4">Product</th>
                                            <th className="py-3 pr-4">SKU</th>
                                            <th className="py-3 pr-4">Qty</th>
                                            <th className="py-3 pr-4">Unit Price</th>
                                            <th className="py-3">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {validatedLines.map((l, i) => (
                                            <tr key={i} className="border-b border-[#1e293b]">
                                                <td className="py-3 pr-4 text-white">{l.name}</td>
                                                <td className="py-3 pr-4 text-slate-400">{l.sku}</td>
                                                <td className="py-3 pr-4 text-slate-300">{l.quantity} {l.unit}</td>
                                                <td className="py-3 pr-4 text-slate-300">{l.unit_price}</td>
                                                <td className="py-3 text-emerald-400">{(Number(l.line_total) || 0).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <p className="mt-4 text-right font-bold text-emerald-400">Grand Total: {validatedLines.reduce((sum, l) => sum + (Number(l.line_total) || 0), 0).toFixed(2)}</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {lines.map((line, idx) => (
                                    <div key={idx} className="flex items-center gap-4">
                                        <select
                                            value={line.product_id}
                                            onChange={(e) => updateLine(idx, 'product_id', e.target.value)}
                                            className="flex-1 px-4 py-2 bg-[#1e293b] border border-[#334155] rounded-xl text-white"
                                        >
                                            <option value="">Select product</option>
                                            {dropdowns.products.map((p) => (
                                                <option key={p.product_id} value={p.product_id}>
                                                    [{p.sku}] {p.name}
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="Qty"
                                            value={line.quantity}
                                            onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                                            className="w-24 px-4 py-2 bg-[#1e293b] border border-[#334155] rounded-xl text-white"
                                        />
                                        <button onClick={() => removeLine(idx)} className="p-2 text-rose-400 hover:bg-rose-500/20 rounded-lg cursor-pointer">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewReceiptScreen;
