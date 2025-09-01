import { Request, Response } from "express";
import formidable from "formidable";
import status from "http-status";
import { eq } from "drizzle-orm";
import { branding } from "@/schema/schema";
import { logger } from "@/utils/logger.util";
import { database } from "@/configs/connection.config";
import cloudinary from "@/configs/cloudinary.config";

export const fetchBrandingController = async (req: Request, res: Response) => {
  try {
    // ?field=logo (string) OR ?field=logo&field=banner (array)
    const { field } = req.query;

    if (!field) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "Query parameter 'field' is required." });
    }

    const fieldsToFetch = Array.isArray(field) ? field : [field as string];

    const columns = fieldsToFetch.reduce((acc, currentField) => {
      if (typeof currentField === "string" && currentField.length > 0) {
        acc[currentField] = true;
      }
      return acc;
    }, {} as Record<string, boolean>);

    // If after processing, no valid columns were created, it's a bad request.
    if (Object.keys(columns).length === 0) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "A valid 'field' query parameter is required." });
    }

    const brandingData = await database.query.branding.findFirst({
      columns,
    });

    if (!brandingData) {
      return res.status(status.OK).json({
        message: `Branding has not been configured.`,
        data: null,
      });
    }

    return res.status(status.OK).json({
      message: `${fieldsToFetch.join(", ")} fetched successfully.`,
      data: brandingData,
    });
  } catch (error) {
    logger.error("Failed to fetch branding:", error);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: (error as Error).message });
  }
};

export const updateBrandingController = async (req: Request, res: Response) => {
  try {
    const form = formidable();
    const [formData, files] = await form.parse<any, "logo" | "banner">(req);

    const logoFile = files.logo?.[0];
    const bannerFile = files.banner?.[0];

    // Build update object dynamically
    const dataToUpdate: Partial<{
      logo: string;
      banner: string;
      name: string;
      email: string;
      phoneNumber: string;
      instagram: string;
      facebook: string;
      mainSection: string;
      updatedAt: Date;
    }> = {};

    if (logoFile) {
      const response = await cloudinary.uploader.upload(logoFile.filepath, {
        folder: "branding",
      });
      dataToUpdate.logo = response.secure_url;
    }

    if (bannerFile) {
      const response = await cloudinary.uploader.upload(bannerFile.filepath, {
        folder: "branding",
      });
      dataToUpdate.banner = response.secure_url;
    }

    // Text fields
    if (formData.name) dataToUpdate.name = formData.name[0];
    if (formData.email) dataToUpdate.email = formData.email[0];
    if (formData.phoneNumber)
      dataToUpdate.phoneNumber = formData.phoneNumber[0];
    if (formData.instagram) dataToUpdate.instagram = formData.instagram[0];
    if (formData.facebook) dataToUpdate.facebook = formData.facebook[0];
    if (formData.mainSection)
      dataToUpdate.mainSection = formData.mainSection[0];

    if (Object.keys(dataToUpdate).length === 0) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "No data provided for update." });
    }

    dataToUpdate.updatedAt = new Date();

    // Check if global branding record exists
    const globalBranding = await database.query.branding.findFirst();
    let updatedRecord;

    if (globalBranding) {
      [updatedRecord] = await database
        .update(branding)
        .set(dataToUpdate)
        .where(eq(branding.id, globalBranding.id))
        .returning();
    } else {
      [updatedRecord] = await database
        .insert(branding)
        .values(dataToUpdate)
        .returning();
    }

    return res.status(status.OK).json({
      message: "Global branding updated successfully",
      data: updatedRecord,
    });
  } catch (error) {
    logger.error(error);
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: (error as Error).message });
  }
};
