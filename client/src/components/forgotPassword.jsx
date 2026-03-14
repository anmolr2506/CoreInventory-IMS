import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Mail, CheckCircle, Lock, ArrowLeft } from 'lucide-react';

const ForgotPassword = ({ onBackToLogin }) => {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");

    const handleSendOtp = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch("http://localhost:5000/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });

            const parseRes = await response.json();
            if (response.ok) {
                toast.success("OTP sent to your email!");
                setStep(2);
            } else {
                toast.error(parseRes);
            }
        } catch (err) {
            toast.error("Internal Server Error");
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch("http://localhost:5000/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp })
            });

            const parseRes = await response.json();
            if (response.ok) {
                toast.success("OTP Verified! Please enter a new password.");
                setStep(3);
            } else {
                toast.error(parseRes);
            }
        } catch (err) {
            toast.error("Internal Server Error");
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch("http://localhost:5000/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, newPassword })
            });

            const parseRes = await response.json();
            if (response.ok) {
                toast.success("Password reset successfully! You can now log in.");
                onBackToLogin();
            } else {
                toast.error(parseRes);
            }
        } catch (err) {
            toast.error("Internal Server Error");
        }
    };

    return (
        <div className="w-full max-w-[440px] p-10 bg-[#162032] border border-[#27354f] rounded-2xl shadow-2xl animate-fade-in-up relative">
             <div className="absolute top-6 left-6">
                <button 
                  onClick={onBackToLogin} 
                  className="text-slate-500 hover:text-cyan-400 font-semibold flex items-center transition-colors text-sm"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </button>
             </div>
            
            <h2 className="text-[28px] font-bold text-white mb-2 tracking-tight mt-6">Reset Password</h2>
            
            {step === 1 && (
                <>
                    <p className="text-slate-400 text-sm mb-8">Enter your email address to receive a one-time password (OTP).</p>
                    <form onSubmit={handleSendOtp} className="space-y-5 animate-fade-in-up">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-300">Email Address</label>
                            <input
                                type="email"
                                placeholder="your@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-[#0f172a] border border-[#334155] text-white rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all placeholder:text-slate-500"
                                required
                            />
                        </div>
                        <button className="w-full bg-cyan-500 hover:bg-cyan-400 text-white font-bold py-3.5 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 mt-4">
                            <Mail className="w-5 h-5" />
                            <span>Send OTP</span>
                        </button>
                    </form>
                </>
            )}

            {step === 2 && (
                <>
                    <p className="text-slate-400 text-sm mb-8">Enter the 6-digit OTP sent to <span className="text-cyan-400 font-medium">{email}</span>.</p>
                    <form onSubmit={handleVerifyOtp} className="space-y-5 animate-fade-in-up">
                        <div className="space-y-2">
                             <label className="text-sm font-semibold text-slate-300">Verification Code</label>
                            <input
                                type="text"
                                placeholder="000000"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full px-4 py-3 bg-[#0f172a] border border-[#334155] text-white rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all placeholder:text-slate-500 tracking-[0.5em] text-center text-lg font-bold"
                                maxLength={6}
                                required
                            />
                        </div>
                        <button className="w-full bg-cyan-500 hover:bg-cyan-400 text-white font-bold py-3.5 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 mt-4">
                            <CheckCircle className="w-5 h-5" />
                            <span>Verify Code</span>
                        </button>
                    </form>
                </>
            )}

            {step === 3 && (
                <>
                    <p className="text-slate-400 text-sm mb-8">Enter your new password below to regain access to your account.</p>
                    <form onSubmit={handleResetPassword} className="space-y-5 animate-fade-in-up">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-300">New Password</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-[#0f172a] border border-[#334155] text-white rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all placeholder:text-slate-600 tracking-widest"
                                required
                            />
                        </div>
                        <button className="w-full bg-cyan-500 hover:bg-cyan-400 text-white font-bold py-3.5 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 mt-4">
                            <Lock className="w-5 h-5" />
                            <span>Reset Password</span>
                        </button>
                    </form>
                </>
            )}

            <div className="mt-12 pt-6 border-t border-[#27354f]">
                <p className="text-center text-xs text-slate-500 leading-relaxed max-w-[280px] mx-auto">
                    If you don't see the email, please check your spam folder or request a new code.
                </p>
            </div>
        </div>
    );
};

export default ForgotPassword;
