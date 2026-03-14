import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Eye, EyeOff, UserPlus } from 'lucide-react';

const Signup = ({ onToggleForm, onSignupSuccess }) => {
    const [inputs, setInputs] = useState({
        username: "",
        email: "",
        password: "",
        confirm_password: "",
        requested_role: "staff"
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { username, email, password, confirm_password, requested_role } = inputs;

    const onChange = (e) => setInputs({ ...inputs, [e.target.name]: e.target.value });

    const onSubmitForm = async (e) => {
        e.preventDefault();
        if (password !== confirm_password) {
            return toast.error("Passwords do not match!");
        }
        try {
            const body = { username, email, password, requested_role };
            const response = await fetch("http://localhost:5000/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            const parseRes = await response.json();

            if (response.ok) {
                localStorage.setItem("token", parseRes.token);
                localStorage.setItem("username", parseRes.username || username);
                localStorage.setItem("role", parseRes.role || 'pending_user');
                localStorage.setItem("is_approved", parseRes.is_approved !== undefined ? parseRes.is_approved : false);
                localStorage.setItem("approval_status", parseRes.approval_status || 'pending');
                if (parseRes.created_at) localStorage.setItem("created_at", parseRes.created_at);
                
                toast.success("Account created successfully! Waiting for approval...");
                if (onSignupSuccess) onSignupSuccess({
                    username: parseRes.username || username,
                    role: parseRes.role || 'pending_user',
                    is_approved: parseRes.is_approved !== undefined ? parseRes.is_approved : false,
                    approval_status: parseRes.approval_status || 'pending',
                    created_at: parseRes.created_at || ''
                });
            } else {
                toast.error(parseRes); // Shows "User already exists!" from backend
            }
        } catch (err) {
            toast.error("Internal Server Error");
        }
    };

    return (
        <div className="w-full max-w-[440px] p-10 bg-[#162032] border border-[#27354f] rounded-2xl shadow-2xl animate-fade-in-up">
            <h2 className="text-[28px] font-bold text-white mb-2 tracking-tight">Create Account</h2>
            <p className="text-slate-400 text-sm mb-8">Get started with Core Inventory today</p>
            
            <form onSubmit={onSubmitForm} className="space-y-5">
                
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300">Full Name</label>
                    <input
                        type="text"
                        name="username"
                        placeholder="John Doe"
                        value={username}
                        onChange={onChange}
                        className="w-full px-4 py-3 bg-[#0f172a] border border-[#334155] text-white rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all placeholder:text-slate-500"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300">Register As</label>
                    <select
                        name="requested_role"
                        value={requested_role}
                        onChange={onChange}
                        className="w-full px-4 py-3 bg-[#0f172a] border border-[#334155] text-white rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all"
                        required
                    >
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300">Email Address</label>
                    <input
                        type="email"
                        name="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={onChange}
                        className="w-full px-4 py-3 bg-[#0f172a] border border-[#334155] text-white rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all placeholder:text-slate-500"
                        required
                    />
                </div>

                <div className="space-y-2 relative">
                    <label className="text-sm font-semibold text-slate-300">Password</label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={onChange}
                            className="w-full px-4 py-3 bg-[#0f172a] border border-[#334155] text-white rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all placeholder:text-slate-600 tracking-widest"
                            required
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
                
                {/* Note: In a real implementation we'd add confirm password logic in the onChange/onSubmit, but sticking to UI redesign rules here */}
                <div className="space-y-2 relative">
                    <label className="text-sm font-semibold text-slate-300">Confirm Password</label>
                    <div className="relative">
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            name="confirm_password"
                            value={confirm_password}
                            onChange={onChange}
                            placeholder="••••••••"
                            className="w-full px-4 py-3 bg-[#0f172a] border border-[#334155] text-white rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all placeholder:text-slate-600 tracking-widest"
                            required
                        />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                <button className="w-full bg-cyan-500 hover:bg-cyan-400 text-white font-bold py-3.5 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 mt-6">
                    <UserPlus className="w-5 h-5" />
                    <span>Create Account</span>
                </button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-400">
                Already have an account? <span onClick={onToggleForm} className="text-cyan-400 font-semibold cursor-pointer hover:underline">Sign In</span>
            </p>

            <div className="mt-8 pt-6 border-t border-[#27354f]">
                <p className="text-center text-xs text-slate-500 leading-relaxed max-w-[280px] mx-auto">
                    By creating an account, you agree to our Terms of Service and acknowledge our Privacy Policy.
                </p>
            </div>
        </div>
    );
};

export default Signup;