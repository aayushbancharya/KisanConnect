import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/AppShell";
import LoadingScreen from "./components/LoadingScreen";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CropRecommendation = lazy(() => import("./pages/CropRecommendation"));
const CropResults = lazy(() => import("./pages/CropResults"));
const DiseaseDetection = lazy(() => import("./pages/DiseaseDetection"));
const MarketPrices = lazy(() => import("./pages/MarketPrices"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const AIAssistant = lazy(() => import("./pages/AIAssistant"));
const Profile = lazy(() => import("./pages/Profile"));
const FarmTools = lazy(() => import("./pages/FarmTools"));
const Weather = lazy(() => import("./pages/Weather"));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public Route */}
          <Route path="/" element={<Login />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/crop-recommendation" element={
            <ProtectedRoute><AppShell><CropRecommendation /></AppShell></ProtectedRoute>} />
          <Route path="/crop-results" element={
            <ProtectedRoute><AppShell><CropResults /></AppShell></ProtectedRoute>} />
          <Route path="/disease-detection" element={
            <ProtectedRoute><AppShell><DiseaseDetection /></AppShell></ProtectedRoute>} />
          <Route path="/market-prices" element={
            <ProtectedRoute><AppShell><MarketPrices /></AppShell></ProtectedRoute>} />
          <Route path="/marketplace" element={
            <ProtectedRoute><AppShell><Marketplace /></AppShell></ProtectedRoute>} />
          <Route path="/ai-assistant" element={
            <ProtectedRoute><AppShell><AIAssistant /></AppShell></ProtectedRoute>} />
          <Route path="/profile" element={
            <ProtectedRoute><AppShell><Profile /></AppShell></ProtectedRoute>} />
          <Route path="/farm-tools" element={
            <ProtectedRoute><AppShell><FarmTools /></AppShell></ProtectedRoute>} />
          <Route path="/weather" element={
            <ProtectedRoute><AppShell><Weather /></AppShell></ProtectedRoute>} />

          {/* Catch all - redirect to login */}
          <Route path="*" element={<Login />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
