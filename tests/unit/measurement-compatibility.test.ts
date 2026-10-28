import {expect,it} from "vitest"
import {compatibleMeasurements,measurementOrigin} from "@/lib/analysis/measurement-compatibility"
it("requires the same approved measurement, questions and platforms; excludes legacy reports",()=>{
 const a={generatedQueries:["q1","q2"],selectedPlatforms:["GEMINI","CHATGPT"],analysisSnapshot:{entityMeasurementVersion:"m1",methodologyVersion:"v4"}}
 expect(compatibleMeasurements(a,{...a,selectedPlatforms:["CHATGPT","GEMINI"]})).toBe(true)
 expect(compatibleMeasurements(a,{...a,generatedQueries:["q2","q1"]})).toBe(false)
 expect(compatibleMeasurements(a,{...a,analysisSnapshot:{...a.analysisSnapshot,entityMeasurementVersion:"m2"}})).toBe(false)
 expect(compatibleMeasurements({...a,analysisSnapshot:null},{...a,analysisSnapshot:null})).toBe(false)
 expect(measurementOrigin("copy",{baselineSourceJobId:"source"})).toBe("source")
})
