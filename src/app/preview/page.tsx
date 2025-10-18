"use client";

import { useSearchParams } from "next/navigation"; // new import
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";

const PreviewPage = () => {
  const searchParams = useSearchParams();
  const fileUrl = searchParams.get("fileUrl");

  if (!fileUrl) {
    return <p>No file URL provided.</p>;
  }

  return (
    <div>
      <div>
        <DocViewer
          documents={[{ uri: fileUrl }]}
          pluginRenderers={DocViewerRenderers}
          style={{ flex: 1, height: "100vh" }}
          prefetchMethod="GET"
        />
      </div>
    </div>
  );
};

export default PreviewPage;
