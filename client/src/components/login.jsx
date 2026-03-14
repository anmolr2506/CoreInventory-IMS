import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Eye, EyeOff, LogIn } from 'lucide-react';

const Login = ({ onToggleForm, onToggleForgotPassword, onLoginSuccess }) => {
    const [inputs, setInputs] = useState({
        email: "",
        password: ""
    });
    const [showPassword, setShowPassword] = useState(false);

    const { email, password } = inputs;

    const onChange = (e) => setInputs({ ...inputs, [e.target.name]: e.target.value });

    const onSubmitForm = async (e) => {
        e.preventDefault();
        try {
            const body = { email, password };
            const response = await fetch("http://localhost:5000/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            const parseRes = await response.json();

            if (response.ok) {
                localStorage.setItem("token", parseRes.token);
                localStorage.setItem("username", parseRes.username || 'User');
                localStorage.setItem("role", parseRes.role || 'staff');
                localStorage.setItem("user_id", parseRes.user_id);
                localStorage.setItem("is_approved", parseRes.is_approved !== undefined ? parseRes.is_approved : true);
                localStorage.setItem("approval_status", parseRes.approval_status || 'approved');
                if (parseRes.created_at) localStorage.setItem("created_at", parseRes.created_at);
                
                // Store warehouse assignments for staff
                if (parseRes.warehouses && parseRes.warehouses.length > 0) {
                    localStorage.setItem("warehouses", JSON.stringify(parseRes.warehouses));
                }

                toast.success(`Login Successful! Welcome ${parseRes.role}!`);
                if (onLoginSuccess) onLoginSuccess({
                    username: parseRes.username || 'User',
                    role: parseRes.role,
                    warehouses: parseRes.warehouses || [],
                    user_id: parseRes.user_id,
                    is_approved: parseRes.is_approved !== undefined ? parseRes.is_approved : true,
                    approval_status: parseRes.approval_status || 'approved',
                    created_at: parseRes.created_at || ''
                });
            } else {
                toast.error(parseRes); 
            }
        } catch (err) {
            toast.error("Internal Server Error");
        }
    };

    return (
        <div className="w-full max-w-[440px] p-10 bg-[#162032] border border-[#27354f] rounded-2xl shadow-2xl animate-fade-in-up">
            <h2 className="text-[28px] font-bold text-white mb-2 tracking-tight">Welcome Back</h2>
            <p className="text-slate-400 text-sm mb-8">Sign in to access your dashboard</p>
            
            <form onSubmit={onSubmitForm} className="space-y-5">
                
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

                <div className="flex justify-between items-center pt-2">
                    <label className="flex items-center space-x-2 cursor-pointer group">
                        <input type="checkbox" className="w-4 h-4 rounded border-slate-600 bg-[#0f172a] checked:bg-cyan-500 focus:ring-cyan-500/50 focus:ring-offset-0 transition-all cursor-pointer" />
                        <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Stay logged in</span>
                    </label>
                    <button type="button" onClick={onToggleForgotPassword} className="text-sm text-cyan-500 font-semibold hover:text-cyan-400 transition-colors hover:underline">Forgot password?</button>
                </div>

                <button className="w-full bg-cyan-500 hover:bg-cyan-400 text-white font-bold py-3.5 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 mt-4">
                    <LogIn className="w-5 h-5" />
                    <span>Sign In</span>
                </button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-400">
                Don't have an account? <span onClick={onToggleForm} className="text-cyan-400 font-semibold cursor-pointer hover:underline">Sign Up</span>
            </p>

            <div className="mt-12 pt-6 border-t border-[#27354f]">
                <p className="text-center text-xs text-slate-500 leading-relaxed max-w-[280px] mx-auto">
                    Password reset is secured via OTP verification sent to your registered email address.
                </p>
                <p className="text-center text-[10px] text-slate-600 mt-6">
                    Secured with industry-standard encryption and OTP verification
                </p>
            </div>
        </div>
    );
};

export default Login;
