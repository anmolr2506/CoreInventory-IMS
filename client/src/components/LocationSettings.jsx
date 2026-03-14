import React, { useState, useEffect } from 'react';

const LocationSettings = ({ onBack }) => {
    const [formData, setFormData] = useState({
        name: '',
        shortCode: '',
        warehouse: ''
    });
    const [warehouses, setWarehouses] = useState([]);
    const [saved, setSaved] = useState(false);

    // Fetch available warehouses on mount
    useEffect(() => {
        const fetchWarehouses = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('http://localhost:5000/warehouses', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setWarehouses(data);
                    // Set first warehouse as default
                    if (data.length > 0) {
                        setFormData(prev => ({
                            ...prev,
                            warehouse: data[0].short_code
                        }));
                    }
                }
            } catch (err) {
                console.error('Error fetching warehouses:', err);
            }
        };

        fetchWarehouses();
    }, []);

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
            const response = await fetch('http://localhost:5000/location', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setSaved(true);
                // Reset form
                setFormData({
                    name: '',
                    shortCode: '',
                    warehouse: warehouses.length > 0 ? warehouses[0].short_code : ''
                });
                setTimeout(() => setSaved(false), 3000);
            } else {
                alert('Error saving location');
            }
        } catch (err) {
            console.error('Error:', err);
            alert('Error saving location');
        }
    };

    return (
        <div className="flex-1 bg-[#0a0f1c] overflow-y-auto">
            {/* Page Header */}
            <div className="bg-[#162032] border-b border-[#27354f] p-6">
                <h1 className="text-3xl font-bold text-white">Location</h1>
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
                            placeholder="e.g., Room A, Zone 1, Shelf B"
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
                            placeholder="e.g., A1 (unique identifier within warehouse)"
                            className="w-full bg-transparent border-0 border-b border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:border-b-2 px-0 py-2 transition-colors text-lg uppercase"
                            required
                        />
                        <p className="text-xs text-slate-500 mt-1">Used to identify specific location within warehouse</p>
                    </div>

                    {/* Warehouse Field */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300">Warehouse</label>
                        {warehouses.length > 0 ? (
                            <select
                                name="warehouse"
                                value={formData.warehouse}
                                onChange={handleChange}
                                className="w-full bg-[#0f172a] border border-slate-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-colors text-lg"
                                required
                            >
                                <option value="">Select a warehouse</option>
                                {warehouses.map(wh => (
                                    <option key={wh.warehouse_id} value={wh.short_code}>
                                        {wh.name} ({wh.short_code})
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                name="warehouse"
                                value={formData.warehouse}
                                onChange={handleChange}
                                placeholder="e.g., WH (parent warehouse short code)"
                                className="w-full bg-transparent border-0 border-b border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:border-b-2 px-0 py-2 transition-colors text-lg uppercase"
                                required
                            />
                        )}
                        <p className="text-xs text-slate-500 mt-1">This location belongs to the selected warehouse</p>
                    </div>

                    {/* Save Button */}
                    <div className="pt-8">
                        <button
                            type="submit"
                            className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200"
                        >
                            Save Location
                        </button>
                        {saved && (
                            <p className="text-green-400 text-sm mt-4">✓ Location saved successfully</p>
                        )}
                    </div>
                </form>

                {/* Helpful Info Section */}
                <div className="mt-16 p-6 bg-[#162032] border border-[#27354f] rounded-lg">
                    <h3 className="text-sm font-semibold text-cyan-400 mb-3">About Locations</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Locations represent specific areas within a warehouse such as rooms, zones, shelves, or bins. 
                        Each location is identified by a unique short code and belongs to a parent warehouse. 
                        Locations are used as source and destination points during receipts and delivery operations.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LocationSettings;
