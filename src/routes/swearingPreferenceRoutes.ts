import express from "express";
import {
  saveSwearingPreference,
  getMySwearingPreference,
  getAllSwearingPreferences,
  getSwearingPreferenceByUser,
  adminUpdateSwearingPreference,
  deleteSwearingPreference,
} from "../controllers/swearingPreferenceController";
import { authorize, protect } from "../middlewares/authMiddleware";

const router = express.Router();

/* USER ROUTES */
router.post("/save", protect, saveSwearingPreference);
router.get("/me", protect, getMySwearingPreference);

/* ADMIN ROUTES */
router.get("/get", protect, authorize("admin"), getAllSwearingPreferences);
router.get("/:userId", protect, authorize("admin"), getSwearingPreferenceByUser);
router.put("/:userId", protect, authorize("admin"), adminUpdateSwearingPreference);
router.delete("/:userId", protect, authorize("admin"), deleteSwearingPreference);

export default router;