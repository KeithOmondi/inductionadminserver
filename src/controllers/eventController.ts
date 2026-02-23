import { Request, Response } from "express";
import Event from "../models/event.model";
import { AuthRequest } from "../middlewares/authMiddleware";

/* ===============================
   CREATE EVENT (ADMIN)
================================ */
export const createEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, location, date, time, type, isMandatory } =
      req.body;

    const event = await Event.create({
      title,
      description,
      location,
      date,
      time,
      type,
      isMandatory,
      createdBy: req.user?.id,
    });

    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ message: "Failed to create event" });
  }
};

/* ===============================
   GET ALL EVENTS (UPCOMING FIRST)
================================ */
export const getEvents = async (req: Request, res: Response) => {
  try {
    const { type } = req.query;

    const filter: any = {};

    if (type && type !== "ALL") {
      filter.type = type;
    }

    const events = await Event.find(filter).sort({ date: 1 });

    res.json(events);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch events" });
  }
};

/* ===============================
   GET SINGLE EVENT
================================ */
export const getEventById = async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json(event);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch event" });
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

    Object.assign(event, req.body);

    const updated = await event.save();

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update event" });
  }
};

/* ===============================
   DELETE EVENT (ADMIN)
================================ */
export const deleteEvent = async (req: AuthRequest, res: Response) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    await event.deleteOne();

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete event" });
  }
};
