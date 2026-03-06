import { Request, Response } from "express";
import JudgeGuest from "../models/judgeGuest";
import { AuthRequest } from "../middlewares/authMiddleware";
import PDFDocument from "pdfkit";
import judgeGuest from "../models/judgeGuest";

const MAX_GUESTS = 5;

/* =====================================================
   CREATE OR SAVE AS DRAFT (UPSERT)
===================================================== */
export const saveGuestList = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { guests } = req.body;

    // Optional: Pre-check limit before hitting DB
    if (guests && guests.length > MAX_GUESTS) {
      return res.status(400).json({
        message: `Maximum of ${MAX_GUESTS} guests allowed.`,
      });
    }

    const guestList = await JudgeGuest.findOneAndUpdate(
      { user: userId },
      {
        guests,
        status: "DRAFT",
      },
      {
        upsert: true,
        new: true,
        runValidators: false, // Drafts bypass our pre-save strict validation
      }
    );

    res.status(200).json(guestList);
  } catch (err) {
    res.status(500).json({
      message: "Failed to save guest list",
      error: err,
    });
  }
};

/* =====================================================
   SUBMIT GUEST LIST (STRICT VALIDATION)
===================================================== */
export const submitGuestList = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { guests } = req.body;

    // 1. Basic length checks
    if (!guests || guests.length === 0) {
      return res.status(400).json({
        message: "You must add at least one guest before submitting.",
      });
    }

    if (guests.length > MAX_GUESTS) {
      return res.status(400).json({
        message: `Maximum of ${MAX_GUESTS} guests allowed.`,
      });
    }

    // 2. Find and Update
    // We use .save() indirectly or findOneAndUpdate with runValidators
    // Note: Our pre-save hook in the model handles the specific logic
    // for Adult (ID/Email) vs Minor (Birth Cert)
    const guestList = await JudgeGuest.findOne({ user: userId }) || new JudgeGuest({ user: userId });
    
    guestList.guests = guests;
    guestList.status = "SUBMITTED";

    await guestList.save(); // 🔥 This triggers the pre-save hook validation

    res.status(200).json({
      message: "Guest list submitted successfully",
      data: guestList,
    });
  } catch (err: any) {
    // Mongoose validation errors will be caught here
    res.status(400).json({
      message: err.message || "Submission failed",
    });
  }
};

/* =====================================================
   GET MY GUEST LIST
===================================================== */
export const getMyGuestList = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const guestList = await JudgeGuest.findOne({ user: userId });

    if (!guestList) {
      return res.status(404).json({ message: "No guest list found" });
    }

    res.json(guestList);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch guest list",
      error: err,
    });
  }
};

/* =====================================================
   ADD MORE GUESTS
===================================================== */
export const addGuests = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { guests } = req.body; 

    const existing = await JudgeGuest.findOne({ user: userId });

    if (!existing) {
      return res.status(404).json({ message: "No guest list found. Please create one first." });
    }

    const totalGuests = existing.guests.length + guests.length;

    if (totalGuests > MAX_GUESTS) {
      return res.status(400).json({
        message: `Total limit exceeded. Maximum of ${MAX_GUESTS} guests allowed.`,
      });
    }

    existing.guests.push(...guests);

    // This save() will trigger the model validation. 
    // If the list is "SUBMITTED", new guests must have correct ID/BirthCert info.
    await existing.save();

    res.json({
      message: "Guests added successfully",
      data: existing,
    });
  } catch (err: any) {
    res.status(400).json({
      message: err.message || "Failed to add guests",
    });
  }
};

/* =====================================================
   DELETE MY GUEST LIST (DRAFT ONLY)
===================================================== */
export const deleteGuestList = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const existing = await JudgeGuest.findOne({ user: userId });

    if (!existing) return res.status(404).json({ message: "No guest list found" });

    if (existing.status === "SUBMITTED") {
      return res.status(400).json({
        message: "Cannot delete a submitted guest list. Please contact admin for changes.",
      });
    }

    await existing.deleteOne();

    res.json({ message: "Guest list deleted successfully" });
  } catch (err) {
    res.status(500).json({
      message: "Failed to delete guest list",
    });
  }
};

/* =====================================================
   ADMIN: GET ALL GUEST LISTS
===================================================== */
export const getAllGuestLists = async (_req: Request, res: Response) => {
  try {
    const guestLists = await JudgeGuest.find().populate(
      "user",
      "name email role"
    );

    res.json(guestLists);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch guest lists",
    });
  }
};

