import { status } from "http-status";
import { Request, Response } from "express";
import { database } from "@/configs/connection.config";
import { eq } from "drizzle-orm";
import { orders } from "@/schema/schema";
