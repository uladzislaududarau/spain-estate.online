// Lift the person from a portrait with macOS Vision (the same subject-lift as Photos).
// Writes an RGBA PNG at the source resolution; the person's pixels are not altered.
// Usage: swift scripts/cutout-portrait.swift <input image> <output.png>
import CoreImage
import Foundation
import Vision

let arguments = CommandLine.arguments
guard arguments.count == 3 else {
  FileHandle.standardError.write("usage: swift cutout-portrait.swift <input> <output.png>\n".data(using: .utf8)!)
  exit(2)
}
guard let image = CIImage(contentsOf: URL(fileURLWithPath: arguments[1])) else {
  FileHandle.standardError.write("cannot read input image\n".data(using: .utf8)!)
  exit(1)
}
let handler = VNImageRequestHandler(ciImage: image)
let request = VNGenerateForegroundInstanceMaskRequest()
try handler.perform([request])
guard let observation = request.results?.first else {
  FileHandle.standardError.write("no subject found\n".data(using: .utf8)!)
  exit(1)
}
let buffer = try observation.generateMaskedImage(ofInstances: observation.allInstances, from: handler, croppedToInstancesExtent: false)
let masked = CIImage(cvPixelBuffer: buffer)
try CIContext().writePNGRepresentation(of: masked, to: URL(fileURLWithPath: arguments[2]), format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
print("instances: \(observation.allInstances.count), size: \(Int(masked.extent.width))x\(Int(masked.extent.height))")
