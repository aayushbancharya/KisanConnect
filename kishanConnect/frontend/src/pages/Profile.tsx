import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://backend-smart-crop-360.onrender.com";
function storedUser() { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } }

interface Listing {
  id: number;
  farmerName: string;
  crop: string;
  quantity: number;
  price: number;
  unit: string;
  state: string;
  district: string;
  quality: string;
  harvestDate: string;
  phone: string;
  description: string;
}
interface Inquiry { id:number; listingId:number; crop:string | null; buyerName:string; message:string; farmerReply:string | null; createdAt:string }

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const [listings, setListings] = useState<Listing[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [sentInquiries, setSentInquiries] = useState<Inquiry[]>([]);
  const [replies, setReplies] = useState<Record<number,string>>({});
  const [replyBusy, setReplyBusy] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const requestedTab = new URLSearchParams(location.search).get("tab");
  const activeTab: "profile" | "listings" | "inquiries" | "sent" = requestedTab === "inquiries" || requestedTab === "listings" || requestedTab === "sent" ? requestedTab : "profile";
  const setActiveTab = (tab: "profile" | "listings" | "inquiries" | "sent") => navigate(tab === "profile" ? "/profile" : `/profile?tab=${tab}`);

  const user = storedUser();

  const form = {
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    state: user.state || "",
    district: user.district || "",
  };

  const fetchMyListings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/listings?mine=true`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      });
      if (!response.ok) throw new Error("Could not load your listings.");
      const data = await response.json();
      setListings(data.listings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInquiries = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/inquiries/received`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      if (response.ok) setInquiries((await response.json()).inquiries || []);
    } catch (err) { console.error(err); }
  }, []);
  const fetchSentInquiries = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/inquiries/sent`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      if (response.ok) setSentInquiries((await response.json()).inquiries || []);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => { void fetchMyListings(); }, 0);
    return () => window.clearTimeout(task);
  }, [fetchMyListings]);
  useEffect(() => { const task = window.setTimeout(() => { void fetchInquiries(); }, 0); return () => window.clearTimeout(task); }, [fetchInquiries]);
  useEffect(() => { const task = window.setTimeout(() => { void fetchSentInquiries(); }, 0); return () => window.clearTimeout(task); }, [fetchSentInquiries]);

  const sendReply = async (id:number) => {
    const reply = (replies[id] || "").trim(); if (!reply) return;
    setReplyBusy(id);
    try {
      const response = await fetch(`${BACKEND_URL}/api/inquiries/${id}/reply`, { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${localStorage.getItem("token") || ""}` }, body:JSON.stringify({reply}) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not send reply.");
      setInquiries((items) => items.map((item) => item.id === id ? {...item, farmerReply:data.inquiry.farmerReply} : item));
      setReplies((current) => ({...current, [id]:""})); setSuccessMsg("Reply saved to this buyer inquiry.");
    } catch (err) { setSuccessMsg(err instanceof Error ? err.message : "Could not send reply."); }
    finally { setReplyBusy(null); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this listing?")) return;
    setDeleteLoading(id);
    try {
      const response = await fetch(`${BACKEND_URL}/api/listings/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      });
      if (response.ok) {
        setListings((prev) => prev.filter((l) => l.id !== id));
        setSuccessMsg("Listing deleted successfully!");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        const data = await response.json();
        setSuccessMsg(data.error || "Could not delete this listing.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="bg-green-600 rounded-2xl p-6 text-white text-center mb-6">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-green-600 font-bold text-2xl mx-auto mb-3">
            {user.name?.charAt(0).toUpperCase() || "F"}
          </div>
          <h2 className="text-xl font-bold">{user.name}</h2>
          <p className="text-green-200 text-sm">{user.email}</p>
          {user.state && (
            <p className="text-green-200 text-xs mt-1">
              📍 {user.district}, {user.state}
            </p>
          )}
        </div>

        {/* Success Message */}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-center">
            <p className="text-green-600 text-sm">{successMsg}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-white rounded-xl shadow-sm p-1 mb-6">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === "profile"
                ? "bg-green-600 text-white"
                : "text-gray-500"}`}>
            👤 My Profile
          </button>
          <button
            onClick={() => setActiveTab("listings")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === "listings"
                ? "bg-green-600 text-white"
                : "text-gray-500"}`}>
            My Listings ({listings.length})
          </button>
          <button onClick={() => { setActiveTab("inquiries"); navigate("/profile?tab=inquiries"); }} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === "inquiries" ? "bg-green-600 text-white" : "text-gray-500"}`}>
            💬 Buyer inquiries ({inquiries.length})
          </button>
          <button onClick={() => { setActiveTab("sent"); void fetchSentInquiries(); }} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === "sent" ? "bg-green-600 text-white" : "text-gray-500"}`}>
            My inquiries ({sentInquiries.length})
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-gray-800 mb-4">👤 Profile Details</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">Full Name</label>
                <div className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 bg-gray-50">
                  {form.name}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Email</label>
                <div className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 bg-gray-50">
                  {form.email}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Phone</label>
                <div className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 bg-gray-50">
                  {form.phone || "Not provided"}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-500 block mb-1">State</label>
                  <div className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 bg-gray-50">
                    {form.state || "Not provided"}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-500 block mb-1">District</label>
                  <div className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 bg-gray-50">
                    {form.district || "Not provided"}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => navigate("/marketplace")}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-sm font-medium transition">
                List a New Crop for Sale
              </button>
              <button
                onClick={handleLogout}
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl text-sm font-medium transition border border-red-200">
                🚪 Logout
              </button>
            </div>
          </div>
        )}

        {/* My Listings Tab */}
        {activeTab === "listings" && (
          <div>
            {loading ? (
              <div className="bg-white rounded-2xl p-10 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10v10h16V10M3 5h18l-2 5H5L3 5Z"/><path d="M9 20v-6h6v6"/></svg></div>
                <p className="text-gray-500">Loading your listings...</p>
              </div>
            ) : listings.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v14H4zM4 14h4l2 2h4l2-2h4"/></svg></div>
                <p className="text-gray-600 font-medium">No listings yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  List your crops for sale to connect with buyers
                </p>
                <button
                  onClick={() => navigate("/marketplace")}
                  className="mt-4 bg-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium">
                  + Add Listing
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {listings.map((listing) => (
                  <div key={listing.id}
                    className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-gray-800">{listing.crop}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          📍 {listing.district}, {listing.state}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          ₹{listing.price.toLocaleString("en-IN")}
                        </p>
                        <p className="text-xs text-gray-400">
                          per {listing.unit}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-400">Quantity</p>
                        <p className="text-sm font-semibold">
                          {listing.quantity} {listing.unit}s
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-400">Quality</p>
                        <p className="text-sm font-semibold">{listing.quality}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-400">Available</p>
                        <p className="text-sm font-semibold">
                          {listing.harvestDate || "Now"}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(listing.id)}
                      disabled={deleteLoading === listing.id}
                      className="w-full bg-red-50 hover:bg-red-100 disabled:bg-gray-100 text-red-600 py-2.5 rounded-xl text-sm font-medium transition border border-red-200">
                      {deleteLoading === listing.id
                        ? "⏳ Deleting..."
                        : "Delete This Listing"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === "inquiries" && <div className="space-y-3">{inquiries.length ? inquiries.map((item) => <article key={item.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><p className="text-xs text-gray-500">{item.crop || "Listing"} · {item.buyerName} · {new Date(item.createdAt).toLocaleString()}</p><p className="mt-2 text-sm text-gray-800">{item.message}</p>{item.farmerReply ? <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-900">Your reply: {item.farmerReply}</p> : <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input aria-label={`Reply to ${item.buyerName}`} maxLength={1000} className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Write a reply" value={replies[item.id] || ""} onChange={(e) => setReplies((current) => ({...current, [item.id]:e.target.value}))} /><button disabled={replyBusy === item.id || !(replies[item.id] || "").trim()} onClick={() => void sendReply(item.id)} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{replyBusy === item.id ? "Sending…" : "Reply"}</button></div>}</article>) : <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500">No buyer inquiries yet.</div>}</div>}
        {activeTab === "sent" && <div className="space-y-3">{sentInquiries.length ? sentInquiries.map((item) => <article key={item.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><p className="text-xs text-gray-500">{item.crop || "Listing"} · Sent {new Date(item.createdAt).toLocaleString()}</p><p className="mt-2 text-sm text-gray-800">{item.message}</p><p className={`mt-3 rounded-lg p-3 text-sm ${item.farmerReply ? "bg-green-50 text-green-900" : "bg-gray-50 text-gray-600"}`}>{item.farmerReply ? `Farmer reply: ${item.farmerReply}` : "Waiting for the farmer to reply."}</p></article>) : <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500">You have not sent any in-app inquiries yet.</div>}</div>}
      </div>
    </div>
  );
}
