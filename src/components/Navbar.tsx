import { UserButton } from "@clerk/nextjs";
import React from "react";

const Navbar = () => {
  return (
    <div className="fixed top-0 left-0 w-full z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto flex justify-between items-center p-4">
        <div className="text-3xl font-bold text-black">Nuvoco FileShare</div>
        <div>
          <UserButton />
        </div>
      </div>
    </div>
  );
};

export default Navbar;
