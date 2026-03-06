import { Request, Response } from "express";
import JudgeGuest from "../models/judgeGuest";
import { AuthRequest } from "../middlewares/authMiddleware";
import PDFDocument from "pdfkit";
import judgeGuest from "../models/judgeGuest";
import axios from "axios";

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
    const guestLists = await JudgeGuest.find({ status: "SUBMITTED" }).populate<{
      user: { name: string; email: string };
    }>("user", "name email");

    // Fetch the logo buffer once
    const LOGO_URL = "https://res.cloudinary.com/drls2cpnu/image/upload/v1772111715/JOB_LOGO_ebsbgu.jpg";
    let logoBuffer: Buffer | null = null;
    try {
      const response = await axios.get(LOGO_URL, { responseType: "arraybuffer" });
      logoBuffer = Buffer.from(response.data, "utf-8");
    } catch (e) {
      console.error("Logo fetch failed");
    }

    const doc = new PDFDocument({ margin: 50, size: "A4", bufferPages: true });
    const DEEP_GREEN = "#25443c";
    const JUDICIAL_GOLD = "#d9b929";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Master_Audit_Report.pdf`);
    doc.pipe(res);

    const drawHeader = (title: string) => {
      // Draw Logo from Buffer
      if (logoBuffer) {
        doc.image(logoBuffer, 50, 40, { width: 70 });
      }

      doc.fillColor(DEEP_GREEN).font("Times-Bold").fontSize(14)
         .text("THE JUDICIARY OF KENYA", 130, 45, { align: "center", width: 340 });
      
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#555")
         .text("OFFICE OF THE REGISTRAR - HIGH COURT", 130, 62, { align: "center", width: 340 });

      doc.rect(210, 78, 180, 16).fill(JUDICIAL_GOLD);
      doc.fillColor(DEEP_GREEN).font("Helvetica-Bold").fontSize(8)
         .text(title.toUpperCase(), 210, 83, { align: "center", width: 180, characterSpacing: 1 });

      doc.moveTo(50, 105).lineTo(545, 105).lineWidth(2).strokeColor(DEEP_GREEN).stroke();
    };

    drawHeader("ORHC Compliance Audit Report");

    let currentY = 130;
    guestLists.forEach((list, idx) => {
      if (currentY > 680) {
        doc.addPage();
        drawHeader("ORHC Compliance Audit Report");
        currentY = 130;
      }

      doc.rect(50, currentY, 495, 22).fill("#f4f6f4");
      doc.fillColor(DEEP_GREEN).font("Times-Bold").fontSize(10)
         .text(`${idx + 1}.${(list.user?.name || "N/A").toUpperCase()}`, 65, currentY + 7);
      currentY += 28;

      doc.rect(50, currentY, 495, 18).fill(DEEP_GREEN);
      doc.fillColor("white").font("Helvetica-Bold").fontSize(8);
      doc.text("GUEST NAME", 65, currentY + 5);
      doc.text("TYPE", 220, currentY + 5);
      doc.text("ID / CERT NO", 320, currentY + 5);
      doc.text("CONTACT", 450, currentY + 5);
      currentY += 18;

      list.guests.forEach((g: any, i: number) => {
        if (i % 2 !== 0) doc.rect(50, currentY, 495, 16).fill("#fafafa");
        doc.fillColor("#333").font("Helvetica").fontSize(8);
        doc.text(g.name, 65, currentY + 4);
        doc.text(g.type, 220, currentY + 4);
        doc.text(g.idNumber || g.birthCertNumber || "-", 320, currentY + 4);
        doc.text(g.phone || "-", 450, currentY + 4);
        currentY += 16;
      });
      currentY += 25;
    });

    // Add page numbers
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(7).fillColor("#aaa").text(
        `Page ${i + 1} of ${range.count}  |  Official ORHC Document`,
        50, 785, { align: "center" }
      );
    }

    doc.end();
  } catch (err) {
    res.status(500).json({ message: "Failed to generate report" });
  }
};

/* =====================================================
 ADMIN: DOWNLOAD SINGLE JUDGE GUEST LIST PDF
===================================================== */
export const downloadJudgeGuestPDF = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    // Explicit typing for the populated user
    const guestList = await JudgeGuest.findOne({ user: userId }).populate<{
      user: { name: string; email: string };
    }>("user", "name email");

    if (!guestList) return res.status(404).json({ message: "List not found" });

    // 1. Fetch Logo Buffer (Fixes missing logo issue)
    const LOGO_URL = "https://res.cloudinary.com/drls2cpnu/image/upload/v1772111715/JOB_LOGO_ebsbgu.jpg";
    let logoBuffer: Buffer | null = null;
    try {
      const response = await axios.get(LOGO_URL, { responseType: "arraybuffer" });
      logoBuffer = Buffer.from(response.data, "utf-8");
    } catch (e) {
      console.error("Logo fetch failed, proceeding with text-only header.");
    }

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const DEEP_GREEN = "#25443c";
    const JUDICIAL_GOLD = "#d9b929";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Authorized_Guest_List_${guestList.user.name.replace(/\s+/g, '_')}.pdf`);
    doc.pipe(res);

    // --- Institutional Header ---
    if (logoBuffer) {
      doc.image(logoBuffer, 50, 40, { width: 70 });
    } else {
      // Placeholder if logo fails to load
      doc.rect(50, 40, 70, 45).lineWidth(0.5).strokeColor("#eee").stroke();
    }
    
    doc.fillColor(DEEP_GREEN).font("Times-Bold").fontSize(14)
       .text("THE JUDICIARY OF KENYA", 130, 45, { align: "center", width: 340 });
    
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#555")
       .text("OFFICE OF THE REGISTRAR - HIGH COURT", 130, 62, { align: "center", width: 340 });
    
    // Authorization Badge
    doc.rect(210, 78, 180, 16).fill(JUDICIAL_GOLD);
    doc.fillColor(DEEP_GREEN).font("Helvetica-Bold").fontSize(8)
       .text("APPROVED GUEST LIST", 210, 83, { align: "center", width: 180, characterSpacing: 0.5 });
    
    // Thick Accent Line
    doc.moveTo(50, 105).lineTo(545, 105).lineWidth(2).strokeColor(DEEP_GREEN).stroke();

    // --- Meta Details Section ---
    let currentY = 130;
    doc.fillColor(DEEP_GREEN).font("Helvetica-Bold").fontSize(9).text("JUDGE:", 50, currentY);
    doc.fillColor("#333").font("Helvetica").text(`${guestList.user.name.toUpperCase()}`, 160, currentY);
    
    doc.fillColor(DEEP_GREEN).font("Helvetica-Bold").text("DATE ISSUED:", 50, currentY + 15);
    doc.fillColor("#333").font("Helvetica").text(new Date().toLocaleDateString('en-GB'), 160, currentY + 15);
    
    doc.fillColor(DEEP_GREEN).font("Helvetica-Bold").text("STATUS:", 380, currentY + 15);
    doc.fillColor(JUDICIAL_GOLD).text(guestList.status.toUpperCase(), 450, currentY + 15);

    // --- Guest Table ---
    currentY += 45;
    
    // Table Header
    doc.rect(50, currentY, 495, 20).fill(DEEP_GREEN);
    doc.fillColor("white").font("Helvetica-Bold").fontSize(8.5);
    doc.text("S/N", 60, currentY + 6);
    doc.text("GUEST NAME", 95, currentY + 6);
    doc.text("CATEGORY", 250, currentY + 6);
    doc.text("IDENTIFICATION", 350, currentY + 6);
    doc.text("CONTACT", 450, currentY + 6);

    currentY += 20;
    
    // Table Rows
    guestList.guests.forEach((g: any, i: number) => {
      // Zebra stripping
      if (i % 2 !== 0) doc.rect(50, currentY, 495, 20).fill("#f9f9f9");
      
      doc.fillColor("#333").font("Helvetica").fontSize(8.5);
      
      const idInfo = g.type === "ADULT" ? (g.idNumber || "-") : (g.birthCertNumber || "-");
      
      doc.text((i + 1).toString(), 60, currentY + 7);
      doc.text(g.name, 95, currentY + 7);
      doc.text(g.type, 250, currentY + 7);
      doc.text(idInfo, 350, currentY + 7);
      doc.text(g.phone || "-", 450, currentY + 7);
      
      currentY += 20;

      // Logic to prevent table breaking into the signature
      if (currentY > 700) {
        doc.addPage();
        currentY = 50; 
      }
    });

    // --- Official Signature Block ---
    const sigY = 720;
    doc.moveTo(380, sigY).lineTo(540, sigY).lineWidth(0.8).strokeColor("#222").stroke();
    doc.fontSize(8).font("Helvetica-Bold").fillColor(DEEP_GREEN)
       .text("FOR: CHIEF REGISTRAR", 380, sigY + 5, { align: "center", width: 160 });

    // Confidentiality Footer
    doc.fontSize(7).font("Helvetica-Oblique").fillColor("#999")
       .text("This document is a property of the High Court. Validity is subject to verification of identification documents.", 50, 785, { align: "center" });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to generate authorization PDF" });
  }
};

//CONSOLIDATED GUEST LIST

//THE JUDICIARY  / ORHC