import { NextRequest, NextResponse } from "next/server";
import { certificateService } from "@/lib/certificate-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");
    const userId = searchParams.get("userId");
    const id = searchParams.get("id");

    if (id) {
      const certificate = await certificateService.getCertificateById(id);
      if (!certificate) {
        return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
      }
      return NextResponse.json(certificate);
    }

    if (orderId) {
      const certificate = await certificateService.getCertificateByOrderId(parseInt(orderId));
      if (!certificate) {
        return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
      }
      return NextResponse.json(certificate);
    }

    if (userId) {
      const certificates = await certificateService.getUserCertificates(parseInt(userId));
      return NextResponse.json(certificates);
    }

    return NextResponse.json({ error: "Missing id, orderId, or userId parameter" }, { status: 400 });
  } catch (error: any) {
    console.error("Error fetching certificates:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const certificate = await certificateService.generateCertificate(orderId);
    return NextResponse.json(certificate);
  } catch (error: any) {
    console.error("Error generating certificate:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
