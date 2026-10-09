import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { type AuthedRequest, type AuthUser, Auth, FormLimit, Me, Public } from "../../common/decorators.js";
import { ZodPipe, z } from "../../common/zod.js";
import type { InquiryMessageDTO, InquiryRow, InquiryStatus, InquiryThread } from "../../contract.js";
import {
  type CreateInquiryDto, type InquiryStatusDto, type ListInquiriesDto, type MessageDto,
  createInquirySchema, inquiryStatusSchema, listInquiriesSchema, messageSchema,
} from "./inquiries.dto.js";
import { InquiriesService } from "./inquiries.service.js";

const idParam = new ZodPipe(z.string().min(1).max(40));

@Controller()
export class InquiriesController {
  constructor(private readonly svc: InquiriesService) {}

  @Public() @FormLimit() @Post("publications/:id/inquiries") @HttpCode(201)
  create(@Param("id", idParam) id: string, @Body(new ZodPipe(createInquirySchema)) dto: CreateInquiryDto, @Req() req: AuthedRequest): Promise<{ id: string }> {
    return this.svc.create(id, req.user, dto);
  }

  @Auth() @Get("inquiries")
  list(@Me() u: AuthUser, @Query(new ZodPipe(listInquiriesSchema)) q: ListInquiriesDto): Promise<InquiryRow[]> {
    return this.svc.list(u, q);
  }

  @Auth() @Get("inquiries/:id")
  thread(@Me() u: AuthUser, @Param("id", idParam) id: string): Promise<InquiryThread> {
    return this.svc.thread(id, u);
  }

  @Auth() @Post("inquiries/:id/messages") @HttpCode(201)
  reply(@Me() u: AuthUser, @Param("id", idParam) id: string, @Body(new ZodPipe(messageSchema)) dto: MessageDto): Promise<InquiryMessageDTO> {
    return this.svc.reply(id, u, dto);
  }

  @Auth() @Patch("inquiries/:id")
  status(@Me() u: AuthUser, @Param("id", idParam) id: string, @Body(new ZodPipe(inquiryStatusSchema)) dto: InquiryStatusDto): Promise<{ id: string; status: InquiryStatus }> {
    return this.svc.setStatus(id, u, dto);
  }
}
