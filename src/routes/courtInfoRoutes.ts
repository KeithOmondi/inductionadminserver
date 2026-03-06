import express from "express";
import {
  getCourtInfo,
  createDivision,
  updateDivision,
  deleteDivision,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  createContact,
  updateContact,
  deleteContact,
  getPublicCourtInfo,
  getPublicDivisions,
  getPublicFAQs,
  getPublicContacts,
} from "../controllers/courtInfoController";
import { authorize, protect } from "../middlewares/authMiddleware";
import { upload } from "../middlewares/upload";

const router = express.Router();

// ----------------- PUBLIC / USER -----------------
router.get("/get", getCourtInfo);

// ----------------- ADMIN ONLY -----------------

/**
 * DIVISIONS
 * Use upload.single("file") to handle multipart/form-data.
 * This allows uploading one video/image/document per request
 * alongside the 'name' and 'body' text fields.
 */
router.post(
  "/divisions",
  protect,
  authorize("admin"),
  upload.single("file"), // Middleware to intercept the file
  createDivision,
);

router.put(
  "/divisions/:id",
  protect,
  authorize("admin"),
  upload.single("file"), // Allows adding new files during updates
  updateDivision,
);

router.delete("/divisions/:id", protect, authorize("admin"), deleteDivision);

// ----------------- FAQS & CONTACTS -----------------
// These remain text-only (JSON), so no multer is needed.

router.post("/faqs", protect, authorize("admin"), createFAQ);
router.put("/faqs/:id", protect, authorize("admin"), updateFAQ);
router.delete("/faqs/:id", protect, authorize("admin"), deleteFAQ);

router.post("/contacts", protect, authorize("admin"), createContact);
router.put("/contacts/:id", protect, authorize("admin"), updateContact);
router.delete("/contacts/:id", protect, authorize("admin"), deleteContact);

//GUEST ROUTES
/* Public Read Only */
router.get("/court-info", getPublicCourtInfo);

router.get("/divisions", protect, authorize("guest"), getPublicDivisions);
router.get("/faqs", protect, authorize("guest"), getPublicFAQs);
router.get("/contacts", protect, authorize("guest"), getPublicContacts);

export default router;
