import { UserButton } from "@clerk/nextjs";
import Image from "next/image";
import React from "react";

const Navbar = () => {
  return (
    <div className="fixed top-0 left-0 w-full z-50 bg-white/50 border-b border-gray-200/50 shadow-sm">
      <div className="max-w-6xl mx-auto flex justify-between items-center py-4">
        <div className="text-3xl font-bold text-black flex gap-x-4">
          <Image src="/logo.png" width={50} height={50} alt="Nuvoco logo" />
          ACP Production
        </div>
        <div>
          <UserButton />
        </div>
      </div>
    </div>
  );
};

export default Navbar;
