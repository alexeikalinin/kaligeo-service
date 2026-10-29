/**
 * DELETE /api/admin/jobs/[id]
 * Deletes an audit job (admin only). Used for cleanup of test jobs.
 */
import {auditFailure} from "@/lib/analysis/audit-failure"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

async function isAuthed(): Promise<boolean> {
  const cookieStore = await cookies()
  return !!process.env.ADMIN_SESSION_TOKEN && cookieStore.get("admin_session")?.value === process.env.ADMIN_SESSION_TOKEN
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const job = await prisma.auditJob.findUnique({ where: { id } })
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Delete related records first
  await prisma.queryResult.deleteMany({ where: { jobId: id } })
  await prisma.report.deleteMany({ where: { jobId: id } })
  await prisma.auditJob.delete({ where: { id } })

  return NextResponse.json({ ok: true, deleted: id })
}

/** Protected job details; report credentials never enter the public status response. */
export async function GET(_req:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(!(await isAuthed()))return NextResponse.json({error:"Unauthorized"},{status:401})
 const {id}=await params
 const job=await prisma.auditJob.findUnique({where:{id},select:{id:true,status:true,tier:true,companyName:true,niche:true,clientEmail:true,websiteUrl:true,errorMessage:true,createdAt:true,completedAt:true,report:{select:{id:true}}}})
 if(!job)return NextResponse.json({error:"Not found"},{status:404})
 return NextResponse.json({...job,errorMessage:job.status==="FAILED"?Object.values(auditFailure(job.errorMessage)).join(". "):null,reportUrl:job.status==="COMPLETED"&&job.report?`/admin/jobs/${id}/report`:null},{headers:{"Cache-Control":"private, no-store"}})
}
