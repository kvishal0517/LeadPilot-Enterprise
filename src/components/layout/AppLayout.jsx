import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50/30">
      {/* Background Decor */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-blue-100/20 blur-[100px] rounded-full -z-10 pointer-events-none" />
      <div className="fixed bottom-0 left-[250px] w-[500px] h-[500px] bg-indigo-100/20 blur-[100px] rounded-full -z-10 pointer-events-none" />
      
      {/* Left Sidebar */}
      <Sidebar />

      {/* Right Main Display */}
      <main className="flex-1 h-full overflow-y-auto relative scroll-smooth">
        <div className="max-w-[1200px] mx-auto p-8 md:p-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
