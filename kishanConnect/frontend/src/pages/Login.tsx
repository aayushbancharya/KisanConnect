import { useState } from "react";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    state: "",
    district: "",
  });

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        if (!form.email || !form.password) {
          setError("Please enter email and password!");
          setLoading(false);
          return;
        }

        const response = await fetch(`${BACKEND_URL}/api/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Login failed!");
          setLoading(false);
          return;
        }

        // Save token and user to localStorage
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/dashboard");

      } else {
        // Register
        if (!form.name || !form.email || !form.password) {
          setError("Please fill in all required fields!");
          setLoading(false);
          return;
        }

        if (form.password.length < 6) {
          setError("Password must be at least 6 characters!");
          setLoading(false);
          return;
        }

        const response = await fetch(`${BACKEND_URL}/api/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Registration failed!");
          setLoading(false);
          return;
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/dashboard");
      }

    } catch {
      setError("Cannot connect to server. Please try again!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-6">
          <img src="/kisanconnect-logo.png" alt="KisanConnect" className="mx-auto mb-3 h-24 w-24 rounded-2xl object-cover" />
          <h1 className="text-2xl font-bold text-green-700">KisanConnect</h1>
          <p className="text-gray-500 text-sm">Your AI-powered farming companion</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button onClick={() => { setIsLogin(true); setError(""); }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
              isLogin ? "bg-white shadow text-green-700" : "text-gray-500"}`}>
            Login
          </button>
          <button onClick={() => { setIsLogin(false); setError(""); }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
              !isLogin ? "bg-white shadow text-green-700" : "text-gray-500"}`}>
            Sign Up
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 mb-4">
            <p className="text-green-600 text-sm">{success}</p>
          </div>
        )}

        {/* Form */}
        <div className="space-y-3">
          {!isLogin && (
            <div>
              <label className="text-sm text-gray-600 block mb-1">Full Name *</label>
              <input type="text" placeholder="Enter your full name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          )}

          <div>
            <label className="text-sm text-gray-600 block mb-1">Email Address *</label>
            <input type="email" placeholder="yourname@gmail.com"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-1">Password *</label>
            <input type="password" placeholder="Minimum 6 characters"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>

          {!isLogin && (
            <>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Phone Number</label>
                <input type="tel" placeholder="10 digit mobile number"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">State</label>
                  <input type="text" placeholder="Your state"
                    value={form.state}
                    onChange={(e) => update("state", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">District</label>
                  <input type="text" placeholder="Your district"
                    value={form.district}
                    onChange={(e) => update("district", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
              </div>
            </>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-2.5 rounded-lg font-medium transition mt-2">
            {loading ? "Please wait..." : isLogin ? "Login" : "Create Account"}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          KisanConnect • AI Farming Assistant
        </p>
      </div>
    </div>
  );
}
