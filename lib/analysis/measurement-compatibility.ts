interface Measurement {generatedQueries:unknown;selectedPlatforms:string[];analysisSnapshot:unknown}
export function compatibleMeasurements(a:Measurement,b:Measurement){
 const x=a.analysisSnapshot as {entityMeasurementVersion?:string;methodologyVersion?:string}|null,y=b.analysisSnapshot as typeof x
 return !!x?.entityMeasurementVersion&&x.entityMeasurementVersion===y?.entityMeasurementVersion&&!!x.methodologyVersion&&x.methodologyVersion===y.methodologyVersion&&JSON.stringify(a.generatedQueries)===JSON.stringify(b.generatedQueries)&&[...a.selectedPlatforms].sort().join() === [...b.selectedPlatforms].sort().join()
}
export function measurementOrigin(id:string,snapshot:unknown){return (snapshot as {baselineSourceJobId?:string}|null)?.baselineSourceJobId??id}
