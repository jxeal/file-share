import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { FileText, Upload, Download, Loader } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

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

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const FileManagementApp = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  // const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [customFileName, setCustomFileName] = useState("");
  const [showFileDialog, setShowFileDialog] = useState(false);

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    setStatusMessage("Fetching file list...");
    try {
      const response = await fetch(LIST_FILES_API);
      if (!response.ok)
        throw new Error(
          `Failed to fetch file list (Status: ${response.status})`
        );
      const fileList: FileItem[] = await response.json();
      setFiles(fileList);
      setStatusMessage("Files loaded successfully.");
    } catch (error) {
      console.error("Error fetching files:", error);
      setStatusMessage(
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
    else setStatusMessage(`Error: No download URL available for ${file.key}`);
  };

  // const handlePreview = (file: FileItem) => {
  //   if (file.downloadUrl) {
  //     setPreviewFile(file); // Opens the modal/dialog
  //   } else {
  //     setStatusMessage(`Error: No download URL available for ${file.key}`);
  //   }
  // };

  //   const handleDownloadFile = (file: FileItem) => {
  //     if (!file.downloadUrl) {
  //       setStatusMessage(`Error: No download URL available for ${file.key}`);
  //       return;
  //     }
  //     const link = document.createElement("a");
  //     link.href = file.downloadUrl;
  //     link.download = file.key?.split("/").pop() || "file";
  //     document.body.appendChild(link);
  //     link.click();
  //     document.body.removeChild(link);
  //   };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStagedFile(file);
    setCustomFileName(file.name); // default value
    setShowFileDialog(true);
  };
  //   const file = event.target.files?.[0];
  //   if (!file) return;
  //   setIsUploading(true);
  //   setStatusMessage(`Requesting upload URL for ${file.name}...`);

  //   try {
  //     const presignResponse: PreSignResponse = await (async () => {
  //       const response = await fetch(PRESIGN_UPLOAD_API, {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({ fileName: file.name, fileType: file.type }),
  //       });
  //       if (!response.ok)
  //         throw new Error(
  //           `Backend failed to generate pre-signed URL (Status: ${response.status}).`
  //         );
  //       return response.json();
  //     })();

  //     const { uploadUrl, key } = presignResponse;
  //     setStatusMessage(`Uploading ${file.name} directly to S3 bucket...`);
  //     const s3Response = await fetch(uploadUrl, {
  //       method: "PUT",
  //       body: file,
  //       headers: { "Content-Type": file.type },
  //     });
  //     if (!s3Response.ok)
  //       throw new Error(
  //         `Direct S3 upload failed with status ${s3Response.status}. S3 Key: ${key}`
  //       );
  //     setStatusMessage(`Upload of ${file.name} successful!`);
  //     await fetchFiles();
  //   } catch (error) {
  //     console.error("Upload Error:", error);
  //     setStatusMessage(
  //       `Upload failed: ${
  //         (error as Error).message || "An unknown error occurred."
  //       }`
  //     );
  //   } finally {
  //     setIsUploading(false);
  //     if (fileInputRef.current) fileInputRef.current.value = "";
  //   }
  // };

  const handleUploadWithCustomName = async (file: File, fileName: string) => {
    setIsUploading(true);
    setStatusMessage(`Requesting upload URL for ${fileName}...`);

    try {
      const presignResponse: PreSignResponse = await fetch(PRESIGN_UPLOAD_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, fileType: file.type }),
      }).then((res) => {
        if (!res.ok)
          throw new Error(`Failed to get presign URL (Status: ${res.status})`);
        return res.json();
      });

      const { uploadUrl, key } = presignResponse;
      setStatusMessage(`Uploading ${fileName} directly to S3...`);

      const s3Response = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!s3Response.ok)
        throw new Error(
          `S3 upload failed with status ${s3Response.status}. Key: ${key}`
        );

      setStatusMessage(`Upload of ${fileName} successful!`);
      await fetchFiles();
    } catch (error) {
      console.error("Upload Error:", error);
      setStatusMessage(`Upload failed: ${(error as Error).message}`);
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

  const renderFileTree = (nodes: FileNode[]) => {
    return nodes.map((node) => {
      if (node.type === "folder") {
        return (
          <div key={node.name} className="ml-4 mb-2">
            <div className="font-semibold text-gray-700">{node.name}/</div>
            <div className="ml-4">{renderFileTree(node.children || [])}</div>
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
              <span className="truncate">{node.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              {/* <button
                onClick={() => handlePreview(node as FileItem)}
                className="flex items-center space-x-1 px-2 py-1 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition"
              >
                Preview
              </button> */}
              {node.size !== 0 && (
                <button
                  onClick={() => handleDownloadFile(node as FileItem)}
                  className="flex items-center space-x-1 px-2 py-1 bg-green-500 text-white text-sm font-medium rounded-md hover:bg-green-600 transition"
                >
                  {/* <Download className="w-4 h-4" /> */}
                  <span>Open File</span>
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

  return (
    <div className="bg-gray-50 p-4 sm:p-8 font-inter">
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-xl p-6">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h1 className="text-3xl font-bold text-gray-800">S3 File Manager</h1>
          {/* <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            disabled={isUploading}
            className="hidden"
          /> */}
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

        {statusMessage && (
          <div
            className={`p-3 mb-4 rounded-lg text-sm ${
              statusMessage.startsWith("Error")
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {statusMessage}
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Bucket Contents
          </h2>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
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
            {!isLoading && files.length > 0 && (
              <div className="p-2">{renderFileTree(buildFileTree(files))}</div>
            )}
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
                    stagedFile &&
                      handleUploadWithCustomName(stagedFile, customFileName);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Upload
                </button>
              </div>
            </div>
          </div>
        )}

        {/* <Dialog
          open={!!previewFile}
          onOpenChange={(open) => !open && setPreviewFile(null)}
        >
          <DialogContent className="max-w-6xl w-full">
            <DialogHeader>
              <DialogTitle>{previewFile?.key?.split("/").pop()}</DialogTitle>
              <DialogClose className="absolute top-2 right-2">×</DialogClose> 
            </DialogHeader>

            <div className="mt-4">
              {previewFile?.key?.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={previewFile.downloadUrl}
                  className="w-full h-[500px] "
                  title={previewFile.key}
                />
              ) : (
                <img
                  src={previewFile?.downloadUrl}
                  alt={previewFile?.key}
                  className="max-w-full max-h-[500px] mx-auto"
                />
              )}
            </div>

            <DialogFooter className="mt-4 flex justify-end space-x-2">
              <button
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                onClick={() => {
                  if (previewFile) handleDownloadFile(previewFile);
                }}
              >
                Download
              </button>
              <DialogClose className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
                Close
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog> */}
      </div>
    </div>
  );
};

export default FileManagementApp;
