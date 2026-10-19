import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0F1012] text-[#F5F6F8] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#17181B] border border-[#2A2C31] flex items-center justify-center mb-6">
        <span className="font-mono text-2xl font-bold text-[#3B82F6]">404</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
      <p className="text-[#9AA0AB] max-w-md mb-6">
        The requested resource does not exist on SolTrace.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm font-medium rounded-lg transition-colors"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
