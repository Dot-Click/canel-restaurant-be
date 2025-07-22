// in your controllers/brandingController.ts

import { Request, Response } from "express";
import formidable from "formidable";
import status from "http-status";
import { eq } from "drizzle-orm";
import { branding } from "@/schema/schema";
import { logger } from "@/utils/logger.util";
import { database } from "@/configs/connection.config";
import cloudinary from "@/configs/cloudinary.config";

export const fetchLogoController = async (_req: Request, res: Response) => {
  try {
    // Query the database, but only select the 'logo' column for efficiency.
    const brandingData = await database.query.branding.findFirst({
      columns: {
        logo: true,
      },
    });

    // If no record exists or the logo field is null, return a clear response.
    if (!brandingData || !brandingData.logo) {
      return res.status(status.OK).json({
        message: "Logo has not been configured.",
        data: null,
      });
    }

    // Return the logo data.
    return res.status(status.OK).json({
      message: "Logo fetched successfully.",
      data: { logo: brandingData.logo },
    });
  } catch (error) {
    logger.error("Failed to fetch logo:", error);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: (error as Error).message });
  }
};

export const fetchBannerController = async (_req: Request, res: Response) => {
  try {
    // Query the database, only selecting the 'banner' column.
    const brandingData = await database.query.branding.findFirst({
      columns: {
        banner: true,
      },
    });

    if (!brandingData || !brandingData.banner) {
      return res.status(status.OK).json({
        message: "Banner has not been configured.",
        data: null,
      });
    }

    return res.status(status.OK).json({
      message: "Banner fetched successfully.",
      data: { banner: brandingData.banner },
    });
  } catch (error) {
    logger.error("Failed to fetch banner:", error);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: (error as Error).message });
  }
};

export const fetchMainSectionController = async (
  _req: Request,
  res: Response
) => {
  try {
    // Query the database, only selecting the 'mainSection' column.
    const brandingData = await database.query.branding.findFirst({
      columns: {
        mainSection: true,
      },
    });

    // Your database schema uses main_section, so ensure your ORM maps it correctly
    // or use the exact column name if needed. Assuming 'mainSection' is the mapped name.
    if (!brandingData || !brandingData.mainSection) {
      return res.status(status.OK).json({
        message: "Main section has not been configured.",
        data: null,
      });
    }

    return res.status(status.OK).json({
      message: "Main section fetched successfully.",
      data: { mainSection: brandingData.mainSection },
    });
  } catch (error) {
    logger.error("Failed to fetch main section:", error);
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
    const mainSection = formData.mainSection?.[0];

    // This object will hold only the data we are actually updating.
    const dataToUpdate: {
      logo?: string;
      banner?: string;
      mainSection?: string;
      updatedAt?: Date;
    } = {};

    // Build the update object dynamically based on what was provided.
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
    if (mainSection) {
      dataToUpdate.mainSection = mainSection;
    }

    // If the request was empty (no files, no text), there's nothing to do.
    if (Object.keys(dataToUpdate).length === 0) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "No data provided for update." });
    }

    // Always update the timestamp when a change is made.
    dataToUpdate.updatedAt = new Date();

    // --- LOGIC STARTS HERE ---

    // 1. Try to find the single, global branding record.
    const globalBranding = await database.query.branding.findFirst();

    // We declare this variable here so it can be used by both the if and else blocks.
    let updatedRecord;

    // 2. Decide whether to UPDATE or INSERT.
    if (globalBranding) {
      // --- PATH A: THE RECORD EXISTS (This will be the normal case) ---
      // We found the record, so we UPDATE it using its ID.
      [updatedRecord] = await database
        .update(branding)
        .set(dataToUpdate)
        .where(eq(branding.id, globalBranding.id)) // Use the ID we just found
        .returning();
    } else {
      // --- PATH B: THE RECORD DOES NOT EXIST (This happens only once) ---
      // The table is empty, so we INSERT the very first record.
      [updatedRecord] = await database
        .insert(branding)
        .values(dataToUpdate) // Drizzle will use all fields in the object
        .returning();
    }

    // 3. Return the final result.
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
