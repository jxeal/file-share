// app/api/s3/presign/route.ts
import { NextResponse } from "next/server";
import AWS from "aws-sdk";

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

export async function POST(req: Request) {
  try {
    const { fileDirectory, fileName, fileType } = await req.json();

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: "Missing fileName or fileType" },
        { status: 400 }
      );
    }

    const dir = fileDirectory?.trim();
    const fileDir = dir ? (dir.endsWith("/") ? dir : dir + "/") : "";

    const bucket = process.env.R2_BUCKET!;
    const key = `${fileDir}${Date.now()}-${fileName}`;

    const uploadUrl = s3.getSignedUrl("putObject", {
      Bucket: bucket,
      Key: key,
      ContentType: fileType,
      Expires: 60 * 10,
    });

    return NextResponse.json({ uploadUrl, key });
  } catch (err) {
    console.error("Presign error:", err);
    return NextResponse.json(
      { error: "Failed to generate presigned URL" },
      { status: 500 }
    );
  }
}