/* =====================================================
    ADMIN: DOWNLOAD ALL GUESTS AS PDF
===================================================== */
export const downloadAllGuestsPDF = async (_req: Request, res: Response) => {
  try {
    const guestLists = await JudgeGuest.find({ status: "SUBMITTED" }).populate(
      "user",
      "name email"
    );

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const filename = `Master_Guest_List_${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    doc.pipe(res);

    // --- Institutional Header Helper ---
    const drawOfficialHeader = (badgeText: string) => {
      const headerY = 40;
      const LOGO_URL = "https://res.cloudinary.com/drls2cpnu/image/upload/v1772111715/JOB_LOGO_ebsbgu.jpg"; // <-- INSERT LOGO URL HERE

      // 1. Logo (Left side)
      try {
        doc.image(LOGO_URL, 50, headerY, { width: 85 });
      } catch (e) {
        // Fallback placeholder if URL fails
        doc.rect(50, headerY, 85, 45).strokeColor("#eee").stroke();
      }

      // 2. Institutional Title (Center)
      doc.fillColor("#001529").font("Helvetica-Bold").fontSize(11);
      doc.text("OFFICE OF THE REGISTRAR HIGH COURT", 150, headerY + 5, { align: "center", width: 300 });
      doc.fontSize(9).font("Helvetica").fillColor("#555").text("REPUBLIC OF KENYA", 150, headerY + 20, { align: "center", width: 300 });

      // Centered Green Badge (Pill Style)
      const badgeWidth = 160;
      const badgeX = 150 + (300 / 2) - (badgeWidth / 2);
      doc.roundedRect(badgeX, headerY + 35, badgeWidth, 18, 5).fill("#e6f7f0");
      doc.fillColor("#006d4e").font("Helvetica-Bold").fontSize(8).text(badgeText.toUpperCase(), badgeX, headerY + 41, { align: "center", width: badgeWidth });

      // 3. QR Verification Area (Right side)
      doc.rect(490, headerY, 48, 48).strokeColor("#eee").stroke();
      doc.fontSize(6).fillColor("#999").text("VERIFY REPORT", 485, headerY + 55, { width: 58, align: "center" });

      // Thin Divider Line
      doc.moveTo(50, headerY + 75).lineTo(545, headerY + 75).lineWidth(0.5).strokeColor("#d9d9d9").stroke();
      doc.moveDown(4);
    };

    drawOfficialHeader("Registry Compliance Audit");
    doc.moveDown(2);

    if (guestLists.length === 0) {
      doc.font("Helvetica-Oblique").text("No submitted records found in the registry.", { align: "center" });
    } else {
      let currentY = 140;

      guestLists.forEach((list: any, index) => {
        // Check for page overflow
        if (currentY > 700) {
          doc.addPage();
          drawOfficialHeader("Registry Compliance Audit");
          currentY = 140;
        }

        // Judge Subsection Header (Grey Bar)
        doc.rect(50, currentY, 495, 22).fill("#f4f4f4");
        doc.fillColor("#1a3a32").font("Helvetica-Bold").fontSize(9);
        doc.text(`${index + 1}. JUDGE: ${(list.user?.name || "N/A").toUpperCase()}`, 60, currentY + 7);
        currentY += 25;

        // Grid Header
        doc.rect(50, currentY, 495, 18).fill("#1a3a32");
        doc.fillColor("white").fontSize(8).text("GUEST NAME", 60, currentY + 5);
        doc.text("TYPE", 220, currentY + 5);
        doc.text("ID / BIRTH CERT", 300, currentY + 5);
        doc.text("CONTACT", 420, currentY + 5);
        currentY += 18;

        // Guest Rows
        list.guests.forEach((g: any, i: number) => {
          // Alternating Zebra Stripes
          if (i % 2 !== 0) doc.rect(50, currentY, 495, 15).fill("#fafafa");
          doc.fillColor("#333").font("Helvetica").fontSize(8);
          
          const idVal = g.type === "ADULT" ? g.idNumber : g.birthCertNumber;
          doc.text(g.name, 60, currentY + 4);
          doc.text(g.type, 220, currentY + 4);
          doc.text(idVal || "-", 300, currentY + 4);
          doc.text(g.phone || "-", 420, currentY + 4);
          currentY += 15;

          // Inner Page Break Logic
          if (currentY > 750) {
            doc.addPage();
            drawOfficialHeader("Registry Compliance Audit");
            currentY = 140;
          }
        });
        currentY += 15;
      });
    }

    // Footer
    doc.fontSize(7).fillColor("#aaa").text(`Consolidated Report - Generated on ${new Date().toLocaleString()}`, 50, 785, { align: "center" });

    doc.end();
  } catch (err) {
    res.status(500).json({ message: "Failed to generate master report" });
  }
};

/* =====================================================
    ADMIN: DOWNLOAD SINGLE JUDGE GUEST LIST PDF
===================================================== */
export const downloadJudgeGuestPDF = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const guestList = await JudgeGuest.findOne({ user: userId }).populate<{
      user: { name: string; email: string };
    }>("user", "name email");

    if (!guestList) return res.status(404).json({ message: "Guest list not found" });

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const judgeName = guestList.user?.name || "Unknown";
    const LOGO_URL = "https://res.cloudinary.com/drls2cpnu/image/upload/v1772111715/JOB_LOGO_ebsbgu.jpg"; // <-- INSERT LOGO URL HERE

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Guest_List_${judgeName.replace(/\s+/g, "_")}.pdf`);
    doc.pipe(res);

    // --- Header Section ---
    const headerY = 40;
    try {
      doc.image(LOGO_URL, 50, headerY, { width: 85 });
    } catch (e) {
      doc.rect(50, headerY, 85, 45).strokeColor("#eee").stroke();
    }

    doc.fillColor("#001529").font("Helvetica-Bold").fontSize(11);
    doc.text("OFFICE OF THE REGISTRAR HIGH COURT", 150, headerY + 5, { align: "center", width: 300 });
    doc.fontSize(9).font("Helvetica").fillColor("#555").text("REPUBLIC OF KENYA", 150, headerY + 20, { align: "center", width: 300 });
    
    // Authorization Badge
    doc.roundedRect(225, headerY + 35, 150, 18, 5).fill("#e6f7f0");
    doc.fillColor("#006d4e").font("Helvetica-Bold").fontSize(8).text("GUEST AUTHORIZATION", 225, headerY + 41, { align: "center", width: 150 });
    
    // QR Area Placeholder
    doc.rect(490, headerY, 48, 48).strokeColor("#eee").stroke();
    doc.moveTo(50, headerY + 75).lineTo(545, headerY + 75).lineWidth(0.5).strokeColor("#d9d9d9").stroke();

    // --- Officer Meta Section ---
    let currentY = 140;
    doc.fillColor("#333").font("Helvetica-Bold").fontSize(10).text("OFFICER/JUDGE:", 50, currentY);
    doc.font("Helvetica").text(judgeName.toUpperCase(), 160, currentY);
    
    doc.font("Helvetica-Bold").text("ISSUED ON:", 50, currentY + 15);
    doc.font("Helvetica").text(new Date().toLocaleDateString(), 160, currentY + 15);
    
    doc.font("Helvetica-Bold").text("LIST STATUS:", 350, currentY + 15);
    doc.fillColor("#006d4e").text(guestList.status, 430, currentY + 15);

    currentY += 45;

    // --- Data Table ---
    doc.rect(50, currentY, 495, 20).fill("#1a3a32");
    doc.fillColor("white").font("Helvetica-Bold").fontSize(9);
    doc.text("S/N", 60, currentY + 6);
    doc.text("NAME OF GUEST", 95, currentY + 6);
    doc.text("CATEGORY", 250, currentY + 6);
    doc.text("IDENTIFICATION", 340, currentY + 6);
    doc.text("CONTACT", 450, currentY + 6);
    
    currentY += 20;
    guestList.guests.forEach((g: any, i: number) => {
      if (i % 2 !== 0) doc.rect(50, currentY, 495, 20).fill("#f9f9f9");
      doc.fillColor("#333").font("Helvetica").fontSize(8);
      
      const idInfo = g.type === "ADULT" ? (g.idNumber || "-") : (g.birthCertNumber || "-");
      doc.text((i + 1).toString(), 60, currentY + 7);
      doc.text(g.name, 95, currentY + 7);
      doc.text(g.type, 250, currentY + 7);
      doc.text(idInfo, 340, currentY + 7);
      doc.text(g.phone || "-", 450, currentY + 7);
      currentY += 20;

      // Handle pagination
      if (currentY > 700) {
        doc.addPage();
        currentY = 50; 
      }
    });

    // --- Official Signature Block ---
    const sigY = 720;
    doc.moveTo(380, sigY).lineTo(540, sigY).lineWidth(0.5).strokeColor("#000").stroke();
    doc.fontSize(8).font("Helvetica-Bold").text("FOR: CHIEF REGISTRAR", 400, sigY + 5);
    
    doc.font("Helvetica-Oblique").fontSize(7).fillColor("#888").text("This document is valid only when presented with original identification for security clearance.", 50, 785, { align: "center" });

    doc.end();
  } catch (err: any) {
    res.status(500).json({ message: "Error generating authorization PDF" });
  }
};