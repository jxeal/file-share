// app/api/s3/delete/route.ts
import { NextResponse } from "next/server";
import AWS from "aws-sdk";
import { currentUser } from "@clerk/nextjs/server";

const s3 = new AWS.S3({
  endpoint: process.env.R2_ENDPOINT,
  region: "auto",
  signatureVersion: "v4",
  s3ForcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function DELETE(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userRole = user.publicMetadata.role;
    if (userRole !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: User does not have 'admin' privileges." },
        { status: 403 }
      );
    }

    const { file } = await req.json();
    if (!file.key) {
      return NextResponse.json(
        { error: "Missing key fileName" },
        { status: 400 }
      );
    }

    const bucket = process.env.R2_BUCKET!;

    await s3.deleteObject({ Bucket: bucket, Key: file.key }).promise();

    return NextResponse.json({ success: true, key: file.key }, { status: 200 });
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json(
      {
        error: "Failed to delete file",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
