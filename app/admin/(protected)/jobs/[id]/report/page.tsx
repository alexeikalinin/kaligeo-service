import {cookies} from "next/headers"
import {notFound,redirect} from "next/navigation"
import {prisma} from "@/lib/prisma"
export default async function AdminReport({params}:{params:Promise<{id:string}>}){
 const secret=process.env.ADMIN_SESSION_TOKEN
 if(!secret||(await cookies()).get("admin_session")?.value!==secret)redirect("/admin/login")
 const {id}=await params
 const job=await prisma.auditJob.findUnique({where:{id},select:{status:true,reportToken:true,report:{select:{id:true}}}})
 if(!job)notFound()
 if(job.status!=="COMPLETED"||!job.report)redirect(`/admin/jobs/${id}`)
 redirect(`/report/${id}?token=${encodeURIComponent(job.reportToken)}`)
}
