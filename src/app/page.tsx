"use client";
import FileManagement from "@/components/FileManagement";
import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <div>
      <Navbar />
      <div className="pt-16">
        <FileManagement />
      </div>
    </div>
  );
}
