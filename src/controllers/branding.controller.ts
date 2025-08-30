// in your controllers/brandingController.ts

import { Request, Response } from "express";
import formidable from "formidable";
import status from "http-status";
import { eq } from "drizzle-orm";
import { branding } from "@/schema/schema";
import { logger } from "@/utils/logger.util";
import { database } from "@/configs/connection.config";
import cloudinary from "@/configs/cloudinary.config";

// export const fetchLogoController = async (_req: Request, res: Response) => {
//   try {
//     // Query the database, but only select the 'logo' column for efficiency.
//     const brandingData = await database.query.branding.findFirst({
//       columns: {
//         logo: true,
//       },
//     });

//     // If no record exists or the logo field is null, return a clear response.
//     if (!brandingData || !brandingData.logo) {
//       return res.status(status.OK).json({
//         message: "Logo has not been configured.",
//         data: null,
//       });
//     }

//     // Return the logo data.
//     return res.status(status.OK).json({
//       message: "Logo fetched successfully.",
//       data: { logo: brandingData.logo },
//     });
//   } catch (error) {
//     logger.error("Failed to fetch logo:", error);
//     return res
//       .status(status.INTERNAL_SERVER_ERROR)
//       .json({ message: (error as Error).message });
//   }
// };

// export const fetchBannerController = async (_req: Request, res: Response) => {
//   try {
//     // Query the database, only selecting the 'banner' column.
//     const brandingData = await database.query.branding.findFirst({
//       columns: {
//         banner: true,
//       },
//     });

//     if (!brandingData || !brandingData.banner) {
//       return res.status(status.OK).json({
//         message: "Banner has not been configured.",
//         data: null,
//       });
//     }

//     return res.status(status.OK).json({
//       message: "Banner fetched successfully.",
//       data: { banner: brandingData.banner },
//     });
//   } catch (error) {
//     logger.error("Failed to fetch banner:", error);
//     return res
//       .status(status.INTERNAL_SERVER_ERROR)
//       .json({ message: (error as Error).message });
//   }
// };

// export const fetchMainSectionController = async (
//   _req: Request,
//   res: Response
// ) => {
//   try {
//     // Query the database, only selecting the 'mainSection' column.
//     const brandingData = await database.query.branding.findFirst({
//       columns: {
//         mainSection: true,
//       },
//     });

//     // Your database schema uses main_section, so ensure your ORM maps it correctly
//     // or use the exact column name if needed. Assuming 'mainSection' is the mapped name.
//     if (!brandingData || !brandingData.mainSection) {
//       return res.status(status.OK).json({
//         message: "Main section has not been configured.",
//         data: null,
//       });
//     }

//     return res.status(status.OK).json({
//       message: "Main section fetched successfully.",
//       data: { mainSection: brandingData.mainSection },
//     });
//   } catch (error) {
//     logger.error("Failed to fetch main section:", error);
//     return res
//       .status(status.INTERNAL_SERVER_ERROR)
//       .json({ message: (error as Error).message });
//   }
// };

export const fetchBrandingController = async (req: Request, res: Response) => {
  try {
    // ?field=logo or ?field=banner or ?field=phoneNumber, etc.
    const { field } = req.query;

    if (!field || typeof field !== "string") {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "Query parameter 'field' is required." });
    }

    // Build dynamic columns object for Drizzle
    const columns: Record<string, boolean> = {};
    columns[field] = true;

    const brandingData = await database.query.branding.findFirst({
      columns,
    });

    if (
      !brandingData ||
      brandingData[field as keyof typeof brandingData] === undefined
    ) {
      return res.status(status.OK).json({
        message: `${field} has not been configured.`,
        data: null,
      });
    }

    return res.status(status.OK).json({
      message: `${field} fetched successfully.`,
      data: { [field]: brandingData[field as keyof typeof brandingData] },
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
