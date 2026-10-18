export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex flex-col items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21v-9M12 12C7 12 5 9 5 5c4 0 7 2 7 7ZM12 15c0-4 2-7 7-7 0 4-2 7-7 7Z"/></svg></div>
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
