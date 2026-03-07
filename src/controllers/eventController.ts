import { Request, Response } from "express";
import Event, { EventFilter } from "../models/event.model";
import { AuthRequest } from "../middlewares/authMiddleware";

/* ===============================
   CREATE EVENT (ADMIN)
================================ */
export const createEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { 
      title, 
      description, 
      location, 
      date, 
      endTime, 
      time, 
      isMandatory, 
      status, 
      capacity 
    } = req.body;

    const event = await Event.create({
      title,
      description,
      location,
      date,
      endTime,
      time,
      isMandatory,
      status: status || "SCHEDULED",
      capacity,
      createdBy: req.user?.id,
    });

    // We return the event; Mongoose will automatically include the 'scheduledAt' 
    // virtual because we set toJSON: { virtuals: true } in the model.
    res.status(201).json(event);
  } catch (error) {
    console.error("Create Event Error:", error);
    res.status(500).json({ message: "Failed to create judicial event record" });
  }
};

/* ===============================
   GET EVENTS (FILTERED)
   ?filter=UPCOMING | PAST | RECENT | ALL
================================ */
export const getEvents = async (req: Request, res: Response) => {
  try {
    const filter = (req.query.filter as EventFilter) || "ALL";

    // The model's static method already handles the logic for 
    // UPCOMING (date >= today) and PAST (older or cancelled/completed)
    const events = await Event.getFilteredEvents(filter);

    res.json(events);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch registry events" });
  }
};

/* ===============================
   GET SINGLE EVENT
================================ */
export const getEventById = async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("createdBy", "name role");

    if (!event) {
      return res.status(404).json({ message: "Event not found in registry" });
    }

    res.json(event);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving event details" });
  }
};

/* ===============================
   UPDATE EVENT (ADMIN)
================================ */
export const updateEvent = async (req: AuthRequest, res: Response) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Merge updates (useful for updating status to ONGOING or COMPLETED)
    Object.assign(event, req.body);

    const updated = await event.save();

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update judicial record" });
  }
};

/* ===============================
   DELETE EVENT (ADMIN)
================================ */
export const deleteEvent = async (req: AuthRequest, res: Response) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event record not found" });
    }

    await event.deleteOne();

    res.json({ message: "Event permanently removed from registry" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete event record" });
  }
};

/* ===============================
   GUEST: GET ALL EVENTS (PUBLIC)
================================ */
export const getPublicEvents = async (req: Request, res: Response) => {
  try {
    // Guests get the "ALL" filter by default
    const filter = (req.query.filter as EventFilter) || "ALL";
    
    // Using the same static method from your Model
    const events = await Event.getFilteredEvents(filter);

    // If you ever want to hide fields from guests, you'd do it here
    res.json(events);
  } catch (error) {
    console.error("Public Fetch Error:", error);
    res.status(500).json({ message: "Error fetching public event registry" });
  }
};

/* ===============================
   GUEST: GET SINGLE EVENT (PUBLIC)
================================ */
export const getPublicEventById = async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.id)
      .select("-__v") // Example: Hiding internal version keys from guests
      .populate("createdBy", "name"); // Only show name, hide role from guests

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json(event);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving event details" });
  }
};