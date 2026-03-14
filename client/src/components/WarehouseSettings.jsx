import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const WarehouseSettings = ({ onBack }) => {
    const [formData, setFormData] = useState({
        name: '',
        shortCode: '',
        address: ''
    });
    const [saved, setSaved] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setSaved(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/warehouse', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            } else {
                alert('Error saving warehouse');
            }
        } catch (err) {
            console.error('Error:', err);
            alert('Error saving warehouse');
        }
    };

    return (
        <div className="flex-1 bg-[#0a0f1c] overflow-y-auto">
            {/* Page Header */}
            <div className="bg-[#162032] border-b border-[#27354f] p-6">
                <h1 className="text-3xl font-bold text-white">Warehouse</h1>
            </div>

            {/* Form Container */}
            <div className="max-w-2xl mx-auto p-8">
                <form onSubmit={handleSave} className="space-y-8">
                    {/* Name Field */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300">Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="e.g., Main Warehouse"
                            className="w-full bg-transparent border-0 border-b border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:border-b-2 px-0 py-2 transition-colors text-lg"
                            required
                        />
                    </div>

                    {/* Short Code Field */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300">Short Code</label>
                        <input
                            type="text"
                            name="shortCode"
                            value={formData.shortCode}
                            onChange={handleChange}
                            placeholder="e.g., WH (used as prefix for reference numbers)"
                            className="w-full bg-transparent border-0 border-b border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:border-b-2 px-0 py-2 transition-colors text-lg uppercase"
                            required
                            maxLength="3"
                        />
                        <p className="text-xs text-slate-500 mt-1">Max 3 characters. This will be used as prefix (e.g., WH/IN/0001)</p>
                    </div>

                    {/* Address Field */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300">Address</label>
                        <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            placeholder="e.g., 123 Warehouse Lane, Industrial Zone"
                            className="w-full bg-transparent border-0 border-b border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:border-b-2 px-0 py-2 transition-colors text-lg"
                            required
                        />
                    </div>

                    {/* Save Button */}
                    <div className="pt-8">
                        <button
                            type="submit"
                            className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200"
                        >
                            Save Warehouse
                        </button>
                        {saved && (
                            <p className="text-green-400 text-sm mt-4">✓ Warehouse saved successfully</p>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default WarehouseSettings;
