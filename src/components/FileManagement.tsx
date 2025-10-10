import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  FileText,
  Upload,
  Loader,
  Trash,
  FolderOpen,
  Folder,
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

interface FileItem {
  key: string;
  lastModified: string;
  size: number;
  downloadUrl: string;
}

interface PreSignResponse {
  uploadUrl: string;
  key: string;
}

interface FileNode {
  name: string;
  type: "folder" | "file";
  key?: string;
  size?: number;
  lastModified?: string;
  downloadUrl?: string;
  children?: FileNode[];
}

const LIST_FILES_API = "/api/s3/list";
const PRESIGN_UPLOAD_API = "/api/s3/presign";
const DELETE_FILES_API = "/api/s3/delete";

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleString(); // you can customize format if needed
};

const FileManagementApp = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  // const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [customFileName, setCustomFileName] = useState("");
  const [customFileDirectory, setCustomFileDirectory] = useState("");
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const { user } = useUser();

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    toast("Fetching file list...");
    try {
      const response = await fetch(LIST_FILES_API);
      if (!response.ok)
        throw new Error(
          `Failed to fetch file list (Status: ${response.status})`
        );
      const fileList: FileItem[] = await response.json();
      setFiles(fileList);
      toast.success("Files loaded successfully.");
    } catch (error) {
      console.error("Error fetching files:", error);
      toast.error(
        `Error: Could not retrieve file list. ${(error as Error).message}`
      );
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleDownloadFile = (file: FileItem) => {
    if (file.downloadUrl) window.open(file.downloadUrl, "_blank");
    else toast.error(`Error: No download URL available for ${file.key}`);
  };

  const handleDelete = async (file: FileItem) => {
    toast("Deleting");
    try {
      const res = await fetch(DELETE_FILES_API, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file }),
      });

      if (!res.ok) throw new Error("Delete failed");
      setFiles((prevFiles) => prevFiles.filter((f) => f.key !== file.key));
      toast.success("File deleted successfully.");
    } catch (error) {
      console.error("Error deleting files:", error);
      toast.error(`Error: Could not delete file. ${(error as Error).message}`);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStagedFile(file);
    setCustomFileName(file.name); // default value
    setShowFileDialog(true);
  };

  const handleUploadWithCustomName = async (
    file: File,
    fileName: string,
    fileDirectory: string
  ) => {
    setIsUploading(true);
    toast(`Requesting upload URL for ${fileName}...`);

    try {
      const presignResponse: PreSignResponse = await fetch(PRESIGN_UPLOAD_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, fileDirectory, fileType: file.type }),
      }).then((res) => {
        if (!res.ok)
          throw new Error(`Failed to get presign URL (Status: ${res.status})`);
        return res.json();
      });

      const { uploadUrl, key } = presignResponse;
      toast(`Uploading ${fileName} directly to S3...`);

      const s3Response = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!s3Response.ok)
        throw new Error(
          `S3 upload failed with status ${s3Response.status}. Key: ${key}`
        );

      toast.success(`Upload of ${fileName} successful!`);
      await fetchFiles();
    } catch (error) {
      console.error("Upload Error:", error);
      toast.error(`Upload failed: ${(error as Error).message}`);
    } finally {
      setIsUploading(false);
      setStagedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const buildFileTree = (files: FileItem[]): FileNode[] => {
    const root: FileNode[] = [];
    files.forEach((file) => {
      const parts = file.key.split("/");
      let currentLevel = root;
      parts.forEach((part, index) => {
        const existingNode = currentLevel.find((n) => n.name === part);
        if (existingNode) {
          if (existingNode.type === "folder")
            currentLevel = existingNode.children!;
        } else {
          const isFile = index === parts.length - 1;
          const newNode: FileNode = {
            name: part,
            type: isFile ? "file" : "folder",
            children: isFile ? undefined : [],
            key: isFile ? file.key : undefined,
            size: isFile ? file.size : undefined,
            lastModified: isFile ? file.lastModified : undefined,
            downloadUrl: isFile ? file.downloadUrl : undefined,
          };
          currentLevel.push(newNode);
          if (!isFile) currentLevel = newNode.children!;
        }
      });
    });
    return root;
  };

  const toggleFolder = (folderName: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderName)) {
        newSet.delete(folderName);
      } else {
        newSet.add(folderName);
      }
      return newSet;
    });
  };

  const renderFileTree = (nodes: FileNode[], parentPath = "") => {
    return nodes.map((node) => {
      const nodePath = parentPath + "/" + node.name;

      if (node.type === "folder") {
        const isOpen = expandedFolders.has(nodePath);

        return (
          <div key={nodePath} className="ml-4 mb-2">
            <div
              className="font-semibold text-gray-700 cursor-pointer select-none gap-x-2 flex"
              onClick={() => toggleFolder(nodePath)}
            >
              {isOpen ? (
                <FolderOpen color="#FFEA00" />
              ) : (
                <Folder color="#FFEA00" />
              )}{" "}
              {node.name}/
            </div>
            {isOpen && (
              <div className="ml-4">
                {renderFileTree(node.children || [], nodePath)}
              </div>
            )}
          </div>
        );
      } else {
        return (
          <div
            key={node.key}
            className="flex items-center justify-between p-2 hover:bg-gray-50 rounded transition"
          >
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-gray-500" />
              <span
                className="truncate cursor-pointer text-blue-600 hover:underline"
                onClick={() => setSelectedFile(node as FileItem)}
              >
                {node.name}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {node.size !== 0 && (
                <button
                  onClick={() => handleDownloadFile(node as FileItem)}
                  className="flex items-center space-x-1 px-2 py-1 bg-green-500 text-white text-sm font-medium rounded-md hover:bg-green-600 transition"
                >
                  <span>Open</span>
                </button>
              )}
              {user?.publicMetadata?.role === "admin" && (
                <button onClick={() => handleDelete(node as FileItem)}>
                  <Trash color="red" />
                </button>
              )}
            </div>
          </div>
        );
      }
    });
  };

  const isEmpty = useMemo(
    () => files.length === 0 && !isLoading,
    [files.length, isLoading]
  );

  const filteredFiles = files.filter((f) =>
    f.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-gray-50 p-4 sm:p-8 font-inter">
      <div className="max-w-6xl mx-auto bg-white shadow-xl rounded-xl p-6">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h1 className="text-3xl font-bold text-gray-800">S3 File Manager</h1>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg shadow-md hover:bg-indigo-700 transition duration-150 disabled:bg-indigo-400 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader className="w-5 h-5" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>Upload File</span>
              </>
            )}
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect} // <-- changed from handleUpload
            disabled={isUploading}
            className="hidden"
          />
        </div>

        <div className="mt-8">
          <div className="flex justify-between">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Bucket Contents
            </h2>
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              <input
                type="text"
                placeholder="Search"
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 border rounded"
              />
            </h2>
          </div>

          <div className="flex gap-4 justify-between">
            <div className="border border-gray-200 rounded-lg overflow-hidden basis-3/4">
              {isLoading && (
                <div className="p-6 text-center text-indigo-600 flex items-center justify-center space-x-2">
                  <Loader className="w-6 h-6" />
                  <span>Loading files...</span>
                </div>
              )}
              {isEmpty && (
                <div className="p-6 text-center text-gray-500">
                  No files found in the bucket. Start by uploading one!
                </div>
              )}
              {!isLoading && files.length > 0 && filteredFiles.length > 0 && (
                <div className="p-2">
                  {renderFileTree(buildFileTree(filteredFiles))}
                </div>
              )}
            </div>
            <div className="border border-gray-200 rounded-lg p-4 basis-1/4">
              {selectedFile ? (
                <div className="space-y-4">
                  <h2 className="font-semibold text-lg">
                    {selectedFile.key.split("/").pop()}
                  </h2>
                  <div>
                    <strong>Size:</strong>{" "}
                    {formatFileSize(selectedFile.size || 0)}
                  </div>
                  <div>
                    <strong>Last Modified:</strong>{" "}
                    {formatDate(selectedFile.lastModified || "")}
                  </div>
                  {selectedFile.downloadUrl && (
                    <button
                      onClick={() => handleDownloadFile(selectedFile)}
                      className="flex items-center space-x-1 px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-md hover:bg-green-600 transition"
                    >
                      <span>Open</span>
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {showFileDialog && stagedFile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-96">
              <h2 className="text-lg font-semibold mb-4">Upload File</h2>
              <p className="mb-2">
                File type: <strong>{stagedFile.type || "unknown"}</strong>
              </p>
              <input
                type="text"
                value={customFileDirectory}
                onChange={(e) => setCustomFileDirectory(e.target.value)}
                placeholder="Enter directory"
                className="w-full border rounded px-3 py-2 mb-4"
              />
              <input
                type="text"
                value={customFileName}
                onChange={(e) => setCustomFileName(e.target.value)}
                placeholder="Enter filename"
                className="w-full border rounded px-3 py-2 mb-4"
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowFileDialog(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowFileDialog(false);
                    if (stagedFile)
                      handleUploadWithCustomName(
                        stagedFile,
                        customFileName,
                        customFileDirectory
                      );
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Upload
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileManagementApp;
