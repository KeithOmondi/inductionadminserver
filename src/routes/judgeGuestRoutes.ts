import express from "express";
import {
  saveGuestList,
  submitGuestList,
  addGuests,
  getMyGuestList,
  deleteGuestList,
  getAllGuestLists,
  downloadAllGuestsPDF,
  downloadJudgeGuestPDF,
} from "../controllers/judgeGuestController";
import { protect, authorize } from "../middlewares/authMiddleware";

const router = express.Router();

/* =====================================================
   USER / JUDGE ROUTES
===================================================== */

// Save as Draft (create or update)
router.post("/save", protect, saveGuestList);

// Submit guest list (strict validation)
router.post("/submit", protect, submitGuestList);

// Add more guests (after draft or submission)
router.patch("/add", protect, addGuests);

// Get my guest list
router.get("/me", protect, getMyGuestList);

// Delete my guest list (only if draft)
router.delete("/delete", protect, deleteGuestList);


/* =====================================================
   ADMIN ROUTES
===================================================== */

// Admin can view all guest lists
router.get("/admin/all", protect, authorize("admin"), getAllGuestLists);

// router.ts
router.get("/all/report", protect, authorize("admin"), downloadAllGuestsPDF);
router.get("/report/:userId", protect, authorize("admin"), downloadJudgeGuestPDF);

export default router;
