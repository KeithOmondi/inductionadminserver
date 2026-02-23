import { Request, Response } from "express";
import Division from "../models/divisionModel";
import FAQ from "../models/faqModel";
import Contact from "../models/contactModel";

// ----------------- READ ALL (for users & admin) -----------------
export const getCourtInfo = async (_req: Request, res: Response) => {
  try {
    const [divisions, faqs, contacts] = await Promise.all([
      Division.find().sort({ name: 1 }),
      FAQ.find().sort({ createdAt: -1 }),
      Contact.find(),
    ]);
    res.json({ divisions, faqs, contacts });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch court info", error: err });
  }
};

// ----------------- CRUD for Divisions -----------------
export const createDivision = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const division = await Division.create({ name });
    res.status(201).json(division);
  } catch (err) {
    res.status(500).json({ message: "Failed to create division", error: err });
  }
};

export const updateDivision = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const division = await Division.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!division)
      return res.status(404).json({ message: "Division not found" });
    res.json(division);
  } catch (err) {
    res.status(500).json({ message: "Failed to update division", error: err });
  }
};

export const deleteDivision = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const division = await Division.findByIdAndDelete(id);
    if (!division)
      return res.status(404).json({ message: "Division not found" });
    res.json({ message: "Division deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete division", error: err });
  }
};

// ----------------- CRUD for FAQs -----------------
export const createFAQ = async (req: Request, res: Response) => {
  try {
    const { question, answer } = req.body;
    const faq = await FAQ.create({ question, answer });
    res.status(201).json(faq);
  } catch (err) {
    res.status(500).json({ message: "Failed to create FAQ", error: err });
  }
};

export const updateFAQ = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const faq = await FAQ.findByIdAndUpdate(id, req.body, { new: true });
    if (!faq) return res.status(404).json({ message: "FAQ not found" });
    res.json(faq);
  } catch (err) {
    res.status(500).json({ message: "Failed to update FAQ", error: err });
  }
};

export const deleteFAQ = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const faq = await FAQ.findByIdAndDelete(id);
    if (!faq) return res.status(404).json({ message: "FAQ not found" });
    res.json({ message: "FAQ deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete FAQ", error: err });
  }
};

// ----------------- CRUD for Contacts -----------------
export const createContact = async (req: Request, res: Response) => {
  try {
    const { title, detail, sub } = req.body;
    const contact = await Contact.create({ title, detail, sub });
    res.status(201).json(contact);
  } catch (err) {
    res.status(500).json({ message: "Failed to create contact", error: err });
  }
};

export const updateContact = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const contact = await Contact.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!contact) return res.status(404).json({ message: "Contact not found" });
    res.json(contact);
  } catch (err) {
    res.status(500).json({ message: "Failed to update contact", error: err });
  }
};

export const deleteContact = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const contact = await Contact.findByIdAndDelete(id);
    if (!contact) return res.status(404).json({ message: "Contact not found" });
    res.json({ message: "Contact deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete contact", error: err });
  }
};
