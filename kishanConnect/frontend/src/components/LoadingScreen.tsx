export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex flex-col items-center justify-center">
      <div className="text-center">
        <img src="/kisanconnect-logo.png" alt="KisanConnect" className="mx-auto mb-4 h-24 w-24 rounded-2xl object-cover shadow-sm" />
        <h1 className="text-2xl font-bold text-green-700 mb-2">
          KisanConnect
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          Your AI-powered farming companion
        </p>
        <div className="flex gap-2 justify-center">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }} />
          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }} />
        </div>
      </div>
    </div>
  );
}
