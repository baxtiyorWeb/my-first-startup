import { NextRequest, NextResponse } from "next/server";
import { botService } from "@/server/bot-engine/bot-service";
import { enforceAdminGuard } from "@/server/common/admin-guard";

export async function POST(req: NextRequest) {
  const guardResponse = enforceAdminGuard();
  if (guardResponse) return guardResponse;
  try {
    const body = await req.json();
    const { action, postId, dailyLimit, isActive } = body;

    switch (action) {
      case "seed_starters": {
        const bots = await botService.seedStarterBotsIfEmpty();
        return NextResponse.json({
          success: true,
          message: "Boshlang'ich botlar yaratildi",
          data: bots,
        });
      }

      case "create_profile": {
        const newBot = await botService.createBotUser();
        return NextResponse.json({
          success: true,
          message: `Yangi bot a'zosi qo'shildi: ${newBot.name}`,
          data: newBot,
        });
      }

      case "create_post": {
        const newPost = await botService.generateOrganicPost();
        return NextResponse.json({
          success: true,
          message: `Yangi post yaratildi: "${newPost.title?.slice(0, 40)}..."`,
          data: newPost,
        });
      }

      case "create_comment": {
        const newComment = await botService.generateOrganicComment(postId);
        return NextResponse.json({
          success: true,
          message: "Yangi tabiiy izoh qoldirildi",
          data: newComment,
        });
      }

      case "simulate_activity": {
        const result = await botService.simulateSocialInteractions();
        return NextResponse.json({
          success: true,
          message: `Faollik oshirildi: +${result.views} ko'rish, +${result.likes} like, +${result.follows} obuna`,
          data: result,
        });
      }

      case "toggle_active": {
        const current = await botService.getSettings();
        const updated = await botService.updateSettings({ isActive: !current.isActive });
        return NextResponse.json({
          success: true,
          message: updated.isActive ? "Bot tizimi faollashtirildi" : "Bot tizimi to'xtatildi (pauza)",
          data: updated,
        });
      }

      case "update_settings": {
        const updated = await botService.updateSettings({
          dailyLimit: dailyLimit ? Number(dailyLimit) : undefined,
          isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        });
        return NextResponse.json({
          success: true,
          message: "Sozlamalar yangilandi",
          data: updated,
        });
      }

      case "tick": {
        const tickResult = await botService.runAutonomousTick();
        return NextResponse.json({
          success: true,
          message: tickResult.executed
            ? `Avtonom sikl bajarildi: ${tickResult.action}`
            : `Sikl o'tkazib yuborildi: ${tickResult.reason}`,
          data: tickResult,
        });
      }

      case "update_bot_profile": {
        const { botId, name, handle, role, bio, avatarUrl, botPersona } = body;
        if (!botId) {
          return NextResponse.json({ success: false, error: "botId kiritilmadi" }, { status: 400 });
        }
        const updatedBot = await botService.updateBotUser(botId, {
          name,
          handle,
          role,
          bio,
          avatarUrl,
          botPersona,
        });
        return NextResponse.json({
          success: true,
          message: `Bot profili yangilandi: ${updatedBot.name}`,
          data: updatedBot,
        });
      }

      case "edit_bot_post": {
        const { postId: targetPostId, title, content } = body;
        if (!targetPostId || !content) {
          return NextResponse.json({ success: false, error: "postId va content kiritilishi shart" }, { status: 400 });
        }
        const updatedPost = await botService.editBotPost(targetPostId, {
          title,
          content,
        });
        return NextResponse.json({
          success: true,
          message: "Bot posti muvaffaqiyatli tahrirlandi",
          data: updatedPost,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Noma'lum amal: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[ADMIN_BOTS_ACTION_ERROR]", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
