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
} from "../controllers/courtInfoController";
import { authorize, protect } from "../middlewares/authMiddleware";

const router = express.Router();

// ----------------- PUBLIC / USER -----------------
router.get("/get", getCourtInfo);

// ----------------- ADMIN ONLY -----------------
router.post("/divisions", protect, authorize("admin"), createDivision);
router.put("/divisions/:id", protect, authorize("admin"), updateDivision);
router.delete("/divisions/:id", protect, authorize("admin"), deleteDivision);

router.post("/faqs", protect, authorize("admin"), createFAQ);
router.put("/faqs/:id", protect, authorize("admin"), updateFAQ);
router.delete("/faqs/:id", protect, authorize("admin"), deleteFAQ);

router.post("/contacts", protect, authorize("admin"), createContact);
router.put("/contacts/:id", protect, authorize("admin"), updateContact);
router.delete("/contacts/:id", protect, authorize("admin"), deleteContact);

export default router;
